import SQLiteStorage from 'react-native-sqlite-storage';
import URL from 'url-parse';
import { ChainType } from '../assets/TokenRatesController';
import { util } from '..';
import { TokenTransactionInfo, TransactionInfo } from './TransactionController';
import Fuse from 'fuse.js';

SQLiteStorage.DEBUG(false);
SQLiteStorage.enablePromise(false);
const database_name = 'GoPocket.db';
const database_version = '1.0';
const database_displayname = 'GoPocketDatabase';

export class Sqlite {
  private static instance: Sqlite;

  private db: any;

  static getInstance() {
    if (!this.instance) {
      this.instance = new Sqlite();
      this.instance.init();
    }
    return this.instance;
  }

  private open() {
    this.db = SQLiteStorage.openDatabase(
      database_name,
      database_version,
      database_displayname,
      200000,
      () => {
        this._successLog('openDatabase');
      },
      (err: any) => {
        this._errorLog('openDatabase', err);
      }
    );
    return this.db;
  }

  deleteTable() {
    if (!this.db) {
      this.open();
    }
    this.db.transaction(
      (tx: any) => {
        tx.executeSql(
          'DROP TABLE TRANSACTIONS',
          [],
          () => {
            this._successLog('deleteTable');
          },
          (err: any) => {
            this._errorLog('deleteTable', err);
          }
        );
      },
      (err: any) => {
        this._errorLog('deleteTable transaction', err);
      },
      () => {
        this._successLog('deleteTable transaction');
      }
    );
  }

  init() {
    if (!this.db) {
      this.open();
    }
    this.db.transaction(
      (tx: any) => {
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS TRANSACTIONS(' +
          'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
          'address VARCHAR,' +
          'type INTEGER,' +
          'txType VARCHAR,' +
          'status VARCHAR,' +
          'randomId VARCHAR,' +
          'origin VARCHAR,' +
          'rawTransaction VARCHAR,' +
          'time INTEGER,' +
          'gasUsed VARCHAR,' +
          'toSmartContract VARCHAR,' +
          'tx_chainId VARCHAR,' +
          'tx_data VARCHAR,' +
          'tx_from VARCHAR,' +
          'tx_gas VARCHAR,' +
          'tx_gasPrice VARCHAR,' +
          'tx_nonce VARCHAR,' +
          'tx_to VARCHAR,' +
          'tx_value VARCHAR,' +
          'tx_amount VARCHAR,' +
          'tx_symbol VARCHAR,' +
          'tx_contractAddress VARCHAR,' +
          'tx_decimals INTEGER,' +
          'transactionHash VARCHAR,' +
          'blockNumber VARCHAR,' +
          'error VARCHAR)',
          [],
          undefined,
          (err: any) => {
            this._errorLog('create table TRANSACTIONS', err);
          }
        );
        // browser history
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS BROWSER_HISTORY(' +
          'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
          'url VARCHAR,' +
          'name VARCHAR,' +
          'icon VARCHAR,' +
          'time INTEGER)',
          [],
          undefined,
          (err: any) => {
            this._errorLog('create table BROWSER_HISTORY', err);
          }
        );
        // browser userSelectedChainTypes
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS USER_SELECTED_CHAIN_TYPES(' +
          'url VARCHAR PRIMARY KEY,' +
          'chainType INTEGER)',
          [],
          undefined,
          (err: any) => {
            this._errorLog('create table USER_SELECTED_CHAIN_TYPES', err);
          }
        );
        // browser whitelistDapps
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS WHITE_LIST_DAPPS(' +
          'key VARCHAR PRIMARY KEY,' +
          'url VARCHAR,' +
          'title VARCHAR,' +
          'desc VARCHAR,' +
          'chain INTEGER,' +
          'img VARCHAR,' +
          'timestamp INTEGER)',
          [],
          undefined,
          (err: any) => {
            this._errorLog('create table WHITE_LIST_DAPPS', err);
          }
        );
        // browser blacklistDapps
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS BLACK_LIST_DAPPS(' +
          'url VARCHAR PRIMARY KEY,' +
          'level INTEGER,' +
          'desc VARCHAR,' +
          'timestamp INTEGER)',
          [],
          undefined,
          (err: any) => {
            this._errorLog('create table BLACK_LIST_DAPPS', err);
          }
        );
        // static tokens
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS STATIC_TOKENS(' +
          'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
          'address VARCHAR NOT NULL,' +
          'l1_address VARCHAR,' +
          'coin_id VARCHAR,' +
          'chain_type INTEGER NOT NULL,' +
          'image TEXT,' +
          'name VARCHAR,' +
          'decimals INTEGER,' +
          'symbol VARCHAR,' +
          'UNIQUE(address, chain_type))',
          [],
          undefined,
          (err: any) => {
            this._errorLog('create table STATIC_TOKENS', err);
          }
        );
      },
      (err: any) => {
        this._errorLog('init', err);
      },
      () => {
        this._successLog('init');
      }
    );
  }

  copyTempTokens(path: string) {
    return new Promise((resolve => {
      this.db.executeSql(
        `ATTACH DATABASE '${path}' AS tempDB`,
        [],
        () => {
          this.db.executeSql(
            `INSERT INTO STATIC_TOKENS SELECT * FROM tempDB.temp_token`,
            [],
            () => {
              this.db.executeSql(
                `DETACH DATABASE tempDB`,
                [],
                () => {
                  resolve(true);
                },
                (error: any) => {
                  this._errorLog('detach tempDB', error);
                  resolve(false);
                }
              );
            },
            (error: any) => {
              this._errorLog('copy tempDB', error);
              resolve(false);
            }
          );
        },
        (error: any) => {
          this._errorLog('attach tempDB', error);
          resolve(false);
        }
      );
    }));
  }

  clearStaticTokens() {
    return new Promise((resolve => {
      const sql = 'DELETE FROM STATIC_TOKENS';
      this.db.executeSql(
        sql,
        [],
        () => {
          resolve(true);
        },
        (error: any) => {
          this._errorLog('clearStaticTokens', error);
          resolve(false);
        }
      );
    }));
  }

  getStaticTokensMaxId() {
    return new Promise<any>((resolve) => {
      let sql = 'SELECT MAX(id) AS max_id FROM STATIC_TOKENS';
      this.db.executeSql(
        sql,
        [],
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(results.rows.item(0)?.max_id || 0);
          } else {
            resolve(0);
          }
        },
        (error: any) => {
          this._errorLog('getStaticTokenCount', error);
          resolve(0);
        }
      );
    });
  }

  async findStaticToken(types: number[], query: string, needFuse = false, fuseCount = 0) {
    query = query?.trim()?.toLowerCase();
    if (!query || !types?.length) {
      return { queryAddress: [], querySymbol: [] };
    }
    let validTypes = types;
    let typeSql: any;
    for (const type of validTypes) {
      if (!typeSql) {
        typeSql = `(${type}`;
      } else {
        typeSql = `${typeSql}, ${type}`;
      }
    }
    typeSql = `${typeSql})`;
    const queryAddress = await new Promise<any[]>((resolve) => {
      const sql = `SELECT * FROM STATIC_TOKENS WHERE address=? AND chain_type IN ${typeSql}`;
      const values = [query];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            const { item, length } = results.rows;
            const tokens = [];
            for (let index = 0; index < length; index++) {
              const data = item(index);
              tokens.push(data);
            }
            resolve(tokens);
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findStaticToken address', error);
          resolve([]);
        }
      );
    });
    if (!needFuse && queryAddress?.length) {
      validTypes = types.filter(type => {
        return !queryAddress.includes((token: any) => token.chain_type == type);
      });
      if (!validTypes?.length) {
        return { queryAddress, querySymbol: [] };
      }
      typeSql = undefined;
      for (const type of validTypes) {
        if (!typeSql) {
          typeSql = `(${type}`;
        } else {
          typeSql = `${typeSql}, ${type}`;
        }
      }
      typeSql = `${typeSql})`;
    }

    let querySymbol = await new Promise<any[]>((resolve) => {
      const sql = `SELECT * FROM STATIC_TOKENS WHERE chain_type IN ${typeSql} AND lower(symbol) GLOB '*${query}*'`;
      this.db.executeSql(
        sql,
        [],
        (results: any) => {
          if (results?.rows?.length > 0) {
            const { item, length } = results.rows;
            const tokens = [];
            for (let index = 0; index < length; index++) {
              const data = item(index);
              tokens.push(data);
            }
            resolve(tokens);
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findStaticToken symbol', error);
          resolve([]);
        }
      );
    });
    if (querySymbol.length) {
      const tempSymbols: any[] = [];
      validTypes.forEach(type => {
        let typeSymbols = querySymbol.filter(token => token.chain_type == type);
        if (typeSymbols.length) {
          const fuse = new Fuse(typeSymbols, {
            shouldSort: true,
            threshold: 0.3,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: [{ name: 'symbol', weight: 0.8 }]
          });
          typeSymbols = fuse.search(query, { limit: fuseCount });
          tempSymbols.push(...typeSymbols);
        }
      });
      querySymbol = tempSymbols;
    }
    if (validTypes.length > 1) {
      const fuse = new Fuse(querySymbol, {
        shouldSort: true,
        threshold: 0.3,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [{ name: 'symbol', weight: 0.8 }]
      });
      querySymbol = fuse.search(query);
    }
    return { queryAddress, querySymbol };
  }

  getStaticTokenCount() {
    return new Promise<any>((resolve) => {
      let sql = 'SELECT COUNT(*) AS count FROM STATIC_TOKENS';
      this.db.executeSql(
        sql,
        [],
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(results.rows.item(0)?.count || 0);
          } else {
            resolve(undefined);
          }
        },
        (error: any) => {
          this._errorLog('getStaticTokenCount', error);
          resolve(undefined);
        }
      );
    });
  }

  getStaticToken(type: number, address: string, l1_address: string | undefined = undefined) {
    if (!type || !address) {
      return undefined;
    }
    return new Promise<any>((resolve) => {
      let sql;
      let values;
      if (type === ChainType.Arbitrum && l1_address) {
        sql = 'SELECT * FROM STATIC_TOKENS WHERE (chain_type=? AND address=?) OR (chain_type=? AND address=?)';
        values = [type, address.toLowerCase(), ChainType.Ethereum, l1_address.toLowerCase()];
      } else {
        sql = 'SELECT * FROM STATIC_TOKENS WHERE chain_type=? AND address=?';
        values = [type, address.toLowerCase()];
      }
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            const { item } = results.rows;
            resolve(item(0));
          } else {
            resolve(undefined);
          }
        },
        (error: any) => {
          this._errorLog('getStaticToken', error);
          resolve(undefined);
        }
      );
    });
  }

  getStaticTokens(type: number) {
    return new Promise<any[]>((resolve) => {
      const sql = 'SELECT * FROM STATIC_TOKENS WHERE chain_type=?';
      const values = [type];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            const { item, length } = results.rows;
            const tokens = [];
            for (let index = 0; index < length; index++) {
              const data = item(index);
              tokens.push(data);
            }
            resolve(tokens);
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getStaticTokens', error);
          resolve([]);
        }
      );
    });
  }

  insetStaticTokens(tokens: any[]) {
    if (!tokens || tokens.length <= 0) {
      return;
    }
    const baseSql = 'INSERT OR REPLACE INTO STATIC_TOKENS(address, l1_address, coin_id, chain_type, image, name, decimals, symbol) VALUES';
    const valuesSql = '(?,?,?,?,?,?,?,?)';
    this.db.transaction(
      (cursor: any) => {
        this.execBatchInsert(cursor, baseSql, valuesSql, tokens, (item) => [
          item.address, item.l1_address, item.coin_id, item.chain_type, item.image, item.name, item.decimals, item.symbol
        ]);
      },
      (error: any) => {
        this._errorLog('insetStaticTokens', error);
      });
  }

  addBrowserHistory(url: string, name: string, icon: string) {
    const sql = 'INSERT INTO BROWSER_HISTORY(url, name, icon, time) values (?,?,?,?)';
    const values = [url, name, icon, Date.now()];
    this.db.transaction(
      (cursor: any) => {
        cursor.executeSql(sql, values, null, (err: any) => {
          this._errorLog('replaceBrowserHistory err:', err);
        });
      }
    );
  }

  getBrowserHistory() {
    return new Promise<any[]>((resolve) => {
      const sql = 'SELECT * FROM BROWSER_HISTORY ORDER BY time DESC';
      const values: any[] = [];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            const { item, length } = results.rows;
            const history = [];
            for (let index = 0; index < length; index++) {
              const data = item(index);
              history.push(data);
            }
            resolve(history);
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getBrowserHistory', error);
          resolve([]);
        }
      );
    });
  }

  insertBrowserHistory(history: [{url: string; name: string; icon: string}]) {
    if (!history || history.length <= 0) {
      return;
    }
    const baseSql = 'INSERT INTO BROWSER_HISTORY(url, name, icon, time) values';
    const valuesSql = '(?,?,?,?)';
    const time = Date.now() - history.length;
    this.db.transaction(
      (cursor: any) => {
        this.execBatchInsert(cursor, baseSql, valuesSql, history, (item, pos) => [
          item.url, item.name, item.icon, time + pos,
        ]);
      },
    (error: any) => {
      this._errorLog('insertBrowserHistory', error);
    });
  }

  getUserSelectedChainType(hostname: string) {
    return new Promise<any>((resolve) => {
      const sql = `SELECT * FROM USER_SELECTED_CHAIN_TYPES WHERE url LIKE '%${hostname}'`;
      this.db.executeSql(sql, null, (results: any) => {
        if (results?.rows?.length > 0) {
          const { item } = results.rows;
          resolve(item(0).chainType);
        } else {
          resolve(null);
        }
      }, (err: any) => {
        resolve(null);
        this._errorLog('getUserSelectedChainType err:', err);
      });
    });
  }

  updateUserSelectedChainTypes(url: string, chainType: number) {
    const sql = 'REPLACE INTO USER_SELECTED_CHAIN_TYPES(url, chainType) values (?,?)';
    const values = [url, chainType];
    this.db.transaction(
      (cursor: any) => {
        cursor.executeSql(sql, values, null, (err: any) => {
          this._errorLog('updateUserSelectedChainTypes err:', err);
        });
      }
    );
  }

  insertUserSelectedChainTypes(userSelectedChainTypes: [{url: string; chainType: number}]) {
    if (!userSelectedChainTypes || userSelectedChainTypes.length <= 0) {
      return;
    }
    const baseSql = 'INSERT INTO USER_SELECTED_CHAIN_TYPES(url, chainType) values';
    const valuesSql = '(?,?)';
    this.db.transaction(
      (cursor: any) => {
        this.execBatchInsert(cursor, baseSql, valuesSql, userSelectedChainTypes, (item) => [
          item.url, item.chainType,
        ]);
      },
      (error: any) => {
        this._errorLog('insertUserSelectedChainTypes', error);
      });
  }

  getWhitelistDapp(key: string, key2?: string) {
    return new Promise<any>((resolve) => {
      let sql: string;
      if (key2) {
        sql = `SELECT * FROM WHITE_LIST_DAPPS WHERE key=? OR key=?`;
      } else {
        sql = `SELECT * FROM WHITE_LIST_DAPPS WHERE key=?`;
      }
      this.db.executeSql(sql, key2 ? [key, key2] : [key], (results: any) => {
        if (results?.rows?.length > 0) {
          const { item } = results.rows;
          resolve({ ...item(0) });
        } else {
          resolve(null);
        }
      }, (err: any) => {
        resolve(null);
        this._errorLog('getWhitelistDapp err:', err);
      });
    });
  }

  updateWhitelistDapp(url: string, title: string, desc: string, chain: number, img: string, timestamp: number) {
    this.replaceDapps(url, url, title, desc, chain, img, timestamp);
    const host = new URL(url).hostname?.toLowerCase();
    if (host) {
      this.replaceDapps(host, url, title, desc, chain, img, timestamp);
    }
  }

  replaceDapps(key: string, url: string, title: string, desc: string, chain: number, img: string, timestamp: number) {
    const sql = `REPLACE INTO WHITE_LIST_DAPPS(key, url, title, desc, chain, img, timestamp) values (?,?,?,?,?,?,?)`;
    const values = [key, url, title, desc, chain, img, timestamp];
    this.db.transaction(
      (cursor: any) => {
        cursor.executeSql(sql, values, null, (err: any) => {
          this._errorLog('replaceDapps err:', err);
        });
      }
    );
  }

  updateWhitelistDapps(whitelistDapps: []) {
    if (!whitelistDapps || whitelistDapps.length <= 0) {
      return;
    }
    const baseSql = `REPLACE INTO WHITE_LIST_DAPPS(key, url, title, desc, chain, img, timestamp) values `;
    const valuesSql = '(?,?,?,?,?,?,?)';
    this.db.transaction(
      (cursor: any) => {
        this.execBatchInsert(cursor, baseSql, valuesSql, whitelistDapps, (item) => [
          item.key ? item.key : item.url, item.url, item.title, item.desc, item.chain, item.img, item.timestamp,
        ]);
      },
      (error: any) => {
        this._errorLog('updateWhitelistDapps', error);
      });
  }

  insertWhitelistDapps(whitelistDapps: []) {
    if (!whitelistDapps || whitelistDapps.length <= 0) {
      return;
    }
    const baseSql = `INSERT INTO WHITE_LIST_DAPPS(key, url, title, desc, chain, img, timestamp) values`;
    const valuesSql = '(?,?,?,?,?,?,?)';
    this.db.transaction(
      (cursor: any) => {
        this.execBatchInsert(cursor, baseSql, valuesSql, whitelistDapps, (item) => [
          item.key ? item.key : item.url, item.url, item.title, item.desc, item.chain, item.img, item.timestamp,
        ]);
      },
      (error: any) => {
        this._errorLog('insertWhitelistDapps', error);
      });
  }

  getBlacklistDapps() {
    return new Promise<any>((resolve) => {
      const sql = `SELECT * FROM BLACK_LIST_DAPPS`;
      this.db.executeSql(sql, [], (results: any) => {
        if (results?.rows?.length > 0) {
          const { item, length } = results.rows;
          const blacklistDapps: {[url: string]: any} = {};
          for (let index = 0; index < length; ++index) {
            blacklistDapps[item(index).url] = { ...item(index) };
          }
          resolve(blacklistDapps);
        } else {
          resolve({});
        }
      }, (err: any) => {
        resolve({});
        this._errorLog('getBlacklistDapps err:', err);
      });
    });
  }

  getBlacklistDappByUrl(url: string) {
    return new Promise<any>((resolve) => {
      const sql = `SELECT * FROM BLACK_LIST_DAPPS WHERE url=?`;
      this.db.executeSql(sql, [url], (results: any) => {
        if (results?.rows?.length > 0) {
          const { item } = results.rows;
          resolve({ ...item(0) });
        } else {
          resolve(null);
        }
      }, (err: any) => {
        resolve(null);
        this._errorLog('getBlacklistDapps err:', err);
      });
    });
  }

  updateBlacklistDapps(url: string, level: number, desc: string) {
    const sql = `REPLACE INTO BLACK_LIST_DAPPS(url, level, desc, timestamp) values (?,?,?,?)`;
    const values = [url, level, desc, Date.now()];
    this.db.transaction(
      (cursor: any) => {
        cursor.executeSql(sql, values, null, (err: any) => {
          this._errorLog('updateBlacklistDapps err:', err);
        });
      }
    );
  }

  insertBlacklistDapps(blacklistDapps: []) {
    if (!blacklistDapps || blacklistDapps.length <= 0) {
      return;
    }
    const baseSql = `INSERT INTO BLACK_LIST_DAPPS(url, level, desc, timestamp) values`;
    const valuesSql = '(?,?,?,?)';
    this.db.transaction(
      (cursor: any) => {
        this.execBatchInsert(cursor, baseSql, valuesSql, blacklistDapps, (item) => [
          item.url, item.level, item.desc, item.timestamp,
        ]);
      },
      (error: any) => {
        this._errorLog('insertBlacklistDapps', error);
      });
  }

  insertTransactions(address: string, type: ChainType, txs: TransactionInfo[], txInternal = false) {
    if (!txs || txs.length <= 0) {
      return;
    }
    const baseSql = 'INSERT INTO TRANSACTIONS(address,type,txType,status,randomId,origin,rawTransaction,time,gasUsed,toSmartContract,tx_chainId,tx_data,tx_from,tx_gas,tx_gasPrice,tx_nonce,tx_to,tx_value,transactionHash,blockNumber,error) values';
    const valuesSql = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    this.db.transaction(
      (cursor: any) => {
        let index = 0;
        let values: any[] = [];
        let sql = baseSql;
        txs.forEach((tx, pos) => {
          sql += valuesSql;
          values.push(
            address,
            type,
            txInternal ? 'internaltx' : 'tx',
            tx.status,
            tx.id,
            tx.origin || '',
            tx.rawTransaction || '',
            tx.time,
            tx.gasUsed || '',
            tx.toSmartContract ? 'true' : 'false',
            tx.transaction?.chainId?.toString() || '',
            tx.transaction?.data || '',
            tx.transaction?.from,
            tx.transaction?.gas || '',
            tx.transaction?.gasPrice || '',
            tx.transaction?.nonce || '',
            tx.transaction?.to || '',
            tx.transaction?.value || '',
            tx.transactionHash || '',
            tx.blockNumber || '',
            tx.error?.message || '',
          );
          index += 1;
          if (index >= 40 || pos === txs.length - 1) {
            cursor.executeSql(sql, values, null, (err: any) => {
              this._errorLog('insertTransactions', err);
            });
            index = 0;
            sql = baseSql;
            values = [];
          } else {
            sql += ',';
          }
        });
      },
      (error: any) => {
        this._errorLog('insertTransaction', error);
      },
      null
    );
  }

  insertTokenTransactions(address: string, type: ChainType, txs: TokenTransactionInfo[]) {
    if (!txs || txs.length <= 0) {
      return;
    }
    const baseSql = 'INSERT INTO TRANSACTIONS(address,type,txType,status,randomId,time,tx_chainId,tx_from,tx_to,tx_amount,tx_symbol,tx_contractAddress,tx_decimals,transactionHash,blockNumber,error) values';
    const valuesSql = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
      this.db.transaction(
        (cursor: any) => {
          let index = 0;
          let values: any[] = [];
          let sql = baseSql;
          txs.forEach((tx, pos) => {
            sql += valuesSql;
            values.push(
              address,
              type,
              'tokentx',
              tx.status,
              tx.id,
              tx.time,
              tx.chainId,
              tx.from,
              tx.to,
              tx.amount,
              tx.transferInformation?.symbol,
              tx.transferInformation?.contractAddress,
              tx.transferInformation?.decimals,
              tx.transactionHash || '',
              tx.blockNumber || '',
              tx.error?.message || '',
            );
            index += 1;
            if (index >= 50 || pos === txs.length - 1) {
              cursor.executeSql(sql, values, null, (err: any) => {
                this._errorLog('insertTokenTransactions', err);
              });
              index = 0;
              sql = baseSql;
              values = [];
            } else {
              sql += ',';
            }
          });
        },
        (error: any) => {
          this._errorLog('insertTokenTransactions', error);
        },
        null
      );
  }

  async getTransactionCount(address: string, type: ChainType, chainId: string, txType: string) {
    return new Promise<number>((resolve) => {
      const sql = 'SELECT count(*) AS count FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=?';
      const values = [address, type, txType, chainId];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(results.rows.item(0)?.count || 0);
          } else {
            resolve(0);
          }
        },
        (error: any) => {
          this._errorLog('getTransactionHash', error);
          resolve(0);
        }
      );
    });
  }

  async getTransactionHash(address: string, type: ChainType, chainId: string, transactionHash: string | undefined, txInternal = false): Promise<TransactionInfo | null> {
    if (!transactionHash) {
      return null;
    }
    return new Promise<TransactionInfo | null>((resolve) => {
      const sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND transactionHash=?';
      const values = [address, type, txInternal ? 'internaltx' : 'tx', chainId, transactionHash];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length)[0]);
          } else {
            resolve(null);
          }
        },
        (error: any) => {
          this._errorLog('getTransactionHash', error);
          resolve(null);
        }
      );
    });
  }

  async getTokenTransactionHash(address: string, type: ChainType, chainId: string, transactionHash: any, contractAddress: any, amount: any): Promise<TokenTransactionInfo | null> {
    return new Promise<TokenTransactionInfo | null>((resolve) => {
      const sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND transactionHash=? AND tx_contractAddress=? AND tx_amount=?';
      const values = [address, type, 'tokentx', chainId, transactionHash, contractAddress, amount];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length)[0]);
          } else {
            resolve(null);
          }
        },
        (error: any) => {
          this._errorLog('getTokenTransactionHash', error);
          resolve(null);
        }
      );
    });
  }

  updateTransactionInfo(address: string, type: ChainType, chainId: string, transactionHash: string, tx: TransactionInfo, txInternal = false) {
    if (!tx || !transactionHash) {
      return;
    }
    this.db.transaction(
      (cursor: any) => {
        const sql =
          'UPDATE TRANSACTIONS SET status=?,randomId=?,origin=?,rawTransaction=?,time=?,gasUsed=?,toSmartContract=?,tx_data=?,tx_from=?,tx_gas=?,tx_gasPrice=?,tx_nonce=?,tx_to=?,tx_value=?,blockNumber=?,error=?' +
          ' WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND transactionHash=?';
        cursor.executeSql(
          sql,
          [
            tx.status,
            tx.id,
            tx.origin || '',
            tx.rawTransaction || '',
            tx.time,
            tx.gasUsed || '',
            tx.toSmartContract ? 'true' : 'false',
            tx.transaction?.data || '',
            tx.transaction?.from,
            tx.transaction?.gas || '',
            tx.transaction?.gasPrice || '',
            tx.transaction?.nonce || '',
            tx.transaction?.to || '',
            tx.transaction?.value || '',
            tx.blockNumber || '',
            tx.error?.message || '',
            address,
            type,
            txInternal ? 'internaltx' : 'tx',
            chainId,
            transactionHash,
          ],
          // eslint-disable-next-line no-empty-function,@typescript-eslint/no-empty-function
          () => {
          },
          (err: any) => {
            this._errorLog('updateTransactionInfo', err);
          }
        );
      },
      (/* error: any*/) => {
        // this._errorLog('updateTransactionInfo', error);
      },
      () => {
        // this._successLog('insertTransaction');
      }
    );
  }

  updateTokenTransactionInfo(address: string, type: ChainType, chainId: string, transactionHash: any, contractAddress: any, amount: any, tx: TokenTransactionInfo) {
    if (!tx || !transactionHash) {
      return;
    }
    this.db.transaction(
      (cursor: any) => {
        const sql =
          'UPDATE TRANSACTIONS SET status=?,randomId=?,time=?,tx_from=?,tx_to=?,tx_amount=?,tx_symbol=?,tx_contractAddress=?,tx_decimals=?,transactionHash=?,blockNumber=?,error=?' +
          ' WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND transactionHash=? AND tx_contractAddress=? AND tx_amount=?';
        cursor.executeSql(
          sql,
          [
            tx.status,
            tx.id,
            tx.time,
            tx.from,
            tx.to,
            tx.amount,
            tx.transferInformation?.symbol,
            tx.transferInformation?.contractAddress,
            tx.transferInformation?.decimals,
            tx.transactionHash || '',
            tx.blockNumber || '',
            tx.error?.message || '',
            address,
            type,
            'tokentx',
            chainId,
            transactionHash,
            contractAddress,
            amount,
          ],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          () => {
          },
          (err: any) => {
            this._errorLog('updateTokenTransactionInfo', err);
          }
        );
      },
      (/* error: any*/) => {
        // this._errorLog('updateTokenTransactionInfo', error);
      },
      () => {
        // this._successLog('insertTransaction');
      }
    );
  }

  // txType: tx, tokentx
  async getMaxBlockNumber(address: string, type: ChainType, chainId: string, txType: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const sql = 'SELECT max(blockNumber) FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=?';
      const values = [address, type, txType, chainId];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(results.rows.item(0)['max(blockNumber)']);
          } else {
            resolve(null);
          }
        },
        (error: any) => {
          this._errorLog('getMaxBlockNumber', error);
          resolve(null);
        }
      );
    });
  }

  async getAddresses(type: ChainType, chainId: string, txType: string): Promise<string[]> {
    return new Promise((resolve) => {
      const sql = 'SELECT DISTINCT address FROM TRANSACTIONS WHERE type=? AND txType=? AND tx_chainId=?';
      const values = [type, txType, chainId];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            const addressList = [];
            for (let index = 0; index < results.rows.length; index++) {
              addressList.push(results.rows.item(index).address);
            }
            resolve(addressList);
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getAddresses', error);
          resolve([]);
        }
      );
    });
  }

  async getAllAddresses(): Promise<string[]> {
    return new Promise((resolve) => {
      const sql = 'SELECT DISTINCT address FROM TRANSACTIONS';
      const values: any[] = [];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            const addressList = [];
            for (let index = 0; index < results.rows.length; index++) {
              addressList.push(results.rows.item(index).address);
            }
            resolve(addressList);
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getAllAddresses', error);
          resolve([]);
        }
      );
    });
  }

  deleteAddress(address: string) {
    this.db.transaction(
      (cursor: any) => {
        cursor.executeSql(
          'DELETE FROM TRANSACTIONS WHERE address=?',
          [address],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          () => {},
          (/* err: any */) => {
            // this._errorLog('updateTokenTransactionInfo', err);
          },
        );
      },
      (error: any) => {
        this._errorLog('deleteAddress', error);
      },
      () => {
        // this._successLog('deleteAddress');
      }
    );
  }

  async getTransactions(
    address: string,
    type: ChainType,
    chainId: string,
    includingTxInternal = false,
    index: number | undefined = undefined,
    count: number | undefined = undefined
  ): Promise<TransactionInfo[]> {
    return new Promise((resolve) => {
      let sql;
      let values;
      if (includingTxInternal) {
        if (index != undefined && count != undefined && index >= 0 && count > 0) {
          sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND (txType=? OR txType=?) AND tx_chainId=? ORDER BY time DESC LIMIT ? OFFSET ?';
          values = [address, type, 'tx', 'internaltx', chainId, count, index];
        } else {
          sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND (txType=? OR txType=?) AND tx_chainId=? ORDER BY time DESC';
          values = [address, type, 'tx', 'internaltx', chainId];
        }
      } else if (index != undefined && count != undefined && index >= 0 && count > 0) {
          sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? ORDER BY time DESC LIMIT ? OFFSET ?';
          values = [address, type, 'tx', chainId, count, index];
        } else {
          sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? ORDER BY time DESC';
          values = [address, type, 'tx', chainId];
        }
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTransactions', error);
          resolve([]);
        }
      );
    });
  }

  async getGasUsedHistory(
    address: string,
    type: ChainType,
    chainId: string,
    index: number,
    count: number
  ): Promise<TransactionInfo[]> {
    return new Promise((resolve) => {
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND transactionHash!='' AND transactionHash IS NOT NULL AND (txType=? OR txType=?) AND tx_chainId=? AND (transactionHash IN (SELECT transactionHash FROM TRANSACTIONS WHERE address=? AND type=? AND (txType=? OR txType=?) AND tx_chainId=? GROUP BY transactionHash HAVING count(transactionHash) > 1) OR tx_value=?) ORDER BY time DESC LIMIT ? OFFSET ?`;
      const values = [address, type, 'tx', 'internaltx', chainId, address, type, 'tx', 'internaltx', chainId, '0x0', count, index];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getGasUsedHistory', error);
          resolve([]);
        }
      );
    });
  }

  async getTransactionsHistory(
    address: string,
    type: ChainType,
    chainId: string,
    from: string,
    to: string,
    index: number,
    count: number
  ): Promise<TransactionInfo[]> {
    return new Promise((resolve) => {
      let sql;
      let values;
      if (from) {
        sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND transactionHash!='' AND transactionHash IS NOT NULL AND (txType=? OR txType=?) AND tx_chainId=? AND lower(tx_from)=? ORDER BY time DESC LIMIT ? OFFSET ?`;
        values = [address, type, 'tx', 'internaltx', chainId, from.toLowerCase(), count, index];
      } else if (to) {
        sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND transactionHash!='' AND transactionHash IS NOT NULL AND (txType=? OR txType=?) AND tx_chainId=? AND lower(tx_to)=? ORDER BY time DESC LIMIT ? OFFSET ?`;
        values = [address, type, 'tx', 'internaltx', chainId, to.toLowerCase(), count, index];
      } else {
        sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND transactionHash!='' AND transactionHash IS NOT NULL AND (txType=? OR txType=?) AND tx_chainId=? ORDER BY time DESC LIMIT ? OFFSET ?`;
        values = [address, type, 'tx', 'internaltx', chainId, count, index];
      }
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTransactionsHistory', error);
          resolve([]);
        }
      );
    });
  }

  async getActionTx(
    address: string,
    type: ChainType,
    chainId: string,
    from: string,
    to: string,
    index: number,
    count: number
  ): Promise<TransactionInfo[]> {
    return new Promise((resolve) => {
      let subSql = '';
      if (from) {
        subSql = `AND lower(tx_from)='${from.toLowerCase()}'`;
      } else if (to) {
        subSql = `AND lower(tx_to)='${to.toLowerCase()}'`;
      }
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND transactionHash!='' AND transactionHash IS NOT NULL AND (txType=? OR txType=?) AND tx_chainId=? ${subSql} AND tx_value IS NOT NULL AND tx_value IS NOT '0x0' AND transactionHash NOT IN (SELECT transactionHash FROM TRANSACTIONS WHERE address=? AND type=? AND (txType=? OR txType=?) AND tx_chainId=? GROUP BY transactionHash HAVING count(transactionHash) > 1) ORDER BY time DESC LIMIT ? OFFSET ?`;
      const values = [address, type, 'tx', 'internaltx', chainId, address, type, 'tx', 'internaltx', chainId, count, index];
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getActionNativeCurrencyTx', error);
          resolve([]);
        }
      );
    });
  }

  async getTransactionsByMethodId(
    address: string,
    chainId: string,
    from: string,
    to: string,
    methodId: string,
    index: number | undefined = undefined,
    count: number | undefined = undefined
  ): Promise<TransactionInfo[]> {
    return new Promise((resolve) => {
      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }
      if (from) {
        subSql = `${subSql} AND lower(tx_from)='${from.toLowerCase()}'`;
      }
      if (to) {
        subSql = `${subSql} AND lower(tx_to)='${to.toLowerCase()}'`;
      }
      let sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND (txType=? OR txType=?) AND transactionHash!='' AND transactionHash IS NOT NULL ${subSql} AND tx_data LIKE ? ORDER BY time DESC`;
      let values: any[] = [address, 'tx', 'internaltx', `${methodId}%`];
      if (index !== undefined && count !== undefined && index >= 0 && count > 0) {
        sql = `${sql} LIMIT ? OFFSET ?`;
        values = [...values, count, index];
      }

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTransactionsByMethodId', error);
          resolve([]);
        }
      );
    });
  }

  async getTransactionsByAddress(
    address: string,
    chainId: string | null,
    from: string,
    to: string,
    index: number | undefined = undefined,
    count: number | undefined = undefined
  ): Promise<TransactionInfo[]> {
    return new Promise((resolve) => {
      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }
      if (from) {
        subSql = `${subSql} AND lower(tx_from)='${from.toLowerCase()}'`;
      }
      if (to) {
        subSql = `${subSql} AND lower(tx_to)='${to.toLowerCase()}'`;
      }
      let sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND (txType=? OR txType=?) AND transactionHash!='' AND transactionHash IS NOT NULL ${subSql} ORDER BY time DESC`;
      let values: any[] = [address, 'tx', 'internaltx'];
      if (index !== undefined && count !== undefined && index >= 0 && count > 0) {
        sql = `${sql} LIMIT ? OFFSET ?`;
        values = [...values, count, index];
      }

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTransactionsByAddress', error);
          resolve([]);
        }
      );
    });
  }

  async getTransactionsByHash(
    address: string,
    chainId: string,
    allHash: string[]
  ): Promise<any[]> {
    if (!allHash?.length) {
      return [];
    }
    return new Promise((resolve) => {
      let hashSql = '';
      allHash.forEach((hash) => {
        if (hashSql) {
          hashSql = `${hashSql},'${hash}'`;
        } else {
          hashSql = `'${hash}'`;
        }
      });

      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }

      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND txType=? ${subSql} AND transactionHash IN (${hashSql})`;
      const values = [address, 'tx'];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTransactionsByHash', error);
          resolve([]);
        }
      );
    });
  }

  async getAllTransactions(
    address: string,
    type: ChainType,
    txType: string,
  ): Promise<any[]> {
    return new Promise((resolve) => {
      const sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=?';
      const values = [address, type, txType];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            if (txType === 'tx') {
              resolve(this.normalizeTxs(results.rows.item, results.rows.length));
            } else {
              resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
            }
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getAllTransactions', error);
          resolve([]);
        }
      );
    });
  }

  async getReceiveTx(
    address: string,
    chainId: string,
    to: string,
    index: number,
    count: number
  ) {
    return new Promise((resolve) => {
      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }

      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND txType=? AND transactionHash!='' AND transactionHash IS NOT NULL ${subSql} AND lower(tx_to)=? AND transactionHash NOT IN (SELECT transactionHash FROM TRANSACTIONS WHERE address=? AND txType=? ${subSql}) ORDER BY time DESC LIMIT ? OFFSET ?`;
      const values = [address, 'tx', to.toLowerCase(), address, 'tokentx', count, index];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getReceiveTx', error);
          resolve([]);
        }
      );
    });
  }

  async findEtherReceiveTransactions(
    address: string,
    chainId: string,
    type: ChainType,
    txType: string,
    status: string,
    time: number
  ): Promise<any[]> {
    return new Promise((resolve) => {
      const sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND status=? AND time>? AND tx_chainId=?';
      const values = [address, type, txType, status, time, chainId];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            if (txType === 'tx') {
              resolve(this.normalizeTxs(results.rows.item, results.rows.length));
            } else {
              resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
            }
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findEtherReceiveTransactions', error);
          resolve([]);
        }
      );
    });
  }

  async findReceiveTransactions(
    address: string,
    chainId: string,
    type: ChainType,
    txType: string,
    status: string,
    time: number
  ): Promise<any[]> {
    return new Promise((resolve) => {
      const lowAddress = address.toLowerCase();
      const sql = 'SELECT * FROM TRANSACTIONS WHERE lower(address)=? AND type=? AND txType=? AND status=? AND time>? AND lower(tx_to)=? AND lower(tx_from)!=? AND tx_chainId=?';
      const values = [lowAddress, type, txType, status, time, lowAddress, lowAddress, chainId];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            if (txType === 'tx') {
              resolve(this.normalizeTxs(results.rows.item, results.rows.length));
            } else {
              resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
            }
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findReceiveTransactions', error);
          resolve([]);
        }
      );
    });
  }

  async findMigrationTxs(
    address: string,
    chainId: string,
    type: ChainType,
    contracts: {addr: string; mid: string}[]
  ): Promise<TransactionInfo[]> {
    if (!contracts || contracts.length <= 0) {
      return [];
    }
    return new Promise((resolve) => {
      let likeSql = '(';
      for (let index = 0; index < contracts.length; index++) {
        if (index === 0) {
          likeSql = `${likeSql} tx_data LIKE '${contracts[index].mid}%' AND lower(tx_to)='${contracts[index].addr}'`;
        } else {
          likeSql = `${likeSql} or tx_data LIKE '${contracts[index].mid}%' AND lower(tx_to)='${contracts[index].addr}'`;
        }
      }
      likeSql += ')';
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND ${likeSql}`;
      const values = [address, type, 'tx', chainId];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findMigrationTxs', error);
          resolve([]);
        }
      );
    });
  }

  async findAllMigrationTxs(
    address: string,
    contracts: {addr: string; mid: string}[]
  ): Promise<TransactionInfo[]> {
    if (!contracts || contracts.length <= 0) {
      return [];
    }
    return new Promise((resolve) => {
      let likeSql = '(';
      for (let index = 0; index < contracts.length; index++) {
        if (index === 0) {
          likeSql = `${likeSql} tx_data LIKE '${contracts[index].mid}%' AND lower(tx_to)='${contracts[index].addr}'`;
        } else {
          likeSql = `${likeSql} or tx_data LIKE '${contracts[index].mid}%' AND lower(tx_to)='${contracts[index].addr}'`;
        }
      }
      likeSql += ')';
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND txType=? AND ${likeSql}`;
      const values = [address, 'tx'];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findMigrationTxs', error);
          resolve([]);
        }
      );
    });
  }

  async findReceiveMigrationTxs(
    address: string,
    chainId: string,
    type: ChainType,
    status: string,
    time: number,
    contracts: {addr: string; mid: string}[]
  ) {
    if (!contracts || contracts.length <= 0) {
      return [];
    }
    return new Promise((resolve) => {
      let likeSql = '(';
      for (let index = 0; index < contracts.length; index++) {
        if (index === 0) {
          likeSql = `${likeSql} tx_data LIKE '${contracts[index].mid}%' AND lower(tx_to)='${contracts[index].addr}'`;
        } else {
          likeSql = `${likeSql} or tx_data LIKE '${contracts[index].mid}%' AND lower(tx_to)='${contracts[index].addr}'`;
        }
      }
      likeSql += ')';
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND status=? AND time>? AND ${likeSql}`;
      const values = [address, type, 'tx', chainId, status, time];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findReceiveMigrationTxs', error);
          resolve([]);
        }
      );
    });
  }

  async getTokenHistory(
    address: string,
    chainId: string,
    type: ChainType,
    contractAddress: string,
    from: string,
    to: string,
    index: number | undefined = undefined,
    count: number | undefined = undefined
  ) {
    return new Promise((resolve) => {
      let sql;
      let values;
      if (from) {
        sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND transactionHash!='' AND transactionHash IS NOT NULL AND tx_chainId=? AND lower(tx_contractAddress)=? AND lower(tx_from)=? ORDER BY time DESC`;
        values = [address, type, 'tokentx', chainId, contractAddress.toLowerCase(), from.toLowerCase()];
      } else if (to) {
        sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND transactionHash!='' AND transactionHash IS NOT NULL AND tx_chainId=? AND lower(tx_contractAddress)=? AND lower(tx_to)=? ORDER BY time DESC`;
        values = [address, type, 'tokentx', chainId, contractAddress.toLowerCase(), to.toLowerCase()];
      } else {
        sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND transactionHash!='' AND transactionHash IS NOT NULL AND tx_chainId=? AND lower(tx_contractAddress)=? ORDER BY time DESC`;
        values = [address, type, 'tokentx', chainId, contractAddress.toLowerCase()];
      }

      if (index != undefined && count != undefined) {
        sql = `${sql} LIMIT ? OFFSET ?`;
        values = [...values, count, index];
      }

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTokenHistory', error);
          resolve([]);
        }
      );
    });
  }

  async findTokenHistory(
    address: string,
    chainId: string,
    type: ChainType,
    contractAddress: string,
    index: number | undefined = undefined,
    count: number | undefined = undefined
  ) {
    return new Promise((resolve) => {
      let sql;
      let values;
      if (index != undefined && count != undefined && index >= 0 && count > 0) {
        sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND lower(tx_contractAddress)=? ORDER BY time DESC LIMIT ? OFFSET ?';
        values = [address, type, 'tokentx', chainId, contractAddress.toLowerCase(), count, index];
      } else {
        sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? AND lower(tx_contractAddress)=? ORDER BY time DESC';
        values = [address, type, 'tokentx', chainId, contractAddress.toLowerCase()];
      }

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('findTokenHistory', error);
          resolve([]);
        }
      );
    });
  }

  async getTokenByHash(
    address: string,
    chainId: string,
    allHash: string[]
  ): Promise<any[]> {
    if (!allHash?.length) {
      return [];
    }
    return new Promise((resolve) => {
      let hashSql = '';
      allHash.forEach((hash) => {
        if (hashSql) {
          hashSql = `${hashSql},'${hash}'`;
        } else {
          hashSql = `'${hash}'`;
        }
      });
      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND txType=? AND transactionHash!='' AND transactionHash IS NOT NULL ${subSql} AND transactionHash IN (${hashSql})`;
      const values = [address, 'tokentx'];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTokenByHash', error);
          resolve([]);
        }
      );
    });
  }

  async getReceiveTokenTx(
    address: string,
    chainId: string,
    to: string,
    index: number,
    count: number
  ) {
    return new Promise((resolve) => {
      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }

      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND txType=? AND transactionHash!='' AND transactionHash IS NOT NULL ${subSql} AND lower(tx_to)=? AND transactionHash NOT IN (SELECT transactionHash FROM TRANSACTIONS WHERE address=? AND txType=? ${subSql}) ORDER BY time DESC LIMIT ? OFFSET ?`;
      const values = [address, 'tokentx', to.toLowerCase(), address, 'tx', count, index];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getReceiveTokenTx', error);
          resolve([]);
        }
      );
    });
  }

  async getAllTokenTx(
    address: string,
    chainId: string | null,
    from: string | null,
    to: string | null
  ) {
    return new Promise((resolve) => {
      let subSql = '';
      if (chainId) {
        subSql = `AND tx_chainId='${chainId}'`;
      }
      if (from) {
        subSql = `${subSql} AND lower(tx_from)='${from.toLowerCase()}'`;
      } else if (to) {
        subSql = `${subSql} AND lower(tx_to)='${to.toLowerCase()}'`;
      }
      const sql = `SELECT * FROM TRANSACTIONS WHERE address=? AND txType=? ${subSql} ORDER BY time DESC`;
      const values = [address, 'tokentx'];

      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getAllTokenTx', error);
          resolve([]);
        }
      );
    });
  }

  async getTokenTransactions(
    address: string,
    type: ChainType,
    chainId: string,
    index: number | undefined = undefined,
    count: number | undefined = undefined
  ): Promise<TokenTransactionInfo[]> {
    return new Promise((resolve) => {
      let sql;
      let values;
      if (index != undefined && count != undefined && index >= 0 && count > 0) {
        sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? ORDER BY time DESC LIMIT ? OFFSET ?';
        values = [address, type, 'tokentx', chainId, count, index];
      } else {
        sql = 'SELECT * FROM TRANSACTIONS WHERE address=? AND type=? AND txType=? AND tx_chainId=? ORDER BY time DESC';
        values = [address, type, 'tokentx', chainId];
      }
      this.db.executeSql(
        sql,
        values,
        (results: any) => {
          if (results?.rows?.length > 0) {
            resolve(this.normalizeTokenTxs(results.rows.item, results.rows.length));
          } else {
            resolve([]);
          }
        },
        (error: any) => {
          this._errorLog('getTokenTransactions', error);
          resolve([]);
        }
      );
    });
  }

  normalizeTxs(txs: any, length: number) {
    const transactions = [];
    for (let index = 0; index < length; index++) {
      const tx = txs(index);
      transactions.push({
        status: tx.status,
        id: tx.randomId,
        origin: tx.origin,
        rawTransaction: tx.rawTransaction,
        time: tx.time,
        chainId: tx.tx_chainId,
        gasUsed: tx.gasUsed,
        toSmartContract: tx.toSmartContract === 'true',
        transaction: {
          data: tx.tx_data,
          from: tx.tx_from,
          gas: tx.tx_gas,
          gasPrice: tx.tx_gasPrice,
          nonce: tx.tx_nonce,
          to: tx.tx_to,
          value: tx.tx_value,
          chainId: Number(tx.tx_chainId),
        },
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        error: tx.error ? new Error(tx.error) : undefined,
      });
    }
    return transactions;
  }

  normalizeTokenTxs(txs: any, length: number) {
    const transactions: TokenTransactionInfo[] = [];
    for (let index = 0; index < length; index++) {
      const tx = txs(index);
      transactions.push({
        id: tx.randomId,
        blockNumber: tx.blockNumber,
        chainId: tx.tx_chainId,
        time: tx.time,
        transactionHash: tx.transactionHash,
        from: tx.tx_from,
        to: tx.tx_to,
        amount: tx.tx_amount,
        status: tx.status,
        transferInformation: {
          contractAddress: tx.tx_contractAddress,
          decimals: tx.tx_decimals,
          symbol: tx.tx_symbol,
        },
      });
    }
    return transactions;
  }

  execBatchInsert(cursor: any, baseSql: string, valuesSql: string, list: any[], callback: (item: any, pos: number) => any[], splitCount = 40) {
    let index = 0;
    let values: any[] = [];
    let sql = baseSql;
    list.forEach((item, pos) => {
      sql += valuesSql;
      // eslint-disable-next-line node/callback-return
      values.push(...callback(item, pos));
      index += 1;
      if (index >= splitCount || pos === list.length - 1) {
        cursor.executeSql(sql, values);
        index = 0;
        sql = baseSql;
        values = [];
      } else {
        sql += ',';
      }
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }

  _successLog(name: string) {
    util.logDebug('SQLiteStorage', name, 'success');
  }

  _errorLog(name: string, error: any) {
    util.logError('SQLiteStorage', name, 'error', error);
  }
}
