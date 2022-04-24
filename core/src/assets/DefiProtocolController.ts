import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import {
  safelyExecute,
  timeoutFetch,
} from '../util';
import { NetworkConfig, ChainType } from "../Config";

export interface DefiProtocolConfig extends BaseConfig {
  interval: number;
}

export interface SupplyToken {
  logo: string;
  symbol: string;
  address: string;
}

export interface RewardToken {
  symbol: string;
  priceUsd: number;
  amount: number;
  decimals: number;
  address: string;
}

export interface Portfolio {
  supplyTokens: SupplyToken[];
  rewardTokens: RewardToken[];
  priceUsd: number;
}

export interface DefiToken {
  logo: string;
  name: string;
  portfolios: Portfolio[];
  chain: string;
  address: string;
  priceUsd: number;
  siteUrl: string;
}

export interface DefiProtocolState extends BaseState {
  allDefiTokens: {
    [address: string]: { [chainId: string]: DefiToken[] };
  };
}

export class DefiProtocolController extends BaseController<DefiProtocolConfig, DefiProtocolState> {
  private mutex = new Mutex();

  private mutexData = new Mutex();

  private polling_counter = 0;

  private handle?: NodeJS.Timer;

  async fixDataDefiTokens(defiArray: any) {
    const defiTokens: DefiToken[] = [];
    defiArray.forEach((defiToken: any) => {
        const { chain, name } = defiToken;
        const logo = defiToken.logo_url;
        const siteUrl = defiToken.site_url;
        const address = defiToken.platform_token_id;
        const portfolioList = defiToken.portfolio_list;
        const portfolios: Portfolio[] = [];
        let allPriceUsd = 0;
        if (portfolioList?.length > 0) {
          portfolioList.forEach((portfolio: any) => {
            if (portfolio.detail_types?.indexOf('lending') === -1) {
              const supplyTokenList = portfolio.detail?.supply_token_list || portfolio.detail?.token_list;
              const rewardTokenList = portfolio.detail?.reward_token_list;
              const priceUsd = portfolio.stats?.net_usd_value;
              const supplyTokens: SupplyToken[] = [];
              const rewardTokens: RewardToken[] = [];
              if (supplyTokenList && supplyTokenList.length > 0) {
                supplyTokenList.forEach((supplyToken: any) => {
                  supplyTokens.push({ logo: supplyToken.logo_url, symbol: supplyToken.symbol, address: supplyToken.id });
                });
              }
              if (rewardTokenList && rewardTokenList.length > 0) {
                rewardTokenList.forEach((rewardToken: any) => {
                  const { symbol, amount, decimals } = rewardToken;
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  rewardTokens.push({ logo: rewardToken.logo_url, priceUsd: rewardToken.price, address: rewardToken.id, amount, decimals, symbol });
                });
              }

              if (supplyTokens.length !== 0 || rewardTokens.length !== 0) {
                allPriceUsd += priceUsd;
                portfolios.push({ priceUsd, supplyTokens, rewardTokens });
              }
            }
          });
        }
        if (portfolios.length > 0) {
          defiTokens.push({ chain, logo, name, portfolios, address, siteUrl, priceUsd: allPriceUsd });
        }
      },
    );
    return defiTokens;
  }

  /**
   * Name of this controller used during composition
   */
  name = 'DefiProtocolController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['PreferencesController'];

  /**
   * Creates a AssetsDetectionController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<DefiProtocolConfig>, state?: Partial<DefiProtocolState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 180000,
    };
    this.defaultState = {
      allDefiTokens: {},
    };
    this.initialize();
  }

  private async getdeBankData(selectedAddress: string) {
    try {
      const api = `https://api.debank.com/portfolio/project_list?user_addr=${selectedAddress?.toLowerCase()}`;
      const response = await timeoutFetch(
        api,
        undefined,
        15000,
      );
      const responseJson = await response.json();
      const results = responseJson.data;
      if (results?.length) {
        return results;
      }
    } catch (e) {
      return undefined;
    }
    return undefined;
  }

  async getDefiTokensByDebank(selectedAddress: string) {
    const defiTokens = await this.getdeBankData(selectedAddress);
    if (!defiTokens) {
      return undefined;
    }
    return await this.fixDataDefiTokens(defiTokens);
  }

  async detectDefiTokens(requestedSelectedAddress: string) {
    const defiTokens = await this.getDefiTokensByDebank(requestedSelectedAddress);
    defiTokens && await this.updateDefiTokens(requestedSelectedAddress, defiTokens);
  }

  getChainId(chain: string) {
    for (const type in NetworkConfig) {
      const chainType = Number(type);
      if (NetworkConfig[chainType].DefiTokenChain?.find((tokenChain: string) => tokenChain === chain)
          && this.networks[chainType]) {
        return this.networks[chainType].state.provider.chainId;
      }
    }
    return this.networks[ChainType.Ethereum].state.provider.chainId;
  }

  async updateDefiTokens(selectedAddress: string, defiTokens: any[]) {
    const releaseLock = await this.mutexData.acquire();
    let chainIdToken = {};
    defiTokens.forEach((defiToken: DefiToken) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const defiTokenTemp: DefiToken[] = chainIdToken[this.getChainId(defiToken.chain)] || [];
      defiTokenTemp.push(defiToken);
      chainIdToken = { ...chainIdToken, [this.getChainId(defiToken.chain)]: defiTokenTemp };
    });

    const newAllDefiTokens = {
      ...this.state.allDefiTokens,
      [selectedAddress]: chainIdToken,
    };

    this.update({ allDefiTokens: newAllDefiTokens });
    releaseLock();
  }

  async poll(interval?: number): Promise<void> {
    if (this.polling_counter > 1) {
      return;
    }
    this.polling_counter += 1;
    interval && this.configure({ interval }, false, false);
    this.handle && clearTimeout(this.handle);
    await this.refresh();
    this.polling_counter -= 1;
    if (this.polling_counter > 0) {
      return;
    }
    this.handle = setTimeout(() => {
      this.poll(this.config.interval);
    }, this.config.interval);
  }

  async refresh() {
    const tokenBalancesController = this.context.TokenBalancesController;
    if (tokenBalancesController?.config.backgroundMode) {
      return;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    await safelyExecute(() => this.detectDefiTokens(selectedAddress));
    releaseLock();
  }

  onComposed() {
    super.onComposed();
    const preferences = this.context.PreferencesController as PreferencesController;
    preferences.subscribe(() => setTimeout(() => this.poll(), 1000), ['selectedAddress']);
  }

  beforeOnComposed() {
    super.beforeOnComposed();
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { identities } = preferencesController.state;
    const defiTokens = this.state.allDefiTokens || {};
    Object.keys(defiTokens).forEach((address) => {
      if (!identities[address]) {
        delete defiTokens[address];
      }
    });
  }
}

export default DefiProtocolController;
