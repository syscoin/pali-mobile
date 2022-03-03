import BigNumber from 'bignumber.js';
import { Mutex } from 'async-mutex';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { logDebug, logError, safelyExecute } from '../util';
import BscNetworkController from '../network/BscNetworkController';
import { RequestManager } from './RequestManager';
import { ICreateSwapResponse, ISwapResponse, ISwapStatus, ITokenResponse } from './entity';

const SYMBOL_ETHEREUM = 'ETH';
const SYMBOL_BSC = 'BSC';

export interface IPegEthToEthSwapDetails {
  enabled: boolean;
  name: string;
  iconUrl: string;
  min: number;
  max: number;
  bscDetails: {
    enabled: boolean;
    networkFee: number;
    rateFee: number;
    explorerUrl: string;
    withdrawalUnit: number;
    addressRegex: string;
    confirms: number;
  };
}

export interface BscBridgeConfig extends BaseConfig {
  interval: number;
}

export interface SwapState {
  chainId: string;
  transactionHash: string;
  walletAddress: string;
  done: boolean;
}

export interface BscBridgeState extends BaseState {
  deposits: SwapState[];
}

export class BscBridgeController extends BaseController<BscBridgeConfig, BscBridgeState> {
  private readonly requestManager: RequestManager = new RequestManager();

  name = 'BscBridgeController';

  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private polling_counter = 0;

  private tokens_timestamp = 0;

  private support_tokens: ITokenResponse[] = [];

  constructor(config?: Partial<BscBridgeConfig>, state?: Partial<BscBridgeState>) {
    super(config, state);
    this.defaultConfig = {
      interval: 60000,
    };
    this.defaultState = {
      deposits: [],
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
      this.poll(this.config.interval);
    }, this.config.interval);
  }

  async refresh() {
    const tokenBalancesController = this.context.TokenBalancesController;
    if (tokenBalancesController?.config.backgroundMode) {
      return;
    }
    const releaseLock = await this.mutex.acquire();
    await safelyExecute(() => this.updateDeposits());
    releaseLock();
  }

  async updateDeposits() {
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    const {
      state: {
        provider: { chainId: bscChainId },
      },
    } = bscNetwork;
    const current_deposits = this.state.deposits;
    if (!current_deposits || current_deposits.length === 0) {
      return;
    }
    const filtered_deposits = current_deposits.filter(
      ({ chainId, done }) => !done && chainId === bscChainId);
    if (filtered_deposits.length <= 0) {
      return;
    }
    const addressList: string[] = [];
    filtered_deposits.forEach(({ walletAddress }) => {
      if (!addressList.includes(walletAddress)) {
        addressList.push(walletAddress.toLowerCase());
      }
    });
    let changed = false;
    for (const address of addressList) {
      const { swaps } = await this.requestManager.getSwaps({
        walletAddress: address,
        status: 'Completed',
      });

      if (swaps && swaps.length > 0) {
        for (const item of current_deposits) {
          if (item.done) {
            continue;
          }
          const result = swaps.find((swap) => swap.depositTxId === item.transactionHash);
          if (result) {
            item.done = true;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      this.update({ deposits: [...current_deposits] });
    }
  }

  async addDepositId(txHash: string, walletAddress: string) {
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    // 只有BSC主网支持跨链
    const chainId = bscNetwork.getMainChainId();
    if (!txHash || !walletAddress) {
      logDebug('PPYang BscBridgeController addDepositId, id or txHash, walletAddress is null');
      return;
    }
    const releaseLock = await this.mutex.acquire();
    const deposits = this.state.deposits ? [...this.state.deposits] : [];
    deposits.push({ chainId, transactionHash: txHash, walletAddress, done: false });
    this.update({ deposits });
    releaseLock();
  }

  public async calcStakingFeeRate(): Promise<BigNumber> {
    let networkFee = 0.045 * 3;
    try {
      const network = await this.requestManager.getNetworkByName(
        SYMBOL_ETHEREUM,
        SYMBOL_ETHEREUM,
      );
      const token = await this.requestManager.getTokenBySymbol(SYMBOL_ETHEREUM);
      logDebug(`Required swap count: ${Math.ceil(32 / token.maxAmount)}`);
      networkFee = network.networkFee * Math.ceil(32 / token.maxAmount);
    } catch (e) {
      logError(`Unable to calculate Binance Bridge network fee: ${e}`);
    }
    logDebug(`Binance bridge network fee: ${networkFee}`);
    const stakingFeeRate = new BigNumber(`${networkFee * 2}`);
    logDebug(`Current staking fee rate is: ${stakingFeeRate.toString(10)}`);
    return stakingFeeRate;
  }

  public async getPegEthToEthSwapDetails(): Promise<IPegEthToEthSwapDetails> {
    const token = await this.getEthToken();
      const network = await this.requestManager.getNetworkByName(
        SYMBOL_ETHEREUM,
        SYMBOL_BSC,
      );
    return {
      enabled: token.enabled,
      name: token.name,
      iconUrl: token.icon,
      min: token.minAmount,
      max: token.maxAmount,
      bscDetails: {
        enabled: network.depositEnabled && network.withdrawEnabled,
        networkFee: network.networkFee,
        rateFee: network.swapFeeRate,
        explorerUrl: network.txUrl,
        withdrawalUnit: network.withdrawAmountUnit,
        addressRegex: network.addressRegex,
        confirms: network.requiresConfirms,
      },
    };
  }

  public async getLatestSwapByStatus(
    status: ISwapStatus,
    address: string
  ): Promise<ISwapResponse | undefined> {
    const { swaps } = await this.requestManager.getSwaps({
      walletAddress: address,
      status,
    });

    if (!swaps.length) {
      return undefined;
    }

    swaps.sort((a, b) => {
      return (
        new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      );
    });

    return swaps[0];
  }

  public async getEthToken(): Promise<ITokenResponse> {
    return this.requestManager.getTokenBySymbol(SYMBOL_ETHEREUM);
  }

  public async createWithdraw(
    fromAddress: string,
    symbol: string,
    // TODO convert to string or BigNumber
    amount: number,
    address: string
  ): Promise<ICreateSwapResponse> {
    await this.checkSwapLimitationOrThrow(amount, fromAddress, symbol, SYMBOL_BSC, address);
    const swapResponse = await this.requestManager.createSwap({
      amount,
      fromNetwork: 'BSC',
      source: 921, // ?
      symbol,
      toAddress: address,
      toAddressLabel: '',
      toNetwork: 'ETH',
      walletAddress: address,
      walletNetwork: 'BSC',
    });
    this.verifySwapResponse(swapResponse);
    return swapResponse;
  }

  public async createDeposit(
    fromAddress: string,
    symbol: string,
    amount: number,
    address: string
  ): Promise<ICreateSwapResponse> {
    await this.checkSwapLimitationOrThrow(
      amount,
      fromAddress,
      symbol,
      SYMBOL_ETHEREUM,
      address
    );
    const swapResponse = await this.requestManager.createSwap({
      amount,
      fromNetwork: 'ETH',
      source: 921, // ?
      symbol,
      toAddress: address,
      toAddressLabel: '',
      toNetwork: 'BSC',
      walletAddress: address,
      walletNetwork: 'ETH',
    });
    this.verifySwapResponse(swapResponse);
    return swapResponse;
  }

  public async getSupportTokens() {
    if (this.support_tokens.length <= 0 || Date.now() - this.tokens_timestamp >= 60 * 60 * 1000) {
      const tokens = await this.requestManager.getTokens();
      this.support_tokens = tokens?.tokens || [];
      this.tokens_timestamp = Date.now();
    }
    return this.support_tokens;
  }

  private verifySwapResponse(response: ICreateSwapResponse) {
    if (response.status !== 'WaitingForDeposit') {
      logError(
        `Incorrect swap status, it should be WaitingForDeposit: ${JSON.stringify(
          response,
          null,
          2,
        )}`,
      );
      throw new Error(`Incorrect swap status`);
    }
  }

  private async checkSwapLimitationOrThrow(
    amount: number,
    fromAddress: string,
    fromSymbol: string,
    targetNetwork: string,
    address: string
  ) {
    let token;
    if (targetNetwork === SYMBOL_BSC) {
      token = await this.requestManager.getTokenByBscAddress(fromAddress);
    } else if (fromSymbol === 'ETH') {
      token = await this.requestManager.getTokenBySymbol(fromSymbol);
    } else {
      token = await this.requestManager.getTokenByEtherAddress(fromAddress);
    }
    if (!token.enabled) {
      throw new Error(`Token ${token.name} is disabled for swap`);
    }

    if (amount < token.minAmount) {
      throw new Error(`Amount can't be less than ${token.minAmount}`);
    } else if (amount > token.maxAmount) {
      throw new Error(`Amount can't be greater than ${token.maxAmount}`);
    }

    const network = await this.requestManager.getNetworkByName(
      fromSymbol,
      targetNetwork,
    );

    if (!network.depositEnabled || !network.withdrawEnabled) {
      throw new Error(
        `Token ${token.name} is disabled for swap to ${targetNetwork} network`,
      );
    }

    const quota = await this.requestManager.getQuotaFor24Hour(
      fromSymbol,
      address,
    );

    if (quota.left - amount < 0) {
      throw new Error(
        `You've reached your daily quota, only ${quota.left} ETH left to swap`,
      );
    }
  }

  onComposed() {
    super.onComposed();
    setTimeout(() => this.poll(), 5000);
  }
}
