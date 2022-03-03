import EthQuery from 'eth-query';
import createMetamaskProvider from 'web3-provider-engine/zero';
import { Mutex } from 'async-mutex';
import BaseController from '../BaseController';
import HecoConfig from '../HecoConfig.json';
import { logInfo, logWarn, queryEIP1559Compatibility, safelyExecuteWithTimeout } from '../util';
import { NetworkConfig, NetworkState } from './NetworkController';

const mainnetRpcTarget = [
  'https://http-mainnet-node.huobichain.com',
  'https://http-mainnet.hecochain.com',
];

const mainChainId = '128';
export class HecoNetworkController extends BaseController<NetworkConfig, NetworkState> {
  private ethQuery: any;

  private mutex = new Mutex();

  private mainRpcTarget: string | undefined;

  private initializeProvider(
    chainId: string,
    rpcTarget?: string,
    ticker?: string,
    nickname?: string,
  ) {
    rpcTarget && this.setupStandardProvider(rpcTarget, chainId, ticker, nickname);
  }

  private refreshNetwork() {
    if (this.state.network !== 'loading') {
      this.update({ network: 'loading' });
    }
    this.unRegisterProvider();
    this.checkRpcTargets().then(() => {
      this.lookupNetwork();
      this.initEIP1559Compatibility().catch((e) => {
        logWarn('PPYang, HecoNetworkController getEIP1559Compatibility e', e);
      });
    });
  }

  async checkRpcTargets() {
    const { rpcTarget, chainId, ticker } = this.state.provider;
    let tempRpcTarget = rpcTarget;
    if (this.ismainnet()) {
      if (!this.mainRpcTarget) {
        await safelyExecuteWithTimeout(async () => {
          this.mainRpcTarget = await Promise.race(mainnetRpcTarget.map((rpc) => {
            return new Promise<string>((resolve) => {
              fetch(rpc).then(() => {
                resolve(rpc);
              }).catch(() => {
                logInfo('PPYang checkRpcTargets fail for rpc:', rpc);
              });
            });
          }));
        }, false, 5000);
      }
      logInfo('PPYang HecoNetworkController rpcTarget:', this.mainRpcTarget);
      tempRpcTarget = this.mainRpcTarget || tempRpcTarget;
    }
    this.initializeProvider(chainId, tempRpcTarget, ticker);
  }

  private registerProvider() {
    if (!this.provider) {
      return;
    }
    this.provider.on('error', this.verifyNetwork.bind(this));
    this.provider.on('latest', this.verifyNetwork.bind(this));
    this.ethQuery = new EthQuery(this.provider);
  }

  private unRegisterProvider() {
    this.provider = undefined;
    this.ethQuery = undefined;
  }

  private setupStandardProvider(rpcTarget: string, chainId: string, ticker?: string, nickname?: string) {
    const providerConfig = this.config.getProviderConfig(chainId);
    const config = {
      ...providerConfig,
      ...{
        chainId,
        engineParams: { pollingInterval: 12000 },
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
  name = 'HecoNetworkController';

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
      provider: this.getProviderConfig('Heco Mainnet'),
      properties: {},
    };
    this.initialize();
  }

  getProviderConfig(type: string) {
    return {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      rpcTarget: HecoConfig[type]?.provider?.rpcTarget,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      type: HecoConfig[type]?.provider?.type,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      chainId: HecoConfig[type]?.provider?.chainId,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ticker: HecoConfig[type]?.provider?.ticker,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      nickname: HecoConfig[type]?.provider?.nickname,
    };
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

  /**
   * Convenience method to update provider network type settings
   *
   * @param type - Human readable network name
   */
  setProviderType(type: string) {
    this.update({
      network: 'loading',
      provider: this.getProviderConfig(type),
    });
    this.refreshNetwork();
  }

  ismainnet() {
    return this.state.provider.chainId === mainChainId;
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
      if (isEIP1559Compatible) {
        const subProperties = this.state.properties[chainId] || {};
        subProperties.isEIP1559Compatible = isEIP1559Compatible;
        const properties = { ...this.state.properties, [chainId]: subProperties };
        this.update({ properties });
      }
    }
  }
}

export default HecoNetworkController;
