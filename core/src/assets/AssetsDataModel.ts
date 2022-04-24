import { Mutex } from 'async-mutex';
import { BigNumber } from 'ethers';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import util, { isEtherscanAvailableAsync, logDebug, safelyExecute, toLowerCaseEquals } from '../util';
import { BN } from '..';
import SecurityController, { SecurityToken } from '../security/SecurityController';
import AssetsController from './AssetsController';
import { LockType, Token, TokenRatesController } from './TokenRatesController';
import { NetworkConfig, ChainType, defaultEnabledChains } from "../Config";
import TokenBalancesController from './TokenBalancesController';
import CollectiblesController from './CollectiblesController';
import DefiProtocolController from './DefiProtocolController';

export interface DataModelConfig extends BaseConfig {
  numberUtil: {
    calcAssetPrices: (asset: any, opt: any) => any;
    getAssetLogo: (asset: any) => any;
    calcDefiTokenPrices: (token: any, opt: any) => any;
  };
  selectedAddress: string;
  enabledChains: ChainType[];
}

interface Asset extends Token {
  indexInBatch?: BigNumber;
  batchNumber?: BigNumber;
  amount?: BN;
  type: ChainType;
  assetChainId: string;
  nativeCurrency?: boolean;
  lockType: LockType;
  balance: string;// amount / decimals
  price: number;
  priceChange: number;
  balanceFiat: string;
  balanceFiatNumber: number;// balance * price
  balanceFiatUsdNumber: number;// balance * price
  safetyFactor: boolean;
  logo: any;
  securityData: SecurityToken;
}

interface Wealth {
  tokenAmount: {[chainType: number]: number};
  nftAmount: {[chainType: number]: number};
}

export interface DataModelState extends BaseState {
  assets: {[address: string]: Asset[] };
  wealths: {[address: string]: Wealth };
}

export class AssetsDataModel extends BaseController<DataModelConfig, DataModelState> {
  private mutex = new Mutex();

  private polling_counter = 0;

  name = 'AssetsDataModel';

  requiredControllers = ['AssetsController', 'PreferencesController', 'TransactionController'];

  constructor(config?: Partial<DataModelConfig>, state?: Partial<DataModelState>) {
    super(config, state);
    this.defaultConfig = {
      numberUtil: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        calcAssetPrices: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        getAssetLogo: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        calcDefiTokenPrices: () => {},
      },
      selectedAddress: '',
      enabledChains: [],
    };
    this.defaultState = {
      assets: {},
      wealths: {},
    };
    this.initialize();
  }

  async poll(): Promise<void> {
    if (this.polling_counter > 1) {
      return;
    }
    this.polling_counter += 1;
    await safelyExecute(() => this.refresh(), true);
    this.polling_counter -= 1;
  }

  async refresh() {
    await isEtherscanAvailableAsync();
    const releaseLock = await this.mutex.acquire();
    try {
      await new Promise((resolve) => setTimeout(() => resolve(true), 500));
      const tokenBalancesController = this.context.TokenBalancesController as TokenBalancesController;
      const assetsController = this.context.AssetsController as AssetsController;
      const preferencesController = this.context.PreferencesController as PreferencesController;
      const tokenRatesController = this.context.TokenRatesController as TokenRatesController;
      const collectiblesController = this.context.CollectiblesController as CollectiblesController;
      const securityController = this.context.SecurityController as SecurityController;
      const defiProtocolController = this.context.DefiProtocolController as DefiProtocolController;

      if (tokenBalancesController?.config.backgroundMode) {
        return;
      }
      const { selectedAddress, identities, hideDefiPortfolio, hideNormalTokens } = preferencesController.state;
      if (!selectedAddress) {
        return;
      }

      const allTokens = hideNormalTokens ? {} : assetsController.state.allTokens;
      const securityTokens = hideNormalTokens ? [] : securityController.state.securityTokens;
      const allDefiTokens = hideDefiPortfolio ? {} : defiProtocolController.state.allDefiTokens;
      const { allCollectibles } = collectiblesController.state;

      const rpcChain = this.networks[ChainType.RPCBase].getEnabledChain(selectedAddress);
      const allContractBalances = tokenBalancesController.state.allContractBalances[selectedAddress] || {};
      const {
        allContractExchangeRates,
        allCurrencyPrice,
        currencyCodeRate,
        currencyCode,
      } = tokenRatesController.state;

      const opt = {
        allContractBalances,
        allContractExchangeRates,
        allCurrencyPrice,
        currencyCode,
        currencyCodeRate,
        isController: true,
      };

      const assets = [];
      const tokenAmount: {[chainType: number]: number} = { [ChainType.All]: 0 };
      const nftAmount: {[chainType: number]: number} = { [ChainType.All]: 0 };
      for (const type in NetworkConfig) {
        const chainType = Number(type);
        if (NetworkConfig[chainType].Disabled) {
          continue;
        }
        tokenAmount[chainType] = 0;
        nftAmount[chainType] = 0;

        if (preferencesController.isDisabledChain(selectedAddress, chainType)) {
          continue;
        }
        const chainId = this.networks[chainType].state.provider.chainId;
        const ticker = this.networks[chainType].state.provider.ticker;

        const nativeToken = this.config.numberUtil.calcAssetPrices({
          assetChainId: chainId,
          type: chainType,
          symbol: ticker,
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        nativeToken.logo = await this.config.numberUtil.getAssetLogo(nativeToken);
        assets.push(nativeToken);

        const tokens = allTokens[selectedAddress]?.[chainId] || [];
        for (const token of tokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            ...token,
            assetChainId: chainId,
            type: chainType,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        const defiTokens = allDefiTokens[selectedAddress]?.[chainId] || [];
        defiTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: chainId,
            type: chainType, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });

        const collectibles = allCollectibles[selectedAddress]?.[chainId] || [];
        nftAmount[chainType] = collectibles.length;
        nftAmount[ChainType.All] += collectibles.length;

        if (chainType === ChainType.Ethereum) {
          const arbNetwork = this.networks[ChainType.Arbitrum];
          const arbChainId = arbNetwork.state.provider.chainId;
          const { partnerChainId: arbPartnerChainId } = arbNetwork.getNetworkConfig(arbChainId);

          const arbContract = this.contracts[ChainType.Arbitrum];
          const { unconfirmed_interval: arb_unconfirmed_interval } = arbContract.config;
          const { withdraws: arbWithdraws } = arbContract.state;

          for (const item of arbWithdraws) {
            if (
              item.chainId !== arbChainId ||
              chainId !== arbPartnerChainId ||
              item.processed ||
              item.destination?.toLowerCase() !== selectedAddress.toLowerCase() ||
              (item.unconfirmed_timestamp && Date.now() - item.unconfirmed_timestamp < arb_unconfirmed_interval)
            ) {
              continue;
            }
            const lockToken = item.token;
            const arbWithdrawObj = this.config.numberUtil.calcAssetPrices({
              ...item,
              assetChainId: chainId,
              type: ChainType.Ethereum,
              lockType: LockType.LockArb,
              address: lockToken.address,
              symbol: lockToken.symbol,
              decimals: lockToken.decimals,
              amount: lockToken.amount,
              nativeCurrency: lockToken.nativeCurrency,
            }, opt);
            arbWithdrawObj.logo = await this.config.numberUtil.getAssetLogo(arbWithdrawObj);
            assets.push(arbWithdrawObj);
          }

          const polygonNetwork = this.networks[ChainType.Polygon];
          const polygonChainId = polygonNetwork.state.provider.chainId;
          const { partnerChainId: polygonPartnerChainId } = polygonNetwork.getNetworkConfig(polygonChainId);

          const polygonContract = this.contracts[ChainType.Polygon];
          const { unconfirmed_interval: polygon_unconfirmed_interval } = polygonContract.config;
          const { withdraws: polygonWithdraws } = polygonContract.state;

          for (const item of polygonWithdraws) {
            if (
              item.chainId !== polygonChainId ||
              polygonPartnerChainId !== chainId ||
              item.processed ||
              item.destination?.toLowerCase() !== selectedAddress.toLowerCase() ||
              (item.unconfirmed_timestamp && Date.now() - item.unconfirmed_timestamp < polygon_unconfirmed_interval)
            ) {
              continue;
            }
            const lockToken = item.token;
            const polygonWithdrawObj = this.config.numberUtil.calcAssetPrices({
              ...item,
              assetChainId: chainId,
              type: ChainType.Ethereum,
              lockType: LockType.LockPolygon,
              address: lockToken.address,
              symbol: lockToken.symbol,
              decimals: lockToken.decimals,
              amount: lockToken.amount,
              nativeCurrency: lockToken.nativeCurrency,
            }, opt);
            polygonWithdrawObj.logo = await this.config.numberUtil.getAssetLogo(polygonWithdrawObj);
            assets.push(polygonWithdrawObj);
          }
        }
      }

      if (rpcChain?.length > 0) {
        const rpcTokens = allTokens[selectedAddress] || [];
        for (const chain of rpcChain) {
          const rpcObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: chain.chainId,
            type: chain.type,
            symbol: this.networks[ChainType.RPCBase].getProviderTicker(chain.type),
            decimals: 18,
            nativeCurrency: true,
          }, opt);
          rpcObj.logo = await this.config.numberUtil.getAssetLogo(rpcObj);
          assets.push(rpcObj);
          const rpcChainTokens = rpcTokens[chain.chainId] || [];
          for (const token of rpcChainTokens) {
            const tokenObj = this.config.numberUtil.calcAssetPrices({
              ...token,
              assetChainId: chain.chainId,
              type: chain.type,
            }, opt);
            tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
            assets.push(tokenObj);
          }
        }
      }

      assets.forEach((asset) => {
        tokenAmount[asset.type] += asset.balanceFiatNumber * asset.safetyFactor;
        tokenAmount[ChainType.All] += asset.balanceFiatNumber * asset.safetyFactor;
        if (!asset.isDefi) {
          const securityData = securityTokens.filter((token) => toLowerCaseEquals(token.address, asset.address) && token.chainId === asset.assetChainId);
          if (securityData.length > 0) {
            asset.securityData = securityData[0];
          }
        }
      });

      const wealths = {
        tokenAmount,
        nftAmount,
      };

      const newAssets = { ...this.state.assets };
      Object.keys(newAssets).forEach((address) => {
        if (!identities[address]) {
          delete newAssets[address];
        }
      });
      newAssets[selectedAddress] = assets;
      const newWealths = { ...this.state.wealths };
      Object.keys(newWealths).forEach((address) => {
        if (!identities[address]) {
          delete newWealths[address];
        }
      });
      newWealths[selectedAddress] = wealths;
      this.update({ assets: newAssets, wealths: newWealths });
    } catch (e) {
      logDebug(`leon.w@${this.name} refresh: `, e);
    } finally {
      releaseLock();
    }
  }

  rehydrate(state: Partial<DataModelState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
  }

  beforeOnComposed() {
    super.beforeOnComposed();
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { identities, selectedAddress } = preferencesController.state;
    if (selectedAddress) {
      const enabledChains = identities[selectedAddress]?.enabledChains || defaultEnabledChains;
      this.configure({ selectedAddress, enabledChains });
    }
    const assets = this.state.assets || {};
    Object.keys(assets).forEach((address) => {
      if (!identities[address]) {
        delete assets[address];
      }
    });
    const wealths = this.state.wealths || {};
    Object.keys(wealths).forEach((address) => {
      if (!identities[address]) {
        delete wealths[address];
      }
    });
  }

  onComposed() {
    super.onComposed();
    const preferencesController = this.context.PreferencesController as PreferencesController;
    preferencesController.subscribe(({ selectedAddress, identities }) => {
      const enabledChains = identities[selectedAddress]?.enabledChains || defaultEnabledChains;
      if (selectedAddress === this.config.selectedAddress) {
        if (enabledChains.join(',') === this.config.enabledChains.join(',')) {
          return;
        }
      }
      this.configure({ selectedAddress, enabledChains: [...enabledChains] });
      setTimeout(() => this.poll(), 100);
    }, ['selectedAddress', 'identities']);

    preferencesController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['hideDefiPortfolio', 'hideNormalTokens']);

    const assetsController = this.context.AssetsController as AssetsController;
    assetsController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['allTokens']);

    this.contracts[ChainType.Arbitrum].subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['withdraws']);

    this.contracts[ChainType.Polygon].subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['withdraws']);

    const tokenRatesController = this.context.TokenRatesController as TokenRatesController;
    tokenRatesController.subscribe(() => {
        setTimeout(() => this.poll(), 100);
    }, [
      'allContractExchangeRates',
      'allCurrencyPrice',
      'currencyCodeRate',
      'currencyCode',
    ]);

    const tokenBalancesController = this.context.TokenBalancesController as TokenBalancesController;
    tokenBalancesController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['allContractBalances']);

    const securityController = this.context.SecurityController as SecurityController;
    securityController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['securityTokens']);

    const collectiblesController = this.context.CollectiblesController as CollectiblesController;
    collectiblesController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['allCollectibles']);

    const defiProtocolController = this.context.DefiProtocolController as DefiProtocolController;
    defiProtocolController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['allDefiTokens']);
  }
}

export default AssetsDataModel;
