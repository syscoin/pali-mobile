import { toChecksumAddress } from 'ethereumjs-util';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import { bitAND, logDebug, safelyExecute } from '../util';
import TransactionController, {TokenTxChanged} from '../transaction/TransactionController';
import { getContractController, getStaticTokenByChainId } from '../ControllerUtils';
import { Sqlite } from '../transaction/Sqlite';
import { Token } from './TokenRatesController';
import AssetsController from './AssetsController';
import ArbContractController from './ArbContractController';
import TokenBalancesController from './TokenBalancesController';
import { BalanceMap } from './AssetsContractController';
import { ChainType } from "../Config";

/**
 * Controller that passively polls on a set interval for assets auto detection
 */
export class AssetsDetectionController extends BaseController<BaseConfig, BaseState> {
  private mutex = new Mutex();

  /**
   * Name of this controller used during composition
   */
  name = 'AssetsDetectionController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['AssetsController', 'PreferencesController', 'TransactionController'];

  /**
   * Creates a AssetsDetectionController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.initialize();
  }

  async detectTokens() {
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    for (const type in this.networks) {
      const chainType = Number(type);
      if (chainType === ChainType.RPCBase) {
        continue;
      }
      await safelyExecute(async () => {
        await this.addTokenByTransactionHistory(this.networks[chainType].state.provider.chainId, selectedAddress);
      });
    }
  }

  /**
   * History is query from Etherscan
   * We think this is whole set, and contains some new
   * coin transactions (not in contract-metadata).
   * */
  async addTokenByTransactionHistory(chainId: string, selectedAddress: string) {
    const releaseLock = await this.mutex.acquire();
    try {
      if (!selectedAddress) {
        return;
      }
      const assetsController = this.context.AssetsController as AssetsController;
      const tokenBalancesController = this.context.TokenBalancesController as TokenBalancesController;
      const needToAdd: string[] = [];
      const { type, contractController } = getContractController(this, chainId);
      if (!contractController || !type) {
        return;
      }
      const targetInfos = await Sqlite.getInstance().getTokenTransactions(selectedAddress, type, chainId);
      if (!targetInfos) {
        return;
      }
      const targetTokens = assetsController.state.allTokens[selectedAddress]?.[chainId] || [];
      const targetIgnoreTokens = assetsController.state.allIgnoredTokens[selectedAddress]?.[chainId] || [];
      if (targetTokens.length >= 200) {
        return;
      }
      for (const tokenTxInfo of targetInfos) {
        let ERC20Addr = '';

        if (chainId !== tokenTxInfo.chainId) {
          continue;
        }

        if (tokenTxInfo.transferInformation) {
          ERC20Addr = tokenTxInfo.transferInformation.contractAddress;
        }

        if (ERC20Addr === '' || ERC20Addr === undefined) {
          continue;
        }
        if (needToAdd.find((address) => address === ERC20Addr)) {
          continue;
        }
        const lowerERC20Addr = ERC20Addr.toLowerCase();
        if (targetTokens.find((token) => lowerERC20Addr === token.address.toLowerCase())) {
          continue;
        }
        if (targetIgnoreTokens.find((token) => lowerERC20Addr === token.address.toLowerCase())) {
          continue;
        }

        needToAdd.push(ERC20Addr);
        if (targetTokens.length + needToAdd.length >= 400) {
          break;
        }
      }

      const balances = await contractController.getBalancesInSingleCall(
        selectedAddress,
        needToAdd,
        false,
        chainId,
      );

      const needAddTokens = [];
      const maxTokensToAdd = 200 - targetTokens.length;
      const needAddTokenBalances: BalanceMap = {};
      for (const tokenAddress in balances) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        let { decimals, symbol } = await getStaticTokenByChainId(chainId, tokenAddress);
        if (!decimals || !symbol) {
          try {
            decimals = await contractController.getTokenDecimals(tokenAddress, chainId);
            symbol = await contractController.getAssetSymbol(tokenAddress, chainId);
          } catch (e) {
            logDebug('leon.w@addTokenByTransactionHistory: ', tokenAddress, chainId, e);
            continue;
          }
        }
        const newEntry: Token = {
          address: toChecksumAddress(tokenAddress),
          symbol,
          decimals: Number(decimals),
        };
        if (type === ChainType.Arbitrum) {
          newEntry.l1Address = await (contractController as ArbContractController).calculateL1ERC20Address(tokenAddress);
        }
        needAddTokenBalances[newEntry.address] = balances[tokenAddress];
        needAddTokens.push(newEntry);
        if (needAddTokens.length >= maxTokensToAdd) {
          break;
        }
      }
      if (needAddTokens.length > 0) {
        await tokenBalancesController.updateBalancesWithBalances(selectedAddress, type, needAddTokenBalances);
        await assetsController.addTokens(needAddTokens, chainId, selectedAddress, type);
      }
    } catch (e) {
      logDebug('leon.w@addTokenByTransactionHistory end: ', e);
    } finally {
      releaseLock();
    }
  }

  /**
   * Extension point called if and when this controller is composed
   * with other controllers using a ComposableController
   */
  onComposed() {
    super.onComposed();
    const transaction = this.context.TransactionController as TransactionController;
    transaction.subscribe(async ({ txChangedType, addressWithChanged }) => {
      if (bitAND(txChangedType, TokenTxChanged) === 0) {
        return;
      }
      safelyExecute(async () => {
        const type = transaction.getTxChangedType(txChangedType);
        if (this.networks[type]) {
          await this.addTokenByTransactionHistory(this.networks[type].state.provider.chainId, addressWithChanged);
        }
      }, true);
    }, ['txChangedType']);
  }
}

export default AssetsDetectionController;
