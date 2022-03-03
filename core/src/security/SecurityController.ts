import { Mutex } from 'async-mutex';
import { bitAND, handleFetch, logDebug, safelyExecute, toLowerCaseEquals, useTestServer } from '../util';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import AssetsController, { TokenChangedType } from '../assets/AssetsController';
import NetworkController from '../network/NetworkController';
import BscNetworkController from '../network/BscNetworkController';
import PolygonNetworkController from '../network/PolygonNetworkController';
import KeyringController from '../keyring/KeyringController';
import ArbNetworkController from '../network/ArbNetworkController';
import HecoNetworkController from '../network/HecoNetworkController';
import OpNetworkController from '../network/OpNetworkController';
import AvaxNetworkController from '../network/AvaxNetworkController';

export enum SecurityChangedType {
  NoChange = 0x00,
  TokensChanged = 0x01,
  NftsChanged = 0x02,
  RedDotChanged = 0x03,
  SubmittedChanged = 0x04,
}

export interface IData {
  eth: ISecurityData[];
  bsc: ISecurityData[];
  polygon: ISecurityData[];
  arbitrum: ISecurityData[];
  heco: ISecurityData[];
  optimism: ISecurityData[];
  avalanche: ISecurityData[];
  new: string; // 字符串类型的数字
}

export interface ISecurityData {
  address: string;
  disclaimer_desc: string;
  website: string;
  detect_status: number;
  options: {
    normal: SecurityContent[];
    notice: SecurityContent[];
    risk: SecurityContent[];
  };
}

export interface SecurityContent {
  name: string;
  desc: string;
  type: string; // "1":normal; "2":notice; "3":risk;
  o_type: string; // "0", "1", "2"
}

export interface SecurityToken {
  isRobotDetected: boolean;
  chainId: string;
  address: string;
  disclaimer: string;
  website: string;
  normal: SecurityContent[];
  notice: SecurityContent[];
  risk: SecurityContent[];
}

export interface SecurityNft {
  address: string;
  chain: number;
  website: string;
  name: string;
}

export interface SecurityState extends BaseState {
  securityTokens: SecurityToken[];
  submittedTokens: { [key: string]: string[] };
  updateTime: number;
  redDotDataMaps: { [key: string]: RedDotData };
  lastRiskBubbleTimestamp: number;
  securityNfts: SecurityNft[];
  changedType: SecurityChangedType;
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

  requiredControllers = ['AssetsController', 'NetworkController'];

  private polling_counter = 0;

  private handle?: NodeJS.Timer;

  private getServerURL() {
    return useTestServer() ? 'https://miaoqiang.libsss.com/api/v1/' : 'https://uniswap.morpheuscommunity.net/api/v1/';
  }

  private getGoServerURL() {
    return useTestServer() ? 'https://go.libsss.com/api/' : 'https://go.morpheuscommunity.net/api/';
  }

  private getSecurityURL() {
    return `${this.getServerURL()}open/safety`;
  }

  constructor(config?: Partial<SecurityConfig>, state?: Partial<SecurityState>) {
    super(config, state);
    this.defaultConfig = { interval: 10 * 60 * 1000, acceptLanguage: 'en', popInterval: 60 * 60 * 1000 };
    this.defaultState = {
      lastRiskBubbleTimestamp: 0,
      securityTokens: [],
      updateTime: 0,
      submittedTokens: {},
      redDotDataMaps: {},
      securityNfts: [],
      changedType: SecurityChangedType.NoChange,
    };
    this.initialize();
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line consistent-return
  public async fetchInfo(addressArray: string[], bscAddressArray: string[],
    polygonAddressArray: string[], arbAddressArray: string[], hecoAddressArray: string[],
    opAddressArray: string[], avaxAddressArray: string[]): Promise<IData | undefined> {
    try {
      const url = this.getSecurityURL();
      const keyringController = this.context.KeyringController as KeyringController;
      const accounts = await keyringController.getAccounts();
      const response = await handleFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          address: addressArray,
          bsc_address: bscAddressArray,
          polygon_address: polygonAddressArray,
          arbitrum_address: arbAddressArray,
          heco_address: hecoAddressArray,
          optimism_address: opAddressArray,
          avalanche_address: avaxAddressArray,
          user_address: accounts.length > 0 ? accounts[0] : '',
        }),
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
    } catch (e) {
      logDebug('leon.w@fetchInfo error: ', e);
    }
    return undefined;
  }

  public async updateFetch() {
    const assetsController = this.context.AssetsController as AssetsController;
    const networkController = this.context.NetworkController as NetworkController;
    const bscNetworkController = this.context.BscNetworkController as BscNetworkController;
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const hecoNetworkController = this.context.HecoNetworkController as HecoNetworkController;
    const opNetworkController = this.context.OpNetworkController as OpNetworkController;
    const avaxNetworkController = this.context.AvaxNetworkController as AvaxNetworkController;
    const chainId = networkController.getMainChainId();
    const bscChainId = bscNetworkController.getMainChainId();
    const polygonChainId = polygonNetworkController.getMainChainId();
    const arbChainId = arbNetworkController.getMainChainId();
    const hecoChainId = hecoNetworkController.getMainChainId();
    const opChainId = opNetworkController.getMainChainId();
    const avaxChainId = avaxNetworkController.getMainChainId();

    const tokenArray = [];
    const addressArray: string[] = [];
    const { allTokens } = assetsController.state;
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[chainId] || [];
      for (const token of tokens) {
        if (!addressArray.includes(token.address)) {
          addressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId });
        }
      }
    }
    const bscAddressArray: string[] = [];
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[bscChainId] || [];
      for (const token of tokens) {
        if (!bscAddressArray.includes(token.address)) {
          bscAddressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId: bscChainId });
        }
      }
    }
    const polygonAddressArray: string[] = [];
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[polygonChainId] || [];
      for (const token of tokens) {
        if (!polygonAddressArray.includes(token.address)) {
          polygonAddressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId: polygonChainId });
        }
      }
    }
    const arbAddressArray: string[] = [];
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[arbChainId] || [];
      for (const token of tokens) {
        if (!arbAddressArray.includes(token.address)) {
          arbAddressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId: arbChainId });
        }
      }
    }
    const hecoAddressArray: string[] = [];
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[hecoChainId] || [];
      for (const token of tokens) {
        if (!hecoAddressArray.includes(token.address)) {
          hecoAddressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId: hecoChainId });
        }
      }
    }

    const opAddressArray: string[] = [];
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[opChainId] || [];
      for (const token of tokens) {
        if (!opAddressArray.includes(token.address)) {
          opAddressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId: opChainId });
        }
      }
    }

    const avaxAddressArray: string[] = [];
    for (const addressKey in allTokens) {
      const tokens = allTokens[addressKey]?.[avaxChainId] || [];
      for (const token of tokens) {
        if (!avaxAddressArray.includes(token.address)) {
          avaxAddressArray.push(token.address);
          tokenArray.push({ address: token.address, chainId: avaxChainId });
        }
      }
    }

    if (addressArray.length === 0 && bscAddressArray.length === 0 &&
      polygonAddressArray.length === 0 && arbAddressArray &&
      hecoAddressArray.length === 0 && opAddressArray.length === 0 && avaxAddressArray.length === 0) {
      return;
    }
    const chainIdList = { chainId, bscChainId, polygonChainId, arbChainId, hecoChainId, opChainId, avaxChainId };
    let securityTokens: any[] = [];
    if (tokenArray.length <= 150) {
      const params = {
        addressArray,
        bscAddressArray,
        polygonAddressArray,
        arbAddressArray,
        hecoAddressArray,
        opAddressArray,
        avaxAddressArray,
        ...chainIdList,
      };
      securityTokens = await this.fetchPart(params);
    } else {
      for (let i = 0; i <= tokenArray.length / 150; i++) {
        const subTokens = tokenArray.slice(i * 150, (i + 1) * 150);
        const ethAddrs = subTokens.filter((e) => e.chainId === chainId).map((e) => e.address);
        const bscAddrs = subTokens.filter((e) => e.chainId === bscChainId).map((e) => e.address);
        const polygonAddrs = subTokens.filter((e) => e.chainId === polygonChainId).map((e) => e.address);
        const arbAddrs = subTokens.filter((e) => e.chainId === arbChainId).map((e) => e.address);
        const hecoAddrs = subTokens.filter((e) => e.chainId === hecoChainId).map((e) => e.address);
        const opAddrs = subTokens.filter((e) => e.chainId === opChainId).map((e) => e.address);
        const avaxAddrs = subTokens.filter((e) => e.chainId === avaxChainId).map((e) => e.address);
        const params = {
          addressArray: ethAddrs,
          bscAddressArray: bscAddrs,
          polygonAddressArray: polygonAddrs,
          arbAddressArray: arbAddrs,
          hecoAddressArray: hecoAddrs,
          opAddressArray: opAddrs,
          avaxAddressArray: avaxAddrs,
          ...chainIdList,
        };
        const ret = await this.fetchPart(params);
        securityTokens = [...securityTokens, ...ret];
      }
    }
    const newRedDotDataMap = this.updateRedDotData(securityTokens, chainIdList);
    this.update({
      redDotDataMaps: newRedDotDataMap,
      securityTokens, updateTime: Date.now(),
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

  updateRedDotData(securityTokens: SecurityToken[], params: any) {
    const riskTokens = securityTokens.filter((t) => (t.risk && t.risk.length > 0) || (t.notice && t.notice.length > 0));
    const { chainId, bscChainId, polygonChainId, arbChainId, hecoChainId, opChainId, avaxChainId } = params;
    const assetsController = this.context.AssetsController as AssetsController;
    const { allTokens } = assetsController.state;
    const accounts = Object.keys(allTokens);
    const newRedDotDataMap: { [key: string]: RedDotData } = {};
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < accounts.length; i++) {
      const oldRedDotData = this.state.redDotDataMaps[accounts[i]];
      const lastRiskList = oldRedDotData?.lastRiskList || [];
      const ethTokens = allTokens[accounts[i]]?.[chainId] || [];
      const bscTokens = allTokens[accounts[i]]?.[bscChainId] || [];
      const polygonTokens = allTokens[accounts[i]]?.[polygonChainId] || [];
      const arbTokens = allTokens[accounts[i]]?.[arbChainId] || [];
      const hecoTokens = allTokens[accounts[i]]?.[hecoChainId] || [];
      const opTokens = allTokens[accounts[i]]?.[opChainId] || [];
      const avaxTokens = allTokens[accounts[i]]?.[avaxChainId] || [];
      const newRiskList: any = [];
      riskTokens.forEach((token) => {
        const { address } = token;
        if (token.chainId === chainId) {
          if (this.isNewRiskToken(ethTokens, address, lastRiskList, chainId)) {
            newRiskList.push({ address, chainId });
          }
        } else if (token.chainId === bscChainId) {
          if (this.isNewRiskToken(bscTokens, address, lastRiskList, bscChainId)) {
            newRiskList.push({ address, chainId: bscChainId });
          }
        } else if (token.chainId === polygonChainId) {
          if (this.isNewRiskToken(polygonTokens, address, lastRiskList, polygonChainId)) {
            newRiskList.push({ address: token.address, chainId: polygonChainId });
          }
        } else if (token.chainId === arbChainId) {
          if (this.isNewRiskToken(arbTokens, address, lastRiskList, arbChainId)) {
            newRiskList.push({ address, chainId: arbChainId });
          }
        } else if (token.chainId === hecoChainId) {
          if (this.isNewRiskToken(hecoTokens, address, lastRiskList, hecoChainId)) {
            newRiskList.push({ address, chainId: hecoChainId });
          }
        } else if (token.chainId === opChainId) {
          if (this.isNewRiskToken(opTokens, address, lastRiskList, opChainId)) {
            newRiskList.push({ address, chainId: opChainId });
          }
        } else if (token.chainId === avaxChainId) {
          if (this.isNewRiskToken(avaxTokens, address, lastRiskList, avaxChainId)) {
            newRiskList.push({ address, chainId: avaxChainId });
          }
        }
      });
      newRedDotDataMap[accounts[i]] = {
        lastRiskList,
        newRiskList,
      };
    }
    return newRedDotDataMap;
  }

  private mapResultList(list: ISecurityData[], chainId: string) {
    return list.map((data) => {
      const { address, options, disclaimer_desc, website, detect_status } = data;
      const { normal, notice, risk } = options;
      const disclaimer = disclaimer_desc;
      const isRobotDetected = detect_status === 1;
      return { chainId, address, normal, notice, risk, website, disclaimer, isRobotDetected };
    });
  }

  private async fetchPart(params: any) {
    const { addressArray, bscAddressArray, polygonAddressArray, arbAddressArray, hecoAddressArray, opAddressArray, avaxAddressArray } = params;
    const { chainId, bscChainId, polygonChainId, arbChainId, hecoChainId, opChainId, avaxChainId } = params;
    const listData = await this.fetchInfo(addressArray, bscAddressArray, polygonAddressArray, arbAddressArray, hecoAddressArray, opAddressArray, avaxAddressArray);
    if (listData) {
      let securityTokens: SecurityToken[] = [];
      securityTokens = securityTokens.concat(this.mapResultList(listData.eth || [], chainId));
      securityTokens = securityTokens.concat(this.mapResultList(listData.bsc || [], bscChainId));
      securityTokens = securityTokens.concat(this.mapResultList(listData.polygon || [], polygonChainId));
      securityTokens = securityTokens.concat(this.mapResultList(listData.arbitrum || [], arbChainId));
      securityTokens = securityTokens.concat(this.mapResultList(listData.heco || [], hecoChainId));
      securityTokens = securityTokens.concat(this.mapResultList(listData.optimism || [], opChainId));
      securityTokens = securityTokens.concat(this.mapResultList(listData.avalanche || [], avaxChainId));
      return securityTokens;
    }
    return [];
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
      if (bitAND(tokenChangedType, TokenChangedType.TokenChanged) !== 0 ||
        bitAND(tokenChangedType, TokenChangedType.BscTokenChanged) !== 0 ||
        bitAND(tokenChangedType, TokenChangedType.ArbTokenChanged) !== 0 ||
        bitAND(tokenChangedType, TokenChangedType.HecoTokenChanged) !== 0 ||
        bitAND(tokenChangedType, TokenChangedType.PolygonTokenChanged) !== 0) {
        await this.poll(true);
      }
    });
    setTimeout(() => this.poll(), 10000);
    setTimeout(() => this.loadNftWhitelist(), 2000);
  }

  public async submitToken(address: string, token: string, chain: number): Promise<number> {
    const releaseLock = await this.mutex.acquire();
    try {
      const url = `${this.getServerURL()}currency/user/submit`;
      const response = await handleFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          address, token, chain,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': this.config.acceptLanguage,
        },
      });
      const { code } = response;
      if (code === 200) {
        this.updateSubmitList(chain, token);
        return 200;
      }
      console.log('response --> ', response);
      return code;
    } catch (e) {
      logDebug('leon.w@fetchInfo error: ', e);
    } finally {
      releaseLock();
    }
    return -1;
  }

  updateSubmitList(chain: number, token: string) {
    const submittedTokens = this.state.submittedTokens || {};
    if (!submittedTokens[chain]) {
      submittedTokens[chain] = [];
    }
    if (!submittedTokens[chain].includes(token)) {
      submittedTokens[chain].push(token);
      this.update({
        submittedTokens,
        changedType: SecurityChangedType.SubmittedChanged,
      });
    }
  }

  async fastCheck(chain: number, chainId: string, address: string) {
    const releaseLock = await this.mutex.acquire();
    try {
      const keyringController = this.context.KeyringController as KeyringController;
      const accounts = await keyringController.getAccounts();
      const url = `${this.getServerURL()}open/safetyAuto`;
      const response = await handleFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          address, chain,
          user_address: accounts.length > 0 ? accounts[0] : '',
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': this.config.acceptLanguage,
        },
      });
      const { code } = response;
      if (code === 200) {
        const { securityTokens } = this.state;
        const newTokens = [...securityTokens];
        const { normal, notice, risk } = response?.data || {};
        const findRet = newTokens.findIndex((v) => toLowerCaseEquals(v.address, address) && v.chainId === chainId);
        if (findRet === -1) {
          newTokens.push({ chainId, address, normal, notice, risk, website: '', disclaimer: '', isRobotDetected: true });
          this.update({
            securityTokens: newTokens,
            changedType: SecurityChangedType.TokensChanged,
          });
        }
      } else if (code === 4403) {
        this.updateSubmitList(chain, address);
      }
      console.log('response --> ', `${chain} - ${chainId}`, response);
      return response;
    } catch (e) {
      logDebug('leon.w@fetchInfo error: ', e);
    } finally {
      releaseLock();
    }
    return { data: undefined, code: -1, msg: 'failed' };
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
}

export default SecurityController;
