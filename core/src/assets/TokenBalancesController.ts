import { BN } from 'ethereumjs-util';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import util, {
  getTronAccountUrl,
  handleFetch,
  isRpcChainType,
  logDebug,
  safelyExecute,
  TRON_ENABLED,
} from '../util';
import PreferencesController from '../user/PreferencesController';
import TronNetworkController from '../network/TronNetworkController';
import KeyringController from '../keyring/KeyringController';
import { getControllerFromType } from '../ControllerUtils';
import AssetsController, { TokenChangedType } from './AssetsController';
import { ChainType, Token } from './TokenRatesController';
import TronContractController from './TronContractController';
import { BalanceMap } from './AssetsContractController';

/**
 * @type TokenBalancesConfig
 *
 * Token balances controller configuration
 *
 * @property interval - Polling interval used to fetch new token balances
 * @property tokens - List of tokens to track balances for
 */
export interface TokenBalancesConfig extends BaseConfig {
  interval: number;
  backgroundMode: boolean;
}

export interface TokenBalancesState extends BaseState {
  contractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  arbContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  opContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  bscContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  polygonContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  hecoContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  tronContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  avaxContractBalances: {[selectedAddress: string]: {[address: string]: BN}};
  rpcContractBalances: {[selectedAddress: string]: {[chainId: string]: {[address: string]: BN}}};
}

/**
 * Controller that passively polls on a set interval token balances
 * for tokens stored in the AssetsController
 */
export class TokenBalancesController extends BaseController<TokenBalancesConfig, TokenBalancesState> {
  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private polling_counter = 0;

  /**
   * Name of this controller used during composition
   */
  name = 'TokenBalancesController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['AssetsContractController', 'AssetsController'];

  /**
   * Creates a TokenBalancesController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<TokenBalancesConfig>, state?: Partial<TokenBalancesState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 180000,
      backgroundMode: false,
    };
    this.defaultState = {
      contractBalances: {},
      arbContractBalances: {},
      opContractBalances: {},
      bscContractBalances: {},
      polygonContractBalances: {},
      hecoContractBalances: {},
      tronContractBalances: {},
      avaxContractBalances: {},
      rpcContractBalances: {},
    };
    this.initialize();
  }

  rehydrate(state: Partial<TokenBalancesState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
  }

  /**
   * Starts a new polling interval
   *
   * @param interval - Polling interval used to fetch new token balances
   */
  async poll(interval?: number): Promise<void> {
    if (this.polling_counter > 1) {
      return;
    }
    this.polling_counter += 1;
    interval && this.configure({ interval }, false, false);
    this.handle && clearTimeout(this.handle);
    await this.refresh();
    this.polling_counter -= 1;
    if (this.polling_counter > 0) {
      return;
    }
    this.handle = setTimeout(() => {
      this.poll(this.config.interval);
    }, this.config.interval);
  }

  async refresh() {
    if (this.config.backgroundMode) {
      return;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    try {
      const start = Date.now();
      const intervals: number[] = [];

      const preferences = this.context.PreferencesController as PreferencesController;
      !preferences.isDisabledChain(selectedAddress, ChainType.Ethereum) &&
      await safelyExecute(() => this.updateBalances(selectedAddress));
      intervals.push(Date.now() - start);

      !preferences.isDisabledChain(selectedAddress, ChainType.Bsc) &&
      await safelyExecute(() => this.updateBalances(selectedAddress, ChainType.Bsc));
      intervals.push(Date.now() - start);

      !preferences.isDisabledChain(selectedAddress, ChainType.Polygon) &&
      await safelyExecute(() => this.updateBalances(selectedAddress, ChainType.Polygon));
      intervals.push(Date.now() - start);

      !preferences.isDisabledChain(selectedAddress, ChainType.Arbitrum) &&
      await safelyExecute(() => this.updateBalances(selectedAddress, ChainType.Arbitrum));
      intervals.push(Date.now() - start);

      !preferences.isDisabledChain(selectedAddress, ChainType.Optimism) &&
      await safelyExecute(() => this.updateBalances(selectedAddress, ChainType.Optimism));
      intervals.push(Date.now() - start);

      !preferences.isDisabledChain(selectedAddress, ChainType.Heco) &&
      await safelyExecute(() => this.updateBalances(selectedAddress, ChainType.Heco));
      intervals.push(Date.now() - start);

      !preferences.isDisabledChain(selectedAddress, ChainType.Avax) &&
      await safelyExecute(() => this.updateBalances(selectedAddress, ChainType.Avax));
      intervals.push(Date.now() - start);

      if (TRON_ENABLED) {
        !preferences.isDisabledChain(selectedAddress, ChainType.Tron) &&
        await safelyExecute(() => this.updateTronBalances(selectedAddress));

        await safelyExecute(() => this.detectTronTokens(selectedAddress));
        intervals.push(Date.now() - start);
      }

      const types = preferences.getEnabledRpcChains(selectedAddress);
      if (types?.length > 0) {
        for (const type of types) {
          await safelyExecute(() => this.updateBalances(selectedAddress, type));
          intervals.push(Date.now() - start);
        }
      }

      logDebug(`leon.w@${this.name} refresh: ${selectedAddress}, intervals=${intervals}`);
    } finally {
      releaseLock();
    }
  }

  async updateBalancesWithBalances(selectedAddress: string, chainType = ChainType.Ethereum, balances: BalanceMap = {}) {
    const releaseLock = await this.mutex.acquire();
    try {
      switch (chainType) {
        case ChainType.Ethereum: {
          const oldBalances = this.state.contractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.contractBalances[selectedAddress] = newBalances;
          this.update({ contractBalances: { ...this.state.contractBalances }});
          break;
        }
        case ChainType.Heco: {
          const oldBalances = this.state.hecoContractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.hecoContractBalances[selectedAddress] = newBalances;
          this.update({ hecoContractBalances: { ...this.state.hecoContractBalances }});
          break;
        }
        case ChainType.Arbitrum: {
          const oldBalances = this.state.arbContractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.arbContractBalances[selectedAddress] = newBalances;
          this.update({ arbContractBalances: { ...this.state.arbContractBalances }});
          break;
        }
        case ChainType.Optimism: {
          const oldBalances = this.state.opContractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.opContractBalances[selectedAddress] = newBalances;
          this.update({ opContractBalances: { ...this.state.opContractBalances }});
          break;
        }
        case ChainType.Bsc: {
          const oldBalances = this.state.bscContractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.bscContractBalances[selectedAddress] = newBalances;
          this.update({ bscContractBalances: { ...this.state.bscContractBalances }});
          break;
        }
        case ChainType.Polygon: {
          const oldBalances = this.state.polygonContractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.polygonContractBalances[selectedAddress] = newBalances;
          this.update({ polygonContractBalances: { ...this.state.polygonContractBalances }});
          break;
        }
        case ChainType.Avax: {
          const oldBalances = this.state.avaxContractBalances[selectedAddress] || {};
          const newBalances = { ...oldBalances, ...balances };
          this.state.avaxContractBalances[selectedAddress] = newBalances;
          this.update({ avaxContractBalances: { ...this.state.avaxContractBalances }});
          break;
        }
        default:
          break;
      }
    } finally {
      releaseLock();
    }
  }

  /**
   * Updates balances for all tokens
   *
   * @returns Promise resolving when this operation completes
   */
  async updateBalances(selectedAddress: string, chainType = ChainType.Ethereum) {
    if (this.disabled) {
      return;
    }
    const { chainId, contractController } = getControllerFromType(this.context, chainType);
    if (!contractController) {
      return;
    }
    const assets = this.context.AssetsController as AssetsController;
    const { allTokens } = assets.state;
    const tokens = allTokens[selectedAddress]?.[chainId] || [];
    const newContractBalances: { [address: string]: BN } = {};

    const tokensAddress = tokens.map((token) => token.address);
    tokensAddress.push('0x0');
    const balances = await contractController.getBalancesInSingleCall(selectedAddress, tokensAddress, true, chainId);
    for (const balancesKey in balances) {
        newContractBalances[balancesKey] = balances[balancesKey];
    }
    if (Object.keys(newContractBalances).length === 0) {
      return;
    }
    let oldBalances;
    switch (chainType) {
      case ChainType.Ethereum:
        oldBalances = this.state.contractBalances[selectedAddress] || {};
        break;
      case ChainType.Heco:
        oldBalances = this.state.hecoContractBalances[selectedAddress] || {};
        break;
      case ChainType.Arbitrum:
        oldBalances = this.state.arbContractBalances[selectedAddress] || {};
        break;
      case ChainType.Optimism:
        oldBalances = this.state.opContractBalances[selectedAddress] || {};
        break;
      case ChainType.Bsc:
        oldBalances = this.state.bscContractBalances[selectedAddress] || {};
        break;
      case ChainType.Polygon:
        oldBalances = this.state.polygonContractBalances[selectedAddress] || {};
        break;
      case ChainType.Avax:
        oldBalances = this.state.avaxContractBalances[selectedAddress] || {};
        break;
      default:
        if (isRpcChainType(chainType)) {
          oldBalances = this.state.rpcContractBalances[selectedAddress]?.[chainId] || {};
        } else {
          oldBalances = {};
        }
        break;
    }
    let needUpdate = Object.keys(newContractBalances).length !== Object.keys(oldBalances).length;
    if (!needUpdate) {
      for (const newContractBalancesKey in newContractBalances) {
        const balance = newContractBalances[newContractBalancesKey];
        const old = oldBalances[newContractBalancesKey];
        if (!old || balance.toString() !== old.toString()) {
          needUpdate = true;
          break;
        }
      }
    }

    if (needUpdate) {
      switch (chainType) {
        case ChainType.Ethereum:
          const contractBalances = { ...this.state.contractBalances };
          contractBalances[selectedAddress] = newContractBalances;
          this.update({ contractBalances });
          break;
        case ChainType.Arbitrum:
          const arbContractBalances = { ...this.state.arbContractBalances };
          arbContractBalances[selectedAddress] = newContractBalances;
          this.update({ arbContractBalances });
          break;
        case ChainType.Optimism:
          const opContractBalances = { ...this.state.opContractBalances };
          opContractBalances[selectedAddress] = newContractBalances;
          this.update({ opContractBalances });
          break;
        case ChainType.Polygon:
          const polygonContractBalances = { ...this.state.polygonContractBalances };
          polygonContractBalances[selectedAddress] = newContractBalances;
          this.update({ polygonContractBalances });
          break;
        case ChainType.Bsc:
          const bscContractBalances = { ...this.state.bscContractBalances };
          bscContractBalances[selectedAddress] = newContractBalances;
          this.update({ bscContractBalances });
          break;
        case ChainType.Heco:
          const hecoContractBalances = { ...this.state.hecoContractBalances };
          hecoContractBalances[selectedAddress] = newContractBalances;
          this.update({ hecoContractBalances });
          break;
        case ChainType.Avax:
          const avaxContractBalances = { ...this.state.avaxContractBalances };
          avaxContractBalances[selectedAddress] = newContractBalances;
          this.update({ avaxContractBalances });
          break;
        default:
          if (isRpcChainType(chainType)) {
            const rpcChainBalances = this.state.rpcContractBalances[selectedAddress] || {};
            rpcChainBalances[chainId] = { ...oldBalances, ...newContractBalances };
            this.update({ rpcContractBalances: { ...this.state.rpcContractBalances, [selectedAddress]: rpcChainBalances } });
          }
          break;
      }
    }
  }

  async updateTronBalances(selectedAddress: string) {
    if (this.disabled) {
      return;
    }
    const keyring_controller = this.context.KeyringController as KeyringController;
    const { state: { provider: { chainId } } } = this.context.TronNetworkController as TronNetworkController;
    const tron_address = keyring_controller.getTronAddress(selectedAddress);
    if (!tron_address) {
      return;
    }
    const result = await handleFetch(getTronAccountUrl(chainId, tron_address));
    if (!result || !result.success || !Array.isArray(result.data) || result.data.length === 0) {
      logDebug('leon.w@updateTronBalances: ', selectedAddress, result);
      return;
    }
    const newContractBalances: { [address: string]: BN } = {};
    newContractBalances['0x0'] = new BN(result.data[0].balance, 10);
    for (const trc20 of result.data[0].trc20) {
      for (const address in trc20) {
        newContractBalances[address] = new BN(trc20[address], 10);
      }
    }
    const tronContractBalances = { ...this.state.tronContractBalances };
    tronContractBalances[selectedAddress] = newContractBalances;
    this.update({ tronContractBalances });
  }

  async detectTronTokens(selectedAddress: string) {
    const tron_contract = this.context.TronContractController as TronContractController;
    const assets = this.context.AssetsController as AssetsController;
    const { state: { provider: { chainId } } } = this.context.TronNetworkController as TronNetworkController;
    const { allTokens, allIgnoredTokens } = assets.state;
    const tokens = allTokens[selectedAddress]?.[chainId] || [];
    const ignoredTokens = allIgnoredTokens[selectedAddress]?.[chainId] || [];
    const tronBalances = this.state.tronContractBalances[selectedAddress] || {};
    const needToAdd = Object.keys(tronBalances).filter((address) => address !== '0x0' &&
      !tokens.find((token) => token.address === address) &&
      !ignoredTokens.find((token) => token.address === address));
    const needAddTokens = [];
    for (const tokenAddress of needToAdd) {
      let decimals;
      let symbol;
      try {
        decimals = await tron_contract.getTokenDecimals(tokenAddress);
        symbol = await tron_contract.getAssetSymbol(tokenAddress);
        const newEntry: Token = {
          address: tokenAddress,
          symbol,
          decimals: Number(decimals),
        };
        needAddTokens.push(newEntry);
      } catch (e) {
        logDebug('leon.w@detectTronTokens: ', tokenAddress, e);
      }
    }
    if (needAddTokens.length > 0) {
      await assets.addTokens(needAddTokens, chainId, selectedAddress, ChainType.Tron);
    }
  }

  beforeOnComposed() {
    super.beforeOnComposed();
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { identities } = preferencesController.state;
    const contractBalances = this.state.contractBalances || {};
    Object.keys(contractBalances).forEach((address) => {
      if (!identities[address]) {
        delete contractBalances[address];
      }
    });
    const bscContractBalances = this.state.bscContractBalances || {};
    Object.keys(bscContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete bscContractBalances[address];
      }
    });
    const polygonContractBalances = this.state.polygonContractBalances || {};
    Object.keys(polygonContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete polygonContractBalances[address];
      }
    });
    const arbContractBalances = this.state.arbContractBalances || {};
    Object.keys(arbContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete arbContractBalances[address];
      }
    });
    const opContractBalances = this.state.opContractBalances || {};
    Object.keys(opContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete opContractBalances[address];
      }
    });
    const hecoContractBalances = this.state.hecoContractBalances || {};
    Object.keys(hecoContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete hecoContractBalances[address];
      }
    });
    const avaxContractBalances = this.state.avaxContractBalances || {};
    Object.keys(avaxContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete avaxContractBalances[address];
      }
    });
    const rpcContractBalances = this.state.rpcContractBalances || {};
    Object.keys(rpcContractBalances).forEach((address) => {
      if (!identities[address]) {
        delete rpcContractBalances[address];
      }
    });
  }

  onComposed() {
    super.onComposed();
    setTimeout(() => this.poll(), 10000);
    const preferences = this.context.PreferencesController as PreferencesController;
    preferences.subscribe(() => setTimeout(() => this.poll(), 100), ['selectedAddress']);
    const assets = this.context.AssetsController as AssetsController;
    assets.subscribe(({ tokenChangedType }) => {
      if (tokenChangedType !== TokenChangedType.NoChange) {
        setTimeout(() => this.poll(), 100);
      }
    }, ['allTokens']);
  }
}

export default TokenBalancesController;
