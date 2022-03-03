import EthQuery from 'eth-query';
import Subprovider from 'web3-provider-engine/subproviders/provider';
import createInfuraProvider from 'eth-json-rpc-infura/src/createProvider';
import createMetamaskProvider from 'web3-provider-engine/zero';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { logDebug, logWarn, queryEIP1559Compatibility } from '../util';

export function getNetworkType(chainId: string) {
  switch (chainId) {
    case '1': return 'mainnet';
    case '42': return 'kovan';
    case '4': return 'rinkeby';
    case '5': return 'goerli';
    case '3': return 'ropsten';
    default: return '';
  }
}

export function getNetworkChainId(networkType: string) {
  switch (networkType) {
    case 'mainnet': return '1';
    case 'kovan': return '42';
    case 'rinkeby': return '4';
    case 'goerli': return '5';
    case 'ropsten': return '3';
    default: break;
  }
  return '';
}

/**
 * @type ProviderConfig
 *
 * Configuration passed to web3-provider-engine
 *
 * @param rpcTarget? - RPC target URL
 * @param type - Human-readable network name
 * @param chainId? - Network ID as per EIP-155
 * @param ticker? - Currency ticker
 * @param nickname? - Personalized network name
 */
export interface ProviderConfig {
  rpcTarget?: string;
  type: string;
  chainId: string;
  ticker?: string;
  nickname?: string;
}

export interface Block {
  baseFeePerGas?: string;
}

export interface NetworkProperties {
  isEIP1559Compatible?: boolean;
}

/**
 * @type NetworkConfig
 *
 * Network controller configuration
 *
 * @property infuraProjectId - an Infura project ID
 * @property providerConfig - web3-provider-engine configuration
 */
export interface NetworkConfig extends BaseConfig {
  infuraProjectId?: string;
  getProviderConfig: (chainId: string) => any;
}

/**
 * @type NetworkState
 *
 * Network controller state
 *
 * @property network - Network ID as per net_version
 * @property provider - RPC URL and network name provider settings
 */
export interface NetworkState extends BaseState {
  network: string;
  provider: ProviderConfig;
  properties: { [chainId: string]: NetworkProperties };
}

const LOCALHOST_RPC_URL = 'http://localhost:8545';

const mainChainId = '1';
export class NetworkController extends BaseController<NetworkConfig, NetworkState> {
  private ethQuery: any;

  private mutex = new Mutex();

  private initializeProvider(
    type: string,
    chainId: string,
    rpcTarget?: string,
    ticker?: string,
    nickname?: string,
  ) {
    switch (type) {
      case 'kovan':
      case 'mainnet':
      case 'rinkeby':
      case 'goerli':
      case 'ropsten':
        this.setupInfuraProvider(type, chainId);
        break;
      case 'localhost':
        this.setupStandardProvider(LOCALHOST_RPC_URL, chainId);
        break;
      case 'rpc':
        rpcTarget && this.setupStandardProvider(rpcTarget, chainId, ticker, nickname);
        break;
      default:
        throw new Error(`Unrecognized network type: '${type}'`);
    }
  }

  private refreshNetwork() {
    if (this.state.network !== 'loading') {
      this.update({ network: 'loading' });
    }
    const { rpcTarget, type, chainId, ticker } = this.state.provider;
    this.initializeProvider(type, chainId, rpcTarget, ticker);
    this.lookupNetwork();
    this.initEIP1559Compatibility().catch((e) => {
      logWarn('PPYang getEIP1559Compatibility e', e);
    });
  }

  private registerProvider() {
    this.provider.on('error', this.verifyNetwork.bind(this));
    this.provider.on('latest', this.verifyNetwork.bind(this));
    this.ethQuery = new EthQuery(this.provider);
  }

  private setupInfuraProvider(type: string, chainId: string) {
    const infuraProvider = createInfuraProvider({ network: type, projectId: this.config.infuraProjectId });
    const infuraSubprovider = new Subprovider(infuraProvider);
    const providerConfig = this.config.getProviderConfig(chainId);
    const config = {
      ...providerConfig,
      ...{
        dataSubprovider: infuraSubprovider,
        engineParams: {
          blockTrackerProvider: infuraProvider,
          pollingInterval: 30000,
        },
      },
    };
    this.updateProvider(createMetamaskProvider(config));
  }

  private setupStandardProvider(rpcTarget: string, chainId: string, ticker?: string, nickname?: string) {
    const providerConfig = this.config.getProviderConfig(chainId);
    const config = {
      ...providerConfig,
      ...{
        chainId,
        engineParams: { pollingInterval: 30000 },
        nickname,
        rpcUrl: rpcTarget,
        ticker,
      },
    };
    this.updateProvider(createMetamaskProvider(config));
  }

  private updateProvider(provider: any) {
    this.safelyStopProvider(this.provider);
    this.provider = provider;
    this.registerProvider();
  }

  private safelyStopProvider(provider: any) {
    setTimeout(() => {
      provider?.stop();
    }, 500);
  }

  private verifyNetwork() {
    this.state.network === 'loading' && this.lookupNetwork();
  }

  /**
   * Name of this controller used during composition
   */
  name = 'NetworkController';

  /**
   * Ethereum provider object for the current network
   */
  provider: any;

  /**
   * Creates a NetworkController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<NetworkConfig>, state?: Partial<NetworkState>) {
    super(config, state);
    this.defaultState = {
      network: 'loading',
      provider: { type: 'mainnet', ticker: 'ETH', chainId: mainChainId, rpcTarget: this.getInfuraUrl('mainnet', config?.infuraProjectId) },
      properties: {},
    };
    this.initialize();
  }

  /**
   * Refreshes the current network code
   */
  async lookupNetwork() {
    /* istanbul ignore if */
    if (!this.ethQuery || !this.ethQuery.sendAsync) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    if (this.ethQuery) {
      this.ethQuery.sendAsync({ method: 'net_version' }, (error: Error, network: string) => {
        this.update({ network: error ? /* istanbul ignore next*/ 'loading' : network });
        releaseLock();
      });
    } else {
      releaseLock();
    }
  }

  private getInfuraUrl(type: string, infuraProjectId?: string) {
    return `https://${type}.infura.io/v3/${infuraProjectId}`;
  }

  /**
   * Convenience method to update provider network type settings
   *
   * @param type - Human readable network name
   */
  setProviderType(type: string) {
    this.update({
      network: 'loading',
      provider: {
        ...{ type, ticker: 'ETH', chainId: getNetworkChainId(type), rpcTarget: this.getInfuraUrl(type, this.config.infuraProjectId) },
      },
    });
    this.refreshNetwork();
  }

  ismainnet() {
    return this.state.provider.chainId === mainChainId;
  }

  isLoading() {
    return this.state.network === 'loading';
  }

  getMainChainId() {
    return mainChainId;
  }

  getEIP1559Compatibility() {
    return this.state.properties[this.state.provider?.chainId]?.isEIP1559Compatible;
  }

  async initEIP1559Compatibility() {
    const chainId = this.state.provider?.chainId;
    if (!this.state.properties[chainId]?.isEIP1559Compatible) {
      const isEIP1559Compatible = await queryEIP1559Compatibility(this.ethQuery);
      logDebug('PPYang initEIP1559Compatibility isEIP1559Compatible:', isEIP1559Compatible, chainId);
      if (isEIP1559Compatible) {
        const subProperties = this.state.properties[chainId] || {};
        subProperties.isEIP1559Compatible = isEIP1559Compatible;
        const properties = { ...this.state.properties, [chainId]: subProperties };
        this.update({ properties });
      }
    }
  }
}

export default NetworkController;
