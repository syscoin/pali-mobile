import { Mutex } from 'async-mutex';
import { BigNumber } from 'bignumber.js';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { ChainType, SupportCollectibles } from '../Config';

import PreferencesController from '../user/PreferencesController';
import util, {
  CollectibleType,
  getScanApiByType,
  logInfo,
  safelyExecute,
  timeoutFetch,
  toLowerCaseEquals,
} from '../util';

export interface ApiCollectibleCreator {
  user: { username: string };
  profile_img_url: string;
  address: string;
}

export interface ApiCollectibleLastSale {
  event_timestamp: string;
  total_price: string;
  transaction: { transaction_hash: string; block_hash: string };
}

export interface ApiCollectibleContract {
  address: string;
  asset_contract_type: string | null;
  created_date: string | null;
  name: string | null;
  schema_name: string | null;
  symbol: string | null;
  total_supply: string | null;
  description: string | null;
  external_link: string | null;
  image_url: string | null;
}

export interface CollectibleContract extends ApiCollectibleContract {
  chainId: string;
}

export interface CollectibleId {
  address: string;
  token_id: string;
  chainId: string;
}

export interface Collection {
  name: string | null;
  slug: string | null;
  image_url: string | null;
  description: string | null;
  address: string | null;
}

export interface Collectible {
  chainId: string;
  token_id: string;
  address: string;
  num_sales: number | null;
  background_color: string | null;
  image_url: string | null;
  image_preview_url: string | null;
  image_thumbnail_url: string | null;
  image_original_url: string | null;
  animation_url: string | null;
  animation_original_url: string | null;
  name: string | null;
  description: string | null;
  external_link: string | null;
  creator: ApiCollectibleCreator | null;
  last_sale: ApiCollectibleLastSale | null;
  balanceOf: BigNumber;
  collection: Collection | null;
}

export interface CollectiblesState extends BaseState {
  allCollectibles: {
    [address: string]: { [chainId: string]: Collectible[] };
  };
  allCollectibleContracts: {
    [address: string]: { [chainId: string]: CollectibleContract[] };
  };
  favoriteCollectibles: {
    [address: string]: CollectibleId[];
  };
  ipfsGateway: string;
}

export interface CollectiblesConfig extends BaseConfig {
  interval: number;
  openSeaApiKey: string;
  openSeaApiKeyForRinkeby: string;
}

const LOAD_NFT_MAX = 400;

export class CollectiblesController extends BaseController<CollectiblesConfig, CollectiblesState> {
  private handle?: NodeJS.Timer;

  private mutex = new Mutex();

  private mutexData = new Mutex();

  private polling_counter = 0;

  private nftChains: { [key: string]: string } = {
    '1': 'ethereum',
    '10': 'optimism',
    '56': 'bsc',
    '137': 'matic',
    '42161': 'arbitrum',
    '43114': 'avalanche',
  };

  /**
   * Name of this controller used during composition
   */
  name = 'CollectiblesController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = ['PreferencesController'];

  private getScanKey: (type: ChainType) => string;

  constructor(
    { getScanKey }: { getScanKey: (type: ChainType) => string },
    config?: Partial<CollectiblesConfig>,
    state?: Partial<CollectiblesState>,
  ) {
    super(config, state);
    this.defaultConfig = {
      interval: 180000,
      openSeaApiKey: '',
      openSeaApiKeyForRinkeby: '',
    };
    this.defaultState = {
      allCollectibles: {},
      allCollectibleContracts: {},
      favoriteCollectibles: {},
      ipfsGateway: 'https://infura-ipfs.io/ipfs/',
    };
    this.initialize();
    this.getScanKey = getScanKey;
  }

  isSupportChainType(chainType: ChainType) {
    return SupportCollectibles.includes(chainType);
  }

  private isSupportLuxy(chainId: string) {
    return chainId === '57' || chainId === '570';
  }

  private isSupportOpensea(chainId: string) {
    return Object.keys(this.nftChains).includes(chainId);
  }

  private getChainName(chainId: string): string {
    return this.nftChains[chainId] || 'unknown';
  }

  private getOwnerCollectiblesApi(chainId: string, address: string) {
    const { openSeaApiKey } = this.config;
    const chainName = this.getChainName(chainId);

    return {
      api: `https://api.opensea.io/api/v2/chain/${chainName}/account/${address}/nfts?limit=50`,
      key: openSeaApiKey,
      version: 'v2',
    };
  }

  private async getOwnerCollectibles(chainId: string, selectedAddress: string) {
    let response: Response;
    let collectibles: any = [];
    const chainName = this.getChainName(chainId);
    try {
      let offset = 0;
      let pagingFinish = false;
      let api;

      do {
        const openseaApi = this.getOwnerCollectiblesApi(chainId, selectedAddress);
        response = await timeoutFetch(
          api || openseaApi.api,
          openseaApi.key ? { headers: { 'X-API-KEY': openseaApi.key } } : {},
          15000,
        );
        const collectiblesArray = await response.json();
        let results;

        results = collectiblesArray.nfts;

        if (results?.length) {
          collectibles = [...collectibles, ...results];
        }
        if (!results || results.length <= 0) {
          pagingFinish = true;
        }

        if (collectiblesArray.next) {
          let nextCode = collectiblesArray.next;
          api = `https://api.opensea.io/api/v2/chain/${chainName}/account/${selectedAddress}/nfts?limit=50&next=${nextCode}`;
        } else {
          api = undefined;
          pagingFinish = true;
        }

        offset += 50;
        if (offset >= LOAD_NFT_MAX) {
          pagingFinish = true;
        }
      } while (!pagingFinish);
    } catch (e) {
      logInfo('PPYang getOwnerCollectibles e:', e);
      return undefined;
    }
    return collectibles;
  }

  /**
   * Fetches Luxy NFT assets from a specific wallet and returns them formatted.
   *
   * @param selectedAddress - The wallet address from which to fetch the NFTs.
   * @param chainId - The ID of the blockchain network.
   * @param contractController - An object that can interact with a blockchain contract, responsible for managing the NFT contract interactions.
   *
   * This function performs a network request to the backend API, retrieving NFTs owned by the given wallet address.
   * It then formats the response data and returns it. If an error occurs during this process, it will be caught and logged,
   * and the function will return `undefined`.
   */
  async fetchLuxyNFTs(selectedAddress: string, chainId: string, contractController: any) {
    const isLuxy = true;
    try {
      const network = chainId === '57' ? 'Syscoin' : 'Rollux';
      const limit = 50;
      let page = 0;
      let pagingFinish = false;
      let collectibles: any[] = [];
      let url = `https://backend.luxy.io/nft/by-owner/${selectedAddress}?network=["${network}"]&page=${page}&limit=${limit}`;

      do {
        const response = await fetch(url);
        const { assets, more_pages } = await response.json();

        if (assets?.length) {
          collectibles = [...collectibles, ...assets];
        }

        if (!more_pages || collectibles.length >= LOAD_NFT_MAX) {
          pagingFinish = true;
        }

        url = `https://backend.luxy.io/nft/by-owner/${selectedAddress}?network=["${network}"]&page=${page}&limit=${limit}`;
        page += 1;
      } while (!pagingFinish);

      if (!collectibles.length) {
        return undefined;
      }

      return await this.fixDataCollectibles(collectibles, chainId, selectedAddress, contractController, isLuxy);
    } catch (e) {
      logInfo('PPYang fetchLuxyNFTs e:', e);
      return undefined;
    }
  }

  async detectCollectibles(requestedSelectedAddress: string, chainType: ChainType) {
    const assetsContract = this.contracts[chainType];
    const { chainId } = this.networks[chainType].state.provider;

    let collectibles;

    if (this.isSupportOpensea(chainId)) {
      collectibles = await this.getCollectiblesByOpensea(chainId, requestedSelectedAddress, assetsContract);
    } else if (this.isSupportLuxy(chainId)) {
      collectibles = await this.fetchLuxyNFTs(requestedSelectedAddress, chainId, assetsContract);
    } else {
      collectibles = await this.detectCollectiblesByType(requestedSelectedAddress, chainId, chainType, assetsContract);
    }

    logInfo('PPYang detectCollectibles collectibles:', collectibles?.length, ' chainId:', chainId);
    collectibles && (await this.updateCollectibles(requestedSelectedAddress, chainId, collectibles));
  }

  async getCollectiblesByOpensea(chainId: string, selectedAddress: string, contractController: any) {
    const collectibles = await this.getOwnerCollectibles(chainId, selectedAddress);

    if (!collectibles) {
      return undefined;
    }

    const updateCollectibles = await this.getCollectionData(collectibles, selectedAddress, chainId);

    return await this.fixDataCollectibles(updateCollectibles, chainId, selectedAddress, contractController);
  }

  private async getCollectionData(collectionArray: any[], selectedAddress: string, selectedChainId: string) {
    const { openSeaApiKey } = this.config;
    const collectionCache = new Map();
    const alreadyFetchedCollections = this.state.allCollectibles[selectedAddress]?.[selectedChainId] || [];

    // Update the cache with already fetched collections
    alreadyFetchedCollections.forEach((item) => {
      if (item.collection && item.collection.slug) {
        collectionCache.set(item.collection.slug, item.collection);
      }
    });

    for (let item of collectionArray) {
      const collectionSlug = item.collection;

      // Check if the collection data is already available, if not call the opensea api
      if (!collectionCache.has(collectionSlug) || this.isCacheExpired(collectionCache.get(collectionSlug).updatedAt)) {
        let api = `https://api.opensea.io/api/v2/collections/${collectionSlug}`;
        let response: Response;

        try {
          response = await timeoutFetch(api, openSeaApiKey ? { headers: { 'X-API-KEY': openSeaApiKey } } : {}, 15000);
          const data = await response.json();

          const collectionData = {
            name: data.name || null,
            slug: data.collection || null,
            image_url: data.image_url || null,
            description: data.description || null,
            address: data.owner || null,
            updatedAt: Date.now(),
          };

          collectionCache.set(collectionSlug, collectionData);
        } catch (error) {
          logInfo('PPYang Error fetching data for getCollectionData e:', collectionSlug, error);
        }
      }

      // If the collection data is already available, add it to the collectible
      if (!item.collection || typeof item.collection === 'string') {
        const cachedData = collectionCache.get(collectionSlug);
        if (cachedData) {
          item.collection = {
            name: cachedData.name,
            slug: cachedData.slug,
            image_url: cachedData.image_url,
            description: cachedData.description,
            address: cachedData.address,
            updatedAt: cachedData.updatedAt,
          };

          item.creator = {
            address: cachedData.address,
          };
        }
      }
    }

    return collectionArray;
  }

  /**
   * Used to verify if the collection cache is expired
   */
  private isCacheExpired(timestamp: number) {
    // 1 week expiry time
    const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
    const currentTime = Date.now();

    return currentTime - timestamp > oneWeekInMilliseconds;
  }

  async fixDataCollectibles(
    collectibles: any,
    chainId: string,
    selectedAddress: string,
    contractController: any,
    isLuxy?: boolean,
  ) {
    const erc721Tokens: string[] = [];
    const erc721Ids: string[] = [];
    const erc1155Tokens: string[] = [];
    const erc1155Ids: string[] = [];

    collectibles.forEach((collectible: any) => {
      const assetContractAddress = collectible.asset_contract
        ? collectible.asset_contract.address
        : collectible.contract;
      const tokenId = collectible.token_id ? collectible.token_id : collectible.identifier;
      const tokenStandard = collectible.token_standard ? collectible.token_standard.toLowerCase() : null;

      if (
        (collectible.asset_contract && collectible.asset_contract.schema_name === 'ERC721') ||
        tokenStandard === 'erc721'
      ) {
        erc721Tokens.push(assetContractAddress);
        erc721Ids.push(tokenId);
      } else if (
        (collectible.asset_contract && collectible.asset_contract.schema_name === 'ERC1155') ||
        tokenStandard === 'erc1155'
      ) {
        erc1155Tokens.push(assetContractAddress);
        erc1155Ids.push(tokenId);
      }
    });

    const allOwners: any[] = [];
    if (erc721Tokens.length > 0) {
      let owners: any[] = [];

      try {
        owners = await contractController.getERC721OwnersInSingleCall(
          selectedAddress,
          erc721Tokens,
          erc721Ids,
          chainId,
        );
      } catch (e) {
        logInfo('PPYang getERC721OwnersInSingleCall e:', e);
        const allCollectibles = this.state.allCollectibles[selectedAddress]?.[chainId];
        if (allCollectibles) {
          erc721Tokens.forEach((address, index) => {
            const eNft = allCollectibles.find(
              (nft) => toLowerCaseEquals(nft.address, address) && nft.token_id === erc721Ids[index],
            );
            if (eNft) {
              owners.push(selectedAddress);
            } else {
              owners.push('0x0');
            }
          });
        }
      }

      if (owners && owners.length === erc721Tokens.length) {
        erc721Tokens.forEach((address, index) => {
          if (toLowerCaseEquals(owners[index], selectedAddress)) {
            allOwners.push({ balanceOf: new BigNumber(1), address, token_id: erc721Ids[index] });
          } else if (isLuxy && owners[index] === '0x0000000000000000000000000000000000000000') {
            allOwners.push({ balanceOf: new BigNumber(1), address, token_id: erc721Ids[index] });
          }
        });
      } else {
        logInfo('PPYang getERC721OwnersInSingleCall length is not match:', owners?.length, erc721Tokens.length);
        return undefined;
      }
    }

    if (erc1155Tokens.length > 0) {
      let owners: any[] = [];
      try {
        owners = await contractController.getERC1155BalancesInSingleCall(
          selectedAddress,
          erc1155Tokens,
          erc1155Ids,
          chainId,
        );
      } catch (e) {
        logInfo('PPYang getERC1155BalancesInSingleCall e:', e);
        const allCollectibles = this.state.allCollectibles[selectedAddress]?.[chainId];
        if (allCollectibles) {
          erc1155Tokens.forEach((address, index) => {
            const eNft = allCollectibles.find(
              (nft) => toLowerCaseEquals(nft.address, address) && nft.token_id === erc1155Ids[index],
            );
            if (eNft) {
              owners.push(eNft.balanceOf);
            } else {
              owners.push(new BigNumber(0));
            }
          });
        }
      }

      if (owners && owners.length === erc1155Tokens.length) {
        erc1155Tokens.forEach((address, index) => {
          if (owners[index]?.gt(0)) {
            allOwners.push({ balanceOf: owners[index], address, token_id: erc1155Ids[index] });
          }
        });
      } else {
        logInfo('PPYang getERC1155BalancesInSingleCall length is not match:', owners?.length, erc1155Tokens.length);
        return undefined;
      }
    }

    const ownedCollectibles: any = [];
    collectibles.forEach((collectible: any) => {
      const owner = allOwners.find(
        (item) =>
          item.address === (collectible.asset_contract ? collectible.asset_contract.address : collectible.contract) &&
          item.token_id === (collectible.token_id ? collectible.token_id : collectible.identifier),
      );

      if (owner) {
        ownedCollectibles.push({
          ...collectible,
          balanceOf: owner.balanceOf,
          chainId,
        });
      }
    });

    return ownedCollectibles;
  }

  async getCollectiblesByType(selectedAddress: string, chainId: string, type: ChainType) {
    const scanKey = await this.getScanKey(type);
    const api = await getScanApiByType(type, chainId, selectedAddress, 'tokennfttx', undefined, scanKey);
    if (!api?.url) {
      return undefined;
    }
    const response = await timeoutFetch(api.url, api.options, 15000);
    const nftResult = await response.json();
    if (!nftResult || nftResult.status === '0' || !Array.isArray(nftResult.result)) {
      return undefined;
    }
    return nftResult.result;
  }

  async getCollectibleImage(
    contractController: any,
    schema_name: string | null,
    contractAddress: string | null,
    tokenID: string | null,
    chainId: string | null = null,
  ) {
    if (!contractController || !schema_name || !contractAddress || !tokenID) {
      return undefined;
    }
    if (schema_name === 'ERC20') {
      return undefined;
    }
    let tokenURI;
    try {
      if (schema_name === 'ERC721') {
        tokenURI = await contractController.getCollectibleERC721URI(contractAddress, tokenID, chainId);
      } else {
        tokenURI = await contractController.getCollectibleERC1155URI(contractAddress, tokenID, chainId);
      }
      if (tokenURI) {
        return await this.handleFetchTokenURI(tokenURI);
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
      util.logDebug('PPYang getCollectibleImage e:', e, tokenID, schema_name, chainId, contractAddress, tokenURI);
    }
    return undefined;
  }

  async handleFetchTokenURI(tokenURI: string) {
    if (util.isIPFSUrl(tokenURI)) {
      tokenURI = util.makeIPFSUrl(tokenURI, this.state.ipfsGateway);
    }
    const response = await timeoutFetch(tokenURI, undefined, 5000);
    let object = await response.json();
    const hasImage = Object.prototype.hasOwnProperty.call(object, 'image');
    let image;
    if (!hasImage && object?.data) {
      image = object.data.image ? 'image' : 'image_url';
      object = object.data;
    } else {
      image = hasImage ? 'image' : 'image_url';
    }
    return { image: object[image], name: object.name, thumb: object.thumb };
  }

  async detectCollectiblesByType(selectedAddress: string, chainId: string, type: ChainType, contractController: any) {
    let nftTxs = await this.getCollectiblesByType(selectedAddress, chainId, type);
    if (!nftTxs) {
      logInfo(
        'PPYang detectCollectiblesByType nftTxs is null, chainId:',
        chainId,
        ' type:',
        type,
        ' selectedAddress:',
        selectedAddress,
      );
      return undefined;
    }
    const oldCollectibles = this.state.allCollectibles[selectedAddress]
      ? this.state.allCollectibles[selectedAddress][chainId] || []
      : [];
    const oldContracts = this.state.allCollectibleContracts[selectedAddress]
      ? this.state.allCollectibleContracts[selectedAddress][chainId] || []
      : [];

    const collectibles: any[] = [];
    nftTxs = nftTxs.reverse();
    for (const nftTx of nftTxs) {
      if (collectibles.length > 0) {
        if (
          collectibles.find(
            (collectible) =>
              collectible.token_id === (nftTx.tokenID ? nftTx.tokenID : nftTx.identifier) &&
              collectible.asset_contract.address === (nftTx.contractAddress ? nftTx.contractAddress : nftTx.contract),
          )
        ) {
          continue;
        }
      }

      const oldCollectible = oldCollectibles.find(
        (collectible) => collectible.token_id === nftTx.tokenID && collectible.address === nftTx.contractAddress,
      );
      if (oldCollectible) {
        const contracts = this.state.allCollectibleContracts[selectedAddress]
          ? this.state.allCollectibleContracts[selectedAddress][chainId] || []
          : [];
        const collectibleContract = contracts.find((contract) => contract.address === nftTx.contractAddress);
        collectibles.push({ ...oldCollectible, asset_contract: collectibleContract });
        continue;
      }

      let asset_contract;
      if (oldContracts && oldContracts.length > 0) {
        asset_contract = oldContracts.find((contract) => contract.address === nftTx.contractAddress);
      }
      if (!asset_contract) {
        let collectibleType;
        try {
          collectibleType = await contractController.getCollectibleType(nftTx.contractAddress, chainId);
          if (collectibleType === CollectibleType.UNKNOWN) {
            continue;
          }
        } catch (e) {
          logInfo('PPYang detectCollectiblesByType getCollectibleType chainId:', chainId, ' error:', e);
          continue;
        }
        asset_contract = {
          address: nftTx.contractAddress,
          asset_contract_type: null,
          created_date: null,
          name: nftTx.tokenName,
          schema_name: collectibleType === CollectibleType.ERC721 ? 'ERC721' : 'ERC1155',
          symbol: nftTx.tokenSymbol,
          total_supply: null,
          description: null,
          external_link: null,
          image_url: null,
        };
      }

      const collectible: any = {
        chainId,
        token_id: nftTx.tokenID,
        address: nftTx.contractAddress,
        balanceOf: nftTx.balanceOf,
        num_sales: null,
        background_color: null,
        image_url: null,
        image_preview_url: null,
        image_thumbnail_url: null,
        image_original_url: null,
        animation_url: null,
        animation_original_url: null,
        name: null,
        description: null,
        external_link: null,
        asset_contract,
        creator: null,
        last_sale: null,
      };
      collectibles.push(collectible);
    }
    let ownedCollectibles = await this.fixDataCollectibles(collectibles, chainId, selectedAddress, contractController);
    if (ownedCollectibles) {
      ownedCollectibles = ownedCollectibles.slice(0, LOAD_NFT_MAX);
      for (const collectible of ownedCollectibles) {
        const imageInfo = await this.getCollectibleImage(
          contractController,
          collectible.asset_contract?.schema_name,
          collectible.address,
          collectible.token_id,
          chainId,
        );
        if (imageInfo) {
          collectible.image_url = imageInfo.image;
          collectible.name = imageInfo.name;
          collectible.image_thumbnail_url = imageInfo.thumb;
          collectible.image_preview_url = imageInfo.thumb;
        }
      }
    }
    return ownedCollectibles;
  }

  async updateCollectibles(selectedAddress: string, chainId: string, newCollectible: any[]) {
    const releaseLock = await this.mutexData.acquire();
    const addressCollectibleContracts = this.state.allCollectibleContracts[selectedAddress];

    const collectibleContracts: CollectibleContract[] = [];
    newCollectible.forEach((collectible: any) => {
      if (
        !collectibleContracts.find(
          (contract: CollectibleContract) =>
            contract.address ===
            (collectible.asset_contract ? collectible.asset_contract.address : collectible.contract),
        )
      ) {
        let collectibleContract;
        if (collectible.asset_contract) {
          collectibleContract = {
            ...collectible.asset_contract,
            chainId,
          };
        } else {
          let imageUrl = null;
          let schemaName = collectible.token_standard ? collectible.token_standard.toUpperCase() : null;

          // Check if collectible.collection is an object and has the necessary properties
          if (typeof collectible.collection === 'object' && collectible.collection !== null) {
            imageUrl = collectible.collection.image_url;
          }

          collectibleContract = {
            address: collectible.contract,
            image_url: imageUrl,
            schema_name: schemaName,
            chainId,
          };
        }

        collectibleContracts.push(collectibleContract);
      }
      collectible.address = collectible.asset_contract ? collectible.asset_contract.address : collectible.contract;
      if (collectible.asset_contract) {
        delete collectible.asset_contract;
      } else {
        delete collectible.contract;
      }
    });

    const newAddressCollectibleContracts = {
      ...addressCollectibleContracts,
      [chainId]: collectibleContracts,
    };

    const newCollectibleContracts = {
      ...this.state.allCollectibleContracts,
      [selectedAddress]: newAddressCollectibleContracts,
    };

    const addressCollectibles = this.state.allCollectibles[selectedAddress];
    const newAddressCollectibles = {
      ...addressCollectibles,
      [chainId]: newCollectible,
    };
    const newAllCollectibles = {
      ...this.state.allCollectibles,
      [selectedAddress]: newAddressCollectibles,
    };

    this.update({ allCollectibles: newAllCollectibles, allCollectibleContracts: newCollectibleContracts });
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
    const preferences = this.context.PreferencesController as PreferencesController;
    for (const chainType of SupportCollectibles) {
      !preferences.isDisabledChain(selectedAddress, chainType) &&
        (await safelyExecute(() => this.detectCollectibles(selectedAddress, chainType)));
    }
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
    const allCollectibles = this.state.allCollectibles || {};
    Object.keys(allCollectibles).forEach((address) => {
      if (!identities[address]) {
        delete allCollectibles[address];
      }
    });
    const allCollectibleContracts = this.state.allCollectibleContracts || {};
    Object.keys(allCollectibleContracts).forEach((address) => {
      if (!identities[address]) {
        delete allCollectibleContracts[address];
      }
    });
    const favoriteCollectibles = this.state.favoriteCollectibles || {};
    Object.keys(favoriteCollectibles).forEach((address) => {
      if (!identities[address]) {
        delete favoriteCollectibles[address];
      }
    });
  }

  rehydrate(state: Partial<CollectiblesState>) {
    const new_state = util.rehydrate(this.name, state);
    this.update(new_state);
  }

  async updateCollectible(address: string, token_id: string, chainId: string, balanceOf: BigNumber) {
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }
    const collectibles = this.state.allCollectibles[selectedAddress]
      ? this.state.allCollectibles[selectedAddress][chainId]
      : undefined;
    if (!collectibles || collectibles.length <= 0) {
      return;
    }
    const releaseLock = await this.mutexData.acquire();
    let newCollectible;
    let newAllCollectibleContracts;

    if (balanceOf.isZero()) {
      newCollectible = collectibles.filter(
        (collectible) => collectible.token_id !== token_id || collectible.address !== address,
      );
      if (!newCollectible.find((collectible) => collectible.address === address)) {
        const contracts = this.state.allCollectibleContracts[selectedAddress]
          ? this.state.allCollectibleContracts[selectedAddress][chainId]
          : undefined;
        if (contracts) {
          const newContracts = contracts.filter((contract) => contract.address !== address);

          const newCollectibleContracts = {
            ...this.state.allCollectibleContracts[selectedAddress],
            [chainId]: newContracts,
          };
          newAllCollectibleContracts = {
            ...this.state.allCollectibleContracts,
            [selectedAddress]: newCollectibleContracts,
          };
        }
      }
    } else {
      collectibles.forEach((collectible) => {
        if (collectible.token_id === token_id && collectible.address === address) {
          collectible.balanceOf = balanceOf;
        }
      });
      newCollectible = [...collectibles];
    }
    const addressCollectibles = this.state.allCollectibles[selectedAddress];
    const newAddressCollectibles = {
      ...addressCollectibles,
      [chainId]: newCollectible,
    };
    const newAllCollectibles = {
      ...this.state.allCollectibles,
      [selectedAddress]: newAddressCollectibles,
    };
    if (newAllCollectibleContracts) {
      this.update({ allCollectibles: newAllCollectibles, allCollectibleContracts: newAllCollectibleContracts });
    } else {
      this.update({ allCollectibles: newAllCollectibles });
    }
    releaseLock();
  }

  addFavoriteCollectible(address: string, token_id: string, chainId: string) {
    if (!address || !token_id) {
      return;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }
    chainId = chainId.toString();

    const collectibles = this.state.allCollectibles[selectedAddress]
      ? this.state.allCollectibles[selectedAddress][chainId]
      : undefined;
    if (!collectibles) {
      return;
    }
    const targetCollectible = collectibles.find((collectible: Collectible) => {
      return (
        chainId === collectible.chainId &&
        toLowerCaseEquals(address, collectible.address) &&
        token_id === collectible.token_id
      );
    });

    if (!targetCollectible) {
      return;
    }
    const curFavoriteCollectibles = this.state.favoriteCollectibles[selectedAddress]
      ? [...this.state.favoriteCollectibles[selectedAddress]]
      : [];
    if (
      curFavoriteCollectibles.findIndex(
        (favorite) =>
          favorite.chainId === chainId &&
          toLowerCaseEquals(favorite.address, address) &&
          favorite.token_id === token_id,
      ) !== -1
    ) {
      return;
    }
    curFavoriteCollectibles.push({ chainId, address, token_id });
    const newFavoriteCollectibles = {
      ...this.state.favoriteCollectibles,
      [selectedAddress]: curFavoriteCollectibles,
    };
    this.update({ favoriteCollectibles: newFavoriteCollectibles });
  }

  removeFavoriteCollectible(address: string, token_id: string, chainId: string) {
    if (!address || !token_id) {
      return;
    }
    const preferencesController = this.context.PreferencesController as PreferencesController;
    const { selectedAddress } = preferencesController.state;
    if (!selectedAddress) {
      return;
    }

    const curFavoriteCollectibles = this.state.favoriteCollectibles[selectedAddress];
    if (!curFavoriteCollectibles) {
      return;
    }
    chainId = chainId.toString();

    const nowFavoriteCollectibles = curFavoriteCollectibles.filter(
      (id) => chainId !== id.chainId || !toLowerCaseEquals(address, id.address) || token_id !== id.token_id,
    );
    if (nowFavoriteCollectibles.length !== curFavoriteCollectibles.length) {
      const newFavoriteCollectibles = {
        ...this.state.favoriteCollectibles,
        [selectedAddress]: nowFavoriteCollectibles,
      };
      this.update({ favoriteCollectibles: newFavoriteCollectibles });
    }
  }

  setIpfsGateway(ipfsGateway: string) {
    this.update({ ipfsGateway });
  }
}

export default CollectiblesController;
