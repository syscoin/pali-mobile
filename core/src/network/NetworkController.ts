import EthQuery from 'eth-query';
import Subprovider from 'web3-provider-engine/subproviders/provider';
import createInfuraProvider from 'eth-json-rpc-infura/src/createProvider';
import createMetamaskProvider from 'web3-provider-engine/zero';
import { Mutex } from 'async-mutex';
import {handleFetch, isEtherscanAvailableAsync, logDebug, logInfo, queryEIP1559Compatibility} from '../util';
import {BaseNetworkController, BaseNetworkConfig, BaseNetworkState} from "./BaseNetworkController";

export class NetworkController extends BaseNetworkController<BaseNetworkConfig, BaseNetworkState> {
  private ethQuery: any;

  private mutex = new Mutex();

  provider: any;

  allCheckRpcTarget: { [chainId: string]: string } = {};

  constructor(config: Partial<BaseNetworkConfig>, state: Partial<BaseNetworkState>) {
    super(config, state);
  }

  private initializeProvider(
    chainId: string,
    rpcTarget?: string,
    ticker?: string,
    nickname?: string,
  ) {
    rpcTarget && this.setupStandardProvider(rpcTarget, chainId, ticker, nickname);
  }


  protected refreshNetwork() {
    if (this.state.network !== 'loading') {
      this.update({ network: 'loading' });
    }

    this.unRegisterProvider();

    const onComplete = () => {
      this.lookupNetwork();
      this.initEIP1559Compatibility().catch((e) => {
        logDebug('PPYang getEIP1559Compatibility e', e, this.name);
      });
    };

    const { rpcTarget, nickname, chainId, ticker } = this.state.provider;
    const { infuraType, rpcTargets } = chainId && this.getNetworkConfig(chainId);

    const normalCreate = () => {
      if (rpcTargets && rpcTargets.length) {
        this.checkRpcTargets(rpcTargets).then(onComplete);
      } else {
        this.initializeProvider(chainId, rpcTarget, ticker, nickname);
        onComplete();
      }
    }

    if (this.config.infuraProjectId && infuraType) {
      isEtherscanAvailableAsync().then((available) => {
        if (available) {
          this.setupInfuraProvider(infuraType, chainId);
          onComplete();
        } else {
          normalCreate();
        }
      });
      return;
    }
    normalCreate();
  }

  private unRegisterProvider() {
    this.provider = undefined;
    this.ethQuery = undefined;
  }

  async checkRpcTargets(rpcTargets: string[]) {
    return new Promise((resolve) => {
      const { chainId, ticker } = this.state.provider;

      if (this.allCheckRpcTarget[chainId]) {
        this.initializeProvider(chainId, this.allCheckRpcTarget[chainId], ticker);
        resolve(true);
        return;
      }
      let block_number = 0;
      let target_rpc = rpcTargets[rpcTargets.length - 1];
      rpcTargets.forEach((rpc) => {
        handleFetch(rpc, { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }) }).then((res: any) => {
          logInfo(this.name, ' checkRpcTargets for rpc: ', rpc, ' with result: ', res);
          try {
            if (res?.result) {
              if (Number(res.result) > block_number) {
                block_number = Number(res.result);
                target_rpc = rpc;
              }
            }
          } catch (e) {
            logInfo(this.name, 'checkRpcTargets fail for rpc: ', rpc, e);
          }
        }).catch((e) => {
          logInfo(this.name, 'checkRpcTargets fail for rpc:', rpc, e);
        });
      });
      setTimeout(() => {
        if (target_rpc) {
          this.allCheckRpcTarget[chainId] = target_rpc;
        }
        logInfo(this.name, ' checkRpcTargets success for rpc:', this.allCheckRpcTarget[chainId]);
        this.initializeProvider(chainId, this.allCheckRpcTarget[chainId], ticker);
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

  async initEIP1559Compatibility() {
    const chainId = this.state.provider?.chainId;
    if (!this.state.properties[chainId]?.isEIP1559Compatible) {
      const isEIP1559Compatible = await queryEIP1559Compatibility(this.ethQuery);
      logDebug(this.name, 'initEIP1559Compatibility isEIP1559Compatible:', isEIP1559Compatible, chainId);
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
