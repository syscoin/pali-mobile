import createMetamaskProvider from 'web3-provider-engine/zero';
import EthQuery from 'eth-query';
import BigNumber from 'bignumber.js';
import BaseController, { BaseState } from '../BaseController';
import { ChainType } from "../Config";
import RpcContractController from '../assets/RpcContractController';
import PreferencesController from '../user/PreferencesController';
import { handleFetch, logDebug, safelyExecuteWithTimeout } from '../util';
import { BaseNetworkConfig, BaseNetworkState } from './BaseNetworkController';

export interface RpcNetworkState extends BaseNetworkState {
  explorerUrl: string;
  chainType: number;
}

export interface RcpNetworkState extends BaseState {
  networks: { [chainType: number]: RpcNetworkState };
}

export class RpcNetworkController extends BaseController<BaseNetworkConfig, RcpNetworkState> {
  /**
   * Name of this controller used during composition
   */
  name = 'RpcNetworkController';

  /**
   * Ethereum provider object for the current network
   */
  providers: { [chainType: number]: any } = {};

  allEthQuery: { [chainType: number]: any } = {};

  /**
   * Creates a NetworkController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<BaseNetworkConfig>, state?: Partial<RcpNetworkState>) {
    super(config, state);
    this.defaultState = {
      networks: {},
    };
    this.initialize();
  }

  beforeOnComposed() {
    if (this.state.networks) {
      const preferences = this.context.PreferencesController as PreferencesController;
      for (const type in this.state.networks) {
        const chainType = Number(type);
        preferences.updateAllChains(chainType);
      }
      console.log('PPYang allChains:', preferences.state.allChains);
    }
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
    return createMetamaskProvider(config);
  }

  private safelyStopProvider(provider: any) {
    setTimeout(() => {
      provider?.stop();
    }, 500);
  }

  private updateProvider(chainType: number, provider: any) {
    this.safelyStopProvider(this.providers[chainType]);
    this.providers[chainType] = provider;
    this.registerProvider(chainType, provider);
  }

  private registerProvider(chainType: number, provider: any) {
    provider.on('error', this.verifyNetwork.bind(this, chainType));
    provider.on('latest', this.verifyNetwork.bind(this, chainType));
  }

  private verifyNetwork(chainType: number) {
    const ethQuery = this.allEthQuery[chainType];
    if (!ethQuery) {
      return;
    }
    this.state.networks[chainType]?.network === 'loading' && this.lookupNetwork(ethQuery).then((result) => {
      this.state.networks[chainType].network = result || 'loading';
      this.update({ networks: { ...this.state.networks } });
    });
  }

  /**
   * Refreshes the current network code
   */
  async lookupNetwork(ethQuery: any): Promise<null | string> {
    if (!ethQuery || !ethQuery.sendAsync) {
      return null;
    }
    return new Promise<null | string>(((resolve) => {
      ethQuery.sendAsync({ method: 'net_version' }, (error: Error, network: string) => {
        if (error) {
          resolve(null);
        } else {
          resolve(network);
        }
      });
    }));
  }

  refreshNetwork() {
    const types = Object.keys(this.state.networks);
    for (const type of types) {
      const chainType = Number(type);
      const { rpcTarget, chainId, ticker, nickname } = this.state.networks[chainType].provider;
      const provider = rpcTarget && this.setupStandardProvider(rpcTarget, chainId, ticker, nickname);
      const ethQuery = new EthQuery(provider);
      this.allEthQuery[chainType] = ethQuery;
      const rpcContract = this.context.RpcContractController as RpcContractController;
      rpcContract.addContract(chainType, provider, chainId);
      this.updateProvider(chainType, provider);
      this.lookupNetwork(ethQuery);
    }
  }

  async checkRpcTarget(rpcTarget: string): Promise<string | undefined> {
    return await safelyExecuteWithTimeout(async () => {
      return await new Promise((resolve) => {
        handleFetch(rpcTarget, {
          method: 'POST',
          body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'net_version', params: [] }),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }).then((res: any) => {
          resolve(res.result);
        }).catch((e) => {
          logDebug('PPYang checkRpcTarget e:', e);
          resolve(undefined);
        });
      });
    }, true, 15000);
  }

  async addNetwork(nickname: string, rpcTarget: string, chainId: string, ticker: string, explorerUrl: string) {
    if (!rpcTarget || !rpcTarget.startsWith('http')) {
      throw new Error('Wrong URL');
    }

    const keys = Object.keys(this.state.networks);
    for (const chainType of keys) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (rpcTarget === this.state.networks[chainType].provider?.rpcTarget) {
        throw new Error('Chain already exists');
      }
    }
    // 16进制或者10进制都转化成10进制
    const bnChainId = new BigNumber(chainId, 10);
    if (bnChainId.isNaN() || bnChainId.isZero() || bnChainId.isLessThan(0)) {
      throw new Error('Wrong Chain ID');
    }
    chainId = bnChainId.toString(10);
    const chainType = ChainType.RPCBase + bnChainId.toNumber();
    if (this.state.networks[chainType]) {
      throw new Error('Chain already exists');
    }

    const network = await this.checkRpcTarget(rpcTarget);
    if (!network) {
      throw new Error(`RPC node not responding`);
    }

    if (!bnChainId.eq(new BigNumber(network, 10))) {
      throw new Error('Wrong Chain ID');
    }
    const provider = this.setupStandardProvider(rpcTarget, chainId, ticker, nickname);
    const ethQuery = new EthQuery(provider);
    this.state.networks[chainType] = {
      chainType,
      network,
      explorerUrl,
      provider: {
        rpcTarget,
        type: 'rpc',
        chainId,
        ticker,
        nickname,
      },
      properties: {},
    };
    this.allEthQuery[chainType] = ethQuery;
    const rpcContract = this.context.RpcContractController as RpcContractController;
    rpcContract.addContract(chainType, provider, chainId);
    this.updateProvider(chainType, provider);
    this.update({ networks: { ...this.state.networks } });
    return chainType;
  }

  removeNetwork(chainType: number) {
    if (this.state.networks[chainType]) {
      delete this.state.networks[chainType];
      this.safelyStopProvider(this.providers[chainType]);
      delete this.providers[chainType];
      delete this.allEthQuery[chainType];
      this.update({ networks: { ...this.state.networks } });
      return true;
    }
    return false;
  }

  // 添加资产的时候检查一下网络
  async checkNetwork(chainType: number) {
    const ethQuery = this.allEthQuery[chainType];
    if (!ethQuery) {
      return false;
    }
    return await this.lookupNetwork(ethQuery);
  }

  isLoading(chainType: number) {
    return this.state.networks[chainType].network === 'loading';
  }

  getProviderConfig(chainType: number) {
    return this.state.networks[chainType]?.provider;
  }

  getProviderChainId(chainType: number) {
    return this.state.networks[chainType]?.provider?.chainId;
  }

  getChainTypeByChainId(chainId: string) {
    if (!chainId) {
      return null;
    }
    chainId = String(chainId);
    for (const type in this.state.networks) {
      if (chainId === this.state.networks[type]?.provider?.chainId) {
        return Number(type);
      }
    }
    return null;
  }

  getProviderTicker(chainType: number) {
    return this.state.networks[chainType]?.provider?.ticker;
  }

  getProviderNickname(chainType: number) {
    return this.state.networks[chainType]?.provider?.nickname;
  }

  getProviderExplorerUrl(chainType: number) {
    return this.state.networks[chainType]?.explorerUrl;
  }

  isRpcChainId(chainId: string) {
    if (!chainId) {
      return false;
    }
    chainId = String(chainId);
    for (const type in this.state.networks) {
      if (chainId === this.state.networks[type]?.provider?.chainId) {
        return true;
      }
    }
    return false;
  }

  getEnabledChain(selectedAddress: string) {
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const types = preferencesController.getEnabledRpcChains(selectedAddress);
    return types.map((type) => {
      return { type, chainId: this.getProviderChainId(type) };
    });
  }
}

export default RpcNetworkController;
