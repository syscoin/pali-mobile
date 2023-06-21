import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { Mutex } from 'async-mutex';
import { Sqlite } from '../transaction/Sqlite';
import RNFS from 'react-native-fs';

import { handleFetch, logInfo, logWarn } from '../util';

export interface StaticTokenConfig extends BaseConfig {
  isIos: boolean;
  interval: number;
}

export class StaticTokenController extends BaseController<StaticTokenConfig, BaseState> {
  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private polling_counter = 0;

  /**
   * Name of this controller used during composition
   */
  name = 'StaticTokenController';

  constructor(config?: Partial<StaticTokenConfig>, state?: Partial<BaseState>) {
    super(config, state);
    this.defaultConfig = {
      isIos: false,
      interval: 6 * 60 * 60 * 1000,
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
      const maxLoadCount = 500;
      let loadCount = 0;
      do {
        const maxTokenId = await Sqlite.getInstance().getStaticTokensMaxId();
        logInfo('PPYang start load static token, id:', maxTokenId);
        //TODO: update api url to Pali ones
        const url = `https://pali.pollum.cloud/getTokens?startId=${maxTokenId + 1}&count=${maxLoadCount}`;
        const response: any = await handleFetch(url);
        if (
          !response ||
          response.errmsg != 'ok' ||
          !response.data ||
          !Array.isArray(response.data) ||
          !response.data.length
        ) {
          break;
        }
        loadCount = response.data.length;
        logInfo('PPYang load static token loadCount:', loadCount);
        const tokens = response.data;
        await Sqlite.getInstance().insetStaticTokens(tokens);
        await new Promise((resolve) => {
          setTimeout(() => resolve(true), 3000);
        });
      } while (loadCount >= maxLoadCount);
    } catch (e) {
      logInfo('PPYang getTokens fail', e);
    } finally {
      releaseLock();
    }
  }

  async startLoadBaseStaticTokensIfNeed() {
    const count = await Sqlite.getInstance().getStaticTokenCount();
    if (count == 0) {
      let dbPath;
      if (this.config.isIos) {
        dbPath = `${RNFS.MainBundlePath}/tempdb.db`;
      } else {
        dbPath = RNFS.DocumentDirectoryPath + '/tempdb.db';
        try {
          await RNFS.copyFileAssets('db/tempdb.db', dbPath);
        } catch (e) {
          logWarn('PPYang copy db fail, e:', e);
        }
      }
      const exists = await RNFS.exists(dbPath);
      logInfo('PPYang dbPath:', dbPath, exists, this.config.isIos);
      await Sqlite.getInstance().copyTempTokens(dbPath);
    }
  }

  onComposed() {
    super.onComposed();
    setTimeout(async () => {
      await this.startLoadBaseStaticTokensIfNeed();
      setTimeout(() => this.poll(), 30000);
    }, 1);
  }
}
