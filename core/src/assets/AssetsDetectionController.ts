import { toChecksumAddress } from 'ethereumjs-util';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import { bitAND, logDebug, safelyExecute } from '../util';
import TransactionController, { TxChangedType } from '../transaction/TransactionController';
import BscNetworkController from '../network/BscNetworkController';
import NetworkController from '../network/NetworkController';
import PolygonNetworkController from '../network/PolygonNetworkController';
import ArbNetworkController from '../network/ArbNetworkController';
import { getContractController, getStaticTokenByChainId } from '../ControllerUtils';
import HecoNetworkController from '../network/HecoNetworkController';
import OpNetworkController from '../network/OpNetworkController';
import { Sqlite } from '../transaction/Sqlite';
import AvaxNetworkController from '../network/AvaxNetworkController';
import SyscoinNetworkController from '../network/SyscoinNetworkController';
import { ChainType, Token } from './TokenRatesController';
import AssetsController from './AssetsController';
import ArbContractController from './ArbContractController';
import TokenBalancesController from './TokenBalancesController';
import { BalanceMap } from './AssetsContractController';

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
  requiredControllers = ['AssetsContractController', 'AssetsController', 'NetworkController', 'PreferencesController', 'TransactionController'];

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
    await safelyExecute(async () => {
      const network = this.context.NetworkController as NetworkController;
      await this.addTokenByTransactionHistory(network.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const bscNetwork = this.context.BscNetworkController as BscNetworkController;
      await this.addTokenByTransactionHistory(bscNetwork.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const polygonNetwork = this.context.PolygonNetworkController as PolygonNetworkController;
      await this.addTokenByTransactionHistory(polygonNetwork.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
      await this.addTokenByTransactionHistory(arbNetwork.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const opNetwork = this.context.OpNetworkController as OpNetworkController;
      await this.addTokenByTransactionHistory(opNetwork.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
      await this.addTokenByTransactionHistory(hecoNetwork.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
      await this.addTokenByTransactionHistory(avaxNetwork.state.provider.chainId, selectedAddress);
    });
    await safelyExecute(async () => {
      const syscoinNetwork = this.context.SyscoinNetworkController as SyscoinNetworkController;
      await this.addTokenByTransactionHistory(syscoinNetwork.state.provider.chainId, selectedAddress);
    });
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
      const { type, contractController } = getContractController(this.context, chainId);
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
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    const polygonNetwork = this.context.PolygonNetworkController as PolygonNetworkController;
    const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
    const opNetwork = this.context.OpNetworkController as OpNetworkController;
    const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
    const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
    const syscoinNetwork = this.context.SyscoinNetworkController as SyscoinNetworkController;
    const network = this.context.NetworkController as NetworkController;
    transaction.subscribe(async ({ txChangedType, addressWithChanged }) => {
      safelyExecute(async () => {
        if (bitAND(txChangedType, TxChangedType.TokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(network.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.BscTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(bscNetwork.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.PolygonTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(polygonNetwork.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.ArbTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(arbNetwork.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.OpTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(opNetwork.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.HecoTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(hecoNetwork.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.AvaxTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(avaxNetwork.state.provider.chainId, addressWithChanged);
        } else if (bitAND(txChangedType, TxChangedType.SyscoinTokenTxChanged) !== 0) {
          await this.addTokenByTransactionHistory(syscoinNetwork.state.provider.chainId, addressWithChanged);
        }
      }, true);
    });
  }
}

export default AssetsDetectionController;
