import BaseController, {BaseConfig, BaseState} from "../BaseController";
import {Mutex} from "async-mutex";
import { Sqlite } from '../transaction/Sqlite';

import ETH_JSON from '../static-token/ethereum.json';
import BSC_JSON from '../static-token/binance-smart-chain.json';
import POLYGON_JSON from '../static-token/polygon-pos.json';
import HECO_JSON from '../static-token/huobi-token.json';
import OP_JSON from '../static-token/optimistic-ethereum.json';
import AVAX_JSON from '../static-token/avalanche.json';
import ARB_JSON from '../static-token/arbitrum.json';

import {ChainType} from "./TokenRatesController";
import {handleFetch, logInfo} from "../util";

export interface StaticTokenConfig extends BaseConfig {
  interval: number;
}

export interface StaticTokenState extends BaseState {
  tokenId: number;
}

export class StaticTokenController extends BaseController<StaticTokenConfig, StaticTokenState> {
  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private polling_counter = 0;

  /**
   * Name of this controller used during composition
   */
  name = 'StaticTokenController';

  constructor(config?: Partial<StaticTokenConfig>, state?: Partial<StaticTokenState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 6 * 60 * 60 * 1000
    };
    this.defaultState = {
      tokenId: -1,
    };
    this.initialize();
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
    const tokenBalancesController = this.context.TokenBalancesController;
    if (tokenBalancesController?.config.backgroundMode) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    try {
      logInfo('PPYang start load static token, id:', this.state.tokenId);
      let loadTokenId = this.state.tokenId + 1;
      const maxLoadCount = 500;
      let loadCount = 0;
      do {
        const url = `https://relayer.gopocket.finance/api/v1/getTokens?startId=${loadTokenId}&count=${maxLoadCount}`;
        const response: any = await handleFetch(url);
        if (!response || response.errmsg != 'ok' || !response.data || !Array.isArray(response.data) || !response.data.length) {
          break;
        }
        loadCount = response.data.length;
        const tokens = response.data;
        await Sqlite.getInstance().insetStaticTokens(tokens);
        const endId = tokens[tokens.length - 1].id;
        this.update({ tokenId: endId });
        loadTokenId = endId + 1;
        await new Promise((resolve => {
          setTimeout(() => resolve(true), 3000);
        }));
      } while (loadCount >= maxLoadCount);
      logInfo('PPYang load static token end, id:', this.state.tokenId);
    } catch (e) {
      logInfo('PPYang getTokens fail', e);
    } finally {
      releaseLock();
    }
  }

  async startLoadBaseStaticTokensIfNeed() {
    const count = await Sqlite.getInstance().getStaticTokenCount();
    if (count == 0) {
      await this.loadBaseStaticTokens(ChainType.Ethereum, ETH_JSON);
      await this.loadBaseStaticTokens(ChainType.Bsc, BSC_JSON);
      await this.loadBaseStaticTokens(ChainType.Polygon, POLYGON_JSON);
      await this.loadBaseStaticTokens(ChainType.Heco, HECO_JSON);
      await this.loadBaseStaticTokens(ChainType.Optimism, OP_JSON);
      await this.loadBaseStaticTokens(ChainType.Avax, AVAX_JSON);
      await this.loadBaseStaticTokens(ChainType.Arbitrum, ARB_JSON);
    }
  }

  async loadBaseStaticTokens(type: number, tokens: any) {
    const keys = Object.keys(tokens);
    const allToken = [];
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const address = key.toLowerCase();
      const l1_address = tokens[key].l1Address ? tokens[key].l1Address.toLowerCase() : undefined;
      const coin_id = tokens[key].id || undefined;
      const chain_type = type;
      const image = tokens[key].image || undefined;
      const name = tokens[key].name || undefined;
      const decimals = tokens[key].decimals || 0;
      const symbol = tokens[key].symbol || undefined;
      allToken.push({ address, l1_address, coin_id, chain_type, image, name, decimals, symbol });
    }
    await Sqlite.getInstance().insetStaticTokens(allToken);
  }

  onComposed() {
    super.onComposed();
    setTimeout(async () => {
      await this.startLoadBaseStaticTokensIfNeed();
      setTimeout(() => this.poll(), 30000);
    }, 1);
  }
}
