import { BN } from 'ethereumjs-util';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import util, { getTronAccountUrl, handleFetch, logDebug, safelyExecute, safelyExecuteWithTimeout } from '../util';
import PreferencesController from '../user/PreferencesController';
import TronNetworkController from '../network/TronNetworkController';
import KeyringController from '../keyring/KeyringController';
import { getControllerFromType } from '../ControllerUtils';
import AssetsController, { TokenNoChange } from './AssetsController';
import { Token } from './TokenRatesController';
import TronContractController from './TronContractController';
import { BalanceMap } from './AssetsContractController';
import { NetworkConfig, ChainType } from '../Config';

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
  intervalRollux: number;
  backgroundMode: boolean;
}

export interface TokenBalancesState extends BaseState {
  allContractBalances: { [selectedAddress: string]: { [chainType: number]: { [address: string]: BN } } };
}

/**
 * Controller that passively polls on a set interval token balances
 * for tokens stored in the AssetsController
 */
export class TokenBalancesController extends BaseController<TokenBalancesConfig, TokenBalancesState> {
  private handle?: NodeJS.Timer;
  private handleRollux?: NodeJS.Timer;
  private mutex = new Mutex();
  private mutexRollux = new Mutex();

  private polling_counter = 0;
  private polling_counterRollux = 0;

  /**
   * Name of this controller used during composition
   */
  name = 'TokenBalancesController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['AssetsController'];

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
      intervalRollux: 180000,
      backgroundMode: false,
    };
    this.defaultState = {
      allContractBalances: {},
    };
    this.initialize();
  }

  rehydrate(state: Partial<TokenBalancesState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
  }

  /**
   * Starts a new polling interval for both rollux and other networks.
   */
  async pollAll() {
    this.poll();
    this.pollRollux();
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

  /**
   * Starts a new polling interval
   *
   * @param interval - Polling interval used to fetch new token balances
   */
  async pollRollux(interval?: number): Promise<void> {
    if (this.polling_counterRollux > 1) {
      return;
    }
    this.polling_counterRollux += 1;
    interval && this.configure({ intervalRollux: interval }, false, false);
    this.handleRollux && clearTimeout(this.handleRollux);
    await this.refreshRolluxTokens();
    this.polling_counterRollux -= 1;
    if (this.polling_counterRollux > 0) {
      return;
    }
    this.handleRollux = setTimeout(() => {
      this.pollRollux(this.config.intervalRollux);
    }, this.config.intervalRollux);
  }

  async refreshRolluxTokens() {
    if (this.config.backgroundMode) {
      return;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }

    const releaseLock = await this.mutexRollux.acquire();
    try {
      const start = Date.now();
      const intervals: number[] = [];

      const preferences = this.context.PreferencesController as PreferencesController;

      for (const type in NetworkConfig) {
        const chainType = Number(type);
        if (NetworkConfig[chainType].Disabled) {
          continue;
        }
        if (chainType === ChainType.Tron) {
          !preferences.isDisabledChain(selectedAddress, ChainType.Tron) &&
            (await safelyExecute(() => this.updateTronBalances(selectedAddress)));

          await safelyExecute(() => this.detectTronTokens(selectedAddress));
        } else {
          //Just Updates rollux tokens
          if (!preferences.isDisabledChain(selectedAddress, chainType) && chainType === ChainType.Rollux) {
            await safelyExecute(() => this.updateBalances(selectedAddress, chainType));
          }
        }
        intervals.push(Date.now() - start);
      }
      const types = preferences.getEnabledRpcChains(selectedAddress);
      if (types?.length > 0) {
        for (const type of types) {
          //Just Updates rollux tokens
          if (type === ChainType.Rollux) {
            await safelyExecute(() => this.updateBalances(selectedAddress, type));
            intervals.push(Date.now() - start);
          }
        }
      }

      logDebug(`leon.w@${this.name} refresh: ${selectedAddress}, intervals=${intervals}`);
    } finally {
      releaseLock();
    }
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

      for (const type in NetworkConfig) {
        const chainType = Number(type);
        if (NetworkConfig[chainType].Disabled) {
          continue;
        }
        if (chainType === ChainType.Tron) {
          !preferences.isDisabledChain(selectedAddress, ChainType.Tron) &&
            (await safelyExecute(() => this.updateTronBalances(selectedAddress)));

          await safelyExecute(() => this.detectTronTokens(selectedAddress));
        } else {
          //Updates other tokens besides Rollux
          if (!preferences.isDisabledChain(selectedAddress, chainType) && chainType !== ChainType.Rollux) {
            await safelyExecute(() => this.updateBalances(selectedAddress, chainType));
          }
        }
        intervals.push(Date.now() - start);
      }
      const types = preferences.getEnabledRpcChains(selectedAddress);
      if (types?.length > 0) {
        for (const type of types) {
          //Updates other tokens besides Rollux
          if (type !== ChainType.Rollux) {
            await safelyExecute(() => this.updateBalances(selectedAddress, type));
            intervals.push(Date.now() - start);
          }
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
      const oldAddressBalances = this.state.allContractBalances[selectedAddress] || {};
      const oldBalances = oldAddressBalances[chainType] || {};
      oldAddressBalances[chainType] = { ...oldBalances, ...balances };
      this.state.allContractBalances[selectedAddress] = oldAddressBalances;
      this.update({ allContractBalances: { ...this.state.allContractBalances } });
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
    const { chainId, contractController } = getControllerFromType(this, chainType);
    if (!contractController) {
      return;
    }
    const assets = this.context.AssetsController as AssetsController;
    const { allTokens } = assets.state;
    const tokens = allTokens[selectedAddress]?.[chainId] || [];
    const newContractBalances: { [address: string]: BN } = {};

    const tokensAddress = tokens.map((token) => token.address);
    tokensAddress.push('0x0');
    let balances = await safelyExecuteWithTimeout(
      async () => await contractController.getBalancesInSingleCall(selectedAddress, tokensAddress, true, chainId),
      true,
      40000,
    );
    if (!balances) {
      return;
    }
    for (const balancesKey in balances) {
      newContractBalances[balancesKey] = balances[balancesKey];
    }
    if (Object.keys(newContractBalances).length === 0) {
      return;
    }
    const oldBalances = this.state.allContractBalances[selectedAddress]?.[chainType] || {};
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
      const typeBalances = this.state.allContractBalances[selectedAddress] || {};
      typeBalances[chainType] = newContractBalances;
      this.update({ allContractBalances: { ...this.state.allContractBalances, [selectedAddress]: typeBalances } });
    }
  }

  async updateTronBalances(selectedAddress: string) {
    if (this.disabled) {
      return;
    }
    const keyring_controller = this.context.KeyringController as KeyringController;
    const {
      state: {
        provider: { chainId },
      },
    } = this.context.TronNetworkController as TronNetworkController;
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

    const typeBalances = this.state.allContractBalances[selectedAddress] || {};
    typeBalances[ChainType.Tron] = newContractBalances;
    this.update({ allContractBalances: { ...this.state.allContractBalances, [selectedAddress]: typeBalances } });
  }

  async detectTronTokens(selectedAddress: string) {
    const tron_contract = this.context.TronContractController as TronContractController;
    const assets = this.context.AssetsController as AssetsController;
    const {
      state: {
        provider: { chainId },
      },
    } = this.context.TronNetworkController as TronNetworkController;
    const { allTokens, allIgnoredTokens } = assets.state;
    const tokens = allTokens[selectedAddress]?.[chainId] || [];
    const ignoredTokens = allIgnoredTokens[selectedAddress]?.[chainId] || [];
    const tronBalances = this.state.allContractBalances[selectedAddress]?.[ChainType.Tron] || {};
    const needToAdd = Object.keys(tronBalances).filter(
      (address) =>
        address !== '0x0' &&
        !tokens.find((token) => token.address === address) &&
        !ignoredTokens.find((token) => token.address === address),
    );
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
    const contractBalances = this.state.allContractBalances || {};
    Object.keys(contractBalances).forEach((address) => {
      if (!identities[address]) {
        delete contractBalances[address];
      }
    });
  }

  onComposed() {
    super.onComposed();
    setTimeout(() => this.poll(), 10000);
    setTimeout(() => this.pollRollux(), 10000);
    const preferences = this.context.PreferencesController as PreferencesController;
    preferences.subscribe(() => setTimeout(() => this.poll(), 100), ['selectedAddress']);
    preferences.subscribe(() => setTimeout(() => this.pollRollux(), 100), ['selectedAddress']);
    const assets = this.context.AssetsController as AssetsController;
    assets.subscribe(
      ({ tokenChangedType }) => {
        if (tokenChangedType !== TokenNoChange) {
          setTimeout(() => this.poll(), 100);
          setTimeout(() => this.pollRollux(), 100);
        }
      },
      ['allTokens'],
    );
  }
}

export default TokenBalancesController;
