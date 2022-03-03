import { EventEmitter } from 'events';
import { toChecksumAddress } from 'ethereumjs-util';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import NetworkController from '../network/NetworkController';
import ArbNetworkController from '../network/ArbNetworkController';
import BscNetworkController from '../network/BscNetworkController';
import PolygonNetworkController from '../network/PolygonNetworkController';
import TronNetworkController from '../network/TronNetworkController';
import HecoNetworkController from '../network/HecoNetworkController';
import OpNetworkController from '../network/OpNetworkController';
import AvaxNetworkController from '../network/AvaxNetworkController';
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
  chainId: string;
  arbChainId: string;
  bscChainId: string;
  polygonChainId: string;
  tronChainId: string;
  hecoChainId: string;
  opChainId: string;
  avaxChainId: string;
}

export enum TokenChangedType {
  NoChange = 0x00,
  TokenChanged = 0x01,
  BscTokenChanged = 0x02,
  ArbTokenChanged = 0x04,
  OpTokenChanged = 0x08,
  PolygonTokenChanged = 0x20,
  HecoTokenChanged = 0x40,
  TronTokenChanged = 0x80,
  AvaxTokenChanged = 0x100,
  RpcTokenChanged = 0x200,
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
  tokenChangedType: TokenChangedType;
  allSmartContract: { [chainId: string]: SmartContractInfo[] };
}

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
  requiredControllers = ['AssetsContractController', 'NetworkController', 'PreferencesController'];

  /**
   * Creates a AssetsController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<BaseConfig>, state?: Partial<AssetsState>) {
    super(config, state);
    this.defaultConfig = {
      chainId: '',
      arbChainId: '',
      bscChainId: '',
      polygonChainId: '',
      tronChainId: '',
      hecoChainId: '',
      opChainId: '',
      avaxChainId: '',
    };
    this.defaultState = {
      tokenChangedType: TokenChangedType.NoChange,
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
      let chainId, tokenChangedType;
      if (chainType === ChainType.Bsc) {
        chainId = this.config.bscChainId;
        tokenChangedType = TokenChangedType.BscTokenChanged;
      } else if (chainType === ChainType.Arbitrum) {
        chainId = this.config.arbChainId;
        tokenChangedType = TokenChangedType.ArbTokenChanged;
      } else if (chainType === ChainType.Polygon) {
        chainId = this.config.polygonChainId;
        tokenChangedType = TokenChangedType.PolygonTokenChanged;
      } else if (chainType === ChainType.Heco) {
        chainId = this.config.hecoChainId;
        tokenChangedType = TokenChangedType.HecoTokenChanged;
      } else if (chainType === ChainType.Tron) {
        chainId = this.config.tronChainId;
        tokenChangedType = TokenChangedType.TronTokenChanged;
      } else if (chainType === ChainType.Optimism) {
        chainId = this.config.opChainId;
        tokenChangedType = TokenChangedType.OpTokenChanged;
      } else if (chainType === ChainType.Avax) {
        chainId = this.config.avaxChainId;
        tokenChangedType = TokenChangedType.AvaxTokenChanged;
      } else if (isRpcChainType(chainType)) {
        const rpcNetwork = this.context.RpcNetworkController as RpcNetworkController;
        chainId = rpcNetwork.getProviderChainId(chainType);
        tokenChangedType = TokenChangedType.RpcTokenChanged;
      } else {
        chainId = this.config.chainId;
        tokenChangedType = TokenChangedType.TokenChanged;
      }
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

      let tokenChangedType;
      if (chainType === ChainType.Bsc) {
        tokenChangedType = TokenChangedType.BscTokenChanged;
      } else if (chainType === ChainType.Arbitrum) {
        tokenChangedType = TokenChangedType.ArbTokenChanged;
      } else if (chainType === ChainType.Polygon) {
        tokenChangedType = TokenChangedType.PolygonTokenChanged;
      } else if (chainType === ChainType.Heco) {
        tokenChangedType = TokenChangedType.HecoTokenChanged;
      } else if (chainType === ChainType.Tron) {
        tokenChangedType = TokenChangedType.TronTokenChanged;
      } else if (chainType === ChainType.Optimism) {
        tokenChangedType = TokenChangedType.OpTokenChanged;
      } else if (chainType === ChainType.Avax) {
        tokenChangedType = TokenChangedType.AvaxTokenChanged;
      } else if (isRpcChainType(chainType)) {
        tokenChangedType = TokenChangedType.RpcTokenChanged;
      } else {
        tokenChangedType = TokenChangedType.TokenChanged;
      }
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
      let chainId, tokenChangedType;
      if (chainType === ChainType.Bsc) {
        chainId = this.config.bscChainId;
        tokenChangedType = TokenChangedType.BscTokenChanged;
      } else if (chainType === ChainType.Arbitrum) {
        chainId = this.config.arbChainId;
        tokenChangedType = TokenChangedType.ArbTokenChanged;
      } else if (chainType === ChainType.Polygon) {
        chainId = this.config.polygonChainId;
        tokenChangedType = TokenChangedType.PolygonTokenChanged;
      } else if (chainType === ChainType.Heco) {
        chainId = this.config.hecoChainId;
        tokenChangedType = TokenChangedType.HecoTokenChanged;
      } else if (chainType === ChainType.Tron) {
        chainId = this.config.tronChainId;
        tokenChangedType = TokenChangedType.TronTokenChanged;
      } else if (chainType === ChainType.Optimism) {
        chainId = this.config.opChainId;
        tokenChangedType = TokenChangedType.OpTokenChanged;
      } else if (chainType === ChainType.Avax) {
        chainId = this.config.avaxChainId;
        tokenChangedType = TokenChangedType.AvaxTokenChanged;
      } else if (isRpcChainType(chainType)) {
        const rpcNetwork = this.context.RpcNetworkController as RpcNetworkController;
        chainId = rpcNetwork.getProviderChainId(chainType);
        tokenChangedType = TokenChangedType.RpcTokenChanged;
      } else {
        chainId = this.config.chainId;
        tokenChangedType = TokenChangedType.TokenChanged;
      }
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

  async onNetworkChange() {
    const network = this.context.NetworkController as NetworkController;
    const { chainId } = network.state.provider;
    this.configure({ chainId });
  }

  async onArbNetworkChange() {
    const arbnetwork = this.context.ArbNetworkController as ArbNetworkController;
    const { chainId } = arbnetwork.state.provider;
    this.configure({ arbChainId: chainId });
  }

  async onOpNetworkChange() {
    const opnetwork = this.context.OpNetworkController as OpNetworkController;
    const { chainId } = opnetwork.state.provider;
    this.configure({ opChainId: chainId });
  }

  async onPolygonNetworkChange() {
    const polygonnetwork = this.context.PolygonNetworkController as PolygonNetworkController;
    const { chainId } = polygonnetwork.state.provider;
    this.configure({ polygonChainId: chainId });
  }

  async onBscNetworkChange() {
    const bscnetwork = this.context.BscNetworkController as BscNetworkController;
    const { chainId } = bscnetwork.state.provider;
    this.configure({ bscChainId: chainId });
  }

  async onTronNetworkChange() {
    const tronnetwork = this.context.TronNetworkController as TronNetworkController;
    const { chainId } = tronnetwork.state.provider;
    this.configure({ tronChainId: chainId });
  }

  async onHecoNetworkChange() {
    const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
    const { chainId } = hecoNetwork.state.provider;
    this.configure({ hecoChainId: chainId });
  }

  async onAvaxNetworkChange() {
    const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
    const { chainId } = avaxNetwork.state.provider;
    this.configure({ avaxChainId: chainId });
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
