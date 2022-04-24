import { randomBytes } from 'crypto';
import * as ethUtil from 'ethereumjs-util';
import { stripHexPrefix } from 'ethjs-util';
import { normalize as normalizeAddress, signTypedData, signTypedData_v4, signTypedDataLegacy } from 'eth-sig-util';
import Wallet, { thirdparty as importers } from 'ethereumjs-wallet';
import { Mutex } from 'async-mutex';
import { sha256 } from '@ethersproject/sha2';
import { Base58 } from '@ethersproject/basex';
import { arrayify } from '@ethersproject/bytes';
import { entropyToMnemonic } from 'bip39';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import { PersonalMessageParams } from '../message-manager/PersonalMessageManager';
import { TypedMessageParams } from '../message-manager/TypedMessageManager';
import { logDebug } from '../util';
import { NetworkConfig } from '../Config';
import KeyringControllerImpl from './KeyringControllerImpl';
import { ChainType } from "../Config";

const privates = new WeakMap();

/**
 * Available keyring types
 */
export enum KeyringTypes {
  simple = 'Simple Key Pair',
  hd = 'HD Key Tree',
}

export interface TronEthereumPair {
  ethereum: string;
  tronHex: string;
  tron: string;
}

/**
 * @type KeyringState
 *
 * Keyring controller state
 *
 * @property vault - Encrypted string representing keyring data
 * @property keyrings - Group of accounts
 */
export interface KeyringState extends BaseState {
  vault?: string;
  keyrings: Keyring[];
  removeAccounts: string[];
  tronEthereumPairs: TronEthereumPair[];
}

/**
 * @type KeyringConfig
 *
 * Keyring controller configuration
 *
 * @property encryptor - Keyring encryptor
 */
export interface KeyringConfig extends BaseConfig {
  encryptor?: any;
}

/**
 * @type Keyring
 *
 * Keyring object to return in fullUpdate
 *
 * @property type - Keyring type
 * @property accounts - Associated accounts
 * @property index - Associated index
 */
export interface Keyring {
  accounts: string[];
  type: string;
  index?: number;
}

/**
 * A strategy for importing an account
 */
export enum AccountImportStrategy {
  privateKey = 'privateKey',
  json = 'json',
}

/**
 * The `signTypedMessage` version
 * @see https://docs.metamask.io/guide/signing-data.html
 */
export enum SignTypedDataVersion {
  V1 = 'V1',
  V3 = 'V3',
  V4 = 'V4',
}

/**
 * Controller responsible for establishing and managing user identity
 */
export class KeyringController extends BaseController<KeyringConfig, KeyringState> {
  private mutex = new Mutex();

  /**
   * Name of this controller used during composition
   */
  name = 'KeyringController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['PreferencesController'];

  /**
   * Creates a KeyringController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<KeyringConfig>, state?: Partial<KeyringState>) {
    super(config, state);
    this.defaultState = {
      keyrings: [],
      removeAccounts: [],
      tronEthereumPairs: [],
    };
    this.initialize();
  }

  /**
   * Adds a new account to the default (first) HD seed phrase keyring
   *
   * @returns - Promise resolving to current state when the account is added
   */
  async addNewAccount(keyringIndex = 0): Promise<string> {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      const keyring = privates.get(this).keyring.keyrings[keyringIndex];
      /* istanbul ignore if */
      if (!keyring) {
        throw new Error('No HD keyring found');
      }
      if (keyring.type !== KeyringTypes.hd) {
        throw new Error('Current keyring is not support add account');
      }
      const accounts = await keyring.getAccounts();
      let selectedAddress = null;
      const index = this.state.removeAccounts.findIndex((remove) =>
        accounts.findIndex((address: string) =>
          ethUtil.toChecksumAddress(address) === remove) !== -1);
      if (index === -1) {
        const oldAccounts = await privates.get(this).keyring.getAccounts();
        await privates.get(this).keyring.addNewAccount(keyring);
        const newAccounts = await privates.get(this).keyring.getAccounts();
        newAccounts.forEach((newAddress: string) => {
          if (!oldAccounts.includes(newAddress)) {
            selectedAddress = ethUtil.toChecksumAddress(newAddress);
          }
        });
      } else {
        selectedAddress = this.state.removeAccounts[index];
      }
      const removeAccounts = [];
      for (const removeAccount of this.state.removeAccounts) {
        if (removeAccount !== selectedAddress) {
          removeAccounts.push(removeAccount);
        }
      }
      this.update({ removeAccounts: [...removeAccounts] });

      await this.verifySeedPhrase();
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return selectedAddress;
    } finally {
      releaseLock();
    }
  }

  /**
   * Adds a new account to the default (first) HD seed phrase keyring without updating identities in preferences
   *
   * @returns - Promise resolving to current state when the account is added
   */
  async addNewAccountWithoutUpdate(keyringIndex = 0) {
    const releaseLock = await this.mutex.acquire();
    try {
      const primaryKeyring = privates.get(this).keyring.keyrings[keyringIndex];
      /* istanbul ignore if */
      if (!primaryKeyring) {
        throw new Error('No HD keyring found');
      }
      if (primaryKeyring.type !== KeyringTypes.hd) {
        throw new Error('Current keyring is not support add account');
      }
      await privates.get(this).keyring.addNewAccount(primaryKeyring);
      await this.verifySeedPhrase();
      await this.fullUpdate();
    } finally {
      releaseLock();
    }
  }

  /**
   * Effectively the same as creating a new keychain then populating it
   * using the given seed phrase
   *
   * @param password - Password to unlock keychain
   * @param seed - Seed phrase to restore keychain
   * @returns - Promise resolving to th restored keychain object
   */
  async createNewVaultAndRestore(password: string, seed: string) {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      preferences.updateIdentities([]);
      const vault = await privates.get(this).keyring.createNewVaultAndRestore(password, seed);
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      return vault;
    } finally {
      releaseLock();
    }
  }

  async createVaultByPrivateKey(password: string, privateKey: string) {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      const prefixed = ethUtil.addHexPrefix(privateKey);
      if (!ethUtil.isValidPrivate(ethUtil.toBuffer(prefixed))) {
        throw new Error('Cannot import invalid private key.');
      }
      privateKey = stripHexPrefix(prefixed);
      preferences.updateIdentities([]);
      const vault = await this.createNewTorusVaultAndRestore(password, privateKey);
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      return vault;
    } finally {
      releaseLock();
    }
  }

  async createNewTorusVaultAndRestore(password: string, privateKey: string) {
    if (typeof password !== 'string') {
      return Promise.reject(new Error('Password must be text.'));
    }
    const { keyring } = privates.get(this);
    await keyring.clearKeyrings();

    return keyring.persistAllKeyrings(password)
      .then(() => {
        return keyring.addNewKeyring(KeyringTypes.simple, [privateKey]);
      })
      .then((firstKeyring: any) => {
        return firstKeyring.getAccounts();
      })
      .then(([firstAccount]: string) => {
        if (!firstAccount) {
          throw new Error('KeyringController - First Account not found.');
        }
        return null;
      })
      .then(keyring.persistAllKeyrings.bind(keyring, password))
      .then(keyring.setUnlocked.bind(keyring))
      .then(keyring.fullUpdate.bind(keyring));
  }

  /**
   * Create a new primary keychain and wipe any previous keychains
   *
   * @param password - Password to unlock the new vault
   * @returns - Newly-created keychain object
   */
  async createNewVaultAndKeychain(password: string) {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      preferences.updateIdentities([]);
      const vault = await privates.get(this).keyring.createNewVaultAndKeychain(password);
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      return vault;
    } finally {
      releaseLock();
    }
  }

  async createNewVault() {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      const account = await this.createKeyTree();
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      return account;
    } finally {
      releaseLock();
    }
  }

  async createKeyTree() {
    return privates.get(this).keyring.addNewKeyring(KeyringTypes.hd, { numberOfAccounts: 1 })
      .then((keyring: any) => {
        return keyring.getAccounts();
      })
      .then(([firstAccount]: string) => {
        if (!firstAccount) {
          throw new Error('KeyringController - No account found on keychain.');
        }
        return firstAccount;
      });
  }

  /**
   * Returns the status of the vault
   *
   * @returns - Boolean returning true if the vault is unlocked
   */
  isUnlocked(): boolean {
    return privates.get(this).keyring.memStore.getState().isUnlocked;
  }

  /**
   * Gets the seed phrase of the HD keyring
   *
   * @param password - Password of the keyring
   * @returns - Promise resolving to the seed phrase
   */
  exportSeedPhrase(password: string, keyringIndex = 0) {
    if (privates.get(this).keyring.password === password) {
      return privates.get(this).keyring.keyrings[keyringIndex].mnemonic;
    }
    throw new Error('Invalid password');
  }

  /**
   * Gets the private key from the keyring controlling an address
   *
   * @param password - Password of the keyring
   * @param address - Address to export
   * @returns - Promise resolving to the private key for an address
   */
  exportAccount(password: string, address: string): Promise<string> {
    if (privates.get(this).keyring.password === password) {
      return privates.get(this).keyring.exportAccount(address);
    }
    throw new Error('Invalid password');
  }

  /**
   * Returns the public addresses of all accounts for the current keyring
   *
   * @returns - A promise resolving to an array of addresses
   */
  async getAccounts(): Promise<string[]> {
    const accounts = await privates.get(this).keyring.getAccounts();
    return this.getNormalAccounts(accounts);
  }

  async getKeyringAccounts(keyringIndex = 0): Promise<string[]> {
    const keyring = privates.get(this).keyring.keyrings[keyringIndex];
    if (!keyring) {
      throw new Error('No keyring found');
    }
    const accounts = await keyring.getAccounts();
    return this.getNormalAccounts(accounts);
  }

  /**
   * Imports an account with the specified import strategy
   *
   * @param strategy - Import strategy name
   * @param args - Array of arguments to pass to the underlying stategy
   * @throws Will throw when passed an unrecognized strategy
   * @returns - Promise resolving to current state when the import is complete
   */
  async importAccountWithStrategy(strategy: AccountImportStrategy, args: any[]): Promise<string> {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      let privateKey;
      switch (strategy) {
        case 'privateKey':
          const [importedKey] = args;
          if (!importedKey) {
            throw new Error('Cannot import an empty key.');
          }
          const prefixed = ethUtil.addHexPrefix(importedKey);
          if (!ethUtil.isValidPrivate(ethUtil.toBuffer(prefixed))) {
            throw new Error('Cannot import invalid private key.');
          }
          privateKey = stripHexPrefix(prefixed);
          break;
        case 'json':
          let wallet;
          const [input, password] = args;
          try {
            wallet = importers.fromEtherWallet(input, password);
          } catch (e) {
            wallet = wallet || (await Wallet.fromV3(input, password, true));
          }
          privateKey = ethUtil.bufferToHex(wallet.getPrivateKey());
          break;
        default:
          throw new Error(`Unexpected import strategy: '${strategy}'`);
      }

      const accounts = await this.tryGetAccounts(KeyringTypes.simple, [privateKey]);
      if (!await this.checkForRemoveAccounts(accounts)) {
        if (!await this.checkForDuplicate(accounts)) {
          await privates.get(this).keyring.addNewKeyring(KeyringTypes.simple, [privateKey]);
        } else {
          throw new Error('The account you\'re are trying to import is a duplicate');
        }
      }
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      return accounts[0];
    } finally {
      releaseLock();
    }
  }

  /**
   * Imports an account with the seed
   *
   * @param seed
   */
  async importAccountWithSeed(seed: string) {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      const opts = {
        mnemonic: seed,
        numberOfAccounts: 1,
      };
      const accounts = await this.tryGetAccounts(KeyringTypes.hd, opts);
      if (!await this.checkForRemoveAccounts(accounts)) {
        if (!await this.checkForDuplicate(accounts)) {
          await privates.get(this).keyring.addNewKeyring(KeyringTypes.hd, {
            mnemonic: seed,
            numberOfAccounts: 1,
          });
        } else {
          throw new Error('The account you\'re are trying to import is a duplicate');
        }
      }
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
      return accounts[0];
    } finally {
      releaseLock();
    }
  }

  async tryGetAccounts(type: string, opts: any): Promise<string[]> {
    const KeyringClass = privates.get(this).keyring.getKeyringClassForType(type);
    const keyring = new KeyringClass();
    await keyring.deserialize(opts);
    return await keyring.getAccounts();
  }

  async checkForRemoveAccounts(accounts: string[]): Promise<boolean> {
    for (const account of accounts) {
      if (!this.state.removeAccounts.includes(ethUtil.toChecksumAddress(account))) {
        return false;
      }
    }

    const removeAccounts = [];
    for (const removeAccount of this.state.removeAccounts) {
      const result = accounts.find((account) => ethUtil.toChecksumAddress(account) === removeAccount);
      if (!result) {
        removeAccounts.push(removeAccount);
      }
    }
    this.update({ removeAccounts: [...removeAccounts] });
    return true;
  }

  async checkForDuplicate(accounts: string[]): Promise<boolean> {
    const allAccount = await privates.get(this).keyring.getAccounts();
    for (const account of accounts) {
      if (allAccount.includes(account)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Removes an account from keyring state
   *
   * @param address - Address of the account to remove
   * @returns - Promise resolving current state when this account removal completes
   */
  async removeAccount(address: string) {
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      address = ethUtil.toChecksumAddress(address);
      preferences.removeIdentity(address);
      if (!this.state.removeAccounts.includes(address)) {
        this.state.removeAccounts.push(address);
      }
      this.update({ removeAccounts: [...this.state.removeAccounts] });
      await this.fullUpdate();
    } finally {
      releaseLock();
    }
  }

  async removeKeyring(keyringIndex: number) {
    if (privates.get(this).keyring.keyrings.length <= 1) {
      throw new Error('remove keyring fail');
    }
    const preferences = this.context.PreferencesController as PreferencesController;
    const releaseLock = await this.mutex.acquire();
    try {
      const keyring = privates.get(this).keyring.keyrings[keyringIndex];
      /* istanbul ignore if */
      if (!keyring) {
        throw new Error('No keyring found');
      }
      const accounts = await keyring.getAccounts();
      await this.removeKeyringInner(keyring);

      if (accounts && accounts.length >= 0) {
        accounts.forEach((address: string) => {
          address = ethUtil.toChecksumAddress(address);
          this.state.removeAccounts = this.state.removeAccounts.filter((remove) => remove !== address);
        });
      }
      this.update({ removeAccounts: [...this.state.removeAccounts] });
      await this.fullUpdate();
      preferences.updateIdentities(await this.getAccounts());
    } finally {
      releaseLock();
    }
  }

  removeKeyringInner(removeKeyring: any) {
    const keyringController = privates.get(this).keyring;
    return new Promise((resolve) => {
      const validKeyrings = [];
      for (const keyring of keyringController.keyrings) {
        if (keyring !== removeKeyring) {
          validKeyrings.push(keyring);
        }
      }
      keyringController.keyrings = validKeyrings;
      resolve(true);
    }).then(keyringController.persistAllKeyrings.bind(keyringController, keyringController.password))
      .then(keyringController._updateMemStoreKeyrings.bind(keyringController))
      .then(keyringController.fullUpdate.bind(keyringController));
  }

  /**
   * Deallocates all secrets and locks the wallet
   *
   * @returns - Promise resolving to current state
   */
  async setLocked() {
    await privates.get(this).keyring.setLocked();
  }

  /**
   * Signs message by calling down into a specific keyring
   *
   * @param messageParams - PersonalMessageParams object to sign
   * @returns - Promise resolving to a signed message string
   */
  signMessage(messageParams: PersonalMessageParams) {
    return privates.get(this).keyring.signMessage(messageParams);
  }

  /**
   * Signs personal message by calling down into a specific keyring
   *
   * @param messageParams - PersonalMessageParams object to sign
   * @returns - Promise resolving to a signed message string
   */
  signPersonalMessage(messageParams: PersonalMessageParams) {
    return privates.get(this).keyring.signPersonalMessage(messageParams);
  }

  /**
   * Signs typed message by calling down into a specific keyring
   *
   * @param messageParams - TypedMessageParams object to sign
   * @param version - Compatibility version EIP712
   * @throws Will throw when passed an unrecognized version
   * @returns - Promise resolving to a signed message string or an error if any
   */
  async signTypedMessage(messageParams: TypedMessageParams, version: SignTypedDataVersion) {
    try {
      const address = normalizeAddress(messageParams.from);
      const { password } = privates.get(this).keyring;
      const privateKey = await this.exportAccount(password, address);
      const privateKeyBuffer = ethUtil.toBuffer(ethUtil.addHexPrefix(privateKey));
      switch (version) {
        case SignTypedDataVersion.V1:
          // signTypedDataLegacy will throw if the data is invalid.
          return signTypedDataLegacy(privateKeyBuffer, { data: messageParams.data as any });
        case SignTypedDataVersion.V3:
          return signTypedData(privateKeyBuffer, { data: JSON.parse(messageParams.data as string) });
        case SignTypedDataVersion.V4:
          return signTypedData_v4(privateKeyBuffer, {
            data: JSON.parse(messageParams.data as string),
          });
        default:
          throw new Error(`Unexpected signTypedMessage version: '${version}'`);
      }
    } catch (error) {
      throw new Error(`Keyring Controller signTypedMessage: ${error}`);
    }
  }

  /**
   * Signs a transaction by calling down into a specific keyring
   *
   * @param transaction - Transaction object to sign. Must be a `ethereumjs-tx` transaction instance.
   * @param from - Address to sign from, should be in keychain
   * @returns - Promise resolving to a signed transaction string
   */
  async signTransaction(transaction: unknown, from: string) {
    return privates.get(this).keyring.signTransaction(transaction, from);
  }

  /**
   * Attempts to decrypt the current vault and load its keyrings
   *
   * @param password - Password to unlock the keychain
   * @returns - Promise resolving to the current state
   */
  async submitPassword(password: string) {
    const preferences = this.context.PreferencesController as PreferencesController;
    await privates.get(this).keyring.submitPassword(password);
    await preferences.updateIdentities(await this.getAccounts());
    await this.fullUpdate();
  }

  async verifyPassword(password: string) {
    if (!this.state.vault) {
      throw new Error('Cannot unlock without a previous vault.');
    }
    if (!this.config.encryptor) {
      throw new Error('Invalid encryptor');
    }
    await this.config.encryptor.decrypt(password, this.state.vault);
    privates.get(this).keyring.password = password;
  }

  async revertVault(vault: string) {
    this.update({ vault });
    await privates.get(this).keyring.store.updateState({ vault });
  }

  /**
   * Adds new listener to be notified when the wallet is locked
   *
   * @param listener - Callback triggered when wallet is locked
   * @returns - EventEmitter if listener added
   */
  onLock(listener: () => void) {
    return privates.get(this).keyring.on('lock', listener);
  }

  /**
   * Adds new listener to be notified when the wallet is unlocked
   *
   * @param listener - Callback triggered when wallet is unlocked
   * @returns - EventEmitter if listener added
   */
  onUnlock(listener: () => void) {
    return privates.get(this).keyring.on('unlock', listener);
  }

  async changePassword(originalPassword: string, targetPassword: string) {
    if (privates.get(this).keyring.password !== originalPassword) {
      throw new Error('Invalid password');
    }
    await privates.get(this).keyring.persistAllKeyrings(targetPassword);
    await this.fullUpdate();
  }

  getPassword() {
    return privates.get(this).keyring.password;
  }

  /**
   * Verifies the that the seed phrase restores the current keychain's accounts
   *
   * @returns - Promise resolving if the verification succeeds
   */
  async verifySeedPhrase(): Promise<any> {
    const primaryKeyring = privates.get(this).keyring.keyrings[0];
    /* istanbul ignore if */
    if (!primaryKeyring) {
      throw new Error('No HD keyring found.');
    }

    const accounts = await primaryKeyring.getAccounts();
    /* istanbul ignore if */
    if (accounts.length === 0) {
      throw new Error('Cannot verify an empty keyring.');
    }

    let opts;
    if (primaryKeyring.type === KeyringTypes.hd) {
      const seedWords = (await primaryKeyring.serialize()).mnemonic;
      opts = {
        mnemonic: seedWords,
        numberOfAccounts: accounts.length,
      };
    } else {
      const privateKey = await privates.get(this).keyring.exportAccount(accounts[0]);
      opts = [privateKey];
    }

    const TestKeyringClass = privates.get(this).keyring.getKeyringClassForType(primaryKeyring.type);
    const testKeyring = new TestKeyringClass();
    await testKeyring.deserialize(opts);
    const testAccounts = await testKeyring.getAccounts();
    /* istanbul ignore if */
    if (testAccounts.length !== accounts.length) {
      throw new Error('Seed phrase imported incorrect number of accounts.');
    }

    testAccounts.forEach((account: string, i: number) => {
      /* istanbul ignore if */
      if (account.toLowerCase() !== accounts[i].toLowerCase()) {
        throw new Error('Seed phrase imported different accounts.');
      }
    });

    return opts;
  }

  /**
   * Update keyrings in state and calls KeyringController fullUpdate method returning current state
   *
   * @returns - Promise resolving to current state
   */
  async fullUpdate() {
    const keyrings: Keyring[] = [];
    const allKeyring = privates.get(this).keyring.keyrings;
    for (const keyring of allKeyring) {
      const keyringAccounts = await keyring.getAccounts();
      let accounts = Array.isArray(keyringAccounts)
        ? keyringAccounts.map((address) => ethUtil.toChecksumAddress(address))
        : /* istanbul ignore next */ [];
      accounts = this.getNormalAccounts(accounts);
      if (accounts.length > 0) {
        const index = allKeyring.indexOf(keyring);
        const targetKeyring: Keyring = {
          accounts,
          index,
          type: keyring.type,
        };
        keyrings.push(targetKeyring);
      }
    }
    this.update({ keyrings: [...keyrings] });
    if (!NetworkConfig[ChainType.Tron].Disabled) {
      await this.fullUpdateTronKeyrings();
    }
    await privates.get(this).keyring.fullUpdate();
  }

  async fullUpdateTronKeyrings() {
    try {
      await privates.get(this).tronKeyring.clearKeyrings();
      privates.get(this).tronKeyring.password = privates.get(this).keyring.password;
      const allKeyring = privates.get(this).keyring.keyrings;
      const tronEthereumPairs: TronEthereumPair[] = [];
      for (const keyring of allKeyring) {
        if (keyring.type === KeyringTypes.hd) {
          const keyringAccounts = await keyring.getAccounts();
          const opts = {
            mnemonic: keyring.mnemonic,
            numberOfAccounts: keyringAccounts.length,
            hdPath: `m/44'/195'/0'/0`,
          };
          const tronKeyring = await privates.get(this).tronKeyring.addNewKeyring(KeyringTypes.hd, opts);
          const tronKeyringAccounts = await tronKeyring.getAccounts();
          if (keyringAccounts.length === tronKeyringAccounts.length) {
            for (let i = 0; i < keyringAccounts.length; i++) {
              tronEthereumPairs.push({
                ethereum: keyringAccounts[i],
                tronHex: tronKeyringAccounts[i],
                tron: this.toTronAddress(tronKeyringAccounts[i]),
              });
            }
          }
        } else if (keyring.type === KeyringTypes.simple) {
          const keyringAccounts = await keyring.getAccounts();
          const privateKey = await keyring.exportAccount(normalizeAddress(keyringAccounts[0]));
          const tronKeyring = await privates.get(this).tronKeyring.addNewKeyring(KeyringTypes.simple, [privateKey]);
          const tronKeyringAccounts = await tronKeyring.getAccounts();
          tronEthereumPairs.push({
            ethereum: keyringAccounts[0],
            tronHex: tronKeyringAccounts[0],
            tron: this.toTronAddress(tronKeyringAccounts[0]),
          });
        }
      }
      logDebug('leon.w@fullUpdateTronKeyrings: ', tronEthereumPairs);
      this.update({ tronEthereumPairs });
    } catch (e) {
      logDebug('leon.w@fullUpdateTronKeyrings failed: ', e);
    }
  }

  toTronAddress(address: string) {
    try {
      const stripped = stripHexPrefix(address);
      const tronHex = `0x41${stripped}`;
      const tronHexBytes = arrayify(tronHex);
      const hash0Bytes = arrayify(sha256(tronHexBytes));
      const hash1Bytes = arrayify(sha256(hash0Bytes));
      const bytes = new Uint8Array(tronHexBytes.length + 4);
      bytes.set(tronHexBytes);
      bytes.set(hash1Bytes.slice(0, 4), tronHexBytes.length);
      return Base58.encode(bytes);
    } catch (e) {
      logDebug('leon.w@toTronAddress failed: ', address, e);
    }
    return '';
  }

  getNormalAccounts(accounts: string[]) {
    return accounts.filter((address) =>
      this.state.removeAccounts.findIndex((removeAddress) =>
        ethUtil.toChecksumAddress(address) === removeAddress) === -1);
  }

  getTronAddress(address: string) {
    try {
      const lowerCasedAddress = address.toLowerCase();
      for (const pair of this.state.tronEthereumPairs) {
        if (pair.tron && pair.ethereum && lowerCasedAddress === pair.ethereum.toLowerCase()) {
          return pair.tron;
        }
      }
    } catch (e) {
      logDebug('leon.w@getTronAddress failed: ', address, e);
    }
    return '';
  }

  private posLength = 0;

  private posSeed = '';

  resetTRGenerator(length: number) {
    this.posLength = length;
    this.posSeed = '';
  }

  appendToTRGenerator(x: number, y: number): {count: number; length: number; true_random: string[]; mnemonic: string} {
    if (this.posLength === 0) {
      throw new Error('resetTRGenerator should be called first.');
    }
    if (this.posSeed.length >= 4 * this.posLength) {
      throw new Error(`touches has already reached to number: ${this.posLength}.`);
    }
    // eslint-disable-next-line no-bitwise
    const xByte = (x | 0) % 256;
    // eslint-disable-next-line no-bitwise
    const yByte = (y | 0) % 256;
    this.posSeed += `00${xByte.toString(16)}`.slice(-2);
    this.posSeed += `00${yByte.toString(16)}`.slice(-2);

    const posSeedBytes = arrayify(`0x${this.posSeed}`);
    const hash0Bytes = arrayify(sha256(posSeedBytes));
    const hash1Bytes = arrayify(sha256(hash0Bytes));
    const bytes = new Uint8Array(64);
    bytes.set(hash0Bytes);
    bytes.set(hash1Bytes, hash0Bytes.length);
    const stringArray: string[] = [];
    bytes.forEach((b) => {
      stringArray.push(`00${b.toString(16)}`.slice(-2).toUpperCase());
    });

    let mnemonic = '';
    if (this.posSeed.length >= 4 * this.posLength) {
      const entropy = Buffer.alloc(16);
      entropy.set(randomBytes(8));
      entropy.set(hash0Bytes.slice(0, 4), 8);
      entropy.set(hash1Bytes.slice(0, 4), 12);
      mnemonic = entropyToMnemonic(entropy);
    }
    return { count: this.posSeed.length / 4, length: this.posLength, true_random: stringArray, mnemonic };
  }

  onComposed() {
    super.onComposed();
    privates.set(this, { keyring: new KeyringControllerImpl(Object.assign({ initState: { vault: this.state.vault } }, this.config)), tronKeyring: new KeyringControllerImpl(Object.assign({ initState: {} }, this.config)) });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    privates.get(this).keyring.store.subscribe(({ vault }) => {
      this.update({ vault });
    });
  }
}

export default KeyringController;
