import EthQuery from 'eth-query';
import createMetamaskProvider from 'web3-provider-engine/zero';
import { Mutex } from 'async-mutex';
import createInfuraProvider from 'eth-json-rpc-infura/src/createProvider';
import Subprovider from 'web3-provider-engine/subproviders/provider';
import BaseController from '../BaseController';
import ArbConfig from '../ArbConfig.json';
import { logDebug, logWarn, queryEIP1559Compatibility } from '../util';
import { NetworkConfig, NetworkState } from './NetworkController';

const mainChainId = '42161';
export class ArbNetworkController extends BaseController<NetworkConfig, NetworkState> {
  private ethQuery: any;

  private mutex = new Mutex();

  private useOffchainEndPoint = false;

  private initializeProvider(
    chainId: string,
    rpcTarget?: string,
    ticker?: string,
    nickname?: string,
  ) {
    const { infuraType } = chainId && this.arbNetworkConfig(chainId);
    if (this.config.infuraProjectId && infuraType && !this.useOffchainEndPoint) {
      this.setupInfuraProvider(infuraType, chainId);
      return;
    }
    logDebug(`leon.w@${this.name}: useOffchainEndPoint`);
    rpcTarget && this.setupStandardProvider(rpcTarget, chainId, ticker, nickname);
  }

  private refreshNetwork(useOffchainEndPoint = false) {
    this.useOffchainEndPoint = useOffchainEndPoint;
    if (this.state.network !== 'loading') {
      this.update({ network: 'loading' });
    }
    const { rpcTarget, chainId, ticker, nickname } = this.state.provider;
    this.unRegisterProvider();
    this.initializeProvider(chainId, rpcTarget, ticker, nickname);
    this.lookupNetwork();
    this.initEIP1559Compatibility().catch((e) => {
      logWarn('PPYang, ArbNetworkController getEIP1559Compatibility e', e);
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

  name = 'ArbNetworkController';

  provider: any;

  constructor(config?: Partial<NetworkConfig>, state?: Partial<NetworkState>) {
    super(config, state);
    const { provider } = this.arbNetworkConfig(mainChainId);
    this.defaultState = { network: 'loading', provider, properties: {} };
    this.initialize();
  }

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

  setProviderType(type: string) {
    const { provider } = this.arbNetworkConfigByType(type);
    this.update({ network: 'loading', provider });
    this.refreshNetwork(this.useOffchainEndPoint);
  }

  ismainnet() {
    return this.state.provider.chainId === mainChainId;
  }

  getMainChainId() {
    return mainChainId;
  }

  arbNetworkConfig(chainId: string) {
    const arbConfig: { [index: string]: any} = ArbConfig;
    for (const i in arbConfig) {
      if (arbConfig[i].provider.chainId === chainId) {
        return arbConfig[i];
      }
    }
    return {};
  }

  arbNetworkConfigByType(type: string) {
    const arbConfig: { [index: string]: any} = ArbConfig;
    return arbConfig[type];
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

export default ArbNetworkController;
