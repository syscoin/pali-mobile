import { BigNumber, utils as EthersUtils } from 'ethers';
import * as axios from 'axios';
import { BigNumber as BignumberJs } from 'bignumber.js';
import { BN, toChecksumAddress, stripHexPrefix, isValidAddress, addHexPrefix, isZeroAddress } from 'ethereumjs-util';
import * as EthjsUnit from 'ethjs-unit';
import * as RNFS from 'react-native-fs';
import { wordlists } from 'bip39';
import { Mutex } from 'async-mutex';
import URL from 'url-parse';
import * as ArbConfig from './ArbConfig.json';
import * as util from './util';
import Fuse from 'fuse.js';

export * from './approval/ApprovalEventsController';
export * from './assets/AssetsContractController';
export * from './assets/ArbContractController';
export * from './assets/OpContractController';
export * from './assets/BscContractController';
export * from './assets/PolygonContractController';
export * from './assets/TronContractController';
export * from './assets/HecoContractController';
export * from './assets/AvaxContractController';
export * from './assets/RpcContractController';
export * from './assets/AssetsController';
export * from './assets/AssetsDetectionController';
export * from './BaseController';
export * from './ComposableController';
export * from './keyring/KeyringController';
export * from './message-manager/MessageManager';
export * from './network/NetworkController';
export * from './network/ArbNetworkController';
export * from './network/OpNetworkController';
export * from './network/BscNetworkController';
export * from './network/PolygonNetworkController';
export * from './network/TronNetworkController';
export * from './network/HecoNetworkController';
export * from './network/AvaxNetworkController';
export * from './network/RpcNetworkController';
export * from './user/PreferencesController';
export * from './assets/TokenBalancesController';
export * from './assets/TokenRatesController';
export * from './transaction/TransactionController';
export * from './message-manager/PersonalMessageManager';
export * from './message-manager/TypedMessageManager';
export * from './binance/BscBridgeController';
export * from './security/SecurityController';
export * from './invite/InviteController';
export * from './assets/CollectiblesController';
export * from './assets/AssetsDataModel';
export * from './user/EnsController';
export * from './transaction/Sqlite';
export * from './assets/DefiProtocolController';
export * from './assets/StaticTokenController';

// ethers
export { BigNumber, EthersUtils };

export { util, axios, BignumberJs, EthjsUnit, RNFS, wordlists, Mutex, URL, Fuse };
// ethereumjs-util
export { BN, toChecksumAddress, stripHexPrefix, isValidAddress, addHexPrefix, isZeroAddress };

export { ArbConfig };
