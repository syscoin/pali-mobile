import { EventEmitter } from 'events';
import { toChecksumAddress } from 'ethereumjs-util';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import util, { isRpcChainType } from '../util';
import { RpcNetworkController } from '../network/RpcNetworkController';
import { ChainType, Token } from './TokenRatesController';

/**
 * @type AssetsConfig
 *
 * Assets controller configuration
 *
 * @property selectedAddress - Vault selected address
 */
export interface AssetsConfig extends BaseConfig {
  chainIds: { [type: number]: string };
}

export interface SmartContractInfo {
  address: string;
  isSmartContract: boolean;
}

/**
 * @type AssetsState
 *
 * Assets controller state
 *
 * @property allTokens - Object containing tokens per account and network
 * @property tokens - List of tokens associated with the active vault
 * @property ignoredTokens - List of tokens that should be ignored
 */
export interface AssetsState extends BaseState {
  allTokens: { [key: string]: { [key: string]: Token[] } };
  allIgnoredTokens: {[key: string]: { [key: string]: Token[] }};
  tokenChangedType: ChainType;
  allSmartContract: { [chainId: string]: SmartContractInfo[] };
}

export const TokenNoChange = 0;

/**
 * Controller that stores assets and exposes convenience methods
 */
export class AssetsController extends BaseController<AssetsConfig, AssetsState> {
  private mutex = new Mutex();

  /**
   * EventEmitter instance used to listen to specific EIP747 events
   */
  hub = new EventEmitter();

  /**
   * Name of this controller used during composition
   */
  name = 'AssetsController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['PreferencesController'];

  /**
   * Creates a AssetsController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<BaseConfig>, state?: Partial<AssetsState>) {
    super(config, state);
    this.defaultConfig = {
      chainIds: {}
    };
    this.defaultState = {
      tokenChangedType: TokenNoChange,
      allTokens: {},
      allIgnoredTokens: {},
      allSmartContract: {},
    };
    this.initialize();
  }

  async addSmartContract(chainId: string, address: string, isSmartContract: boolean) {
    const releaseLock = await this.mutex.acquire();
    try {
      address = toChecksumAddress(address);
      const nowContract = this.state.allSmartContract[chainId] || [];
      if (!nowContract.find((sc) => sc.address === address)) {
        nowContract.push({ address, isSmartContract });
        this.state.allSmartContract[chainId] = nowContract;
        this.update({ allSmartContract: { ...this.state.allSmartContract } });
      }
    } finally {
      releaseLock();
    }
  }

  async addToken(address: string, symbol: string, decimals: number, chainType = ChainType.Ethereum, l1Address?: string) {
    const releaseLock = await this.mutex.acquire();
    try {
      address = toChecksumAddress(address);
      const { allTokens } = this.state;
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const { selectedAddress } = preferencesController.state;
      if (!selectedAddress) {
        return;
      }
      let chainId;
      if (isRpcChainType(chainType)) {
        const rpcNetwork = this.context.RpcNetworkController as RpcNetworkController;
        chainId = rpcNetwork.getProviderChainId(chainType);
      } else {
        chainId = this.config.chainIds[chainType];
      }
      const tokenChangedType = chainType;
      const tokens = allTokens[selectedAddress]?.[chainId] || [];
      if (tokens.find((token) => token.address === address)) {
        return;
      }
      const newEntry: Token = { address, symbol, decimals, l1Address };
      tokens.push(newEntry);
      const newAllTokens = { ...allTokens };
      if (!newAllTokens[selectedAddress]) {
        newAllTokens[selectedAddress] = {};
      }
      newAllTokens[selectedAddress][chainId] = [...tokens];
      this.update({ allTokens: newAllTokens, tokenChangedType });
    } finally {
      releaseLock();
    }
  }

  async addTokens(tokensToAdd: Token[], chainId: string, selectedAddress: string, chainType = ChainType.Ethereum) {
    const releaseLock = await this.mutex.acquire();
    const { allTokens } = this.state;

    try {
      const tokens = allTokens[selectedAddress]?.[chainId] || [];
      tokensToAdd.forEach((tokenToAdd) => {
        const { address, symbol, decimals, l1Address } = tokenToAdd;
        const checksumAddress = chainType === ChainType.Tron ? address : toChecksumAddress(address);
        if (!tokens.find((token) => token.address === checksumAddress)) {
          const newEntry: Token = { address: checksumAddress, l1Address, symbol, decimals };
          tokens.push(newEntry);
        }
      });
      const newAllTokens = { ...allTokens };
      if (!newAllTokens[selectedAddress]) {
        newAllTokens[selectedAddress] = {};
      }
      newAllTokens[selectedAddress][chainId] = [...tokens];

      const tokenChangedType = chainType;
      this.update({ allTokens: newAllTokens, tokenChangedType });
    } finally {
      releaseLock();
    }
  }

  async removeAndIgnoreToken(address: string, chainType = ChainType.Ethereum) {
    const releaseLock = await this.mutex.acquire();
    try {
      address = toChecksumAddress(address);
      const { allTokens, allIgnoredTokens } = this.state;
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const { selectedAddress } = preferencesController.state;
      if (!selectedAddress) {
        return;
      }
      let chainId;
      if (isRpcChainType(chainType)) {
        const rpcNetwork = this.context.RpcNetworkController as RpcNetworkController;
        chainId = rpcNetwork.getProviderChainId(chainType);
      } else {
        chainId = this.config.chainIds[chainType];
      }
      const tokenChangedType = chainType;
      const tokens = allTokens[selectedAddress]?.[chainId] || [];
      const tokenEntry = tokens.find((token) => token.address === address);
      if (!tokenEntry) {
        return;
      }
      const newTokens = tokens.filter((token) => token.address !== address);

      const newAllTokens = { ...allTokens };
      if (!newAllTokens[selectedAddress]) {
        newAllTokens[selectedAddress] = {};
      }
      newAllTokens[selectedAddress][chainId] = newTokens;

      const ignoredTokens = allIgnoredTokens[selectedAddress]?.[chainId] || [];
      if (!ignoredTokens.find((token) => token.address === address)) {
        ignoredTokens.push(tokenEntry);
      }
      const newAllIgnoredTokens = { ...allIgnoredTokens };
      if (!newAllIgnoredTokens[selectedAddress]) {
        newAllIgnoredTokens[selectedAddress] = {};
      }
      newAllIgnoredTokens[selectedAddress][chainId] = [...ignoredTokens];

      this.update({
        allTokens: newAllTokens,
        allIgnoredTokens: newAllIgnoredTokens,
        tokenChangedType,
      });
    } finally {
      releaseLock();
    }
  }

  async onNetworkChange(chainType: ChainType) {
    const { chainId } = this.networks[chainType].state.provider;
    const chainIds = this.config.chainIds;
    chainIds[chainType] = chainId;
    this.configure({ chainIds });
  }

  rehydrate(state: Partial<AssetsState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
  }

  beforeOnComposed() {
    super.beforeOnComposed();
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { identities } = preferencesController.state;
    const allTokens = this.state.allTokens || {};
    Object.keys(allTokens).forEach((address) => {
      if (!identities[address]) {
        delete allTokens[address];
      }
    });
    const allIgnoredTokens = this.state.allIgnoredTokens || {};
    Object.keys(allIgnoredTokens).forEach((address) => {
      if (!identities[address]) {
        delete allIgnoredTokens[address];
      }
    });
  }
}

export default AssetsController;
