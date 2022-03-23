import { Mutex } from 'async-mutex';
import { BigNumber } from 'ethers';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController, { defaultEnabledChains } from '../user/PreferencesController';
import BscNetworkController from '../network/BscNetworkController';
import NetworkController from '../network/NetworkController';
import PolygonNetworkController from '../network/PolygonNetworkController';
import ArbNetworkController from '../network/ArbNetworkController';
import HecoNetworkController from '../network/HecoNetworkController';
import AvaxNetworkController from '../network/AvaxNetworkController';
import SyscoinNetworkController from '../network/SyscoinNetworkController';
import RpcNetworkController from '../network/RpcNetworkController';
import util, { isEtherscanAvailableAsync, logDebug, safelyExecute, toLowerCaseEquals } from '../util';
import { BN } from '..';
import SecurityController, { SecurityToken } from '../security/SecurityController';
import OpNetworkController from '../network/OpNetworkController';
import ArbContractController from './ArbContractController';
import PolygonContractController from './PolygonContractController';
import AssetsController from './AssetsController';
import { ChainType, LockType, Token, TokenRatesController } from './TokenRatesController';
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

  requiredControllers = ['AssetsContractController', 'AssetsController', 'NetworkController', 'PreferencesController', 'TransactionController'];

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
      const networkController = this.context.NetworkController as NetworkController;
      const arbNetworkController = this.context.ArbNetworkController as ArbNetworkController;
      const opNetworkController = this.context.OpNetworkController as OpNetworkController;
      const polygonNetworkController = this.context.PolygonNetworkController as PolygonNetworkController;
      const bscNetworkController = this.context.BscNetworkController as BscNetworkController;
      const hecoNetworkController = this.context.HecoNetworkController as HecoNetworkController;
      const avaxNetworkController = this.context.AvaxNetworkController as AvaxNetworkController;
      const syscoinNetworkController = this.context.SyscoinNetworkController as SyscoinNetworkController;
      const rpcNetworkController = this.context.RpcNetworkController as RpcNetworkController;
      const tokenRatesController = this.context.TokenRatesController as TokenRatesController;
      const arbContractController = this.context.ArbContractController as ArbContractController;
      const polygonContractController = this.context.PolygonContractController as PolygonContractController;
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

      const { chainId: mainChainId } = networkController.state.provider;
      const { chainId: arbChainId } = arbNetworkController.state.provider;
      const { chainId: opChainId } = opNetworkController.state.provider;
      const { chainId: polygonChainId } = polygonNetworkController.state.provider;
      const { chainId: bscChainId } = bscNetworkController.state.provider;
      const { chainId: hecoChainId } = hecoNetworkController.state.provider;
      const { chainId: avaxChainId } = avaxNetworkController.state.provider;
      const { chainId: syscoinChainId } = syscoinNetworkController.state.provider;
      const rpcChain = rpcNetworkController.getEnabledChain(selectedAddress);
      const { partnerChainId: arbPartnerChainId } = arbNetworkController.arbNetworkConfig(arbChainId);
      const { partnerChainId: polygonPartnerChainId } = polygonNetworkController.polygonNetworkConfig(polygonChainId);
      const tokens = allTokens[selectedAddress]?.[mainChainId] || [];
      const bscTokens = allTokens[selectedAddress]?.[bscChainId] || [];
      const arbTokens = allTokens[selectedAddress]?.[arbChainId] || [];
      const opTokens = allTokens[selectedAddress]?.[opChainId] || [];
      const polygonTokens = allTokens[selectedAddress]?.[polygonChainId] || [];
      const hecoTokens = allTokens[selectedAddress]?.[hecoChainId] || [];
      const avaxTokens = allTokens[selectedAddress]?.[avaxChainId] || [];
      const syscoinTokens = allTokens[selectedAddress]?.[syscoinChainId] || [];
      const rpcTokens = allTokens[selectedAddress] || [];
      const collectibles = allCollectibles[selectedAddress]?.[mainChainId] || [];
      const bscCollectibles = allCollectibles[selectedAddress]?.[bscChainId] || [];
      const arbCollectibles = allCollectibles[selectedAddress]?.[arbChainId] || [];
      const opCollectibles = allCollectibles[selectedAddress]?.[opChainId] || [];
      const polygonCollectibles = allCollectibles[selectedAddress]?.[polygonChainId] || [];
      const hecoCollectibles = allCollectibles[selectedAddress]?.[hecoChainId] || [];
      const avaxCollectibles = allCollectibles[selectedAddress]?.[avaxChainId] || [];
      const syscoinCollectibles = allCollectibles[selectedAddress]?.[syscoinChainId] || [];
      const defiTokens = allDefiTokens[selectedAddress]?.[mainChainId] || [];
      const defiBscTokens = allDefiTokens[selectedAddress]?.[bscChainId] || [];
      const defiArbTokens = allDefiTokens[selectedAddress]?.[arbChainId] || [];
      const defiOpTokens = allDefiTokens[selectedAddress]?.[opChainId] || [];
      const defiPolygonTokens = allDefiTokens[selectedAddress]?.[polygonChainId] || [];
      const defiHecoTokens = allDefiTokens[selectedAddress]?.[hecoChainId] || [];
      const defiAvaxTokens = allDefiTokens[selectedAddress]?.[avaxChainId] || [];
      const defiSyscoinTokens = allDefiTokens[selectedAddress]?.[syscoinChainId] || [];
      const {
        contractBalances,
        arbContractBalances,
        opContractBalances,
        bscContractBalances,
        polygonContractBalances,
        hecoContractBalances,
        avaxContractBalances,
        syscoinContractBalances,
        rpcContractBalances,
      } = tokenBalancesController.state;
      const {
        contractExchangeRates,
        arbContractExchangeRates,
        bscContractExchangeRates,
        polygonContractExchangeRates,
        hecoContractExchangeRates,
        opContractExchangeRates,
        avaxContractExchangeRates,
        syscoinContractExchangeRates,
        ethPrice,
        bnbPrice,
        polygonPrice,
        hecoPrice,
        avaxPrice,
        syscoinPrice,
        currencyCodeRate,
        currencyCode,
      } = tokenRatesController.state;

      const opt = {
        contractBalances: contractBalances[selectedAddress] || {},
        arbContractBalances: arbContractBalances[selectedAddress] || {},
        opContractBalances: opContractBalances[selectedAddress] || {},
        bscContractBalances: bscContractBalances[selectedAddress] || {},
        polygonContractBalances: polygonContractBalances[selectedAddress] || {},
        hecoContractBalances: hecoContractBalances[selectedAddress] || {},
        avaxContractBalances: avaxContractBalances[selectedAddress] || {},
        syscoinContractBalances: syscoinContractBalances[selectedAddress] || {},
        rpcContractBalances: rpcContractBalances[selectedAddress] || {},
        contractExchangeRates,
        arbContractExchangeRates,
        bscContractExchangeRates,
        polygonContractExchangeRates,
        hecoContractExchangeRates,
        opContractExchangeRates,
        avaxContractExchangeRates,
        syscoinContractExchangeRates,
        ethPrice,
        bnbPrice,
        polygonPrice,
        hecoPrice,
        avaxPrice,
        syscoinPrice,
        currencyCode,
        currencyCodeRate,
        isController: true,
      };

      const assets = [];
      const tokenAmount: {[chainType: number]: number} = { [ChainType.All]: 0, [ChainType.Ethereum]: 0, [ChainType.Polygon]: 0, [ChainType.Bsc]: 0, [ChainType.Heco]: 0, [ChainType.Arbitrum]: 0, [ChainType.Optimism]: 0, [ChainType.Avax]: 0, [ChainType.Syscoin]: 0 };
      const nftAmount: {[chainType: number]: number} = { [ChainType.All]: 0, [ChainType.Ethereum]: 0, [ChainType.Polygon]: 0, [ChainType.Bsc]: 0, [ChainType.Heco]: 0, [ChainType.Arbitrum]: 0, [ChainType.Optimism]: 0, [ChainType.Avax]: 0, [ChainType.Syscoin]: 0 };
      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Ethereum)) {
        const ethObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: mainChainId,
          type: ChainType.Ethereum,
          symbol: 'ETH',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        ethObj.logo = await this.config.numberUtil.getAssetLogo(ethObj);
        assets.push(ethObj);
        for (const token of tokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: mainChainId,
            type: ChainType.Ethereum, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        const { unconfirmed_interval: arb_unconfirmed_interval } = arbContractController.config;
        const { withdraws: arbWithdraws } = arbContractController.state;
        for (const item of arbWithdraws) {
          if (
            item.chainId !== arbChainId ||
            mainChainId !== arbPartnerChainId ||
            item.processed ||
            item.destination?.toLowerCase() !== selectedAddress.toLowerCase() ||
            (item.unconfirmed_timestamp && Date.now() - item.unconfirmed_timestamp < arb_unconfirmed_interval)
          ) {
            continue;
          }
          const lockToken = item.token;
          const arbWithdrawObj = this.config.numberUtil.calcAssetPrices({
            ...item,
            assetChainId: mainChainId,
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
        const { unconfirmed_interval: polygon_unconfirmed_interval } = polygonContractController.config;
        const { withdraws: polygonWithdraws } = polygonContractController.state;
        for (const item of polygonWithdraws) {
          if (
            item.chainId !== polygonChainId ||
            polygonPartnerChainId !== mainChainId ||
            item.processed ||
            item.destination?.toLowerCase() !== selectedAddress.toLowerCase() ||
            (item.unconfirmed_timestamp && Date.now() - item.unconfirmed_timestamp < polygon_unconfirmed_interval)
          ) {
            continue;
          }
          const lockToken = item.token;
          const polygonWithdrawObj = this.config.numberUtil.calcAssetPrices({
            ...item,
            assetChainId: mainChainId,
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
        defiTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: mainChainId,
            type: ChainType.Ethereum, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Ethereum] = collectibles.length;
        nftAmount[ChainType.All] += collectibles.length;
      }
      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Polygon)) {
        const polygonObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: polygonChainId,
          type: ChainType.Polygon,
          symbol: 'MATIC',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        polygonObj.logo = await this.config.numberUtil.getAssetLogo(polygonObj);
        assets.push(polygonObj);
        for (const token of polygonTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: polygonChainId,
            type: ChainType.Polygon, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiPolygonTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: polygonChainId,
            type: ChainType.Polygon, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Polygon] = polygonCollectibles.length;
        nftAmount[ChainType.All] += polygonCollectibles.length;
      }
      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Arbitrum)) {
        const arbEthObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: arbChainId,
          type: ChainType.Arbitrum,
          symbol: 'ETH',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        arbEthObj.logo = await this.config.numberUtil.getAssetLogo(arbEthObj);
        assets.push(arbEthObj);
        for (const token of arbTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: arbChainId,
            type: ChainType.Arbitrum, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiArbTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: arbChainId,
            type: ChainType.Arbitrum, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Arbitrum] = arbCollectibles.length;
        nftAmount[ChainType.All] += arbCollectibles.length;
      }
      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Optimism)) {
        const opEthObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: opChainId,
          type: ChainType.Optimism,
          symbol: 'ETH',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        opEthObj.logo = await this.config.numberUtil.getAssetLogo(opEthObj);
        assets.push(opEthObj);
        for (const token of opTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: opChainId,
            type: ChainType.Optimism, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiOpTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: opChainId,
            type: ChainType.Optimism, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Optimism] = opCollectibles.length;
        nftAmount[ChainType.All] += opCollectibles.length;
      }
      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Bsc)) {
        const bnbObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: bscChainId,
          type: ChainType.Bsc,
          symbol: 'BNB',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        bnbObj.logo = await this.config.numberUtil.getAssetLogo(bnbObj);
        assets.push(bnbObj);
        for (const token of bscTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: bscChainId,
            type: ChainType.Bsc, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiBscTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: bscChainId,
            type: ChainType.Bsc, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Bsc] = bscCollectibles.length;
        nftAmount[ChainType.All] += bscCollectibles.length;
      }
      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Heco)) {
        const hecoObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: hecoChainId,
          type: ChainType.Heco,
          symbol: 'HT',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        hecoObj.logo = await this.config.numberUtil.getAssetLogo(hecoObj);
        assets.push(hecoObj);
        for (const token of hecoTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: hecoChainId,
            type: ChainType.Heco, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiHecoTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: hecoChainId,
            type: ChainType.Heco, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Heco] = hecoCollectibles.length;
        nftAmount[ChainType.All] += hecoCollectibles.length;
      }

      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Avax)) {
        const avaxObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: avaxChainId,
          type: ChainType.Avax,
          symbol: 'AVAX',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        avaxObj.logo = await this.config.numberUtil.getAssetLogo(avaxObj);
        assets.push(avaxObj);
        for (const token of avaxTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: avaxChainId,
            type: ChainType.Avax, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiAvaxTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: avaxChainId,
            type: ChainType.Avax, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Avax] = avaxCollectibles.length;
        nftAmount[ChainType.All] += avaxCollectibles.length;
      }

      if (!preferencesController.isDisabledChain(selectedAddress, ChainType.Syscoin)) {
        const syscoinObj = this.config.numberUtil.calcAssetPrices({
          assetChainId: syscoinChainId,
          type: ChainType.Syscoin,
          symbol: 'SYS',
          decimals: 18,
          nativeCurrency: true,
        }, opt);
        syscoinObj.logo = await this.config.numberUtil.getAssetLogo(syscoinObj);
        assets.push(syscoinObj);
        for (const token of syscoinTokens) {
          const tokenObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: syscoinChainId,
            type: ChainType.Syscoin, ...token,
          }, opt);
          tokenObj.logo = await this.config.numberUtil.getAssetLogo(tokenObj);
          assets.push(tokenObj);
        }
        defiSyscoinTokens.forEach((token) => {
          const tokenObj = this.config.numberUtil.calcDefiTokenPrices({
            assetChainId: syscoinChainId,
            type: ChainType.Syscoin, ...token,
          }, opt);
          tokenObj.symbol = token.name;
          tokenObj.isDefi = true;
          assets.push(tokenObj);
        });
        nftAmount[ChainType.Syscoin] = syscoinCollectibles.length;
        nftAmount[ChainType.All] += syscoinCollectibles.length;
      }

      if (rpcChain?.length > 0) {
        for (const chain of rpcChain) {
          const rpcObj = this.config.numberUtil.calcAssetPrices({
            assetChainId: chain.chainId,
            type: chain.type,
            symbol: rpcNetworkController.getProviderTicker(chain.type),
            decimals: 18,
            nativeCurrency: true,
          }, opt);
          rpcObj.logo = await this.config.numberUtil.getAssetLogo(rpcObj);
          assets.push(rpcObj);
          const rpcChainTokens = rpcTokens[chain.chainId] || [];
          for (const token of rpcChainTokens) {
            const tokenObj = this.config.numberUtil.calcAssetPrices({
              assetChainId: chain.chainId,
              type: chain.type, ...token,
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

    const arbContractController = this.context.ArbContractController as ArbContractController;
    arbContractController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['withdraws']);

    const polygonContractController = this.context.PolygonContractController as PolygonContractController;
    polygonContractController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, ['withdraws']);

    const tokenRatesController = this.context.TokenRatesController as TokenRatesController;
    tokenRatesController.subscribe(() => {
        setTimeout(() => this.poll(), 100);
    }, [
      'contractExchangeRates',
      'arbContractExchangeRates',
      'bscContractExchangeRates',
      'polygonContractExchangeRates',
      'hecoContractExchangeRates',
      'opContractExchangeRates',
      'avaxContractExchangeRates',
      'syscoinContractExchangeRates',
      'ethPrice',
      'bnbPrice',
      'polygonPrice',
      'hecoPrice',
      'avaxPrice',
      'syscoinPrice',
      'currencyCodeRate',
      'currencyCode',
    ]);

    const tokenBalancesController = this.context.TokenBalancesController as TokenBalancesController;
    tokenBalancesController.subscribe(() => {
      setTimeout(() => this.poll(), 100);
    }, [
      'contractBalances',
      'arbContractBalances',
      'opContractBalances',
      'bscContractBalances',
      'polygonContractBalances',
      'hecoContractBalances',
      'avaxContractBalances',
      'syscoinContractBalances',
      'rpcContractBalances',
    ]);

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
