import { Mutex } from 'async-mutex';
import { BigNumber } from 'bignumber.js';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import PreferencesController from '../user/PreferencesController';
import util, {
  CollectibleType,
  getScanApiByType,
  logInfo,
  safelyExecute,
  timeoutFetch,
  toLowerCaseEquals,
} from '../util';
import { SupportCollectibles, ChainType } from '../Config';

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

  private isSupportOpensea(chainId: string) {
    return chainId === '1' || chainId === '4' || chainId === '137';
  }

  private isSupportLuxy(chainId: string) {
    return chainId === '57';
  }

  private getOwnerCollectiblesApi(chainId: string, address: string, offset: number) {
    const { openSeaApiKey, openSeaApiKeyForRinkeby } = this.config;

    if (chainId === '4') {
      return {
        api: `https://rinkeby-api.opensea.io/api/v1/assets?owner=${address}&offset=${offset}&limit=50`,
        key: openSeaApiKeyForRinkeby,
        version: 'v1',
      };
    } else if (chainId === '137') {
      return {
        api: `https://api.opensea.io/api/v2/assets/matic?owner_address=${address}`,
        key: openSeaApiKey,
        version: 'v2',
      };
    }
    return {
      api: `https://api.opensea.io/api/v1/assets?owner=${address}&offset=${offset}&limit=50`,
      key: openSeaApiKey,
      version: 'v1',
    };
  }

  private async getOwnerCollectibles(chainId: string, selectedAddress: string) {
    let response: Response;
    let collectibles: any = [];
    try {
      let offset = 0;
      let pagingFinish = false;
      let api;
      do {
        const openseaApi = this.getOwnerCollectiblesApi(chainId, selectedAddress, offset);
        response = await timeoutFetch(
          api || openseaApi.api,
          openseaApi.key ? { headers: { 'X-API-KEY': openseaApi.key } } : {},
          15000,
        );
        const collectiblesArray = await response.json();
        let results;
        if (openseaApi.version === 'v1') {
          results = collectiblesArray.assets;
        } else {
          results = collectiblesArray.results;
        }
        if (results?.length) {
          collectibles = [...collectibles, ...results];
        }
        if (!results || results.length <= 0) {
          pagingFinish = true;
        }
        if (openseaApi.version === 'v1') {
          if (results.length < 50) {
            pagingFinish = true;
          }
        } else if (openseaApi.version === 'v2') {
          if (collectiblesArray.next) {
            api = collectiblesArray.next;
            api = 'https://api.opensea.io/api/v2/assets/matic' + api.substring(api.indexOf('?'), api.length);
          } else {
            api = undefined;
            pagingFinish = true;
          }
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
   * Format Luxy Assets objects to match the Opensea object.
   *
   * @param collectibles - Luxy Assets object
   */
  formatLuxyJSON(collectibles: any) {
    const transformedAssets = collectibles.assets.map((asset: any) => {
      return {
        chainId: asset.chainId,
        token_id: asset.token_id,
        balanceOf: asset.balanceOf,
        address: asset.address,
        name: asset.name,
        background_color: asset.background_color ? asset.background_color : null,
        image_url: asset.image_url ? asset.image_url : null,
        image_preview_url: asset.image_preview_url ? asset.image_preview_url : null,
        image_thumbnail_url: asset.image_thumbnail_url ? asset.image_thumbnail_url : null,
        image_original_url: asset.image_original_url ? asset.image_original_url : null,
        animation_url: asset.animation_url ? asset.animation_url : null,
        animation_original_url: asset.animation_original_url ? asset.animation_original_url : null,
        description: asset.description ? asset.description : null,
        external_link: asset.external_link ? asset.external_link : null,
        creator: {
          user: {
            username: asset.creator.user.username ? asset.creator.user.username : null,
          },
          profile_img_url: asset.creator.profile_img_url ? asset.creator.profile_img_url : null,
          address: asset.creator.address ? asset.creator.address : null,
          image_url: asset.image_url ? asset.image_url : null,
        },
        last_sale: asset.last_sale ? asset.last_sale : null,
        asset_contract: {
          schema_name: asset.asset_contract.schema_name ? asset.asset_contract.schema_name : null,
          address: asset.address,
          image_url: asset.collection.image_url ? asset.collection.image_url : null,
        },
        collection: {
          name: asset.collection.name ? asset.collection.name : null,
          slug: asset.collection.slug ? asset.collection.slug : null,
          image_url: asset.collection.image_url ? asset.collection.image_url : null,
          description: asset.collection.description ? asset.collection.description : null,
        },
      };
    });

    return transformedAssets;
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
    try {
      const response = await fetch(`https://backend.luxy.io/nft/by-owner/${selectedAddress}?network=["Syscoin"]
    `);
      const data = await response.json();

      const collectible = this.formatLuxyJSON(data);

      if (!collectible) {
        return undefined;
      }

      return await this.fixDataCollectibles(collectible, chainId, selectedAddress, contractController);
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
    return await this.fixDataCollectibles(collectibles, chainId, selectedAddress, contractController);
  }

  async fixDataCollectibles(collectibles: any, chainId: string, selectedAddress: string, contractController: any) {
    const erc721Tokens: string[] = [];
    const erc721Ids: string[] = [];

    const erc1155Tokens: string[] = [];
    const erc1155Ids: string[] = [];

    collectibles.forEach((collectible: any) => {
      if (collectible.asset_contract.schema_name === 'ERC721') {
        erc721Tokens.push(collectible.asset_contract.address);
        erc721Ids.push(collectible.token_id);
      } else if (collectible.asset_contract.schema_name === 'ERC1155') {
        erc1155Tokens.push(collectible.asset_contract.address);
        erc1155Ids.push(collectible.token_id);
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
        (item) => item.address === collectible.asset_contract.address && item.token_id === collectible.token_id,
      );
      if (owner) {
        ownedCollectibles.push({ ...collectible, balanceOf: owner.balanceOf, chainId });
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
              collectible.token_id === nftTx.tokenID && collectible.asset_contract.address === nftTx.contractAddress,
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
          (contract: CollectibleContract) => contract.address === collectible.asset_contract.address,
        )
      ) {
        const collectibleContract = {
          ...collectible.asset_contract,
          chainId,
        };
        collectibleContracts.push(collectibleContract);
      }
      collectible.address = collectible.asset_contract.address;
      delete collectible.asset_contract;
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
