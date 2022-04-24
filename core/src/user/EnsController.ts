import { isValidAddress, isZeroAddress, toChecksumAddress } from 'ethereumjs-util';
import ENS from 'ethjs-ens';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import util, { handleFetch, logDebug, safelyExecute, toLowerCaseEquals } from '../util';
import { getContractController } from '../ControllerUtils';
import CollectiblesController from '../assets/CollectiblesController';
import PreferencesController from './PreferencesController';
import { ChainType } from "../Config";

export interface EnsEntry {
  ensName: string;
  address: string;// checksum address
  avatar?: string;
  avatarUrl?: string;
  timestamp: number;// lookup timestamp
}

export interface EnsConfig extends BaseConfig {
  lookupInterval: number;
  interval: number;
}

export interface EnsState extends BaseState {
  ensEntries: {[address: string]: EnsEntry};
  avatarUrls: {[avatar: string]: string};
}

export class EnsController extends BaseController<EnsConfig, EnsState> {
  private mutex = new Mutex();

  private handle?: NodeJS.Timer;

  private polling_counter = 0;

  name = 'EnsController';

  constructor(config?: Partial<EnsConfig>, state?: Partial<EnsState>) {
    super(config, state);
    this.defaultConfig = {
      lookupInterval: 1 * 60 * 60 * 1000,
      interval: 180000,
    };
    this.defaultState = {
      ensEntries: {},
      avatarUrls: {},
    };
    this.initialize();
  }

  async pollEnsEntryFromAddress(address: string) {
    if (!isValidAddress(address) || isZeroAddress(address)) {
      return false;
    }
    address = toChecksumAddress(address);
    const ensEntry = this.state.ensEntries[address];
    if (ensEntry) {
      if (Date.now() - ensEntry.timestamp < this.config.lookupInterval) {
        return false;
      }
    }
    const entry = await this.getEnsEntry('', address);
    if (entry) {
      this.state.ensEntries[address] = entry;
      return true;
    }
    return false;
  }

  async getEnsEntry(ensName: string, address: string): Promise<EnsEntry | undefined> {
    if (!address && !ensName) {
      return undefined;
    }
    try {
      const networkController = this.networks[ChainType.Ethereum];
      if (!networkController.ismainnet() || networkController.isLoading()) {
        return undefined;
      }
      const { provider } = networkController;
      const { network } = networkController.state;
      const ens = new ENS({ provider, network });
      if (!address) {
        address = await ens.lookup(ensName);
      }
      if (!isValidAddress(address) || isZeroAddress(address)) {
        return undefined;
      }
      address = toChecksumAddress(address);
      if (!ensName) {
        ensName = await ens.reverse(address);
      } else {
        const resolvedAddress = await ens.lookup(ensName);
        if (!toLowerCaseEquals(address, resolvedAddress)) {
          return undefined;
        }
      }
      const node = await ens.getNamehash(ensName);
      const resolver = await ens.getResolverForNode(node);
      const result = await resolver.text(node, 'avatar');
      const avatarUrl = await this.getAvatarUrl(result[0]);
      return {
        address,
        ensName,
        avatar: result[0],
        avatarUrl,
        timestamp: Date.now(),
      };
      // eslint-disable-next-line no-empty
    } catch (e) {
      logDebug('leon.w@getENSNameFromAddress ', address, ensName, e);
      if (e?.message?.includes('ENS name not defined')) {
        return {
          address,
          ensName: '',
          timestamp: Date.now(),
        };
      }
    }
    return undefined;
  }

  async getAvatarUrl(avatar: string) {
    if (!avatar) {
      return null;
    }
    const avatarUrl = this.state.avatarUrls[avatar];
    if (avatarUrl) {
      return avatarUrl;
    }
    if (avatar.startsWith('http') || util.isIPFSUrl(avatar)) {
      this.state.avatarUrls[avatar] = avatar;
      this.update({ avatarUrls: { ...this.state.avatarUrls } });
      return avatar;
    } else if (avatar.startsWith('eip155:')) {
      const subStr = avatar.substr(7, avatar.length).split('/');
      const contractInfo = subStr[1].split(':');
      const chainId = subStr[0];
      const contractType = contractInfo[0];
      const contractAddress = contractInfo[1];
      const tokenID = subStr[2];

      const { contractController } = getContractController(this, chainId);
      const collectiblesController = this.context.CollectiblesController as CollectiblesController;
      const cImage = await collectiblesController.getCollectibleImage(contractController, contractType?.toUpperCase(), contractAddress, tokenID, chainId);
      if (cImage?.image) {
        this.state.avatarUrls[avatar] = cImage.image;
        this.update({ avatarUrls: { ...this.state.avatarUrls } });
        return cImage.image;
      }
    }
    return null;
  }

  async forceUpdateEnsAvatar(ensName: string, address: string) {
    const releaseLock = await this.mutex.acquire();
    try {
      address = toChecksumAddress(address);
      const nowEntry = await this.getEnsEntry(ensName, address);
      if (nowEntry) {
        this.state.ensEntries[address] = nowEntry;
        this.update({ ensEntries: { ...this.state.ensEntries } });
        return nowEntry.avatarUrl;
      }
      return undefined;
    } finally {
      releaseLock();
    }
  }

  async getAvatarUrlForEnsName(ensName: string, address: string) {
    const releaseLock = await this.mutex.acquire();
    try {
      address = toChecksumAddress(address);
      const oldEntry = this.state.ensEntries[address];
      if (oldEntry) {
        return oldEntry.avatarUrl;
      }
      const nowEntry = await this.getEnsEntry(ensName, address);
      if (nowEntry) {
        this.state.ensEntries[address] = nowEntry;
        this.update({ ensEntries: { ...this.state.ensEntries } });
        return nowEntry.avatarUrl;
      }
      return undefined;
    } finally {
      releaseLock();
    }
  }

  async getAddressForEnsName(ensName: string) {
    const releaseLock = await this.mutex.acquire();
    try {
      const keys = Object.keys(this.state.ensEntries);
      for (const key of keys) {
        if (this.state.ensEntries[key].ensName === ensName) {
          return this.state.ensEntries[key].address;
        }
      }
      const nowEntry = await this.getEnsEntry(ensName, '');
      if (nowEntry) {
        this.state.ensEntries[nowEntry.address] = nowEntry;
        this.update({ ensEntries: { ...this.state.ensEntries } });
        return nowEntry.address;
      }
      return undefined;
    } finally {
      releaseLock();
    }
  }

  async searchAllName(ids: string[]) {
    const graphUrl = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
    const graphQL = {
      operationName: 'tokens',
      variables: { ids },
      query: `query accounts($ids:[String!]){ accounts(where: { id_in: $ids}) { domains(first: 1) { name } } }`,
    };
    const options = {
      method: 'POST',
      body: JSON.stringify(graphQL),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
    const allName = await handleFetch(graphUrl, options).then((result) => {
      return result?.data?.accounts?.map((item: any) => {
        return { address: item?.id, name: item?.domains?.[0]?.name };
      });
    }).catch(() => undefined);
    if (allName !== undefined) {
      const releaseLock = await this.mutex.acquire();
      try {
        const ensEntries = { ...this.state.ensEntries };
        let tempIds: string[] = ids.map((id) => toChecksumAddress(id));
        const timestamp = Date.now();
        allName.forEach((ens: any) => {
          const address = toChecksumAddress(ens.address);
          const ensEntry = ensEntries[address] || { address };
          ensEntry.ensName = ens.name;
          ensEntry.timestamp = timestamp;
          ensEntries[address] = ensEntry;
          tempIds = tempIds.filter((id) => id !== address);
        });
        tempIds.forEach((address) => {
          const ensEntry = ensEntries[address] || { address };
          ensEntry.ensName = '';
          ensEntry.timestamp = timestamp;
          ensEntries[address] = ensEntry;
        });
        this.update({ ensEntries });
      } finally {
        releaseLock();
      }
    }
  }

  async searchEnsName(name: string, count: number) {
    const graphUrl = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
    const graphQL = {
      operationName: 'tokens',
      variables: { count, 'name': `${name}` },
      query: `query lookup($name: String!, $count: Int!) { domains(first: $count, where: {name_contains: $name, resolvedAddress_not: null}) { name resolver { addr { id } } } }`,
    };
    const options = {
      method: 'POST',
      body: JSON.stringify(graphQL),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
    return handleFetch(graphUrl, options).then((result) => {
      return result?.data?.domains?.map((item: any) => {
       return { name: item?.name, address: item?.resolver?.addr?.id };
      });
    }).catch(() => undefined);
  }

  async getNodeByName(ensName: string) {
    const networkController = this.networks[ChainType.Ethereum];
    if (!networkController.ismainnet() || networkController.isLoading()) {
      return undefined;
    }
    const { provider } = networkController;
    const { network } = networkController.state;
    const ens = new ENS({ provider, network });
    return await ens.getNamehash(ensName);
  }

  async poll(): Promise<void> {
    if (this.polling_counter > 1) {
      return;
    }
    this.polling_counter += 1;
    this.handle && clearTimeout(this.handle);
    await this.refresh();
    this.polling_counter -= 1;
    if (this.polling_counter > 0) {
      return;
    }
    this.handle = setTimeout(() => {
      this.poll();
    }, this.config.interval);
  }

  async refresh() {
    const releaseLock = await this.mutex.acquire();
    try {
      const tokenBalancesController = this.context.TokenBalancesController;
      if (tokenBalancesController?.config.backgroundMode) {
        return;
      }
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const { identities } = preferencesController.state;
      if (!identities) {
        return;
      }
      const addresss = Object.keys(identities);
      if (!addresss || addresss.length <= 0) {
        return;
      }
      let needUpdate = false;
      for (const address of addresss) {
        needUpdate = await safelyExecute(() => this.pollEnsEntryFromAddress(address)) || needUpdate;
      }
      const existAddresss = Object.keys(this.state.ensEntries);

      for (const address of existAddresss) {
        if (!addresss.includes(address) && Date.now() - this.state.ensEntries[address].timestamp > this.config.lookupInterval) {
          needUpdate = true;
          delete this.state.ensEntries[address];
        }
      }
      needUpdate && this.update({ ensEntries: { ...this.state.ensEntries } });
    } finally {
      releaseLock();
    }
  }

  onComposed() {
    super.onComposed();
    setTimeout(() => this.poll(), 10000);
    const preferences = this.context.PreferencesController as PreferencesController;
    preferences.subscribe(() => setTimeout(() => this.poll(), 1000), ['identities']);
  }
}

export default EnsController;
