import { EventEmitter } from 'events';
import Wallet from 'ethereumjs-wallet';
import { stripHexPrefix, bufferToHex, ecsign, hashPersonalMessage, toBuffer, keccak } from 'ethereumjs-util';
import { normalize, concatSig, personalSign, decrypt, signTypedDataLegacy, signTypedData, signTypedData_v4, getEncryptionPublicKey } from 'eth-sig-util';

const type = 'Simple Key Pair';

export class SimpleKeyring extends EventEmitter {

  type: string = type;

  wallets: any[] = [];

  constructor() {
    super();
    this.wallets = [];
  }

  serialize(): Promise<any> {
    return Promise.resolve(this.wallets.map((w) => w.getPrivateKey().toString('hex')));
  }

  async deserialize(privateKeys = []): Promise<any> {
    this.wallets = privateKeys.map((privateKey) => {
      const stripped = stripHexPrefix(privateKey);
      const buffer = Buffer.from(stripped, 'hex');
      const wallet = Wallet.fromPrivateKey(buffer);
      return wallet;
    });
    return Promise.resolve([]);
  }

  addAccounts(n = 1) {
    const newWallets = [];
    for (let i = 0; i < n; i++) {
      newWallets.push(Wallet.generate());
    }
    this.wallets = this.wallets.concat(newWallets);
    const hexWallets = newWallets.map((w) => bufferToHex(w.getAddress()));
    return Promise.resolve(hexWallets);
  }

  getAccounts() {
    return Promise.resolve(this.wallets.map((w) => bufferToHex(w.getAddress())));
  }

  // tx is an instance of the ethereumjs-transaction class.hdWallet
  signTransaction(address: string, tx: any, opts = {}) {
    const privKey = this.getPrivateKeyFor(address, opts);
    const signedTx = tx.sign(privKey);
    // Newer versions of Ethereumjs-tx are immutable and return a new tx object
    return Promise.resolve(signedTx === undefined ? tx : signedTx);
  }

  // For eth_sign, we need to sign arbitrary data:
  signMessage(address: string, data: any, opts = {}) {
    const message = stripHexPrefix(data);
    const privKey = this.getPrivateKeyFor(address, opts);
    const msgSig = ecsign(Buffer.from(message, 'hex'), privKey);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const rawMsgSig = concatSig(msgSig.v, msgSig.r, msgSig.s);
    return Promise.resolve(rawMsgSig);
  }

  // For eth_sign, we need to sign transactions:
  newGethSignMessage(withAccount: string, msgHex: string, opts = {}) {
    const privKey = this.getPrivateKeyFor(withAccount, opts);
    const msgBuffer = toBuffer(msgHex);
    const msgHash = hashPersonalMessage(msgBuffer);
    const msgSig = ecsign(msgHash, privKey);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const rawMsgSig = concatSig(msgSig.v, msgSig.r, msgSig.s);
    return Promise.resolve(rawMsgSig);
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage(address: string, msgHex: string, opts = {}) {
    const privKey = this.getPrivateKeyFor(address, opts);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const privKeyBuffer = Buffer.from(privKey, 'hex');
    const sig = personalSign(privKeyBuffer, { data: msgHex });
    return Promise.resolve(sig);
  }

  // For eth_decryptMessage:
  decryptMessage(withAccount: string, encryptedData: any) {
    const wallet = this._getWalletForAccount(withAccount);
    const privKey = stripHexPrefix(wallet.getPrivateKey());
    const sig = decrypt(encryptedData, privKey);
    return Promise.resolve(sig);
  }

  // personal_signTypedData, signs data along with the schema
  signTypedData(withAccount: string, typedData: string, opts = { version: 'V1' }) {
    switch (opts.version) {
      case 'V1':
        return this.signTypedData_v1(withAccount, typedData, opts);
      case 'V3':
        return this.signTypedData_v3(withAccount, typedData, opts);
      case 'V4':
        return this.signTypedData_v4(withAccount, typedData, opts);
      default:
        return this.signTypedData_v1(withAccount, typedData, opts);
    }
  }

  // personal_signTypedData, signs data along with the schema
  signTypedData_v1(withAccount: string, typedData: string, opts = {}) {
    const privKey = this.getPrivateKeyFor(withAccount, opts);
    const sig = signTypedDataLegacy(privKey, { data: typedData });
    return Promise.resolve(sig);
  }

  // personal_signTypedData, signs data along with the schema
  signTypedData_v3(withAccount: string, typedData: string, opts = {}) {
    const privKey = this.getPrivateKeyFor(withAccount, opts);
    const sig = signTypedData(privKey, { data: typedData });
    return Promise.resolve(sig);
  }

  // personal_signTypedData, signs data along with the schema
  signTypedData_v4(withAccount: string, typedData: string, opts = {}) {
    const privKey = this.getPrivateKeyFor(withAccount, opts);
    const sig = signTypedData_v4(privKey, { data: typedData });
    return Promise.resolve(sig);
  }

  // get public key for nacl
  getEncryptionPublicKey(withAccount: string, opts = {}) {
    const privKey = this.getPrivateKeyFor(withAccount, opts);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const publicKey = getEncryptionPublicKey(privKey);
    return Promise.resolve(publicKey);
  }

  getPrivateKeyFor(address: string, opts = {}) {
    if (!address) {
      throw new Error('Must specify address.');
    }
    const wallet = this._getWalletForAccount(address, opts);
    const privKey = toBuffer(wallet.getPrivateKey());
    return privKey;
  }

  // returns an address specific to an app
  getAppKeyAddress(address: string, origin: any) {
    if (
      !origin ||
      typeof origin !== 'string'
    ) {
      throw new Error(`'origin' must be a non-empty string`);
    }
    return new Promise((resolve, reject) => {
      try {
        const wallet = this._getWalletForAccount(address, {
          withAppKeyOrigin: origin,
        });
        const appKeyAddress = normalize(wallet.getAddress().toString('hex'));
        return resolve(appKeyAddress);
      } catch (e) {
        return reject(e);
      }
    });
  }

  // exportAccount should return a hex-encoded private key:
  exportAccount(address: string, opts = {}) {
    const wallet = this._getWalletForAccount(address, opts);
    return Promise.resolve(wallet.getPrivateKey().toString('hex'));
  }

  removeAccount(address: string) {
    if (!this.wallets.map((w) => bufferToHex(w.getAddress()).toLowerCase()).includes(address.toLowerCase())) {
      throw new Error(`Address ${address} not found in this keyring`);
    }
    this.wallets = this.wallets.filter((w) => bufferToHex(w.getAddress()).toLowerCase() !== address.toLowerCase());
  }

  /**
   * @private
   */
  _getWalletForAccount(account: string, opts: any = {}) {
    const address = normalize(account);
    let wallet = this.wallets.find((w) => bufferToHex(w.getAddress()) === address);
    if (!wallet) {
      throw new Error('Simple Keyring - Unable to find matching address.');
    }

    if (opts.withAppKeyOrigin) {
      const privKey = wallet.getPrivateKey();
      const appKeyOriginBuffer = Buffer.from(opts.withAppKeyOrigin, 'utf8');
      const appKeyBuffer = Buffer.concat([privKey, appKeyOriginBuffer]);
      const appKeyPrivKey = keccak(appKeyBuffer, 256);
      wallet = Wallet.fromPrivateKey(appKeyPrivKey);
    }

    return wallet;
  }

}

export default SimpleKeyring;
