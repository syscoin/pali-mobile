import { BN, isZeroAddress, toChecksumAddress } from 'ethereumjs-util';
import abiERC20 from 'human-standard-token-abi';
import { Mutex } from 'async-mutex';
import Matic, { MaticPOSClient } from '@maticnetwork/maticjs';
import PolygonNetworkController from '../network/PolygonNetworkController';
import PreferencesController from '../user/PreferencesController';
import util, { bitAND, BNToHex, handleFetch, hexToBN, logDebug, safelyExecute } from '../util';
import * as lastStateId from '../polygon/lastStateId.json';
import * as MainTokens from '../polygon/mainnetTokens.json';
import * as TestTokens from '../polygon/testnetTokens.json';
import TransactionController, {
  TransactionInfo,
  TransactionStatus,
  TxChangedType,
} from '../transaction/TransactionController';
import { BaseConfig, BaseState } from '../BaseController';
import { Sqlite } from '../transaction/Sqlite';
import {getContractController, getStaticTokenByChainId} from '../ControllerUtils';
import AssetsContractController from './AssetsContractController';
import { ContractController } from './ContractController';
import { ChainType } from './TokenRatesController';

const ERC20_TRANSFER_EVENT_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface PolygonConfig extends BaseConfig {
  interval: number;
  unconfirmed_interval: number;
  expired_block_number: number;
}

export interface DepositState {
  chainId: string;
  tx: string;
  root_counter: number;
  done: boolean;
}

export interface WithdrawToken {
  nativeCurrency?: boolean;
  address?: string;
  decimals: number;
  symbol: string;
  amount: BN;
}

export interface WithdrawState {
  destination: string;
  chainId: string;
  tx: string;
  block_number: number;
  done: boolean;
  processed: boolean;
  unconfirmed_timestamp?: number;
  token: WithdrawToken;
}

export interface ExitHashState {
  chainId: string;
  tx: string;
  exitHash?: string;
}

export interface PolygonState extends BaseState {
  deposits: DepositState[];
  withdraws: WithdrawState[];
  exithashs: ExitHashState[];
}

export class PolygonContractController extends ContractController<PolygonConfig, PolygonState> {

  private bridge: MaticPOSClient | undefined;

  private bridge2: Matic | undefined;

  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private bridgeMutex = new Mutex();

  private polling_counter = 0;

  name = 'PolygonContractController';

  constructor(config?: Partial<PolygonConfig>, state?: Partial<PolygonState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 180000,
      unconfirmed_interval: 180000,
      expired_block_number: 30 * 24 * 60 * 60 / 2.5,
    };
    this.defaultState = {
      deposits: [],
      withdraws: [],
      exithashs: [],
    };
    this.initialize();
  }

  rehydrate(state: Partial<PolygonState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
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
    if (this.config.disabled) {
      return;
    }
    const tokenBalancesController = this.context.TokenBalancesController;
    if (tokenBalancesController?.config.backgroundMode) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    await safelyExecute(() => this.updateDeposits());
    await safelyExecute(() => this.updateWithdraws());
    await safelyExecute(() => this.appendWithdrawsByHistory());
    releaseLock();
  }

  toEthereumAddress(address: string) {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const tokens = polygonNetworkController.ismainnet() ? MainTokens.tokens : TestTokens.tokens;
    const lowercase_address = address.toLowerCase();
    const index = tokens.findIndex((token, i) => i % 2 === 1 && token === lowercase_address);
    if (index !== -1) {
      return tokens[index - 1];
    }
    return '';
  }

  toPolygonAddress(address: string) {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const tokens = polygonNetworkController.ismainnet() ? MainTokens.tokens : TestTokens.tokens;
    const lowercase_address = address.toLowerCase();
    const index = tokens.findIndex((token, i) => i % 2 === 0 && token === lowercase_address);
    if (index !== -1) {
      return tokens[index + 1];
    }
    return '';
  }

  async addDepositTxHash(tx: string, mainChainId: string) {
    if (!tx) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = polygonNetworkController.l2ChainIdFromMainChainId(mainChainId);
    const deposits = this.state.deposits ? [...this.state.deposits] : [];
    deposits.push({ chainId, tx, root_counter: 0, done: false });
    this.update({ deposits });
    releaseLock();
  }

  async addWithdrawTxHash(tx: string, polygon_address: string, amount: string, chainId: string) {
    if (!tx || !polygon_address) {
      return false;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return false;
    }
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const { MaticWETH, partnerChainId: ethereumChainId } = polygonNetworkController.polygonNetworkConfig(chainId);
    if (polygon_address.toLowerCase() === MaticWETH?.toLowerCase()) {
      const releaseLock = await this.mutex.acquire();
      try {
        const withdraws = this.state.withdraws ? [...this.state.withdraws] : [];
        if (withdraws.filter((item) => item.tx === tx).length > 0) {
          return false;
        }
        withdraws.push({
          chainId,
          tx,
          destination: selectedAddress,
          block_number: 0,
          done: false,
          processed: false,
          token: { nativeCurrency: true, decimals: 18, symbol: 'ETH', amount: hexToBN(amount) },
        });
        this.update({ withdraws });
      } finally {
        releaseLock();
      }
      return true;
    }
    let address = this.toEthereumAddress(polygon_address);
    if (!address) {
      return false;
    }
    address = toChecksumAddress(address);
    const contract_controller = this.context.AssetsContractController as AssetsContractController;
    const releaseLock = await this.mutex.acquire();
    try {
      const symbol = await contract_controller.getAssetSymbol(address, ethereumChainId);
      const decimals = await contract_controller.getTokenDecimals(address, ethereumChainId);
      const withdraws = this.state.withdraws ? [...this.state.withdraws] : [];
      if (withdraws.filter((item) => item.tx === tx).length > 0) {
        return false;
      }
      withdraws.push({ chainId, tx, destination: selectedAddress, block_number: 0, done: false, processed: false, token: { address, symbol, decimals: Number(decimals), amount: hexToBN(amount) } });
      this.update({ withdraws });
      return true;
    } catch (e) {
      logDebug('leon.w@addWithdrawTxHash: ', e);
    } finally {
      releaseLock();
    }
    return false;
  }

  async addClaimTxHash(tx: string) {
    if (!tx) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    const chainId = this.l2_chainId;
    const { withdraws } = this.state;
    let changed = false;
    for (const item of withdraws) {
      if (item.tx === tx && item.chainId === chainId && !item.processed) {
        item.unconfirmed_timestamp = Date.now();
        changed = true;
        break;
      }
    }
    if (changed) {
      this.update({ withdraws: [...withdraws] });
    }
    releaseLock();
  }

  async updateDeposits() {
    const contractController = this.context.AssetsContractController as AssetsContractController;
    const chainId = this.l2_chainId;
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const { partnerChainId: ethereumChainId, DepositManagerProxy } = polygonNetworkController.polygonNetworkConfig(chainId);
    const current_deposits = this.state.deposits;
    if (!current_deposits || current_deposits.length === 0) {
      return;
    }
    let is_necessary = false;
    for (const item of current_deposits) {
      if (item.done) {
        continue;
      }
      if (!item.chainId) {
        item.chainId = polygonNetworkController.l2ChainIdFromMainChainId('1');
      }
      if (item.chainId !== chainId) {
        continue;
      }
      is_necessary = true;
      break;
    }
    if (!is_necessary) {
      return;
    }
    const child_counter = await this.safelyGetChildCounter();
    if (!child_counter || Number(child_counter) <= 0) {
      return;
    }
    logDebug('leon.w@updateDeposits: child_counter=', child_counter);
    let changed = false;
    for (const item of current_deposits) {
      if (item.done || item.chainId !== chainId) {
        continue;
      }
      if (!item.root_counter || item.root_counter === 0) {
        const tx = await contractController.safelyGetTransactionReceipt(item.tx, ethereumChainId);
        if (tx?.to?.toLowerCase() === DepositManagerProxy?.toLowerCase()) {
          if (tx && tx.logs.length > 1 && tx.logs[tx.logs.length - 2].topics.length > 1) {
            item.root_counter = hexToBN(tx.logs[tx.logs.length - 2].topics[1]).toNumber();
            logDebug('leon.w@updateDeposits: root_counter matic=', item.root_counter);
          }
        } else if (tx && tx.logs.length > 0 && tx.logs[tx.logs.length - 1].topics.length > 1) {
          item.root_counter = hexToBN(tx.logs[tx.logs.length - 1].topics[1]).toNumber();
          logDebug('leon.w@updateDeposits: root_counter=', item.root_counter);
        }
      }
      if (!item.root_counter || item.root_counter === 0) {
        continue;
      }
      item.done = Number(child_counter) >= item.root_counter;
      if (item.done) {
        changed = true;
      }
    }

    if (changed) {
      this.update({ deposits: [...current_deposits] });
    }
  }

  async appendWithdrawsByHistory() {
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress || preferencesController.isObserveAddress(selectedAddress)) {
      return;
    }
    const txs: TransactionInfo[] = await Sqlite.getInstance().getAllTransactions(selectedAddress, ChainType.Polygon, 'tx');
    if (!txs) {
      return;
    }
    const block_info = await this.getBlockInfo();
    if (block_info.block_number === 0 || block_info.timestamp === 0) {
      logDebug('leon.w@polygon getBlockInfo failed');
      return;
    }
    const addr1 = await this.getwithdrawMethodId();
    const polygonMigrationTxs = txs.filter((tx) => {
      return tx.transactionHash && tx.status === TransactionStatus.confirmed && tx.blockNumber && block_info.block_number - Number(tx.blockNumber) < this.config.expired_block_number && tx.transaction.data?.startsWith(`0x${addr1[1]}`);
    });
    if (!polygonMigrationTxs || polygonMigrationTxs.length === 0) {
      return;
    }
    const start = Date.now();
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = this.l2_chainId;
    const { partnerChainId, MaticWETH } = polygonNetworkController.polygonNetworkConfig(chainId);
    const new_withdraws: WithdrawState[] = [];
    let done_block_number = 0;
    const current_withdraws = this.state.withdraws;
    for (const item of current_withdraws) {
      if (item.chainId !== chainId || !item.done) {
        continue;
      }
      if (item.block_number > done_block_number) {
        done_block_number = item.block_number;
      }
    }
    const { contractController } = getContractController(this.context, partnerChainId);
    if (!contractController) {
      return;
    }
    for (const tx of polygonMigrationTxs) {
      if (!tx.transactionHash || !tx.transaction.to || !tx.transaction.data || chainId !== String(tx.transaction.chainId) || partnerChainId !== this.l1_chainId) {
        continue;
      }
      if (this.state.withdraws.filter((item) => item.tx === tx.transactionHash).length > 0) {
        continue;
      }
      if (tx.transaction.to.toLowerCase() !== MaticWETH?.toLowerCase() && !this.toEthereumAddress(tx.transaction.to)) {
        continue;
      }
      const amount = hexToBN(tx.transaction.data.substr(10, 64));
      let result = false;
      try {
        result = await this.isERC20ExitProcessed(tx.transactionHash, chainId);
      } catch (e) {
        logDebug('leon.w@appendWithdrawsByHistory: ', e);
      }
      if (result) {
        if (done_block_number < Number(tx.blockNumber)) {
          done_block_number = Number(tx.blockNumber);
        }
        new_withdraws.push({ chainId, tx: tx.transactionHash, destination: selectedAddress, block_number: 0, done: true, processed: true, token: { address: tx.transaction.to, symbol: '', decimals: 18, amount } });
        continue;
      }
      const block_number = Number(tx.blockNumber);
      let done = false;
      const processed = false;
      if (block_number <= done_block_number) {
        done = true;
      } else {
        const {
          message,
        } = await this.safelyFetchInclusion(block_number, polygonNetworkController.ismainnet());
        if (message === 'success') {
          if (block_number > done_block_number) {
            done_block_number = block_number;
          }
          done = true;
        }
      }
      if (tx.transaction.to.toLowerCase() === MaticWETH?.toLowerCase()) {
        new_withdraws.push({ chainId, tx: tx.transactionHash, destination: selectedAddress, block_number, done, processed, token: { nativeCurrency: true, decimals: 18, symbol: 'ETH', amount } });
      } else {
        let address = this.toEthereumAddress(tx.transaction.to);
        if (!address) {
          continue;
        }
        address = toChecksumAddress(address);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        let { decimals, symbol } = await getStaticTokenByChainId(chainId, tokenAddress);
        if (!decimals || !symbol) {
          try {
            symbol = await contractController.getAssetSymbol(address, partnerChainId);
            decimals = await contractController.getTokenDecimals(address, partnerChainId);
          } catch (e) {
            logDebug('leon.w@appendWithdrawsByHistory get Symbol: ', e);
            continue;
          }
        }
        new_withdraws.push({
          chainId,
          tx: tx.transactionHash,
          destination: selectedAddress,
          block_number,
          done,
          processed,
          token: { address, symbol, decimals: Number(decimals), amount },
        });
      }
    }
    let changed = false;
    for (const i of new_withdraws) {
      if (this.state.withdraws.filter((item) => item.tx === i.tx).length > 0) {
        continue;
      }
      changed = true;
      this.state.withdraws.push(i);
    }
    if (changed) {
      this.update({ withdraws: [...this.state.withdraws] });
    }
    logDebug('leon.w@appendPolygonWithdrawsByHistory end: ', Date.now() - start, 'withdraws: ', this.state.withdraws.length, ', txs length: ', polygonMigrationTxs.length);
  }

  async updateWithdraws() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = this.l2_chainId;
    const current_withdraws = this.state.withdraws;
    if (!current_withdraws || current_withdraws.length === 0) {
      return;
    }
    const block_info = await this.getBlockInfo();
    if (block_info.block_number === 0 || block_info.timestamp === 0) {
      logDebug('leon.w@polygon getBlockInfo failed');
      return;
    }
    let changed = false;
    let done_block_number = 0;
    for (const item of current_withdraws) {
      if (item.chainId !== chainId || !item.done) {
        continue;
      }
      if (item.block_number > done_block_number) {
        done_block_number = item.block_number;
      }
    }
    for (const item of current_withdraws) {
      if (item.chainId !== chainId || item.done) {
        continue;
      }
      if (!item.block_number || item.block_number === 0) {
        const tx = await this.safelyGetTransactionReceipt(item.tx, chainId);
        if (tx) {
          item.block_number = Number(tx.blockNumber);
          logDebug('leon.e@updateWithdrws: block_number=', item.block_number);
        }
      }
      if (!item.block_number || item.block_number === 0) {
        continue;
      }
      if (item.block_number < done_block_number) {
        item.done = true;
        changed = true;
      } else {
        const {
          message,
        } = await this.safelyFetchInclusion(item.block_number, polygonNetworkController.ismainnet());
        if (message === 'success') {
          item.done = true;
          if (item.block_number > done_block_number) {
            done_block_number = item.block_number;
          }
          changed = true;
        }
      }
    }
    for (const item of current_withdraws) {
      if (item.chainId !== chainId || !item.done || item.processed) {
        continue;
      }
      let result = item.block_number && block_info.block_number - item.block_number > this.config.expired_block_number;
      if (!result) {
        try {
          result = await this.isERC20ExitProcessed(item.tx, chainId);
        } catch (e) {
          logDebug('leon.w@updateWithdrws: checkProcessedError=', e);
          break;
        }
      }
      if (result) {
        item.processed = true;
        changed = true;
      }
    }
    if (changed) {
      this.update({ withdraws: [...current_withdraws] });
    }
  }

  async isERC20ExitProcessed(tx: string, chainId: string) {
    let exitHash;
    for (const item of this.state.exithashs) {
      if (item.chainId === chainId && item.tx === tx && item.exitHash) {
        exitHash = item.exitHash;
        break;
      }
    }
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bridge = await this.requireBridge();
      if (!exitHash) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        exitHash = await bridge.posRootChainManager.exitManager.getExitHash(tx, ERC20_TRANSFER_EVENT_SIG, bridge.posRootChainManager.requestConcurrency);
        const exithashs = [...this.state.exithashs];
        exithashs.push({ chainId, tx, exitHash });
        this.update({ exithashs });
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return bridge.posRootChainManager.posRootChainManager.methods.processedExits(exitHash).call();
    } finally {
      releaseLock();
    }
  }

  async exitERC20(txHash: string, from: string, legacyProof: boolean) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      return await new Promise((resolve, reject) => {
        this.requireBridge()
          .then((bridge) => {
            return bridge.exitERC20(txHash, {
              from,
              legacyProof,
              onTransactionHash: (result: unknown) => {
                resolve(result);
              },
              onError: (error: any) => {
                reject(error);
              },
            });
          }).then((result) => {
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      });
    } finally {
      releaseLock();
    }
  }

  async depositEtherForUser(user: string, amount: string, from: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      return await new Promise((resolve, reject) => {
        this.requireBridge()
          .then((bridge) => {
            return bridge.depositEtherForUser(user, hexToBN(amount), {
              from,
              onTransactionHash: (result: unknown) => {
                resolve(result);
              },
              onError: (error: any) => {
                reject(error);
              },
            });
          }).then((result) => {
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      });
    } finally {
      releaseLock();
    }
  }

  async depositERC20ForUser(rootToken: string, user: string, amount: string, from: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
      const { MaticToken } = polygonNetworkController.polygonNetworkConfig(this.l2_chainId);
      if (MaticToken?.toLowerCase() === rootToken?.toLowerCase()) {
        return await new Promise((resolve, reject) => {
          this.requireBridge2()
            .then((bridge) => {
              return bridge.depositERC20ForUser(rootToken, user, hexToBN(amount), {
                from,
                onTransactionHash: (result: unknown) => {
                  resolve(result);
                },
                onError: (error: any) => {
                  reject(error);
                },
              });
            }).then((result) => {
            resolve(result);
          }).catch((error) => {
            reject(error);
          });
        });
      }
      return await new Promise((resolve, reject) => {
        this.requireBridge()
          .then((bridge) => {
            return bridge.depositERC20ForUser(rootToken, user, amount, {
              from,
              onTransactionHash: (result: unknown) => {
                resolve(result);
              },
              onError: (error: any) => {
                reject(error);
              },
            });
          }).then((result) => {
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      });
    } finally {
      releaseLock();
    }
  }

  async burnERC20(rchildToken: string, amount: string, from: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      return await new Promise((resolve, reject) => {
        this.requireBridge()
          .then((bridge) => {
            return bridge.burnERC20(rchildToken, hexToBN(amount), {
              from,
              onTransactionHash: (result: unknown) => {
                resolve(result);
              },
              onError: (error: any) => {
                reject(error);
              },
            });
          }).then((result) => {
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      });
    } finally {
      releaseLock();
    }
  }

  async safelyGetChildCounter() {
    return new Promise<any>((resolve) => {
      if (!this.l2_web3) {
        resolve(undefined);
        return;
      }
      try {
        const contract = this.l2_web3.eth.contract(lastStateId.abi).at('0x0000000000000000000000000000000000001001');
        contract.lastStateId((error: Error, result: any) => {
          if (error) {
            resolve(undefined);
            return;
          }
          resolve(result);
        });
      } catch (e) {
        logDebug('leon.w@safelyGetChildCounter: ', e);
        resolve(undefined);
      }
    });
  }

  private getInclusionCheckingURL(block_number: number, mainnet = true) {
    return mainnet ? `https://apis.matic.network/api/v1/matic/block-included/${block_number}` : `https://apis.matic.network/api/v1/mumbai/block-included/${block_number}`;
  }

  async safelyFetchInclusion(block_number: number, mainnet = true) {
    try {
      const result = await handleFetch(this.getInclusionCheckingURL(block_number, mainnet));
      return result;
    } catch (e) {
      logDebug('leon.w@safelyFetchInclusion: ', block_number, mainnet, e);
      return {};
    }
  }

  onL1NetworkChange(provider: any, chainId: any) {
    super.onL1NetworkChange(provider, chainId);
    this.bridge = undefined;
    this.bridge2 = undefined;
  }

  onL2NetworkChange(provider: any, chainId: any) {
    super.onL2NetworkChange(provider, chainId);
    this.bridge = undefined;
    this.bridge2 = undefined;
  }

  async requireBridge() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const mainChainId = this.l1_chainId;
    const chainId = this.l2_chainId;
    const { partnerChainId } = polygonNetworkController.polygonNetworkConfig(chainId);
    if (mainChainId !== partnerChainId) {
      throw new Error('mainnet chainId and polygon chainId do not match.');
    }
    if (!this.bridge) {
      if (!this.l1_web3 || !this.l2_web3) {
        throw new Error('web3 provider not found!');
      }
      this.bridge = new MaticPOSClient({
        network: polygonNetworkController.ismainnet() ? 'mainnet' : 'testnet',
        version: polygonNetworkController.ismainnet() ? 'v1' : 'mumbai',
        parentProvider: this.l1_web3.currentProvider,
        maticProvider: this.l2_web3.currentProvider,
      });
    }
    if (!this.bridge) {
      throw new Error('bridge not found');
    }
    return this.bridge;
  }

  async requireBridge2() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const mainChainId = this.l1_chainId;
    const chainId = this.l2_chainId;
    const { partnerChainId } = polygonNetworkController.polygonNetworkConfig(chainId);
    if (mainChainId !== partnerChainId) {
      throw new Error('mainnet chainId and polygon chainId do not match.');
    }
    if (!this.bridge2) {
      if (!this.l1_web3 || !this.l2_web3) {
        throw new Error('web3 provider not found!');
      }
      this.bridge2 = new Matic({
        network: polygonNetworkController.ismainnet() ? 'mainnet' : 'testnet',
        version: polygonNetworkController.ismainnet() ? 'v1' : 'mumbai',
        parentProvider: this.l1_web3.currentProvider,
        maticProvider: this.l2_web3.currentProvider,
      });
    }
    if (!this.bridge2) {
      throw new Error('bridge2 not found');
    }
    return this.bridge2;
  }

  async getdepositEtherForUserMethodId() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = this.l2_chainId;
    const { RootChainManagerProxy } = polygonNetworkController.polygonNetworkConfig(chainId);
    return [RootChainManagerProxy, '4faa8a26'];
  }

  async getdepositERC20ForUserMethodId() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = this.l2_chainId;
    const { RootChainManagerProxy } = polygonNetworkController.polygonNetworkConfig(chainId);
    return [RootChainManagerProxy, 'e3dec8fb'];
  }

  async getdepositERC20ForUserMethodId2() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = this.l2_chainId;
    const { DepositManagerProxy } = polygonNetworkController.polygonNetworkConfig(chainId);
    return [DepositManagerProxy, '8b9e4f93'];
  }

  async getexitERC20MethodId() {
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const chainId = this.l2_chainId;
    const { RootChainManagerProxy } = polygonNetworkController.polygonNetworkConfig(chainId);
    return [RootChainManagerProxy, '3805550f'];
  }

  async getwithdrawMethodId() {
    return [undefined, '2e1a7d4d'];
  }

  async approved(erc20: string): Promise<string> {
    const releaseLock = await this.bridgeMutex.acquire();
    let address: string | undefined;
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const { MaticToken, DepositManagerProxy } = polygonNetworkController.polygonNetworkConfig(this.l2_chainId);
    try {
      if (erc20?.toLowerCase() === MaticToken?.toLowerCase()) {
        address = DepositManagerProxy;
      } else {
        const bridge = await this.requireBridge();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        address = await bridge.posRootChainManager.getPredicateAddress(erc20);
      }
    } finally {
      releaseLock();
    }
    if (!address || isZeroAddress(address)) {
      throw new Error('erc20 bridge not found');
    }
    return new Promise<string>((resolve) => {
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const { selectedAddress } = preferencesController.state;
      const contract = this.l1_web3.eth.contract(abiERC20).at(erc20);
      const chainId = this.l1_chainId;
      contract.allowance(selectedAddress, address, { from: selectedAddress, chainId }, (error: Error, result: BN) => {
        logDebug(`leon.w@approved(${erc20}, ${address}): `, error, result);
        if (error) {
          return;
        }
        resolve(BNToHex(result));
      });
    });
  }

  async approve(erc20: string, amount: string, origin: string): Promise<boolean> {
    const releaseLock = await this.bridgeMutex.acquire();
    let address: string | undefined;
    const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
    const { MaticToken, DepositManagerProxy } = polygonNetworkController.polygonNetworkConfig(this.l2_chainId);
    try {
      if (erc20?.toLowerCase() === MaticToken?.toLowerCase()) {
        address = DepositManagerProxy;
      } else {
        const bridge = await this.requireBridge();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        address = await bridge.posRootChainManager.getPredicateAddress(erc20);
      }
    } finally {
      releaseLock();
    }
    if (!address || isZeroAddress(address)) {
      throw new Error('erc20 bridge not found');
    }
    return new Promise<boolean>((resolve) => {
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const { selectedAddress } = preferencesController.state;
      const chainId = this.l1_chainId;
      const contract = this.l1_web3.eth.contract(abiERC20).at(erc20);
      contract.approve(address, amount, { from: selectedAddress, chainId, origin }, (error: Error, result: any) => {
        logDebug(`leon.w@approve(${erc20}, ${amount}, ${address}): `, error, result);
        if (error) {
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  onComposed() {
    super.onComposed();
    const preferences = this.context.PreferencesController as PreferencesController;
    preferences.subscribe(() => setTimeout(() => this.poll(), 5000), ['selectedAddress']);
    const transaction = this.context.TransactionController as TransactionController;
    transaction.subscribe(async ({ addressWithChanged, txChangedType }) => {
      if (bitAND(txChangedType, TxChangedType.PolygonTxChanged) !== 0) {
        const { selectedAddress } = preferences.state;
        if (selectedAddress !== addressWithChanged) {
          return;
        }
        setTimeout(() => this.poll(), 5000);
      }
    }, ['txChangedType']);
  }
}

export default PolygonContractController;
