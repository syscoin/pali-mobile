import { Mutex } from 'async-mutex';
import BaseController from '../BaseController';
import TronConfig from '../TronConfig.json';
import { NetworkConfig, NetworkState } from './NetworkController';

const mainChainId = '123454321';
export class TronNetworkController extends BaseController<NetworkConfig, NetworkState> {
  private mutex = new Mutex();

  /**
   * Name of this controller used during composition
   */
  name = 'TronNetworkController';

  /**
   * Ethereum provider object for the current network
   */
  provider: any;

  private async refreshNetwork() {
    const releaseLock = await this.mutex.acquire();
    setTimeout(() => {
      this.update({ network: this.state.provider.chainId });
      releaseLock();
    }, 300);
  }

  /**
   * Creates a NetworkController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<NetworkConfig>, state?: Partial<NetworkState>) {
    super(config, state);
    const { provider } = this.tronNetworkConfig(mainChainId);
    this.defaultState = { network: 'loading', provider, properties: {} };
    this.initialize();
  }

  /**
   * Convenience method to update provider network type settings
   *
   * @param type - Human readable network name
   */
  setProviderType(type: string) {
    const { provider } = this.tronNetworkConfigByType(type);
    this.update({ network: 'loading', provider });
    this.provider = this.state.provider;
    this.refreshNetwork();
  }

  ismainnet() {
    return this.state.provider.chainId === mainChainId;
  }

  getMainChainId() {
    return mainChainId;
  }

  tronNetworkConfig(chainId: string) {
    const tronConfig: { [index: string]: any} = TronConfig;
    for (const i in tronConfig) {
      if (tronConfig[i].provider.chainId === chainId) {
        return tronConfig[i];
      }
    }
    return {};
  }

  tronNetworkConfigByType(type: string) {
    const tronConfig: { [index: string]: any} = TronConfig;
    return tronConfig[type];
  }
}

export default TronNetworkController;
