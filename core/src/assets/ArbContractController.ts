import { addHexPrefix, BN, isZeroAddress, toChecksumAddress } from 'ethereumjs-util';
import abiERC20 from 'human-standard-token-abi';
import { Bridge, OutgoingMessageState } from 'arb-ts';
import { BigNumber, providers } from 'ethers';
import { Mutex } from 'async-mutex';
import { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import ArbNetworkController from '../network/ArbNetworkController';
import util, { bitAND, BNToHex, hexToBN, logDebug, safelyExecute } from '../util';
import TransactionController, {
  TransactionInfo,
  TransactionStatus,
  TxChangedType,
} from '../transaction/TransactionController';
import { Sqlite } from '../transaction/Sqlite';
import AssetsContractController from './AssetsContractController';
import ContractController from './ContractController';
import { WithdrawState } from './PolygonContractController';
import { ChainType } from './TokenRatesController';

export { Bridge, OutgoingMessageState };

export interface ArbConfig extends BaseConfig {
  interval: number;
  unconfirmed_interval: number;
}

export interface ArbWithdrawState extends WithdrawState {
  batchNumber?: BigNumber;
  indexInBatch?: BigNumber;
  timestamp?: string;
}

export interface ArbState extends BaseState {
  L1ToL2Address: {L1: string; L2: string; chainId: string}[];
  withdraws: ArbWithdrawState[];
}

export class ArbContractController extends ContractController<ArbConfig, ArbState> {
  private bridge: Bridge | undefined;

  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private bridgeMutex = new Mutex();

  private polling_counter = 0;

  name = 'ArbContractController';

  constructor(config?: Partial<ArbConfig>, state?: Partial<ArbState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 180000,
      unconfirmed_interval: 180000,
    };
    this.defaultState = {
      L1ToL2Address: [],
      withdraws: [],
    };
    this.initialize();
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
      this.poll();
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
    await safelyExecute(() => this.updateWithdraws());
    await safelyExecute(() => this.appendWithdrawsByHistory());
    releaseLock();
  }

  async addWithdrawTxHash(tx: string, arb_address: string, amount: string, chainId: string) {
    if (!tx || !arb_address) {
      return false;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return false;
    }
    if (arb_address.toLowerCase() === '0x') {
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
    let address = await this.calculateL1ERC20Address(arb_address);
    if (!address) {
      return false;
    }
    address = toChecksumAddress(address);
    const contract_controller = this.context.AssetsContractController as AssetsContractController;
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const releaseLock = await this.mutex.acquire();
    try {
      const { partnerChainId: ethereumChainId } = arbNetworkController.arbNetworkConfig(chainId);
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

  async updateWithdraws() {
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }
    const block_info = await this.getBlockInfo();
    if (block_info.block_number === 0 || block_info.timestamp === 0) {
      logDebug('leon.w@arb getBlockInfo failed');
      return;
    }
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const current_withdraws = this.state.withdraws;
    if (!current_withdraws || current_withdraws.length === 0) {
      return;
    }
    const { confirmIntervalInSecond } = arbNetworkController.arbNetworkConfig(chainId);
    let changed = false;
    for (const item of current_withdraws) {
      if (item.chainId !== chainId || item.processed || (item.timestamp && block_info.timestamp - Number(item.timestamp) < confirmIntervalInSecond)) {
        continue;
      }
      if (!item.batchNumber || !item.indexInBatch || !item.timestamp) {
        const { batchNumber, indexInBatch, timestamp } = await this.safelyGetBatchInfo(chainId, item.tx);
        if (batchNumber && indexInBatch && timestamp) {
          item.batchNumber = batchNumber;
          item.indexInBatch = indexInBatch;
          item.timestamp = timestamp;
          changed = true;
        }
      }

      try {
        if (item.batchNumber && item.indexInBatch) {
          const state = await this.getOutGoingMessageState(item.batchNumber, item.indexInBatch);
          if (state === OutgoingMessageState.EXECUTED) {
            item.processed = true;
            changed = true;
          } else if (state === OutgoingMessageState.CONFIRMED) {
            if (!item.done) {
              item.done = true;
              changed = true;
            }
          }
        }
      } catch (e) {
        logDebug('leon.w@getOutGoingMessageState: ', e);
      }
    }
    if (changed) {
      this.update({ withdraws: [...current_withdraws] });
    }
  }

  async appendWithdrawsByHistory() {
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress || preferencesController.isObserveAddress(selectedAddress)) {
      return;
    }
    const block_info = await this.getBlockInfo();
    if (block_info.block_number === 0 || block_info.timestamp === 0) {
      logDebug('leon.w@arb getBlockInfo failed');
      return;
    }
    const txs: TransactionInfo[] = await Sqlite.getInstance().getAllTransactions(selectedAddress, ChainType.Arbitrum, 'tx');
    if (!txs) {
      return;
    }
    const addr1 = await this.getwithdrawERC20MethodId();
    const addr2 = await this.getwithdrawETHMethodId();
    const arbMigrationTxs = txs.filter((tx) => {
      return tx.transactionHash && tx.status === TransactionStatus.confirmed &&
        ((tx.transaction.to?.toLowerCase() === addr1[0].toLowerCase() && tx.transaction.data?.startsWith(`0x${addr1[1]}`)) ||
        (tx.transaction.to?.toLowerCase() === addr2[0].toLowerCase() && tx.transaction.data?.startsWith(`0x${addr2[1]}`)));
    });
    if (!arbMigrationTxs || arbMigrationTxs.length === 0) {
      return;
    }
    const start = Date.now();
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const { partnerChainId, confirmIntervalInSecond } = arbNetworkController.arbNetworkConfig(chainId);
    const new_withdraws: ArbWithdrawState[] = [];
    for (const tx of arbMigrationTxs) {
      if (!tx.transactionHash || !tx.transaction.data || chainId !== String(tx.transaction.chainId) || partnerChainId !== this.l1_chainId) {
        continue;
      }
      if (this.state.withdraws.filter((item) => item.tx === tx.transactionHash).length > 0) {
        continue;
      }
      const block_number = Number(tx.blockNumber);
      if (tx.transaction.to === addr2[0]) {
        let amount;
        if (tx.transaction.value) {
          amount = hexToBN(tx.transaction.value);
        }
        if (!amount) {
          continue;
        }
        const { batchNumber, indexInBatch, timestamp } = await this.safelyGetBatchInfo(chainId, tx.transactionHash);
        if (!batchNumber || !indexInBatch || !timestamp) {
          continue;
        }
        let processed = false;
        let done = false;
        if (block_info.timestamp - Number(timestamp) > confirmIntervalInSecond) {
          try {
            const state = await this.getOutGoingMessageState(batchNumber, indexInBatch);
            if (state === OutgoingMessageState.EXECUTED) {
              processed = true;
            } else if (state === OutgoingMessageState.CONFIRMED) {
              done = true;
            }
          } catch (e) {
            logDebug('leon.w@getOutGoingMessageState: ', e);
          }
        }
        new_withdraws.push({
          chainId,
          tx: tx.transactionHash,
          destination: selectedAddress,
          block_number,
          done,
          processed,
          token: { nativeCurrency: true, symbol: 'ETH', decimals: 18, amount },
          batchNumber,
          indexInBatch,
          timestamp,
        });
      } else {
        const { address, amount, symbol, decimals, destination } = await this.safelyGetBaseInfo(tx.transaction.data, partnerChainId);
        if (!address || !amount || !symbol || !decimals || (destination && isZeroAddress(destination))) {
          continue;
        }
        const { batchNumber, indexInBatch, timestamp } = await this.safelyGetBatchInfo(chainId, tx.transactionHash);
        if (!batchNumber || !indexInBatch || !timestamp) {
          continue;
        }
        let processed = false;
        let done = false;
        if (block_info.timestamp - Number(timestamp) > confirmIntervalInSecond) {
          try {
            const state = await this.getOutGoingMessageState(batchNumber, indexInBatch);
            if (state === OutgoingMessageState.EXECUTED) {
              processed = true;
            } else if (state === OutgoingMessageState.CONFIRMED) {
              done = true;
            }
          } catch (e) {
            logDebug('leon.w@getOutGoingMessageState: ', e);
          }
        }
        new_withdraws.push({
          chainId,
          tx: tx.transactionHash,
          destination: selectedAddress,
          block_number,
          done,
          processed,
          token: { address, symbol, decimals, amount },
          batchNumber,
          indexInBatch,
          timestamp,
        });
      }
    }
    let changed = false;
    for (const i of new_withdraws) {
      changed = true;
      this.state.withdraws.push(i);
    }
    if (changed) {
      this.update({ withdraws: [...this.state.withdraws] });
    }
    logDebug('leon.w@appendArbWithdrawsByHistory end: ', Date.now() - start, 'withdraws: ', this.state.withdraws.length, ', txs length: ', arbMigrationTxs.length);
  }

  async safelyGetBaseInfo(data: string, mainChainId: string) {
    let address, amount, symbol, decimals, destination;
    try {
      address = `0x${data.substr(34, 40)}`;
    } catch (e) {
      logDebug('leon.w@safelyGetBaseInfo address: ', data, e);
    }
    if (!address) {
      return {};
    }
    address = toChecksumAddress(address);
    try {
      amount = hexToBN(data.substr(138, 64));
    } catch (e) {
      logDebug('leon.w@safelyGetBaseInfo amount: ', data, e);
    }
    if (!amount) {
      return {};
    }
    try {
      destination = `0x${data.substr(98, 40)}`;
    } catch (e) {
      logDebug('leon.w@safelyGetBaseInfo destination: ', data, e);
    }
    const contract_controller = this.context.AssetsContractController as AssetsContractController;
    try {
      symbol = await contract_controller.getAssetSymbol(address, mainChainId);
      decimals = await contract_controller.getTokenDecimals(address, mainChainId);
    } catch (e) {
      logDebug('leon.w@safelyGetBaseInfo symbol: ', address, e);
      return {};
    }
    decimals = Number(decimals);
    return { address, amount, symbol, decimals, destination };
  }

  async safelyGetBatchInfo(chainId: string, txHash: string) {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const { arbsys } = arbNetworkController.arbNetworkConfig(chainId);
    const tx = await this.safelyGetTransactionReceipt(txHash, chainId);
    if (!tx || !tx.logs) {
      return {};
    }
    let batchNumber;
    let indexInBatch;
    let timestamp;
    for (const log of tx.logs) {
      if (log.address === arbsys) {
        const { topics, data } = log;
        if (topics.length >= 4) {
          batchNumber = BigNumber.from(addHexPrefix(topics[3]));
        }
        if (data.length > 350) {
          indexInBatch = BigNumber.from(addHexPrefix(data.substr(66, 64)));
          timestamp = hexToBN(data.substr(258, 64)).toString();
        }
        break;
      }
    }
    return { batchNumber, indexInBatch, timestamp };
  }

  onL1NetworkChange(provider: any, chainId: any) {
    super.onL1NetworkChange(provider, chainId);
    this.bridge = undefined;
  }

  onL2NetworkChange(provider: any, chainId: any) {
    super.onL2NetworkChange(provider, chainId);
    this.bridge = undefined;
  }

  async requireBridge() {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const mainChainId = this.l1_chainId;
    const chainId = this.l2_chainId;
    const { partnerChainId } = arbNetworkController.arbNetworkConfig(chainId);
    if (mainChainId !== partnerChainId) {
      throw new Error('mainnet chainId and arbitrum chainId do not match.');
    }
    if (!this.bridge) {
      if (!this.l1_web3 || !this.l2_web3) {
        throw new Error('web3 provider not found!');
      }
      const ethprovider = new providers.Web3Provider(this.l1_web3.currentProvider);
      const arbprovider = new providers.Web3Provider(this.l2_web3.currentProvider);
      this.bridge = await Bridge.init(ethprovider.getSigner(), arbprovider.getSigner());
    }
    if (!this.bridge) {
      throw new Error('bridge not found');
    }
    return this.bridge;
  }

  async getdepositETHMethodId() {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const { inbox } = arbNetworkController.arbNetworkConfig(chainId);
    return [inbox, '0f4d14e9'];
  }

  async getdepositMethodId() {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const { l1GatewayRouter } = arbNetworkController.arbNetworkConfig(chainId);
    return [l1GatewayRouter, 'd2ce7d65'];
  }

  async getwithdrawETHMethodId() {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const { arbsys } = arbNetworkController.arbNetworkConfig(chainId);
    return [arbsys, '25e16063'];
  }

  async getwithdrawERC20MethodId() {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const { l2GatewayRouter } = arbNetworkController.arbNetworkConfig(chainId);
    return [l2GatewayRouter, '7b3a3c8b'];
  }

  getexecuteTransactionMethodId() {
    const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
    const chainId = this.l2_chainId;
    const { outbox, outbox2 } = arbNetworkController.arbNetworkConfig(chainId);
    return [outbox, outbox2, '9c5cfe0b'];
  }

  async approved(erc20: string, address = ''): Promise<string> {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bridge = await this.requireBridge();
      if (!address) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        address = await bridge.l1Bridge.getGatewayAddress(erc20);
      }
    } finally {
      releaseLock();
    }
    if (!address || isZeroAddress(address) || address === '0x') {
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

  async approve(erc20: string, amount: string, origin: string, address = ''): Promise<boolean> {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bridge = await this.requireBridge();
      if (!address) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        address = await bridge.l1Bridge.getGatewayAddress(erc20);
      }
    } finally {
      releaseLock();
    }
    if (!address || isZeroAddress(address) || address === '0x') {
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

  async calculateL2ERC20Address(erc20: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bridge = await this.requireBridge();
      const chainId = this.l2_chainId;
      const l1_address = toChecksumAddress(erc20);
      for (const item of this.state.L1ToL2Address) {
        if (item.chainId === chainId && l1_address === item.L1 && !isZeroAddress(item.L2)) {
          logDebug(`leon.w@calculateL2ERC20Address: ${erc20}, ${item.L2} already exist!`);
          return item.L2;
        }
      }

      let l2_address = await bridge.getERC20L2Address(erc20);
      if (l2_address && l2_address !== '0x' && !isZeroAddress(l2_address)) {
        l2_address = toChecksumAddress(l2_address);
        const new_pairs = this.state.L1ToL2Address;
        new_pairs.push({ L1: l1_address, L2: l2_address, chainId });
        this.update({ L1ToL2Address: new_pairs });
        return l2_address;
      }
    } catch (e) {
      logDebug('leon.w@calculateL2ERC20Address: error=', e);
    } finally {
      releaseLock();
    }
    return '';
  }

  async calculateL1ERC20Address(erc20: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bridge = await this.requireBridge();
      const chainId = this.l2_chainId;
      const l2_address = toChecksumAddress(erc20);
      for (const item of this.state.L1ToL2Address) {
        if (item.chainId === chainId && l2_address === item.L2 && !isZeroAddress(item.L1)) {
          logDebug(`leon.w@calculateL1ERC20Address: ${erc20}, ${item.L1} already exist!`);
          return item.L1;
        }
      }

      let l1_address = await bridge.l2Bridge.getERC20L1Address(erc20);
      if (l1_address && l1_address !== '0x' && !isZeroAddress(l1_address)) {
        l1_address = toChecksumAddress(l1_address);
        const new_pairs = this.state.L1ToL2Address;
        new_pairs.push({ L1: l1_address, L2: l2_address, chainId });
        this.update({ L1ToL2Address: new_pairs });
        return l1_address;
      }
    } catch (e) {
      logDebug('leon.w@calculateL1ERC20Address: error=', e);
    } finally {
      releaseLock();
    }
    return '';
  }

  async triggerL2ToL1Transaction(batchNumber: string, indexInBatch: string, singleAttempt?: boolean) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      return await (await this.requireBridge()).triggerL2ToL1Transaction(BigNumber.from(batchNumber), BigNumber.from(indexInBatch), singleAttempt);
    } finally {
      releaseLock();
    }
  }

  async depositETH(value: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bValue = BigNumber.from(value);
      return await (await this.requireBridge()).depositETH(bValue);
    } finally {
      releaseLock();
    }
  }

  async deposit(erc20L1Address: string, amount: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bAmount = BigNumber.from(amount);
      return await (await this.requireBridge()).deposit(erc20L1Address, bAmount);
    } finally {
      releaseLock();
    }
  }

  async withdrawETH(value: string, destinationAddress?: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bValue = BigNumber.from(value);
      return await (await this.requireBridge()).withdrawETH(bValue, destinationAddress);
    } finally {
      releaseLock();
    }
  }

  async withdrawERC20(erc20L1Address: string, amount: string, destinationAddress?: string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      const bAmount = BigNumber.from(amount);
      return await (await this.requireBridge()).withdrawERC20(erc20L1Address, bAmount, destinationAddress);
    } finally {
      releaseLock();
    }
  }

  async getOutGoingMessageState(batchNumber: BigNumber | string, indexInBatch: BigNumber | string) {
    const releaseLock = await this.bridgeMutex.acquire();
    try {
      if (typeof batchNumber === 'string') {
        batchNumber = BigNumber.from(batchNumber);
      }
      if (typeof indexInBatch === 'string') {
        indexInBatch = BigNumber.from(indexInBatch);
      }
      return await (await this.requireBridge()).getOutGoingMessageState(batchNumber, indexInBatch);
    } finally {
      releaseLock();
    }
  }

  rehydrate(state: Partial<ArbState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
  }

  onComposed() {
    super.onComposed();
    const preferences = this.context.PreferencesController as PreferencesController;
    preferences.subscribe(() => setTimeout(() => this.poll(), 5000), ['selectedAddress']);
    const transaction = this.context.TransactionController as TransactionController;
    transaction.subscribe(async ({ addressWithChanged, txChangedType }) => {
      if (bitAND(txChangedType, TxChangedType.ArbTxChanged) !== 0) {
        const { selectedAddress } = preferences.state;
        if (selectedAddress !== addressWithChanged) {
          return;
        }
        setTimeout(() => this.poll(), 5000);
      }
    }, ['txChangedType']);
  }
}

export default ArbContractController;
