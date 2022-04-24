import { toChecksumAddress } from 'ethereumjs-util';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { isRpcChainType, logDebug } from '../util';
import {defaultEnabledChains, allChains, ChainType} from "../Config";

/**
 * @type ContactEntry
 *
 * ContactEntry representation
 *
 * @property address - Hex address of a recipient account
 * @property name - Nickname associated with this address
 * @property importTime - Data time when an account as created/imported
 */
export interface ContactEntry {
  address: string;
  name: string;
  importTime?: number;
  currentTokenType: TokenType;
  currentChain: ChainType;
  enabledChains: ChainType[];
  isObserve?: boolean;
}

/**
 * @type PreferencesState
 *
 * Preferences controller state
 *
 * @property identities - Map of addresses to ContactEntry objects
 * @property selectedAddress - Current coinbase account
 */
export interface PreferencesState extends BaseState {
  identities: { [address: string]: ContactEntry };
  selectedAddress: string;
  allChains: ChainType[];
  hideDefiPortfolio: boolean;
  hideNormalTokens: boolean;
}

export interface PreferencesConfig extends BaseConfig {
  mainAccount: string;
  otherAccount: string;
  observeAccount: string;
}

export enum TokenType {
  TOKEN = 0x01,
  NFT = 0x02,
}

/**
 * Controller that stores shared settings and exposes convenience methods
 */
export class PreferencesController extends BaseController<PreferencesConfig, PreferencesState> {
  /**
   * Name of this controller used during composition
   */
  name = 'PreferencesController';

  /**
   * Creates a PreferencesController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<BaseConfig>, state?: Partial<PreferencesState>) {
    super(config, state);
    this.defaultState = {
      identities: {},
      selectedAddress: '',
      allChains: allChains,
      hideDefiPortfolio: false,
      hideNormalTokens: false,
    };
    this.initialize();
  }

  /**
   * Removes an identity from state
   *
   * @param address - Address of the identity to remove
   */
  removeIdentity(address: string) {
    const { identities } = this.state;
    if (!identities[address]) {
      return;
    }
    delete identities[address];
    const selectedAddress = address === this.state.selectedAddress ? Object.keys(identities)[0] : this.state.selectedAddress;
    this.update({ identities: { ...identities }, selectedAddress });
  }

  /**
   * Associates a new label with an identity
   *
   * @param address - Address of the identity to associate
   * @param label - New label to assign
   */
  setAccountLabel(address: string, label: string) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (!identities[address]) {
      logDebug('PPYang setAccountLabel, no find address:', address);
      return;
    }
    identities[address].name = label;
    this.update({ identities: { ...identities } });
  }

  /**
   * Generates and stores a new list of stored identities based on address. If the selected address
   * is unset, or if it refers to an identity that was removed, it will be set to the first
   * identity.
   *
   * @param addresses - List of addresses to use as a basis for each identity
   */
  updateIdentities(addresses: string[]) {
    addresses = addresses.map((address: string) => toChecksumAddress(address));
    const oldIdentities = this.state.identities;
    const observeIdentities: { [address: string]: ContactEntry } = {};
    for (const identity in oldIdentities) {
      if (oldIdentities[identity].isObserve) {
        if (!addresses.find((address) => address === identity)) {
          observeIdentities[identity] = oldIdentities[identity];
        }
      }
    }

    const newIdentities = addresses.reduce((ids: { [address: string]: ContactEntry }, address, index) => {
      ids[address] = oldIdentities[address] || {
        address,
        name: index === 0 ? `${this.config.mainAccount}` : this.findAccountName({ ...ids, ...oldIdentities }),
        importTime: Date.now(),
        currentTokenType: TokenType.TOKEN,
        currentChain: ChainType.All,
        enabledChains: [...defaultEnabledChains],
      };
      ids[address].isObserve = false;
      return ids;
    }, {});
    let { selectedAddress } = this.state;
    const identities = { ...newIdentities, ...observeIdentities };
    if (!Object.keys(identities).includes(selectedAddress)) {
      selectedAddress = Object.keys(identities)[0];
    }
    if (!selectedAddress) {
      selectedAddress = this.defaultState.selectedAddress;
    }
    this.update({ identities: { ...identities }, selectedAddress });
  }

  /**
   * Sets selected address
   *
   * @param selectedAddress - Ethereum address
   */
  setSelectedAddress(selectedAddress: string) {
    this.update({ selectedAddress: toChecksumAddress(selectedAddress) });
  }

  findAccountName(identities: { [address: string]: ContactEntry }) {
    const normalIdentities: { [address: string]: ContactEntry } = {};
    for (const identity in identities) {
      if (!identities[identity].isObserve) {
        normalIdentities[identity] = identities[identity];
      }
    }
    const keys = Object.keys(normalIdentities);
    let index = keys.length + 1;
    let targetName = null;
    do {
      const tempName = `${this.config.otherAccount} ${index}`;
      if (keys.find((key) => normalIdentities[key].name === tempName)) {
        index += 1;
      } else {
        targetName = tempName;
      }
    } while (targetName === null);
    return targetName;
  }

  findObserveName(identities: { [address: string]: ContactEntry }) {
    const observeIdentities = [];
    for (const identity in identities) {
      if (identities[identity].isObserve) {
        observeIdentities.push(identities[identity]);
      }
    }
    let index = 1;
    let targetName = null;
    do {
      const tempName = `${this.config.observeAccount}${index}`;
      if (observeIdentities.find((identity) => identity.name === tempName)) {
        index += 1;
      } else {
        targetName = tempName;
      }
    } while (targetName === null);
    return targetName;
  }

  addObserveAddress(address: string) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (identities[address]) {
      return false;
    }
    identities[address] = {
      name: this.findObserveName(identities),
      address,
      importTime: Date.now(),
      currentTokenType: TokenType.TOKEN,
      currentChain: ChainType.All,
      enabledChains: [...defaultEnabledChains],
      isObserve: true,
    };
    this.update({ identities: { ...identities } });
    return true;
  }

  addFamousObserveAddress(address: string, name: string, defaultChains: ChainType[]) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (identities[address]) {
      return false;
    }
    if (!name) {
      name = this.findObserveName(identities);
    }
    if (!defaultChains || defaultChains.length === 0) {
      defaultChains = [...defaultEnabledChains];
    }

    identities[address] = {
      name,
      address,
      importTime: Date.now(),
      currentTokenType: TokenType.TOKEN,
      currentChain: ChainType.All,
      enabledChains: [...defaultChains],
      isObserve: true,
    };
    this.update({ identities: { ...identities } });
    return true;
  }

  removeObserveAddress(address: string) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (!identities[address] || !identities[address].isObserve) {
      return false;
    }
    this.removeIdentity(address);
    return true;
  }

  isObserveAddress(address: string) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    return identities[address]?.isObserve;
  }

  isDisabledChain(selectedAddress: string, type: ChainType) {
    const enabledChains = this.state.identities?.[selectedAddress]?.enabledChains || defaultEnabledChains;
    return !enabledChains.includes(type);
  }

  getEnabledRpcChains(selectedAddress: string) {
    const enabledChains = this.state.identities?.[selectedAddress]?.enabledChains || [];
    return enabledChains.filter((type) => isRpcChainType(type));
  }

  updateCurrentTokenType(address: string, tokenType: TokenType) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (!identities[address]) {
      logDebug('PPYang updateCurrentTokenType, no find address:', address);
      return;
    }
    identities[address].currentTokenType = tokenType;
    this.update({ identities: { ...identities } });
  }

  updateCurrentChain(address: string, chain: ChainType) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (!identities[address]) {
      logDebug('PPYang updateCurrentChain, no find address:', address);
      return;
    }
    const enabledChains = identities[address].enabledChains || [];
    if (enabledChains.length !== 0 && enabledChains.indexOf(chain) === -1) {
      chain = ChainType.All;
    }
    identities[address].currentChain = chain;
    this.update({ identities: { ...identities } });
  }

  updateChains(address: string, enabledChains: ChainType[]) {
    address = toChecksumAddress(address);
    const { identities } = this.state;
    if (!identities[address]) {
      logDebug('PPYang updateFavouriteChains, no find address:', address);
      return;
    }
    const newEnabledChains = enabledChains.filter((eType) => eType !== ChainType.All && (this.state.allChains.find((aType) => aType === eType) || isRpcChainType(eType)));
    identities[address].enabledChains = [...newEnabledChains];
    const currentChain = identities[address].currentChain || ChainType.All;
    if (identities[address].enabledChains.indexOf(currentChain) === -1) {
      identities[address].currentChain = ChainType.All;
    }
    this.update({ identities: { ...identities } });
  }

  addRpcChain(address: string, chain: number) {
    const { identities } = this.state;

    if (!this.state.allChains.includes(chain)) {
      this.update({ allChains: [...this.state.allChains, chain] });
    }

    let enabledChains = this.state.identities?.[address]?.enabledChains || defaultEnabledChains;
    if (!enabledChains.includes(chain)) {
      enabledChains = [...enabledChains, chain];
      this.state.identities[address].enabledChains = enabledChains;
      this.update({ identities: { ...identities } });
    }
  }

  updateAllChains(chain: number) {
    if (!this.state.allChains.includes(chain)) {
      this.update({ allChains: [...this.state.allChains, chain] });
    }
  }

  removeRpcChain(chain: number) {
    const { identities } = this.state;
    let needUpdate = false;
    if (this.state.allChains.includes(chain)) {
      this.state.allChains.splice(this.state.allChains.findIndex((type) => type === chain), 1);
      needUpdate = true;
    }

    for (const identity in identities) {
      if (identities[identity].enabledChains) {
        const enabledChains = identities[identity].enabledChains.filter((type) => type !== chain);
        if (!needUpdate && identities[identity].enabledChains.length !== enabledChains.length) {
          needUpdate = true;
        }
        identities[identity].enabledChains = enabledChains;
      }
    }
    needUpdate && this.update({ identities: { ...identities }, allChains: [ ...this.state.allChains ] });
  }

  setHideDefiPortfolio(isHide: boolean) {
    this.update({ hideDefiPortfolio: isHide });
  }

  setHideNormalTokens(isHide: boolean) {
    this.update({ hideNormalTokens: isHide });
  }
}

export default PreferencesController;
