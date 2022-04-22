import BaseController, {BaseConfig, BaseState} from "../BaseController";
import {ChainType} from "../assets/TokenRatesController";
import { NetworkConfig } from "../Config";

export interface NetworkProperties {
  isEIP1559Compatible?: boolean;
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

/**
 * @type NetworkConfig
 *
 * Network controller configuration
 *
 * @property infuraProjectId - an Infura project ID
 * @property providerConfig - web3-provider-engine configuration
 */
export interface BaseNetworkConfig extends BaseConfig {
  infuraProjectId?: string;
  getProviderConfig: (chainId: string) => any;
  name: string
  chainType: ChainType;
}

/**
 * @type NetworkState
 *
 * Network controller state
 *
 * @property network - Network ID as per net_version
 * @property provider - RPC URL and network name provider settings
 */
export interface BaseNetworkState extends BaseState {
  network: string;
  provider: ProviderConfig;
  properties: { [chainId: string]: NetworkProperties };
}

export class BaseNetworkController<C extends BaseNetworkConfig, S extends BaseNetworkState> extends BaseController<C, S> {

  constructor(config: Partial<C> = {} as C, state: Partial<S> = {} as S) {
    super(config, state);
    // @ts-ignore
    const { provider } = this.getInitProvider(config.chainType);
    // @ts-ignore
    this.defaultState = { network: 'loading', provider, properties: {} };
    if (config.name) {
      this.name = config.name;
    }
    this.initialize();
  }

  protected refreshNetwork() {}

  setProviderType(type: string) {
    const { provider } = this.getNetworkConfigByType(type);
    // @ts-ignore
    this.update({ network: 'loading', provider });
    this.refreshNetwork();
  }

  getInitProvider(chainType: number) {
    const chainId = NetworkConfig[chainType].MainChainId
    const networkConfig = NetworkConfig[chainType].Networks;
    for (const i in networkConfig) {
      if (networkConfig[i].provider.chainId === chainId) {
        return networkConfig[i];
      }
    }
    return {};
  }

  getNetworkConfig(chainId: string) {
    const networkConfig = NetworkConfig[this.config.chainType].Networks;
    for (const i in networkConfig) {
      if (networkConfig[i].provider.chainId === chainId) {
        return networkConfig[i];
      }
    }
    return {};
  }

  getNetworkConfigByType(type: string) {
    const networkConfig = NetworkConfig[this.config.chainType].Networks;
    return networkConfig[type];
  }

  ismainnet() {
    return this.state.provider.chainId === NetworkConfig[this.config.chainType].MainChainId;
  }

  isLoading() {
    return this.state.network === 'loading';
  }

  getMainChainId() {
    return NetworkConfig[this.config.chainType].MainChainId;
  }

  getEIP1559Compatibility() {
    return this.state.properties[this.state.provider?.chainId]?.isEIP1559Compatible;
  }
}
