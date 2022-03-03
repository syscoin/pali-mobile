export interface IBridgeRequest<T> {
  payload: T;
}

export interface IBridgeResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface ITokenResponse {
  name: string;
  symbol: string;
  bcSymbol: string;
  ethSymbol: string;
  bscSymbol: string;
  icon: string;
  minAmount: number;
  maxAmount: number;
  promotion: boolean;
  enabled: boolean;
  bscContractAddress: string;
  bscContractDecimal: number;
  ethContractAddress: string;
  ethContractDecimal: number;
}

export interface ITokenListResponse {
  tokens: ITokenResponse[];
  total: number;
}

export interface INetworkResponse {
  name: string;
  symbol: string;
  swapFeeRate: number;
  networkFee: number;
  supportLabel: boolean;
  labelName: string;
  labelRegex: string;
  txUrl: string;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  withdrawAmountUnit: number;
  addressRegex: string;
  tokenStandard: string;
  requiresConfirms: number;
}

export interface INetworkListResponse {
  networks: INetworkResponse[];
}

export type ISwapStatus =
  | 'WaitingForDeposit'
  | 'Cancelled'
  | 'DepositInProgress'
  | 'Completed';

export interface ISwapResponse {
  id: string;
  createTime: string;
  updateTime: string;
  walletAddress: string;
  symbol: string;
  amount: number;
  fromNetwork: string;
  toNetwork: string;
  toAddress: string;
  toAddressLabel: string;
  networkFeePromoted: boolean;
  networkFee: number;
  swapFeeRate: number;
  swapFee: number;
  depositAddress: string;
  depositAddressLabel: string;
  depositAddressLabelName: string;
  depositTimeout: string;
  status: ISwapStatus;
  depositTxId: string;
  depositTxLink: string;
  depositRequiredConfirms: number;
  swapTxId: string;
  swapTxLink: string;
}

export interface IGetSwapsRequest {
  endTime?: number;
  limit?: number;
  offset?: number;
  startTime?: number;
  status?: ISwapStatus;
  symbol?: string;
  walletAddress: string;
}

export interface ISwapListResponse {
  swaps: ISwapResponse[];
  total: number;
}

export interface ICreateSwapRequest {
  amount: number;
  fromNetwork: string;
  source: number;
  symbol: string;
  toAddress: string;
  toAddressLabel: string;
  toNetwork: string;
  walletAddress: string;
  walletNetwork: string;
}

export interface ICreateSwapResponse {
  amount: number;
  createTime: string;
  depositAddress: string;
  depositAddressLabel: string;
  depositTimeout: string;
  direction: 'IN' | 'OUT';
  fromNetwork: string;
  id: string;
  networkFee: number;
  networkFeePromoted: boolean;
  status: ISwapStatus;
  swapFee: number;
  swapFeeRate: number;
  symbol: string;
  toAddress: string;
  toAddressLabel: string;
  toNetwork: string;
  walletAddress: string;
}

export interface IQuotaFor24Hour {
  left: number;
  total: number;
  used: number;
}
