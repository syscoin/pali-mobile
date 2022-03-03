import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  IBridgeResponse,
  ICreateSwapRequest,
  ICreateSwapResponse,
  IGetSwapsRequest,
  INetworkListResponse,
  INetworkResponse,
  IQuotaFor24Hour,
  ISwapListResponse,
  ISwapResponse,
  ITokenListResponse,
  ITokenResponse,
} from './entity';

const parseBridgeResponseOrThrow = function <T = any>(
  response: IBridgeResponse<T>,
): T {
  const { code, data, message } = response;
  if (code === 20000) {
    return data;
  }
  throw new Error(`#${code}: ${message}`);
};

export class RequestManager {
  private api: AxiosInstance;

  public constructor() {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: 'https://api.binance.org/bridge',
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'json',
    };
    this.api = axios.create(axiosConfig);
  }

  public async getTokens(): Promise<ITokenListResponse> {
    const { data } = await this.api.get<IBridgeResponse<ITokenListResponse>>(
      `/api/v2/tokens`,
    );
    return parseBridgeResponseOrThrow(data);
  }

  public async getTokenBySymbol(name: string): Promise<ITokenResponse> {
    const tokens = await this.getTokens();
    for (const token of tokens.tokens) {
      if (token.symbol === name) {
        return token;
      }
    }
    throw new Error(`Unable to resolve token by symbol: ${name}`);
  }

  public async getTokenByEtherAddress(address: string): Promise<ITokenResponse> {
    const lowerAddress = address?.toLowerCase();
    const tokens = await this.getTokens();
    for (const token of tokens.tokens) {
      if (token.ethContractAddress?.toLowerCase() === lowerAddress) {
        return token;
      }
    }
    throw new Error(`Unable to resolve token by ether address: ${address}`);
  }

  public async getTokenByBscAddress(address: string): Promise<ITokenResponse> {
    const lowerAddress = address?.toLowerCase();
    const tokens = await this.getTokens();
    for (const token of tokens.tokens) {
      if (token.bscContractAddress?.toLowerCase() === lowerAddress) {
        return token;
      }
    }
    throw new Error(`Unable to resolve token by bsc address: ${address}`);
  }

  public async getNetworks(symbol: string): Promise<INetworkListResponse> {
    const { data } = await this.api.get<IBridgeResponse<INetworkListResponse>>(
      `/api/v2/tokens/${symbol}/networks`,
    );
    return parseBridgeResponseOrThrow(data);
  }

  public async getNetworkByName(
    symbol: string,
    name: string,
  ): Promise<INetworkResponse> {
    const networks = await this.getNetworks(symbol);
      const [network] = networks.networks.filter((n) => n.name === name);
    if (!network) {
      throw new Error(`Unable to resolve network by name: ${name}`);
    }
    return network;
  }

  public async getSwaps(request: IGetSwapsRequest): Promise<ISwapListResponse> {
    const { data } = await this.api.get<IBridgeResponse<ISwapListResponse>>(
      `/api/v2/swaps`,
      {
        params: request,
      },
    );
    return parseBridgeResponseOrThrow(data);
  }

  public async createSwap(
    request: ICreateSwapRequest,
  ): Promise<ICreateSwapResponse> {
    const { data } = await this.api.post<IBridgeResponse<ICreateSwapResponse>>(
      `/api/v2/swaps`,
      request,
    );
    return parseBridgeResponseOrThrow(data);
  }

  public async getSwap(id: string): Promise<ISwapResponse> {
    const { data } = await this.api.get<IBridgeResponse<ISwapResponse>>(
      `/api/v1/swaps/${id}`,
    );
    return parseBridgeResponseOrThrow(data);
  }

  public async getQuotaFor24Hour(
    symbol: string,
    walletAddress: string,
  ): Promise<IQuotaFor24Hour> {
    const { data } = await this.api.get<IBridgeResponse<IQuotaFor24Hour>>(
      `/api/v1/swaps/quota/24hour`,
      {
        params: { symbol, walletAddress },
      },
    );
    return parseBridgeResponseOrThrow(data);
  }
}
