import { hdkey } from 'ethereumjs-wallet';
import { mnemonicToSeed, generateMnemonic } from 'bip39';
import { normalize } from 'eth-sig-util';
import SimpleKeyring from './SimpleKeyring';

// Options:
const hdPathString = `m/44'/60'/0'/0`;
const type = 'HD Key Tree';

export class HdKeyring extends SimpleKeyring {

  type: string = type;

  mnemonic: string | null | undefined;

  hdPath: any;

  opts: any;

  root: any;

  hdWallet: any;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }

  serialize(): Promise<any> {
    return Promise.resolve({
      mnemonic: this.mnemonic,
      numberOfAccounts: this.wallets.length,
      hdPath: this.hdPath,
    });
  }

  async deserialize(opts: any = {}): Promise<any> {
    this.opts = opts || {};
    this.wallets = [];
    this.mnemonic = null;
    this.root = null;
    this.hdPath = opts.hdPath || hdPathString;

    if (opts.mnemonic) {
      await this._initFromMnemonic(opts.mnemonic);
    }

    if (opts.numberOfAccounts) {
      return this.addAccounts(opts.numberOfAccounts);
    }

    return Promise.resolve([]);
  }

  async addAccounts(numberOfAccounts = 1) {
    if (!this.root) {
      await this._initFromMnemonic(generateMnemonic());
    }

    const oldLen = this.wallets.length;
    const newWallets = [];
    for (let i = oldLen; i < numberOfAccounts + oldLen; i++) {
      const child = this.root.deriveChild(i);
      const wallet = child.getWallet();
      newWallets.push(wallet);
      this.wallets.push(wallet);
    }
    const hexWallets = newWallets.map((w) => {
      return normalize(w.getAddress().toString('hex'));
    });
    return Promise.resolve(hexWallets);
  }

  getAccounts() {
    return Promise.resolve(this.wallets.map((w) => {
      return normalize(w.getAddress().toString('hex'));
    }));
  }

  async _initFromMnemonic(mnemonic: string) {
    this.mnemonic = mnemonic;
    const seed = await mnemonicToSeed(mnemonic);
    this.hdWallet = hdkey.fromMasterSeed(seed);
    this.root = this.hdWallet.derivePath(this.hdPath);
  }
}

export default HdKeyring;
