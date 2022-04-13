import { EventEmitter } from 'events';
import { addHexPrefix, BN, bufferToHex } from 'ethereumjs-util';
import { ethErrors } from 'eth-rpc-errors';
import MethodRegistry from 'eth-method-registry';
import Common from '@ethereumjs/common';
import EthQuery from 'eth-query';
import { TransactionFactory, TypedTransaction } from '@ethereumjs/tx';
import { v1 as random } from 'uuid';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import NetworkController, { getNetworkType } from '../network/NetworkController';
import ArbNetworkController from '../network/ArbNetworkController';

import util, {
  bitOR,
  BNToHex,
  fractionBN,
  getIncreasedPriceFromExisting,
  handleTransactionFetch,
  hexToBN,
  isEIP1559Transaction,
  isSmartContractCode,
  logDebug, logInfo,
  logWarn,
  normalizeTransaction,
  query,
  safelyExecute,
  validateTransaction,
} from '../util';
import BscNetworkController from '../network/BscNetworkController';
import PolygonNetworkController from '../network/PolygonNetworkController';
import { ChainType } from '../assets/TokenRatesController';
import PreferencesController from '../user/PreferencesController';
import HecoNetworkController from '../network/HecoNetworkController';
import OpNetworkController from '../network/OpNetworkController';
import AvaxNetworkController from '../network/AvaxNetworkController';
import SyscoinNetworkController from '../network/SyscoinNetworkController';
import RpcNetworkController from '../network/RpcNetworkController';
import { Sqlite } from './Sqlite';

const HARDFORK = 'london';

/**
 * @type Result
 *
 * @property result - Promise resolving to a new transaction hash
 * @property transactionMeta - Meta information about this new transaction
 */
export interface Result {
  result: Promise<string>;
  transactionMeta: TransactionMeta;
}

/**
 * @type Fetch All Options
 *
 * @property fromBlock - String containing a specific block decimal number
 * @property etherscanApiKey - API key to be used to fetch token transactions
 */
export interface FetchAllOptions {
  fromBlock?: string;
  etherscanApiKey?: string;
  chainId?: string;
}

/**
 * @type Transaction
 *
 * Transaction representation
 *
 * @property chainId - Network ID as per EIP-155
 * @property data - Data to pass with this transaction
 * @property from - Address to send this transaction from
 * @property gas - Gas to send with this transaction
 * @property gasPrice - Price of gas with this transaction
 * @property nonce - Unique number to prevent replay attacks
 * @property to - Address to send this transaction to
 * @property value - Value associated with this transaction
 */
export interface Transaction {
  chainId: number;
  data?: string;
  from: string;
  gas?: string;
  gasPrice?: string;
  nonce?: string;
  to?: string;
  value?: string;
  extraInfo?: TransactionExtraInfo;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedBaseFee?: string;
}

/**
 * The status of the transaction. Each status represents the state of the transaction internally
 * in the wallet. Some of these correspond with the state of the transaction on the network, but
 * some are wallet-specific.
 */
export enum TransactionStatus {
  approved = 'approved',
  cancelled = 'cancelled',
  confirmed = 'confirmed',
  failed = 'failed',
  rejected = 'rejected',
  signed = 'signed',
  submitted = 'submitted',
  unapproved = 'unapproved',
}

export enum CrossChainType {
  depositArb = 'depositArb',
  withdrawArb = 'withdrawArb',
  depositPolygon = 'depositPolygon',
  withdrawPolygon = 'withdrawPolygon',
}

type TransferInformation = {
  symbol: string;
  contractAddress: string;
  decimals: number;
};

type TransactionExtraInfo = {
  nativeCurrency?: boolean;
  symbol?: string;
  contractAddress?: string;
  decimals?: number;
  transferTo?: string;
  readableAmount?: string;
  crossChainType?: CrossChainType;
  crossChainDone?: boolean;
  tryCancelHash?: string;
  tryCancelTime?: number;
};

type TransactionMeta = {
  status: TransactionStatus;
  id: string;
  chainId: string;
  origin?: string;
  rawTransaction?: string;
  time: number;
  transaction: Transaction;
  transactionHash?: string;
  blockNumber?: string;
  extraInfo?: TransactionExtraInfo;
  error?: Error;
};

export type TransactionInfo = {
  status: TransactionStatus;
  id: string;
  origin?: string;
  rawTransaction?: string;
  time: number;
  gasUsed?: string;
  toSmartContract?: boolean;
  transaction: Transaction;
  transactionHash?: string;
  blockNumber?: string;
  error?: Error;
};

export type TokenTransactionInfo = {
  status: TransactionStatus;
  id: string;
  blockNumber?: string;
  chainId: string;
  time: number;
  transactionHash?: string;
  from: string;
  to: string;
  amount: string;
  transferInformation: TransferInformation;
  error?: Error;
};

export enum TxChangedType {
  NoChange = 0x0,

  TxChanged = 0x1,
  TokenTxChanged = 0x2,

  BscTxChanged = 0x4,
  BscTokenTxChanged = 0x8,

  PolygonTxChanged = 0x10,
  PolygonTokenTxChanged = 0x20,

  ArbTxChanged = 0x40,
  ArbTokenTxChanged = 0x80,

  HecoTxChanged = 0x100,
  HecoTokenTxChanged = 0x200,

  OpTxChanged = 0x400,
  OpTokenTxChanged = 0x800,

  AvaxTxChanged = 0x1000,
  AvaxTokenTxChanged = 0x2000,

  SyscoinTxChanged = 0x4000,
  SyscoinTokenTxChanged = 0x8000,
}

/**
 * @type EtherscanTransactionMeta
 *
 * EtherscanTransactionMeta representation
 * @property blockNumber - Number of the block where the transaction has been included
 * @property timeStamp - Timestamp associated with this transaction
 * @property hash - Hash of a successful transaction
 * @property nonce - Nonce of the transaction
 * @property blockHash - Hash of the block where the transaction has been included
 * @property transactionIndex - Etherscan internal index for this transaction
 * @property from - Address to send this transaction from
 * @property to - Address to send this transaction to
 * @property gas - Gas to send with this transaction
 * @property gasPrice - Price of gas with this transaction
 * @property isError - Synthesized error information for failed transactions
 * @property txreceipt_status - Receipt status for this transaction
 * @property input - input of the transaction
 * @property contractAddress - Address of the contract
 * @property cumulativeGasUsed - Amount of gas used
 * @property confirmations - Number of confirmations
 *
 */
export interface EtherscanTransactionMeta {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  tokenDecimal: string;
  tokenSymbol: string;
}

/**
 * @type TransactionConfig
 *
 * Transaction controller configuration
 *
 * @property interval - Polling interval used to fetch new currency rate
 * @property provider - Provider used to create a new underlying EthQuery instance
 * @property sign - Method used to sign transactions
 */
export interface TransactionConfig extends BaseConfig {
  interval: number;
  sign?: (transaction: TypedTransaction, from: string) => Promise<TypedTransaction>;
}

/**
 * @type MethodData
 *
 * Method data registry object
 *
 * @property registryMethod - Registry method raw string
 * @property parsedRegistryMethod - Registry method object, containing name and method arguments
 */
export interface MethodData {
  registryMethod: string;
  parsedRegistryMethod: Record<string, unknown>;
}

/**
 * @type TransactionState
 *
 * Transaction controller state
 *
 * @property transactions - A list of TransactionMeta objects
 * @property methodData - Object containing all known method data information
 */
export interface TransactionState extends BaseState {
  transactionMetas: TransactionMeta[];
  methodData: { [key: string]: MethodData };
  txChangedType: TxChangedType;
  addressWithChanged: string;
}

/**
 * Multiplier used to determine a transaction's increased gas fee during cancellation
 */
export const CANCEL_RATE = 1.5;

/**
 * Multiplier used to determine a transaction's increased gas fee during speed up
 */
export const SPEED_UP_RATE = 1.1;

/**
 * Controller responsible for submitting and managing transactions
 */
export class TransactionController extends BaseController<TransactionConfig, TransactionState> {
  private ethQuery: any;

  private arbEthQuery: any;

  private opEthQuery: any;

  private bscEthQuery: any;

  private polygonEthQuery: any;

  private hecoEthQuery: any;

  private avaxEthQuery: any;

  private syscoinEthQuery: any;

  private registry: any;

  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private failTransaction(transactionMeta: TransactionMeta, error: Error) {
    const newTransactionMeta = {
      ...transactionMeta,
      error,
      status: TransactionStatus.failed,
    };
    this.updateTransaction(newTransactionMeta);
    this.hub.emit(`${transactionMeta.id}:finished`, newTransactionMeta);
  }

  private async registryLookup(fourBytePrefix: string): Promise<MethodData> {
    const registryMethod = await this.registry.lookup(fourBytePrefix);
    const parsedRegistryMethod = this.registry.parse(registryMethod);
    return { registryMethod, parsedRegistryMethod };
  }

  /**
   * Normalizes the transaction information from etherscan
   * to be compatible with the TransactionMeta interface
   *
   * @param txMeta - Object containing the transaction information
   * @param currentNetworkID - string representing the current network id
   * @param currentChainId - string representing the current chain id
   * @returns - TransactionMeta
   */
  private normalizeTx(
    txMeta: EtherscanTransactionMeta,
    currentChainId: string,
  ): TransactionInfo {
    const time = parseInt(txMeta.timeStamp, 10) * 1000;
    const normalizedTransactionInfo = {
      blockNumber: txMeta.blockNumber,
      id: random({ msecs: time }),
      chainId: currentChainId,
      time,
      transaction: {
        data: txMeta.input,
        from: txMeta.from,
        gas: BNToHex(new BN(txMeta.gas)),
        gasPrice: BNToHex(new BN(txMeta.gasPrice)),
        nonce: BNToHex(new BN(txMeta.nonce)),
        to: txMeta.to,
        value: BNToHex(new BN(txMeta.value)),
        chainId: Number(currentChainId),
      },
      gasUsed: BNToHex(new BN(txMeta.gasUsed)),
      transactionHash: txMeta.hash,
      toSmartContract: isSmartContractCode(txMeta.input),
    };

    /* istanbul ignore else */
    if (txMeta.isError === '0') {
      return {
        ...normalizedTransactionInfo,
        status: TransactionStatus.confirmed,
      };
    }

    /* istanbul ignore next */
    return {
      ...normalizedTransactionInfo,
      error: new Error('Transaction failed'),
      status: TransactionStatus.failed,
    };
  }

  private normalizeTokenTx = (
    txMeta: EtherscanTransactionMeta,
    currentChainId: string,
  ): TokenTransactionInfo => {
    const time = parseInt(txMeta.timeStamp, 10) * 1000;
    const { blockNumber, to, from, hash, contractAddress, tokenDecimal, tokenSymbol, value } = txMeta;
    return {
      id: random({ msecs: time }),
      blockNumber,
      chainId: currentChainId,
      time,
      transactionHash: hash,
      from,
      to,
      amount: BNToHex(new BN(value)),
      status: TransactionStatus.confirmed,
      transferInformation: {
        contractAddress,
        decimals: Number(tokenDecimal),
        symbol: tokenSymbol,
      },
    };
  };

  /**
   * EventEmitter instance used to listen to specific transactional events
   */
  hub = new EventEmitter();

  /**
   * Name of this controller used during composition
   */
  name = 'TransactionController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['NetworkController'];

  /**
   * Creates a TransactionController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<TransactionConfig>, state?: Partial<TransactionState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 5000,
    };
    this.defaultState = {
      methodData: {},
      transactionMetas: [],
      txChangedType: TxChangedType.NoChange,
      addressWithChanged: '',
    };
    this.initialize();
  }

  /**
   * Starts a new polling interval
   *
   * @param interval - Polling interval used to fetch new transaction statuses
   */
  async poll(interval?: number): Promise<void> {
    interval && this.configure({ interval }, false, false);
    this.handle && clearTimeout(this.handle);
    await safelyExecute(() => this.queryTransactionStatuses());
    this.handle = setTimeout(() => {
      this.poll(this.config.interval);
    }, this.config.interval);
  }

  getETHQueryByChainId(chainId: string) {
    const commonNetwork = this.context.NetworkController as NetworkController;
    const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
    const opNetwork = this.context.OpNetworkController as OpNetworkController;
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    const polygonNetwork = this.context.PolygonNetworkController as PolygonNetworkController;
    const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
    const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
    const syscoinNetwork = this.context.SyscoinNetworkController as SyscoinNetworkController;
    const rpcNetwork = this.context.RpcNetworkController as RpcNetworkController;
    const {
      state: {
        provider: { chainId: commonChainId },
      },
    } = commonNetwork;

    const {
      state: {
        provider: { chainId: arbChainId },
      },
    } = arbNetwork;

    const {
      state: {
        provider: { chainId: opChainId },
      },
    } = opNetwork;

    const {
      state: {
        provider: { chainId: bscChainId },
      },
    } = bscNetwork;

    const {
      state: {
        provider: { chainId: polygonChainId },
      },
    } = polygonNetwork;

    const {
      state: {
        provider: { chainId: hecoChainId },
      },
    } = hecoNetwork;

    const {
      state: {
        provider: { chainId: avaxChainId },
      },
    } = avaxNetwork;

    const {
      state: {
        provider: { chainId: syscoinChainId },
      },
    } = syscoinNetwork;

    if (chainId === commonChainId) {
      return this.ethQuery;
    } else if (chainId === arbChainId) {
      return this.arbEthQuery;
    } else if (chainId === opChainId) {
      return this.opEthQuery;
    } else if (chainId === bscChainId) {
      return this.bscEthQuery;
    } else if (chainId === polygonChainId) {
      return this.polygonEthQuery;
    } else if (chainId === hecoChainId) {
      return this.hecoEthQuery;
    } else if (chainId === avaxChainId) {
      return this.avaxEthQuery;
    } else if (chainId === syscoinChainId) {
      return this.syscoinEthQuery;
    } else if (rpcNetwork.isRpcChainId(chainId)) {
      const type = rpcNetwork.getChainTypeByChainId(chainId);
      if (type) {
        return rpcNetwork.allEthQuery[type];
      }
    }
    return null;
  }

  /**
   * Handle new method data request
   *
   * @param fourBytePrefix - String corresponding to method prefix
   * @returns - Promise resolving to method data object corresponding to signature prefix
   */
  async handleMethodData(fourBytePrefix: string): Promise<MethodData> {
    const releaseLock = await this.mutex.acquire();
    try {
      const { methodData } = this.state;
      const knownMethod = Object.keys(methodData).find((knownFourBytePrefix) => fourBytePrefix === knownFourBytePrefix);
      if (knownMethod) {
        return methodData[fourBytePrefix];
      }
      const registry = await this.registryLookup(fourBytePrefix);
      this.update({ txChangedType: TxChangedType.NoChange, methodData: { ...methodData, ...{ [fourBytePrefix]: registry } } });
      return registry;
    } finally {
      releaseLock();
    }
  }

  /**
   * Add a new unapproved transaction to state. Parameters will be validated, a
   * unique transaction id will be generated, and gas and gasPrice will be calculated
   * if not provided. If A `<tx.id>:unapproved` hub event will be emitted once added.
   *
   * @param transaction - Transaction object to add
   * @param origin - Domain origin to append to the generated TransactionMeta
   * @param deviceConfirmedOn - enum to indicate what device the transaction was confirmed to append to the generated TransactionMeta
   * @param transferInformation - is a transfer tx, need token information
   * @returns - Object containing a promise resolving to the transaction hash if approved
   */
  async addTransaction(transaction: Transaction, origin?: string): Promise<Result> {
    const normalizeTx = normalizeTransaction(transaction);
    validateTransaction(normalizeTx);

    const extraInfo: TransactionExtraInfo = transaction.extraInfo as TransactionExtraInfo;

    // Handle Tx
    const transactionMeta: TransactionMeta = {
      id: random(),
      origin,
      chainId: transaction.chainId ? transaction.chainId.toString() : 'undefined',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      transaction: normalizeTx,
      extraInfo,
    };

    if (!transaction.chainId) {
      const error = new Error('No chainId defined on added tx.');
      this.failTransaction(transactionMeta, error);
      return Promise.reject(error);
    } else if (!this.getETHQueryByChainId(transactionMeta.chainId)) {
      const error = new Error('No chainId defined on added tx.');
      this.failTransaction(transactionMeta, error);
      return Promise.reject(error);
    }

    try {
      const { gas, gasPrice } = await this.estimateGas(transaction);
      normalizeTx.gas = gas;
      normalizeTx.gasPrice = gasPrice;
    } catch (error) {
      this.failTransaction(transactionMeta, error);
      return Promise.reject(error);
    }

    // Handle Token
    const result: Promise<string> = new Promise((resolve, reject) => {
      this.hub.once(`${transactionMeta.id}:finished`, (meta: TransactionMeta) => {
        switch (meta.status) {
          case TransactionStatus.submitted:
            return resolve(meta.transactionHash as string);
          case TransactionStatus.rejected:
            return reject(ethErrors.provider.userRejectedRequest('User rejected the transaction'));
          case TransactionStatus.cancelled:
            return reject(ethErrors.rpc.internal('User cancelled the transaction'));
          case TransactionStatus.failed:
            return reject(ethErrors.rpc.internal(meta.error ? meta.error.message : 'Unknown'));
          /* istanbul ignore next */
          default:
            return reject(ethErrors.rpc.internal(`Go Pocket Tx Signature: Unknown problem: ${JSON.stringify(meta)}`));
        }
      });
    });
    this.state.transactionMetas.unshift(transactionMeta);
    this.update({ transactionMetas: [...this.state.transactionMetas] });
    this.hub.emit(`unapprovedTransaction`, transactionMeta);
    return { result, transactionMeta };
  }

  findTransactionMetaByID(transactionID: string) {
    const { transactionMetas } = this.state;

    for (const transactionsKey in transactionMetas) {
      const txMeta = transactionMetas[transactionsKey];
      if (txMeta.id === transactionID) {
        return txMeta;
      }
    }
    return undefined;
  }

  /**
   * Approves a transaction and updates it's status in state. If this is not a
   * retry transaction, a nonce will be generated. The transaction is signed
   * using the sign configuration property, then published to the blockchain.
   * A `<tx.id>:finished` hub event is fired after success or failure.
   *
   * @param transactionID - ID of the transaction to approve
   * @returns - Promise resolving when this operation completes
   */
  async approveTransaction(transactionID: string) {
    const releaseLock = await this.mutex.acquire();

    const transactionMeta = this.findTransactionMetaByID(transactionID);

    if (!transactionMeta) {
      logWarn('Yu Can not find tx with transactionID');
      releaseLock();
      return;
    }

    const currentChainId = transactionMeta.chainId;
    const useEthQuery = this.getETHQueryByChainId(currentChainId);

    try {
      const { from } = transactionMeta.transaction;
      if (!this.config.sign) {
        releaseLock();
        this.failTransaction(transactionMeta, new Error('No sign method defined.'));
        return;
      } else if (!useEthQuery) {
        releaseLock();
        this.failTransaction(transactionMeta, new Error('No chainId defined.'));
        return;
      }

      transactionMeta.status = TransactionStatus.approved;
      transactionMeta.transaction.nonce = await query(useEthQuery, 'getTransactionCount', [from, 'pending']);

      const isEIP1559 = isEIP1559Transaction(transactionMeta.transaction);
      const txParams = isEIP1559 ? {
        ...transactionMeta.transaction,
        gasLimit: transactionMeta.transaction.gas,
        type: 2,
      } : {
        ...transactionMeta.transaction,
        gasLimit: transactionMeta.transaction.gas,
      };
      if (isEIP1559) {
        delete txParams.gasPrice;
      }

      const unsignedEthTx = this.prepareUnsignedEthTx(txParams.chainId.toString(), txParams);
      const signedTx = await this.config.sign(unsignedEthTx, transactionMeta.transaction.from);
      transactionMeta.status = TransactionStatus.signed;
      this.updateTransaction(transactionMeta);
      console.log('PPYang bufferToHex:', bufferToHex);
      const rawTransaction = bufferToHex(signedTx.serialize());

      transactionMeta.rawTransaction = rawTransaction;
      this.updateTransaction(transactionMeta);
      const transactionHash = await query(useEthQuery, 'sendRawTransaction', [rawTransaction]);
      logDebug(`Yu sendRawTransactionTxHash: ${transactionHash}`);
      if (!transactionHash || !transactionHash.startsWith('0x') || transactionHash.length != 66) {
        throw ethErrors.rpc.internal('The hash returned by sendRawTransaction is null!');
      }
      transactionMeta.transactionHash = transactionHash;
      transactionMeta.status = TransactionStatus.submitted;
      transactionMeta.time = Date.now();
      this.updateTransaction(transactionMeta);

      this.hub.emit(`${transactionMeta.id}:finished`, transactionMeta);
      this.hub.emit(`submittedTransaction`, transactionMeta);
    } catch (error) {
      this.failTransaction(transactionMeta, error);
      throw error;
    } finally {
      releaseLock();
    }
  }

  prepareUnsignedEthTx(chainId: string, txParams: Record<string, unknown>): TypedTransaction {
    return TransactionFactory.fromTxData(txParams, {
      common: this.getCommonConfiguration(chainId),
      freeze: false,
    });
  }

  getCommonConfiguration(chainId: string): Common {
    const chain = getNetworkType(chainId);
    if (chain) {
      return new Common({ chain, hardfork: HARDFORK });
    }

    const customChainParams = {
      name: chain,
      chainId: parseInt(chainId, undefined),
      networkId: parseInt(chainId, undefined),
    };

    return Common.forCustomChain('mainnet', customChainParams, HARDFORK);
  }

  /**
   * Cancels a transaction based on its ID by setting its status to "rejected"
   * and emitting a `<tx.id>:finished` hub event.
   *
   * @param transactionID - ID of the transaction to cancel
   */
  cancelTransaction(transactionID: string) {
    const transactionMeta = this.findTransactionMetaByID(transactionID);
    if (!transactionMeta) {
      return;
    }

    transactionMeta.status = TransactionStatus.rejected;

    this.hub.emit(`${transactionMeta.id}:finished`, transactionMeta);

    const chainIdTransactions = this.state.transactionMetas.filter(({ id }) => id !== transactionID);
    this.update({ transactionMetas: [...chainIdTransactions] });
  }

  /**
   * Attempts to cancel a transaction based on its ID by setting its status to "rejected"
   * and emitting a `<tx.id>:finished` hub event.
   *
   * @param transactionID - ID of the transaction to cancel
   * @param gasOption
   */
  async stopTransaction(transactionID: string, gasOption: any) {
    const transactionMeta = this.findTransactionMetaByID(transactionID);
    if (!transactionMeta) {
      return;
    }

    if (!this.config.sign) {
      throw new Error('No sign method defined.');
    }

    const useEthQuery = this.getETHQueryByChainId(transactionMeta.chainId);

    const isEIP1559 = isEIP1559Transaction(transactionMeta.transaction);

    const txParams =
      isEIP1559
        ? {
          chainId: transactionMeta.transaction.chainId,
          from: transactionMeta.transaction.from,
          gasLimit: transactionMeta.transaction.gas,
          maxFeePerGas: gasOption.maxFeePerGas,
          maxPriorityFeePerGas: gasOption.maxPriorityFeePerGas,
          estimatedBaseFee: gasOption.estimatedBaseFee,
          type: 2,
          nonce: transactionMeta.transaction.nonce,
          to: transactionMeta.transaction.from,
          value: '0x0',
        }
        : {
          chainId: transactionMeta.transaction.chainId,
          from: transactionMeta.transaction.from,
          gasLimit: transactionMeta.transaction.gas,
          gasPrice: gasOption.gasPrice,
          nonce: transactionMeta.transaction.nonce,
          to: transactionMeta.transaction.from,
          value: '0x0',
        };
    const unsignedEthTx = this.prepareUnsignedEthTx(txParams.chainId.toString(), txParams);
    const signedTx = await this.config.sign(unsignedEthTx, transactionMeta.transaction.from);
    const rawTransaction = bufferToHex(signedTx.serialize());
    const cancelHash = await query(useEthQuery, 'sendRawTransaction', [rawTransaction]);
    logDebug(`PPYang sendRawTransactionCancelTxHash: ${cancelHash}`);
    const nowMeta = this.findTransactionMetaByID(transactionID);
    if (nowMeta) {
      const extraInfo = {
        ...nowMeta.extraInfo,
        tryCancelHash: cancelHash,
        tryCancelTime: Date.now(),
      };
      nowMeta.extraInfo = extraInfo;
      this.updateTransaction(nowMeta);
    }
    this.hub.emit(`${transactionMeta.id}:cancel`, transactionMeta);
  }

  /**
   * Attemps to speed up a transaction increasing transaction gasPrice by ten percent
   *
   * @param transactionID - ID of the transaction to speed up
   */
  async speedUpTransaction(transactionID: string) {
    const transactionMeta = this.findTransactionMetaByID(transactionID);
    /* istanbul ignore next */
    if (!transactionMeta) {
      return;
    }

    /* istanbul ignore next */
    if (!this.config.sign) {
      throw new Error('No sign method defined.');
    }

    const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
    const isArbTransaction = transactionMeta.chainId === arbNetwork.state.provider.chainId;
    const useEthQuery = isArbTransaction ? this.arbEthQuery : this.ethQuery;

    /* istanbul ignore next */
    const gasPrice = getIncreasedPriceFromExisting(
      transactionMeta.transaction.gasPrice,
      SPEED_UP_RATE,
    );

    const existingMaxFeePerGas = transactionMeta.transaction?.maxFeePerGas;
    const existingMaxPriorityFeePerGas =
      transactionMeta.transaction?.maxPriorityFeePerGas;

    const newMaxFeePerGas =
      existingMaxFeePerGas &&
      getIncreasedPriceFromExisting(existingMaxFeePerGas, SPEED_UP_RATE);
    const newMaxPriorityFeePerGas =
      existingMaxPriorityFeePerGas &&
      getIncreasedPriceFromExisting(
        existingMaxPriorityFeePerGas,
        SPEED_UP_RATE,
      );

    const txParams =
      newMaxFeePerGas && newMaxPriorityFeePerGas
        ? {
          ...transactionMeta.transaction,
          gasLimit: transactionMeta.transaction.gas,
          maxFeePerGas: newMaxFeePerGas,
          maxPriorityFeePerGas: newMaxPriorityFeePerGas,
          type: 2,
        }
        : {
          ...transactionMeta.transaction,
          gasLimit: transactionMeta.transaction.gas,
          gasPrice,
        };

    const unsignedEthTx = this.prepareUnsignedEthTx(txParams.chainId.toString(), txParams);

    const signedTx = await this.config.sign(unsignedEthTx, transactionMeta.transaction.from);
    const rawTransaction = bufferToHex(signedTx.serialize());
    const transactionHash = await query(useEthQuery, 'sendRawTransaction', [rawTransaction]);
    const newTransactionMeta = {
      ...transactionMeta,
      id: random(),
      time: Date.now(),
      transaction: {
        ...transactionMeta.transaction,
        gasPrice,
      },
      transactionHash,
    };

    this.state.transactionMetas.unshift(newTransactionMeta);
    this.update({ transactionMetas: [...this.state.transactionMetas] });
    this.hub.emit(`${transactionMeta.id}:speedup`, newTransactionMeta);
  }

  /**
   * Estimates required gas for a given transaction
   *
   * @param transaction - Transaction object to estimate gas for
   * @returns - Promise resolving to an object containing gas and gasPrice
   */
  async estimateGas(transaction: Transaction) {
    const estimatedTransaction = { ...transaction };
    const { gas, gasPrice: providedGasPrice, to, value, data } = estimatedTransaction;
    const useEthQuery = this.getETHQueryByChainId(transaction.chainId ? transaction.chainId.toString() : 'undefined');
    const gasPrice =
      typeof providedGasPrice === 'undefined' ? await query(useEthQuery, 'gasPrice') : providedGasPrice;

    // 1. If gas is already defined on the transaction, use it
    if (typeof gas !== 'undefined') {
      return { gas, gasPrice };
    }
    const { gasLimit } = await query(useEthQuery, 'getBlockByNumber', ['latest', false]);

    // 2. If to is not defined or this is not a contract address, and there is no data use 0x5208 / 21000
    /* istanbul ignore next */
    const code = to ? await query(useEthQuery, 'getCode', [to]) : undefined;
    /* istanbul ignore next */
    if (!to || (to && !data && (!code || code === '0x'))) {
      return { gas: '0x5208', gasPrice };
    }
    // if data, should be hex string format
    estimatedTransaction.data = !data ? data : /* istanbul ignore next */ addHexPrefix(data);
    // 3. If this is a contract address, safely estimate gas using RPC
    estimatedTransaction.value = typeof value === 'undefined' ? '0x0' : /* istanbul ignore next */ value;
    const gasLimitBN = hexToBN(gasLimit);
    estimatedTransaction.gas = BNToHex(fractionBN(gasLimitBN, 19, 20));
    const gasHex = await query(useEthQuery, 'estimateGas', [estimatedTransaction]);

    // 4. Pad estimated gas without exceeding the most recent block gasLimit
    const gasBN = hexToBN(gasHex);
    const maxGasBN = gasLimitBN.muln(0.9);
    const paddedGasBN = gasBN.muln(1.5);

    /* istanbul ignore next */
    if (gasBN.gt(maxGasBN)) {
      return { gas: addHexPrefix(gasHex), gasPrice };
    }
    /* istanbul ignore next */
    if (paddedGasBN.lt(maxGasBN)) {
      return { gas: addHexPrefix(BNToHex(paddedGasBN)), gasPrice };
    }
    return { gas: addHexPrefix(BNToHex(maxGasBN)), gasPrice };
  }

  async getRpcSuggestedGasFees(chainId: string | number) {
    const useEthQuery = this.getETHQueryByChainId(chainId?.toString());
    if (!useEthQuery) {
      return {};
    }
    const maxPriorityFeePerGas = await this.sendAsync(chainId, 'eth_maxPriorityFeePerGas')
    const end = await query(useEthQuery, 'getBlockByNumber', ['latest', false]);
    return { maxPriorityFeePerGas , baseFeePerGas: end?.baseFeePerGas};
  }

  async sendAsync(chainId: string | number, method: string) {
    if (!chainId || !method) {
      return undefined;
    }
    const useEthQuery = this.getETHQueryByChainId(chainId?.toString());
    if (!useEthQuery) {
      return undefined;
    }
    return new Promise((resolve => {
      useEthQuery.sendAsync({ method }, (error: Error, result: string) => {
        if (error) {
          resolve(undefined);
        }
        resolve(result);
      });
    }));
  }

  async onNetworkChange() {
    const network = this.context.NetworkController as NetworkController;
    this.ethQuery = network.provider ? new EthQuery(network.provider) : /* istanbul ignore next */ null;
    this.registry = network.provider
      ? new MethodRegistry({ provider: network.provider }) /* istanbul ignore next */
      : null;
  }

  async onArbNetworkChange() {
    const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
    this.arbEthQuery = arbNetwork.provider ? new EthQuery(arbNetwork.provider) : /* istanbul ignore next */ null;
  }

  async onOpNetworkChange() {
    const opNetwork = this.context.OpNetworkController as OpNetworkController;
    this.opEthQuery = opNetwork.provider ? new EthQuery(opNetwork.provider) : /* istanbul ignore next */ null;
  }

  async onBscNetworkChange() {
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    this.bscEthQuery = bscNetwork.provider ? new EthQuery(bscNetwork.provider) : /* istanbul ignore next */ null;
  }

  async onPolygonNetworkChange() {
    const polygonNetwork = this.context.PolygonNetworkController as PolygonNetworkController;
    this.polygonEthQuery = polygonNetwork.provider ? new EthQuery(polygonNetwork.provider) : /* istanbul ignore next */ null;
  }

  async onHecoNetworkChange() {
    const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
    this.hecoEthQuery = hecoNetwork.provider ? new EthQuery(hecoNetwork.provider) : /* istanbul ignore next */ null;
  }

  async onAvaxNetworkChange() {
    const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
    this.avaxEthQuery = avaxNetwork.provider ? new EthQuery(avaxNetwork.provider) : /* istanbul ignore next */ null;
  }

  async onSyscoinNetworkChange() {
    const syscoinNetwork = this.context.SyscoinNetworkController as SyscoinNetworkController;
    this.syscoinEthQuery = syscoinNetwork.provider ? new EthQuery(syscoinNetwork.provider) : /* istanbul ignore next */ null;
  }

  /**
   * Resiliently checks all submitted transactions on the blockchain
   * and verifies that it has been included in a block
   * when that happens, the tx status is updated to confirmed
   *
   * @returns - Promise resolving when this operation completes
   */
  async queryTransactionStatuses() {
    const tokenBalancesController = this.context.TokenBalancesController;
    if (tokenBalancesController?.config.backgroundMode) {
      return;
    }
    const { transactionMetas } = this.state;
    await safelyExecute(() => {
      return Promise.all(
        transactionMetas.map(async (meta) => {
          const useEthQuery = this.getETHQueryByChainId(meta.chainId);
          if (!useEthQuery) {
            return;
          }
          if (meta.status === TransactionStatus.submitted) {
            const txObj = await query(useEthQuery, 'getTransactionByHash', [meta.transactionHash]);
            /* istanbul ignore next */
            if (txObj?.blockNumber) {
              const txIndex = transactionMetas.findIndex(({ id }) => meta.id === id);
              transactionMetas[txIndex].status = TransactionStatus.confirmed;
              this.hub.emit(`${meta.id}:confirmed`, meta);
              this.updateTransaction(transactionMetas[txIndex]);
            } else if (meta.extraInfo?.tryCancelHash) {
              const ctxObj = await query(useEthQuery, 'getTransactionByHash', [meta.extraInfo.tryCancelHash]);
              if (ctxObj?.blockNumber) {
                const txIndex = transactionMetas.findIndex(({ id }) => meta.id === id);
                transactionMetas[txIndex].status = TransactionStatus.cancelled;
                this.hub.emit(`${meta.id}:confirmed`, meta);
                this.updateTransaction(transactionMetas[txIndex]);
              } else if (!ctxObj && Date.now() - (meta.extraInfo.tryCancelTime ? meta.extraInfo.tryCancelTime : 0) >= 5 * 60 * 1000) {
                logWarn('PPYang safelyExecute, ctxObj remains empty after 5 minutes, meta:', meta);
                const txIndex = transactionMetas.findIndex(({ id }) => meta.id === id);
                transactionMetas[txIndex].status = TransactionStatus.failed;
                this.updateTransaction(transactionMetas[txIndex]);
                this.hub.emit(`${meta.id}:confirmed`, meta);
              }
            } else if (!txObj && Date.now() - meta.time >= 5 * 60 * 1000) {
              logWarn('PPYang safelyExecute, txObj remains empty after 5 minutes, meta:', meta);
              const txIndex = transactionMetas.findIndex(({ id }) => meta.id === id);
              transactionMetas[txIndex].status = TransactionStatus.failed;
              this.updateTransaction(transactionMetas[txIndex]);
              this.hub.emit(`${meta.id}:confirmed`, meta);
            }
          }
        }),
      );
      },
    );
  }

  /**
   * Updates an existing transaction in state
   *
   * @param transactionMeta - New transaction meta to store in state
   */
  updateTransaction(transactionMeta: TransactionMeta) {
    const { transactionMetas } = this.state;
    transactionMeta.transaction = normalizeTransaction(transactionMeta.transaction);
    validateTransaction(transactionMeta.transaction);
    const index = transactionMetas.findIndex(({ id }) => transactionMeta.id === id);
    transactionMetas[index] = transactionMeta;
    this.update({ transactionMetas: [...transactionMetas] });
  }

  getCurrentChainId(type: ChainType, opt?: FetchAllOptions) {
    if (type === ChainType.Bsc) {
      const network = this.context.BscNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (type === ChainType.Polygon) {
      const network = this.context.PolygonNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (type === ChainType.Arbitrum) {
      const network = this.context.ArbNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (type === ChainType.Heco) {
      const network = this.context.HecoNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (type === ChainType.Optimism) {
      const network = this.context.OpNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (type === ChainType.Avax) {
      const network = this.context.AvaxNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (type === ChainType.Syscoin) {
      const network = this.context.SyscoinNetworkController;
      return opt?.chainId ? opt.chainId : network.state.provider.chainId;
    } else if (util.isRpcChainType(type)) {
      return opt?.chainId ? opt.chainId : (this.context.RpcNetworkController as RpcNetworkController).getProviderChainId(type);
    }
    const network = this.context.NetworkController;
    return opt?.chainId ? opt.chainId : network.state.provider.chainId;
  }

  getTxChangedByType(type: ChainType) {
    if (type === ChainType.Bsc) {
      return TxChangedType.BscTxChanged;
    } else if (type === ChainType.Polygon) {
      return TxChangedType.PolygonTxChanged;
    } else if (type === ChainType.Arbitrum) {
      return TxChangedType.ArbTxChanged;
    } else if (type === ChainType.Heco) {
      return TxChangedType.HecoTxChanged;
    } else if (type === ChainType.Optimism) {
      return TxChangedType.OpTxChanged;
    } else if (type === ChainType.Avax) {
      return TxChangedType.AvaxTxChanged;
    } else if (type === ChainType.Syscoin) {
      return TxChangedType.SyscoinTxChanged;
    }
    return TxChangedType.TxChanged;
  }

  getTokenTxChangedByType(type: ChainType) {
    if (type === ChainType.Bsc) {
      return TxChangedType.BscTokenTxChanged;
    } else if (type === ChainType.Polygon) {
      return TxChangedType.PolygonTokenTxChanged;
    } else if (type === ChainType.Arbitrum) {
      return TxChangedType.ArbTokenTxChanged;
    } else if (type === ChainType.Heco) {
      return TxChangedType.HecoTokenTxChanged;
    } else if (type === ChainType.Optimism) {
      return TxChangedType.OpTokenTxChanged;
    } else if (type === ChainType.Avax) {
      return TxChangedType.AvaxTokenTxChanged;
    } else if (type === ChainType.Syscoin) {
      return TxChangedType.SyscoinTokenTxChanged;
    }
    return TxChangedType.TokenTxChanged;
  }

  async handleScanTx(address: string, type: ChainType, currentChainId: string, loadToken: boolean, txInternal: boolean, txResponse: any) {
    let changed = TxChangedType.NoChange;
    if (!loadToken || txInternal) {
      const normalizedTxs = txResponse?.result?.map((tx: EtherscanTransactionMeta) =>
        this.normalizeTx(tx, currentChainId),
      );
      if (normalizedTxs?.length > 0) {
        const txCount = await Sqlite.getInstance().getTransactionCount(address, type, currentChainId, txInternal ? 'internaltx' : 'tx');
        if (txCount <= 0) {
          const txs = normalizedTxs.filter((item: TransactionInfo, index: number, arr: TransactionInfo[]) => {
            return arr.findIndex((item2) => item2.transactionHash === item.transactionHash) === index;
          });
          changed = bitOR(changed, this.getTxChangedByType(type));
          Sqlite.getInstance().insertTransactions(address, type, txs, txInternal);
        } else {
          for (const normalizedTx of normalizedTxs) {
            const existInfo = await Sqlite.getInstance().getTransactionHash(address, type, currentChainId, normalizedTx.transactionHash, txInternal);
            if (existInfo) {
              await Sqlite.getInstance().updateTransactionInfo(address, type, currentChainId, normalizedTx.transactionHash || '', normalizedTx, txInternal);
            } else {
              changed = bitOR(changed, this.getTxChangedByType(type));
              Sqlite.getInstance().insertTransactions(address, type, [normalizedTx], txInternal);
            }
          }
        }
      }
    } else {
      const normalizedTokenTxs = txResponse?.result?.map((tx: EtherscanTransactionMeta) =>
        this.normalizeTokenTx(tx, currentChainId),
      );
      if (normalizedTokenTxs?.length > 0) {
        const tokenTxCount = await Sqlite.getInstance().getTransactionCount(address, type, currentChainId, 'tokentx');
        if (tokenTxCount <= 0) {
          const txs = normalizedTokenTxs.filter((item: TokenTransactionInfo, index: number, arr: TokenTransactionInfo[]) => {
            return arr.findIndex((item2) =>
              item2.transactionHash === item.transactionHash &&
              item2.transferInformation.contractAddress === item.transferInformation.contractAddress &&
              item2.amount === item.amount) === index;
          });
          changed = bitOR(changed, this.getTokenTxChangedByType(type));
          Sqlite.getInstance().insertTokenTransactions(address, type, txs);
        } else {
          for (const normalizedToken of normalizedTokenTxs) {
            const existInfo = await Sqlite.getInstance().getTokenTransactionHash(address, type,
              currentChainId, normalizedToken.transactionHash, normalizedToken.transferInformation.contractAddress, normalizedToken.amount);
            if (existInfo) {
              Sqlite.getInstance().updateTokenTransactionInfo(address, type, currentChainId, normalizedToken.transactionHash,
                normalizedToken.transferInformation.contractAddress, normalizedToken.amount, normalizedToken);
            } else {
              changed = bitOR(changed, this.getTokenTxChangedByType(type));
              Sqlite.getInstance().insertTokenTransactions(address, type, [normalizedToken]);
            }
          }
        }
      }
    }

    // Last Block
    let latestIncomingTxBlockNumber = 0;
    let txType = 'tx';
    if (txInternal) {
      txType = 'internaltx';
    } else if (loadToken) {
      txType = 'tokentx';
    }
    const maxBlockNumber = await Sqlite.getInstance().getMaxBlockNumber(address, type, currentChainId, txType);
    if (maxBlockNumber) {
      latestIncomingTxBlockNumber = parseInt(maxBlockNumber, 10);
    }

    return {
      commonChanged: changed,
      latestIncomingTxBlockNumber,
    };
  }

  async fetchAll(address: string, type: ChainType, loadToken: boolean, txInternal: boolean, opt?: FetchAllOptions):
    Promise<{latestIncomingTxBlockNumber: number; needUpdate: TxChangedType}> {
    const preferences = this.context.PreferencesController as PreferencesController;
    if (preferences.isDisabledChain(address, type)) {
      return {
        latestIncomingTxBlockNumber: opt ? Number(opt.fromBlock) : 0,
        needUpdate: TxChangedType.NoChange,
      };
    }
    const chainId = this.getCurrentChainId(type, opt);
    const etherscanTxResponse = await handleTransactionFetch(type, chainId, address, loadToken, txInternal, opt);
    const {
      commonChanged,
      latestIncomingTxBlockNumber,
    } = await this.handleScanTx(address, type, chainId, loadToken, txInternal, etherscanTxResponse);

    if (commonChanged !== TxChangedType.NoChange) {
      this.update({
        txChangedType: commonChanged,
        addressWithChanged: address,
      });
    }

    return {
      latestIncomingTxBlockNumber,
      needUpdate: commonChanged,
    };
  }

  async getTransactionByHash(chainId: string, hash: string) {
    const useEthQuery = this.getETHQueryByChainId(chainId);
    if (!useEthQuery) {
      return undefined;
    }
    return await query(useEthQuery, 'getTransactionByHash', [hash]);
  }

  async getCodeByChainId(chainId: string, address: string) {
    const ethQuery = this.getETHQueryByChainId(chainId);
    if (!ethQuery) {
      return undefined;
    }
    return await util.query(ethQuery, 'getCode', [address]);
  }

  async getCode(chainType: ChainType, address: string) {
    let code;
    if (chainType === ChainType.Bsc) {
      code = await util.query(this.bscEthQuery, 'getCode', [address]);
    } else if (chainType === ChainType.Polygon) {
      code = await util.query(this.polygonEthQuery, 'getCode', [address]);
    } else if (chainType === ChainType.Arbitrum) {
      code = await util.query(this.arbEthQuery, 'getCode', [address]);
    } else if (chainType === ChainType.Heco) {
      code = await util.query(this.hecoEthQuery, 'getCode', [address]);
    } else if (chainType === ChainType.Optimism) {
      code = await util.query(this.opEthQuery, 'getCode', [address]);
    } else if (chainType === ChainType.Avax) {
      code = await util.query(this.avaxEthQuery, 'getCode', [address]);
    } else if (chainType === ChainType.Syscoin) {
      code = await util.query(this.syscoinEthQuery, 'getCode', [address]);
    } else if (util.isRpcChainType(chainType)) {
      const rpcNetwork = this.context.RpcNetworkController as RpcNetworkController;
      const ethQuery = rpcNetwork.allEthQuery[chainType];
      if (ethQuery) {
        code = await util.query(ethQuery, 'getCode', [address]);
      }
    } else {
      code = await util.query(this.ethQuery, 'getCode', [address]);
    }
    return code;
  }

  beforeOnComposed() {
    super.beforeOnComposed();
    setTimeout(async () => {
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const { identities } = preferencesController.state;
      const existAddress = Object.keys(identities);
      const allAddress = await Sqlite.getInstance().getAllAddresses();
      if (allAddress && allAddress.length > 0) {
        const diffAddress = allAddress.filter((address) => !existAddress?.find((eAddress) => address.toLowerCase() === eAddress.toLowerCase()));
        if (diffAddress && diffAddress.length > 0) {
          logInfo('PPYang TransactionController delete diffAddress:', diffAddress);
          for (const address of diffAddress) {
            Sqlite.getInstance().deleteAddress(address);
          }
        }
      }
    }, 1);
  }

  onComposed() {
    super.onComposed();
    setTimeout(() => this.poll(), 1000);
  }
}

export default TransactionController;
