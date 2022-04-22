import { BN } from 'ethereumjs-util';
import Web3 from 'web3';
import abiSingleCallBalancesContract from 'single-call-balance-checker-abi';
import abiERC20 from 'human-standard-token-abi';
import abiERC721 from 'human-standard-collectible-abi';
import BigNumber from 'bignumber.js';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { BaseChainConfig } from '../Config';
import { BNToHex, CollectibleType, logDebug, resolveURI } from '../util';
import TOKEN_INFOS_ABI from '../static/tokeninfos_abi.json';
import abiERC1155 from '../static/ERC1155.json';
import NFT_BALANCE_CHECKER_ABI from '../static/nftbalance_checker_abi.json';
import abiERC20Bytes32 from '../static/ERC20Bytes32.json';
import { BalanceMap } from './AssetsContractController';

export const ERC721METADATA_INTERFACE_ID = '0x80ac58cd';
export const ERC1155METADATA_INTERFACE_ID = '0xd9b67a26';

export interface BlockInfo {
  block_number: number;
  timestamp: number;
}

export class ContractController<C extends BaseConfig, S extends BaseState> extends BaseController<C, S> {
  protected l1_web3: any;

  protected l2_web3: any;

  protected l1_chainId: any;

  protected l2_chainId: any;

  name = 'ContractController';

  constructor(config: Partial<C> = {} as C, state: Partial<S> = {} as S) {
    super(config, state);
  }

  async safelyGetTransactionReceipt(tx: string, targetChainId: string | undefined = undefined) {
    return new Promise<any>((resolve) => {
      if (!tx || !this.l2_web3) {
        resolve(undefined);
        return;
      }
      if (targetChainId && targetChainId !== this.l2_chainId) {
        resolve(undefined);
      }
      try {
        this.l2_web3.eth.getTransactionReceipt(tx, (error: Error, result: any) => {
          if (error) {
            resolve(undefined);
            return;
          }
          resolve(result);
        });
      } catch (e) {
        logDebug(`leon.w@safelyGetTransactionReceipt@${this.name}: ${e}`);
        resolve(undefined);
      }
    });
  }

  onL1NetworkChange(provider: any, chainId: any) {
    this.l1_web3 = new Web3(provider);
    this.l1_chainId = chainId;
  }

  onL2NetworkChange(provider: any, chainId: any) {
    this.l2_web3 = new Web3(provider);
    this.l2_chainId = chainId;
  }

  async getBlockInfo(): Promise<BlockInfo> {
    if (!this.l2_web3) {
      return { block_number: 0, timestamp: 0 };
    }
    return new Promise<BlockInfo>((resolve) => {
      this.l2_web3.eth.getBlock('latest', (error: Error, result: any) => {
        if (error) {
          resolve({ block_number: 0, timestamp: 0 });
        } else {
          resolve({ block_number: result.number, timestamp: result.timestamp });
        }
      });
    });
  }

  async getTokenDecimals(address: string, targetChainId: string | undefined = undefined): Promise<string> {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      throw new Error(`getTokenDecimals:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
    }
    const contract = this.l2_web3.eth.contract(abiERC20).at(address);
    return new Promise<string>((resolve, reject) => {
      contract.decimals((error: Error, result: string) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        // if (result.toString() === '0') {
        //   reject(error);
        //   return;
        // }
        resolve(result.toString());
      });
    });
  }

  async getAssetSymbol(address: string, targetChainId: string | undefined = undefined): Promise<string> {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      throw new Error(`getAssetSymbol:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
    }
    const contract = this.l2_web3.eth.contract(abiERC721).at(address);
    return new Promise<string>((resolve, reject) => {
      contract.symbol((error: Error, result: string) => {
        /* istanbul ignore if */
        if (error) {
          if (targetChainId && targetChainId !== this.l2_chainId) {
            reject(error);
            return;
          }
          const contract32 = this.l2_web3.eth.contract(abiERC20Bytes32).at(address);
          contract32.symbol((error2: Error, result2: any) => {
            if (error2) {
              reject(error2);
              return;
            }
            resolve(this.l2_web3.toAscii(result2));
          });
          return;
        }
        resolve(result);
      });
    });
  }

  async getSupportContract(contract: any, interfaceID: string) {
    return new Promise<boolean>((resolve, reject) => {
      contract.supportsInterface(interfaceID, (error: Error, result: boolean) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getCollectibleType(address: string, targetChainId: string | undefined = undefined) {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      throw new Error(`getCollectibleType:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
    }
    const contract = this.l2_web3.eth.contract(abiERC721).at(address);
    const supportErc1155 = await this.getSupportContract(contract, ERC1155METADATA_INTERFACE_ID);
    if (supportErc1155) {
      return CollectibleType.ERC1155;
    }
    if (targetChainId && targetChainId !== this.l2_chainId) {
      throw new Error(`getCollectibleType:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
    }
    const supportErc721 = await this.getSupportContract(contract, ERC721METADATA_INTERFACE_ID);
    if (supportErc721) {
      return CollectibleType.ERC721;
    }
    return CollectibleType.UNKNOWN;
  }

  async getCollectibleERC721URI(address: string, tokenId: string, targetChainId: string | undefined = undefined) {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      throw new Error(`getCollectibleERC721URI:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
    }
    const contract = this.l2_web3.eth.contract(abiERC721).at(address);
    return new Promise<string>((resolve, reject) => {
      contract.tokenURI(tokenId, (error: Error, result: string) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getCollectibleERC1155URI(address: string, tokenId: string, targetChainId: string | undefined = undefined) {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      throw new Error(`getCollectibleERC1155URI:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
    }
    const contract = this.l2_web3.eth.contract(abiERC1155).at(address);
    return new Promise<string>((resolve, reject) => {
      contract.uri(tokenId, (error: Error, result: string) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        if (result) {
          result = resolveURI(result, tokenId, 'en');
        }
        resolve(result);
      });
    });
  }

  async getOwnerOf(address: string, tokenId: string) {
    const contract = this.l2_web3.eth.contract(abiERC721).at(address);
    return new Promise<string>((resolve, reject) => {
      contract.ownerOf(tokenId, (error: Error, result: string) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getCollectibleBalanceOf(address: string, owner: string, tokenId: string): Promise<BigNumber> {
    const contract = this.l2_web3.eth.contract(abiERC1155).at(address);
    return new Promise<BigNumber>((resolve, reject) => {
      contract.balanceOf(owner, tokenId, (error: Error, result: BigNumber) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getBalancesInSingleCallInternal(selectedAddress: string, tokensToDetect: string[], returnZeroBalance = false): Promise<BalanceMap> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.balances_address;
    if (!ADDRESS) {
      return this.getBalances(selectedAddress, tokensToDetect, returnZeroBalance, this.l2_chainId);
    }
    if (!this.l2_web3 || !tokensToDetect?.length) {
      return {};
    }
    const contract = this.l2_web3.eth.contract(abiSingleCallBalancesContract).at(ADDRESS);
    return new Promise<BalanceMap>((resolve) => {
      contract.balances([selectedAddress], tokensToDetect, (error: Error, result: any[]) => {
        const allBalances: BalanceMap = {};
        if (error) {
          resolve(allBalances);
          return;
        }
        /* istanbul ignore else */
        if (result.length > 0) {
          tokensToDetect.forEach((tokenAddress, index) => {
            const balance: BN = new BN(result[index].toString(16), 16);
            /* istanbul ignore else */
            if (returnZeroBalance || !balance.isZero()) {
              allBalances[tokenAddress] = balance;
            }
          });
        }
        resolve(allBalances);
      });
    });
  }

  async getBalancesInSingleCall(selectedAddress: string, tokensToDetect: string[], returnZeroBalance = false, targetChainId: string | undefined = undefined): Promise<BalanceMap> {
    if (!tokensToDetect?.length) {
      return {};
    }
    let allBalances: BalanceMap = {};
    for (let i = 0; i <= tokensToDetect.length / 500; i++) {
      const sliced_tokens = tokensToDetect.slice(i * 500, (i + 1) * 500);
      if (targetChainId && targetChainId !== this.l2_chainId) {
        return allBalances;
      }
      const result = await this.getBalancesInSingleCallInternal(selectedAddress, sliced_tokens, returnZeroBalance);
      allBalances = { ...allBalances, ...result };
    }
    return allBalances;
  }

  async getBalances(selectedAddress: string, tokensToDetect: string[], returnZeroBalance = false, targetChainId: string | undefined = undefined): Promise<BalanceMap> {
    if (!tokensToDetect?.length) {
      return {};
    }
    const allBalances: BalanceMap = {};
    for (const token of tokensToDetect) {
      if (targetChainId && targetChainId !== this.l2_chainId) {
        logDebug(`getBalances:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
        return allBalances;
      }
      let balance;
      if (token === '0x0') {
        balance = await this.getNativeCurrencyBalanceOf(selectedAddress);
      } else {
        balance = await this.getBalanceOfCanReturnNull(token, selectedAddress);
      }
      if (balance && (returnZeroBalance || !balance.isZero())) {
        allBalances[token] = balance;
      }
    }
    return allBalances;
  }

  async getERC1155BalancesInSingleCall(selectedAddress: string, tokens: string[], ids: string[], targetChainId: string | undefined = undefined): Promise<BigNumber[]> {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      logDebug(`getERC1155BalancesInSingleCall:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.nftbalances_address;
    if (!ADDRESS || !this.l2_web3) {
      return [];
    }

    const allBalances = [];
    for (let i = 0; i <= tokens.length / 500; i++) {
      const sliced_tokens = tokens.slice(i * 500, (i + 1) * 500);
      const sliced_ids = ids.slice(i * 500, (i + 1) * 500);
      const result = await this.getERC1155BalancesInSingleCallInternal(selectedAddress, sliced_tokens, sliced_ids, targetChainId);
      result && allBalances.push(...result);
    }
    return allBalances;
  }

  async getERC1155BalancesInSingleCallInternal(selectedAddress: string, tokens: string[], ids: string[], targetChainId: string | undefined = undefined): Promise<BigNumber[]> {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      logDebug(`getERC1155BalancesInSingleCall:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.nftbalances_address;
    if (!ADDRESS || !this.l2_web3) {
      return [];
    }
    const contract = this.l2_web3.eth.contract(NFT_BALANCE_CHECKER_ABI).at(ADDRESS);
    return new Promise<BigNumber[]>((resolve) => {
      contract.balances([selectedAddress], tokens, ids, (error: Error, result: BigNumber[]) => {
        if (error) {
          resolve([]);
          return;
        }
        resolve(result);
      });
    });
  }

  async getERC721OwnersInSingleCall(selectedAddress: string, tokens: string[], ids: string[], targetChainId: string | undefined = undefined): Promise<string[]> {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      logDebug(`getERC721OwnersInSingleCall:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.nftbalances_address;
    if (!ADDRESS || !this.l2_web3) {
      return [];
    }

    const allBalances = [];
    for (let i = 0; i <= tokens.length / 500; i++) {
      const sliced_tokens = tokens.slice(i * 500, (i + 1) * 500);
      const sliced_ids = ids.slice(i * 500, (i + 1) * 500);
      const result = await this.getERC721OwnersInSingleCallInternal(selectedAddress, sliced_tokens, sliced_ids, targetChainId);
      result && allBalances.push(...result);
    }
    return allBalances;
  }

  async getERC721OwnersInSingleCallInternal(selectedAddress: string, tokens: string[], ids: string[], targetChainId: string | undefined = undefined): Promise<string[]> {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      logDebug(`getERC721OwnersInSingleCall:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.nftbalances_address;
    if (!ADDRESS || !this.l2_web3) {
      return [];
    }
    const contract = this.l2_web3.eth.contract(NFT_BALANCE_CHECKER_ABI).at(ADDRESS);
    return new Promise<string[]>((resolve) => {
      contract.owners([selectedAddress], tokens, ids, (error: Error, result: string[]) => {
        let allBalances: string[] = [];
        if (error) {
          resolve(allBalances);
          return;
        }
        allBalances = result;
        resolve(allBalances);
      });
    });
  }

  async getAllowancesInSingleCallInternal(contract: any, tokens: string[], spenders: string[], selectedAddress: string) {
    return new Promise<string[]>((resolve) => {
      contract.getTokenAllowance(tokens, spenders, selectedAddress, (error: Error, result: string[]) => {
        logDebug(`getAllowancesInSingleCall(${selectedAddress}, ${this.l2_chainId}: `, error, result.length);
        if (error) {
          resolve([]);
          return;
        }
        resolve(result);
      });
    });

  }

  async getAllowancesInSingleCall(tokens: string[], spenders: string[], selectedAddress: string, targetChainId: string | undefined = undefined) {
    if (targetChainId && targetChainId !== this.l2_chainId) {
      logDebug(`getAllowancesInSingleCall:Cannot match target chainId, current ${this.l2_chainId} target ${targetChainId}`);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ADDRESS = BaseChainConfig[this.l2_chainId]?.tokeninfos_address;
    if (!ADDRESS || !this.l2_web3) {
      return [];
    }
    const contract = this.l2_web3.eth.contract(TOKEN_INFOS_ABI).at(ADDRESS);
    let result: any[] = [];
    try {
      for (let i = 0; i <= tokens.length / 200; i++) {
        const subTokens = tokens.slice(i * 200, (i + 1) * 200);
        const subSpenders = spenders.slice(i * 200, (i + 1) * 200);
        const ret = await this.getAllowancesInSingleCallInternal(contract, subTokens, subSpenders, selectedAddress);
        result = [...result, ...ret];
      }
    } catch (error) {
      logDebug('getAllowancesInSingleCall failed ', error);
    }
    return result;
  }

  async getNativeCurrencyBalanceOf(selectedAddress: string): Promise<BN | null> {
    return new Promise<BN | null>((resolve) => {
      this.l2_web3.eth.getBalance(selectedAddress, (error: Error, result: any) => {
        /* istanbul ignore if */
        if (error) {
          resolve(null);
          return;
        }
        resolve(new BN(result.toString(16), 16));
      });
    });
  }

  async getBalanceOfCanReturnNull(address: string, selectedAddress: string): Promise<BN | null> {
    const contract = this.l2_web3.eth.contract(abiERC20).at(address);
    return new Promise<BN | null>((resolve) => {
      contract.balanceOf(selectedAddress, (error: Error, result: any) => {
        /* istanbul ignore if */
        if (error) {
          resolve(null);
          return;
        }
        resolve(new BN(result.toString(16), 16));
      });
    });
  }

  async getBalanceOf(address: string, selectedAddress: string): Promise<BN> {
    const contract = this.l2_web3.eth.contract(abiERC20).at(address);
    return new Promise<BN>((resolve) => {
      contract.balanceOf(selectedAddress, (error: Error, result: any) => {
        /* istanbul ignore if */
        if (error) {
          resolve(new BN(0));
          return;
        }
        resolve(new BN(result.toString(16), 16));
      });
    });
  }

  async getBalanceOfHex(address: string, selectedAddress: string): Promise<string> {
    return BNToHex(await this.getBalanceOf(address, selectedAddress));
  }

  async callApprove(tokenAddress: string, spender: string, amount: string, myAddress: string, origin: string): Promise<boolean> {
    const contract = this.l2_web3.eth.contract(abiERC20).at(tokenAddress);
    return new Promise<boolean>((resolve, reject) => {
      contract.approve(spender, amount, { from: myAddress, chainId: this.l2_chainId, origin }, (error: Error, result: any) => {
        logDebug(`callApprove(${tokenAddress}, ${amount}, ${spender}, ${origin}: `, error, result);
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      });
    });
  }
}

export default ContractController;
