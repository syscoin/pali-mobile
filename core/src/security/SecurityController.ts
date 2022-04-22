import { Mutex } from 'async-mutex';
import {handleFetch, isRpcChainType, logDebug, safelyExecute, toLowerCaseEquals, useTestServer} from '../util';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import AssetsController, { TokenNoChange } from '../assets/AssetsController';
import {ChainType} from "../assets/TokenRatesController";

export enum SecurityChangedType {
  NoChange = 0x00,
  TokensChanged = 0x01,
  NftsChanged = 0x02,
  RedDotChanged = 0x03,
  SubmittedChanged = 0x04,
}

export interface SecurityContent {
  name: string;
  type: string; // "1":normal; "2":notice; "3":risk;
}

export interface Holder {
  address: string;
  is_locked: number;
  tag: string;
  is_contract: number;
  balance: string;
  percent: string;
}

export interface Dex {
  name: string;
  liquidity: string;
  pair: string;
}

export interface SecurityToken {
  chainId: string;
  address: string;
  is_blacklisted: string;
  is_in_dex: string;
  is_mintable: string;
  is_open_source: string;
  is_proxy: string;
  slippage_modifiable: string;
  buy_tax: string;
  can_take_back_ownership: string;
  is_true_token: string;
  is_airdrop_scam: string;
  holder_count: string;
  is_anti_whale: string;
  is_honeypot: string;
  is_whitelisted: string;
  lp_holder_count: string;
  lp_total_supply: string;
  owner_address: string;
  sell_tax: string;
  total_supply: string;
  transfer_pausable: string;
  trust_list: string;
  dex: Dex[];
  holders: Holder[];
  lp_holders: Holder[];
  normal: SecurityContent[];
  notice: SecurityContent[];
  risk: SecurityContent[];
  isTrust: boolean
}

export interface SecurityNft {
  address: string;
  chain: number;
  website: string;
  name: string;
}

export interface SecurityState extends BaseState {
  securityTokens: SecurityToken[];
  updateTime: number;
  redDotDataMaps: { [key: string]: RedDotData };
  lastRiskBubbleTimestamp: number;
  securityNfts: SecurityNft[];
  changedType: SecurityChangedType;
  updateVersion: number; // The structure of securityTokens changes, use this field to distinguish
}

export interface RedDotData {
  lastRiskList: TokenSummary[];
  newRiskList: TokenSummary[];
}

export interface TokenSummary {
  address: string;
  chainId: string;
}

export interface SecurityConfig extends BaseConfig {
  interval: number;
  acceptLanguage: string;
  popInterval: number;
}

export class SecurityController extends BaseController<SecurityConfig, SecurityState> {
  private mutex = new Mutex();

  name = 'SecurityController';

  requiredControllers = ['AssetsController'];

  private polling_counter = 0;

  private handle?: NodeJS.Timer;

  private getGoServerURL() {
    return useTestServer() ? 'https://go.libsss.com/api/' : 'https://go.morpheuscommunity.net/api/';
  }

  private getSecurityURL() {
    return `https://api.gopluslabs.io/api/v1/`;
  }

  constructor(config?: Partial<SecurityConfig>, state?: Partial<SecurityState>) {
    super(config, state);
    this.defaultConfig = { interval: 10 * 60 * 1000, acceptLanguage: 'en', popInterval: 60 * 60 * 1000 };
    this.defaultState = {
      lastRiskBubbleTimestamp: 0,
      securityTokens: [],
      updateTime: 0,
      redDotDataMaps: {},
      securityNfts: [],
      changedType: SecurityChangedType.NoChange,
      updateVersion: 0
    };
    this.initialize();
  }

  private async fetchSecurityData(addressArray: string[], chainId: string): Promise<any | undefined> {
    if (!addressArray || !chainId || addressArray.length === 0) {
      return undefined;
    }
    try {
      let addressAppend = '';
      addressArray.forEach((addr) => {
        addressAppend += `${addr},`;
      });
      addressAppend = addressAppend.substr(0, addressAppend.length - 1);
      const url = `${this.getSecurityURL()}token_security/${chainId}?contract_addresses=${addressAppend}`;
      const response = await handleFetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': this.config.acceptLanguage,
        },
      });
      return response?.result;
    } catch (e) {
      logDebug('cyh@fetchInfo error: ', e);
    }
    return undefined;
  }

  public async updateFetch() {
    const assetsController = this.context.AssetsController as AssetsController;

    const tokenArray = [];
    const allSecurityTokens: any[] = [];

    const { allTokens } = assetsController.state;
    for (const type in this.networks) {
      const chainType = Number(type);
      if (chainType === ChainType.RPCBase) {
        continue;
      }
      const chainId = this.networks[type].getMainChainId();
      const addressArray: string[] = [];

      for (const addressKey in allTokens) {
        const tokens = allTokens[addressKey]?.[chainId] || [];
        for (const token of tokens) {
          if (!addressArray.includes(token.address)) {
            addressArray.push(token.address);
            tokenArray.push({ address: token.address, chainId });
          }
        }
      }
      if (addressArray.length === 0) {
        continue;
      }
      const securityTokens = await this.fetchInfo(addressArray, chainId);
      allSecurityTokens.push(...securityTokens)
    }

    const newSecurityTokens = [...allSecurityTokens];
    const oldSecurityTokens = this.state.securityTokens;
    if (oldSecurityTokens && oldSecurityTokens.length > 0) {
      oldSecurityTokens.forEach((oldToken) => {
        const findToken = allSecurityTokens.find((token: { address: string; chainId: string }) => toLowerCaseEquals(oldToken.address, token.address) && oldToken.chainId === token.chainId);
        if (!findToken) {
          newSecurityTokens.push(oldToken);
        }
      });
    }

    const newRedDotDataMap = this.updateRedDotData(newSecurityTokens);
    this.update({
      redDotDataMaps: newRedDotDataMap,
      securityTokens: newSecurityTokens, updateTime: Date.now(),
      changedType: SecurityChangedType.TokensChanged,
    });
  }

  private isNewRiskToken(tokenList: any[], address: string, lastRiskList: any[], chainId: string) {
    const isUserAssets = tokenList.find((t) => toLowerCaseEquals(t.address, address));
    if (isUserAssets) {
      const inLastRiskList = lastRiskList.find((t) => toLowerCaseEquals(t.address, address) && t.chainId === chainId);
      if (!inLastRiskList) {
        return true;
      }
    }
    return false;
  }

  updateRedDotData(securityTokens: SecurityToken[]) {
    const riskTokens = securityTokens.filter((t) => (t.risk && t.risk.length > 0) || (t.notice && t.notice.length > 0));
    const assetsController = this.context.AssetsController as AssetsController;
    const { allTokens } = assetsController.state;
    const accounts = Object.keys(allTokens);
    const newRedDotDataMap: { [key: string]: RedDotData } = {};
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < accounts.length; i++) {
      const oldRedDotData = this.state.redDotDataMaps[accounts[i]];
      const lastRiskList = oldRedDotData?.lastRiskList || [];
      const newRiskList: any = [];
      riskTokens.forEach((token) => {
        const { address } = token;
        const tokens = allTokens[accounts[i]]?.[token.chainId] || [];
        if (this.isNewRiskToken(tokens, address, lastRiskList, token.chainId)) {
          newRiskList.push({ address, chainId: token.chainId });
        }
      });
      newRedDotDataMap[accounts[i]] = {
        lastRiskList,
        newRiskList,
      };
    }
    return newRedDotDataMap;
  }

  private mapResultList(tokenArray: any[], listData: any, chainId: string) {
    if (!listData || !tokenArray || !chainId) {
      return [];
    }
    const securityTokens: any[] = [];
    tokenArray.forEach((address: string) => {
      const data = listData[address.toLowerCase()];
      if (data) {
        const normal: SecurityContent[] = [];
        const notice: SecurityContent[] = [];
        const risk: SecurityContent[] = [];
        if (data.is_open_source === '1') {
          normal.push({ name: 'is_open_source', type: '1' });
        } else if (data.is_open_source === '0') {
          risk.push({ name: 'is_open_source', type: '3' });
        }
        if (data.is_proxy === '1') {
          notice.push({ name: 'is_proxy', type: '2' });
        } else if (data.is_proxy === '0') {
          normal.push({ name: 'is_proxy', type: '1' });
        }
        if (data.is_mintable === '1') {
          notice.push({ name: 'is_mintable', type: '2' });
        } else if (data.is_mintable === '0') {
          normal.push({ name: 'is_mintable', type: '1' });
        }
        if (data.slippage_modifiable === '1') {
          notice.push({ name: 'slippage_modifiable', type: '2' });
        } else if (data.slippage_modifiable === '0') {
          normal.push({ name: 'slippage_modifiable', type: '1' });
        }
        if (data.is_honeypot === '1') {
          risk.push({ name: 'is_honeypot', type: '3' });
        } else if (data.is_honeypot === '0') {
          normal.push({ name: 'is_honeypot', type: '1' });
        }
        if (data.transfer_pausable === '1') {
          notice.push({ name: 'transfer_pausable', type: '2' });
        } else if (data.transfer_pausable === '0') {
          normal.push({ name: 'transfer_pausable', type: '1' });
        }
        if (data.is_blacklisted === '1') {
          notice.push({ name: 'is_blacklisted', type: '2' });
        } else if (data.is_blacklisted === '0') {
          normal.push({ name: 'is_blacklisted', type: '1' });
        }
        if (data.is_whitelisted === '1') {
          notice.push({ name: 'is_whitelisted', type: '2' });
        } else if (data.is_whitelisted === '0') {
          normal.push({ name: 'is_whitelisted', type: '1' });
        }
        if (data.is_in_dex === '1') {
          normal.push({ name: 'is_in_dex', type: '1' });
        } else if (data.is_in_dex === '0') {
          notice.push({ name: 'is_in_dex', type: '2' });
        }
        if (data.is_true_token === '1') {
          normal.push({ name: 'is_true_token', type: '1' });
        } else if (data.is_true_token === '0') {
          risk.push({ name: 'is_true_token', type: '3' });
        }
        if (data.is_airdrop_scam === '1') {
          risk.push({ name: 'is_airdrop_scam', type: '3' });
        } else if (data.is_airdrop_scam === '0') {
          normal.push({ name: 'is_airdrop_scam', type: '1' });
        }
        securityTokens.push({ address, chainId, normal, notice, risk, ...data, isTrust: data.trust_list === '1' });
      }
    });
    return securityTokens;
  }

  public async fetchInfo(tokenArray: any[], chainId: string) {
    let securityTokens: any[] = [];
    if (!tokenArray || tokenArray.length === 0 || !chainId) {
      return securityTokens;
    }

    if (tokenArray.length <= 100) {
      const listData = await this.fetchSecurityData(tokenArray, chainId);
      securityTokens = securityTokens.concat(this.mapResultList(tokenArray, listData, chainId));
    } else {
      for (let i = 0; i <= tokenArray.length / 100; i++) {
        const subTokens = tokenArray.slice(i * 100, (i + 1) * 100);
        const listData = await this.fetchSecurityData(subTokens, chainId);
        securityTokens = securityTokens.concat(this.mapResultList(subTokens, listData, chainId));
      }
    }
    return securityTokens;
  }

  /**
   * 在用户新增risk气泡消失时调用
   */
  public onNewRiskBubbleShown() {
    this.update({ lastRiskBubbleTimestamp: Date.now(), changedType: SecurityChangedType.RedDotChanged });
  }

  public hideNewRiskRedDot(address: string) {
    const { redDotDataMaps } = this.state;
    if (redDotDataMaps[address]) {
      const redDotData = redDotDataMaps[address];
      redDotDataMaps[address] = {
        lastRiskList: [...redDotData.lastRiskList, ...redDotData.newRiskList],
        newRiskList: [],
      };
      this.update({
        redDotDataMaps: { ...redDotDataMaps },
        changedType: SecurityChangedType.RedDotChanged,
      });
    }
  }

  public async refresh(forceCheck: boolean) {
    const tokenBalancesController = this.context.TokenBalancesController;
    if (tokenBalancesController?.config.backgroundMode) {
      return;
    }
    if (forceCheck || Date.now() - this.state.updateTime > this.config.interval / 2) {
      await safelyExecute(() => this.updateFetch());
    }
  }

  async poll(force = false, interval?: number): Promise<void> {
    if (this.polling_counter > 1) {
      return;
    }
    this.polling_counter += 1;
    interval && this.configure({ interval }, false, false);
    this.handle && clearTimeout(this.handle);
    await this.refresh(force);
    this.polling_counter -= 1;
    if (this.polling_counter > 0) {
      return;
    }
    this.handle = setTimeout(() => {
      this.poll(false, this.config.interval);
    }, this.config.interval);
  }

  onComposed() {
    super.onComposed();
    const assets = this.context.AssetsController as AssetsController;
    assets.subscribe(async ({ tokenChangedType }) => {
      if (tokenChangedType === TokenNoChange && !isRpcChainType(tokenChangedType)) {
        await this.poll(true);
      }
    });
    setTimeout(() => this.poll(), 10000);
    setTimeout(() => this.loadNftWhitelist(), 2000);
  }

  public async fastCheck(chainId: string, address: string) {
    if (!chainId || !address) {
      return undefined;
    }
    const releaseLock = await this.mutex.acquire();
    try {
      const { securityTokens } = this.state;
      if (securityTokens && securityTokens.length > 0) {
        const findToken = securityTokens.find((token) => toLowerCaseEquals(token.address, address) && token.chainId === chainId);
        if (findToken) {
          return findToken;
        }
      }
      const tokens = await this.fetchInfo([address], chainId);
      const newSecurityTokens = [...securityTokens, ...tokens];
      this.update({
        securityTokens: newSecurityTokens,
      });
      return tokens && tokens.length > 0 ? tokens[0] : undefined;
    } catch (e) {
      logDebug('cyh@fastCheck error: ', e);
    } finally {
      releaseLock();
    }
    return undefined;
  }

  /**
   * check address safty
   * @param address
   * @param chain
   * @returns {
   *  type: number, //type: 0:未知，1：白名单，2：黑名单，3：合约地址
   *  desc: string
   * }
   */
  public async checkAddress(address: string, chain: number): Promise<any> {
    try {
      const url = `${this.getGoServerURL()}v2/index/checkAddress`;
      console.log('checkAddress url --> ', url);
      const response = await handleFetch(url, {
        method: 'POST',
        body: JSON.stringify({ address, chain }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': this.config.acceptLanguage,
        },
      });
      const { code, data } = response;
      if (code === 200) {
        return data;
      }
      return { type: 0, desc: '' };
    } catch (e) {
      logDebug('checkAddress error: ', e);
    }
    return { type: 0, desc: '' };
  }

  public async loadNftWhitelist() {
    try {
      const url = `${this.getGoServerURL()}v1/index/getNft`;
      const response = await handleFetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': this.config.acceptLanguage,
        },
      });
      const { code, data } = response;
      if (code === 200) {
        this.update({ securityNfts: data, changedType: SecurityChangedType.NftsChanged });
      }
    } catch (e) {
      logDebug('loadNftWhitelist error: ', e);
    }
  }

  rehydrate(state: Partial<SecurityState>) {
    const newState = { ...state };
    if (newState.updateVersion === 1) {
      super.rehydrate(newState);
    } else {
      newState.updateVersion = 1;
      newState.updateTime = 0;
      newState.securityTokens = [];
      this.update(newState);
    }
  }
}
export default SecurityController;
