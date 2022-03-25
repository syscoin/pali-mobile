import EthQuery from 'eth-query';
import createMetamaskProvider from 'web3-provider-engine/zero';
import { Mutex } from 'async-mutex';
import BaseController from '../BaseController';
import BscConfig from '../BscConfig.json';
import { handleFetch, logInfo, logWarn, queryEIP1559Compatibility } from '../util';
import { NetworkConfig, NetworkState } from './NetworkController';

const mainnetRpcTarget = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',
  'https://bsc-dataseed2.defibit.io/',
  'https://bsc-dataseed3.defibit.io/',
  'https://bsc-dataseed4.defibit.io/',
  'https://bsc-dataseed2.ninicoin.io/',
  'https://bsc-dataseed3.ninicoin.io/',
  'https://bsc-dataseed4.ninicoin.io/',
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  'https://binance.ankr.com/',
  'https://rpc.ankr.com/bsc',
  'https://bscrpc.com',
  'https://bsc.mytokenpocket.vip',
  'https://binance.nodereal.io'
];

const mainChainId = '56';
export class BscNetworkController extends BaseController<NetworkConfig, NetworkState> {
  private ethQuery: any;

  private mutex = new Mutex();

  private mainRpcTarget: string | undefined;

  private block_number = 0;

  private target_rpc = '';

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
        logWarn('PPYang, BscNetworkController getEIP1559Compatibility e', e);
      });
    });
  }

  async checkRpcTargets() {
    return new Promise((resolve) => {
      const { rpcTarget, chainId, ticker } = this.state.provider;
      if (!this.ismainnet()) {
        this.initializeProvider(chainId, rpcTarget, ticker);
        resolve(true);
        return;
      }
      if (this.mainRpcTarget) {
        this.initializeProvider(chainId, this.mainRpcTarget, ticker);
        resolve(true);
        return;
      }
      this.mainRpcTarget = mainnetRpcTarget[mainnetRpcTarget.length - 1];
      mainnetRpcTarget.forEach((rpc) => {
        handleFetch(rpc, { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }) }).then((res: any) => {
          logInfo('PPYang checkRpcTargets for rpc: ', rpc, ' with result: ', res);
          try {
            if (res?.result) {
              if (Number(res.result) > this.block_number) {
                this.block_number = Number(res.result);
                this.target_rpc = rpc;
              }
            }
          } catch (e) {
            logInfo('PPYang checkRpcTargets fail for rpc: ', rpc, e);
          }
        }).catch((e) => {
          logInfo('PPYang checkRpcTargets fail for rpc:', rpc, e);
        });
      });
      setTimeout(() => {
        if (this.target_rpc) {
          this.mainRpcTarget = this.target_rpc;
        }
        logInfo('PPYang checkRpcTargets success for rpc:', this.mainRpcTarget);
        this.initializeProvider(chainId, this.mainRpcTarget, ticker);
        resolve(true);
      }, 5000);
    });
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
  name = 'BscNetworkController';

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
      provider: this.getProviderConfig('BSC Mainnet'),
      properties: {},
    };
    this.initialize();
  }

  getProviderConfig(type: string) {
    return {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      rpcTarget: BscConfig[type]?.provider?.rpcTarget,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      type: BscConfig[type]?.provider?.type,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      chainId: BscConfig[type]?.provider?.chainId,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ticker: BscConfig[type]?.provider?.ticker,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      nickname: BscConfig[type]?.provider?.nickname,
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

export default BscNetworkController;
