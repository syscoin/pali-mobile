import TronWeb from 'tronweb';
import BigNumber from 'bignumber.js';
import { BaseConfig, BaseState } from '../BaseController';
import TronNetworkController from '../network/TronNetworkController';
import PreferencesController from '../user/PreferencesController';
import KeyringController from '../keyring/KeyringController';
import { CollectibleType, logDebug } from '../util';
import { BalanceMap, BN, stripHexPrefix } from '..';
import { BaseChainConfig } from '../Config';
import ContractController, { ERC1155METADATA_INTERFACE_ID, ERC721METADATA_INTERFACE_ID } from './ContractController';

interface TronConfig extends BaseConfig {
  selectedAddress: string;
  tronAddress: string;
}

export class TronContractController extends ContractController<TronConfig, BaseState> {
  name = 'TronContractController';

  protected tron_web: any;

  constructor(config?: Partial<BaseConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
      selectedAddress: '',
      tronAddress: '',
    };
    this.defaultState = {
    };
    this.initialize();
  }

  onL2NetworkChange(_provider: any, chainId: any) {
    const tronNetworkController = this.context.TronNetworkController as TronNetworkController;
    const { provider: { rpcTarget }, apiKey } = tronNetworkController.getNetworkConfig(chainId);
    this.l2_chainId = chainId;
    this.tron_web = new TronWeb({ fullHost: rpcTarget });
    if (this.config.tronAddress) {
      this.tron_web.setAddress(this.config.tronAddress);
    }
    if (apiKey) {
      this.tron_web.setHeader({ 'TRON-PRO-API-KEY': apiKey });
    }
  }

  // USDT: 41a614f803b6fd780986a42c78ec9c7f77e6ded13c -> TM1zzNDZD2DPASbKcgdVoTYhfmYgtfwx9R
  fromHex(address: string) {
    const stripped = stripHexPrefix(address);
    if (this.tron_web) {
      return this.tron_web.address.fromHex(stripped);
    }
    return '';
  }

  // USDT: TM1zzNDZD2DPASbKcgdVoTYhfmYgtfwx9R -> 41a614f803b6fd780986a42c78ec9c7f77e6ded13c
  toHex(address: string) {
    if (this.tron_web) {
      return this.tron_web.address.toHex(address);
    }
    return '';
  }

  async safelyGetTransactionReceipt(tx: string) {
    if (!tx || !this.tron_web) {
      return undefined;
    }
    try {
      const result = await this.tron_web.trx.getTransactionInfo(tx);
      return result;
    } catch (e) {
      logDebug(`leon.w@safelyGetTransactionReceipt@${this.name}: ${e}`);
      return undefined;
    }
  }

  async getTokenDecimals(address: string): Promise<string> {
    const contract = await this.tron_web.contract().at(address);
    const result = await contract.decimals().call();
    return result;
  }

  async getAssetSymbol(address: string): Promise<string> {
    const contract = await this.tron_web.contract().at(address);
    const result = await contract.symbol().call();
    return result;
  }

  async getSupportContract(contract: any, interfaceID: string) {
    const result = await contract.supportsInterface(interfaceID).call();
    return result;
  }

  // 不确定 TRON 上 ERC1155METADATA_INTERFACE_ID、 ERC721METADATA_INTERFACE_ID 是否和以太坊一致
  async getCollectibleType(address: string) {
    const contract = await this.tron_web.contract().at(address);
    const supportErc1155 = await this.getSupportContract(contract, ERC1155METADATA_INTERFACE_ID);
    if (supportErc1155) {
      return CollectibleType.ERC1155;
    }
    const supportErc721 = await this.getSupportContract(contract, ERC721METADATA_INTERFACE_ID);
    if (supportErc721) {
      return CollectibleType.ERC721;
    }
    return CollectibleType.UNKNOWN;
  }

  async getCollectibleERC721URI(address: string, tokenId: string) {
    const contract = await this.tron_web.contract().at(address);
    const result = await contract.tokenURI(tokenId).call();
    return result;
  }

  async getCollectibleERC1155URI(address: string, tokenId: string) {
    const result = await this.getCollectibleERC721URI(address, tokenId);
    return result;
  }

  async getOwnerOf(address: string, tokenId: string) {
    const contract = await this.tron_web.contract().at(address);
    const result = await contract.ownerOf(tokenId).call();
    return result;
  }

  async getCollectibleBalanceOf(address: string, owner: string, tokenId: string): Promise<BigNumber> {
    const contract = await this.tron_web.contract().at(address);
    const result = await contract.balanceOf(owner, tokenId).call();
    return result;
  }

  async getBalancesInSingleCall(selectedAddress: string, tokensToDetect: string[], returnZeroBalance = false): Promise<BalanceMap> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.balances_address;
    if (!ADDRESS || !this.tron_web) {
      return {};
    }
    const allBalances: BalanceMap = {};
    try {
      const contract = await this.tron_web.contract().at(ADDRESS);
      const result = await contract.balances([selectedAddress], tokensToDetect).call();
      if (result.length > 0) {
        tokensToDetect.forEach((tokenAddress, index) => {
          const balance: BN = new BN(result[index].toString());
          /* istanbul ignore else */
          if (returnZeroBalance || !balance.isZero()) {
            allBalances[tokenAddress] = balance;
          }
        });
      }
    } catch (error) {
      logDebug('getBalancesInSingleCall error --> ', error);
    }
    return allBalances;
  }

  async getERC1155BalancesInSingleCall(selectedAddress: string, tokens: string[], ids: string[]): Promise<BigNumber[]> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.nftbalances_address;
    if (!ADDRESS || !this.tron_web) {
      return [];
    }
    try {
      const contract = await this.tron_web.contract().at(ADDRESS);
      const result = await contract.balances([selectedAddress], tokens, ids).call();
      return result;
    } catch (error) {
      return [];
    }
  }

  async getERC721OwnersInSingleCall(selectedAddress: string, tokens: string[], ids: string[]): Promise<string[]> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.nftbalances_address;
    if (!ADDRESS || !this.tron_web) {
      return [];
    }
    try {
      const contract = await this.tron_web.contract().at(ADDRESS);
      const result = await contract.owners([selectedAddress], tokens, ids).call();
      return result;
    } catch (error) {
      return [];
    }
  }

  async getAllowancesInSingleCall(tokens: string[], spenders: string[], selectedAddress: string) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.tokeninfos_address;
    if (!ADDRESS || !this.tron_web) {
      return [];
    }
    let result: any[] = [];
    try {
      const contract = await this.tron_web.contract().at(ADDRESS);
      for (let i = 0; i <= tokens.length / 200; i++) {
        const subTokens = tokens.slice(i * 250, (i + 1) * 250);
        const subSpenders = spenders.slice(i * 250, (i + 1) * 250);
        const ret = await contract.getTokenAllowance(subTokens, subSpenders, selectedAddress).call();
        const allowances: string[] = [];
        if (ret && ret.length > 0) {
          ret.forEach((v: any) => {
            allowances.push(v.toString());
          });
        }
        result = [...result, ...allowances];
      }
    } catch (error) {
      logDebug(`getAllowancesInSingleCall(${selectedAddress}, ${this.l2_chainId}: `, error);
    }
    return result;
  }

  async getBalanceOf(address: string, selectedAddress: string): Promise<BN> {
    try {
      const contract = await this.tron_web.contract().at(address);
      const result = await contract.balanceOf(selectedAddress).call();
      return new BN(stripHexPrefix(result.toHexString()), 16);
    } catch (e) {
      logDebug('leon.w@ getBalanceOf failed: ', address, selectedAddress, e);
      return new BN(0);
    }
  }

  async callApprove(tokenAddress: string, spender: string, amount: string, myAddress: string, origin: string): Promise<boolean> {
    const contract = await this.tron_web.contract().at(tokenAddress);
    try {
      const result = await contract.approve(spender, amount).send({ from: myAddress, chainId: this.l2_chainId, origin });
      logDebug(`callApprove(${tokenAddress}, ${amount}, ${spender}, ${origin}: `, result);
      return true;
    } catch (error) {
      logDebug(`callApprove(${tokenAddress}, ${amount}, ${spender}, ${origin}: `, error);
      throw error;
    }
  }

  beforeOnComposed() {
    super.beforeOnComposed();
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    this.configure({ selectedAddress });
  }

  onComposed() {
    super.onComposed();
    const preferences = this.context.PreferencesController as PreferencesController;
    const keyring = this.context.KeyringController as KeyringController;
    preferences.subscribe(({ selectedAddress }) => {
      const actualSelectedAddress = this.config.selectedAddress;
      if (actualSelectedAddress === selectedAddress) {
        return;
      }
      this.configure({ selectedAddress, tronAddress: keyring.getTronAddress(selectedAddress) });
      if (this.tron_web && this.config.tronAddress) {
        this.tron_web.setAddress(this.config.tronAddress);
      }
    }, ['selectedAddress']);
  }
}

export default TronContractController;
