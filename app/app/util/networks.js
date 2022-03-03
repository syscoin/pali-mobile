import { colors } from '../styles/common';
import {
	MAINNET,
	ROPSTEN,
	KOVAN,
	RINKEBY,
	GOERLI,
	RPC,
	BSCMAINNET,
	BSCTESTNET,
	ArbitrumMainnet,
	ArbitrumTestnetRinkeby,
	PolygonMainnet,
	PolygonTestnet,
	TronMainnet,
	TronShastaTestnet,
	HecoMainnet,
	HecoTestnet,
	OptimismMainnet,
	OptimismTestnetKovan,
	AvaxMainnet,
	AvaxTestnet
} from '../constants/network';
import { ChainType, URL } from 'gopocket-core';
import { getRpcChainTypeByChainId } from './ControllerUtils';

/**
 * List of the supported networks
 * including name, id, and color
 *
 * This values are used in certain places like
 * navbar and the network switcher.
 */
const NetworkList = {
	[MAINNET]: {
		name: 'Ethereum Main Network',
		shortName: 'Ethereum Mainnet',
		networkId: 1,
		chainId: 1,
		hexChainId: '0x1',
		color: '#3cc29e',
		networkType: 'mainnet'
	},
	[ROPSTEN]: {
		name: 'Ropsten Test Network',
		shortName: 'Ropsten',
		networkId: 3,
		chainId: 3,
		hexChainId: '0x3',
		color: '#ff4a8d',
		networkType: 'ropsten'
	},
	[KOVAN]: {
		name: 'Kovan Test Network',
		shortName: 'Kovan',
		networkId: 42,
		chainId: 42,
		hexChainId: '0x2a',
		color: '#7057ff',
		networkType: 'kovan'
	},
	[RINKEBY]: {
		name: 'Rinkeby Test Network',
		shortName: 'Rinkeby',
		networkId: 4,
		chainId: 4,
		hexChainId: '0x4',
		color: '#f6c343',
		networkType: 'rinkeby'
	},
	[GOERLI]: {
		name: 'Goerli Test Network',
		shortName: 'Goerli',
		networkId: 5,
		chainId: 5,
		hexChainId: '0x5',
		color: '#3099f2',
		networkType: 'goerly'
	},
	[RPC]: {
		name: 'Private Network',
		shortName: 'Private',
		color: colors.grey000,
		networkType: 'rpc'
	}
};

export const BscNetworks = {
	[BSCMAINNET]: {
		name: 'BSC Mainnet',
		shortName: 'BSC Mainnet ',
		networkId: 56,
		chainId: 56,
		hexChainId: '0x6',
		color: '#FEBF27',
		networkType: 'BSC Mainnet'
	},
	[BSCTESTNET]: {
		name: 'BSC Testnet',
		shortName: 'BSC Testnet',
		networkId: 97,
		chainId: 97,
		hexChainId: '0x7',
		color: '#FEBF27',
		networkType: 'BSC Testnet'
	}
};

export const ArbNetworks = {
	[ArbitrumMainnet]: {
		name: 'Arbitrum Mainnet',
		shortName: 'Arbitrum Mainnet',
		networkId: 42161,
		chainId: 42161,
		hexChainId: '0x9',
		color: '#23A1F0',
		networkType: ArbitrumMainnet
	},
	[ArbitrumTestnetRinkeby]: {
		name: 'Arbitrum Testnet for Rinkeby',
		shortName: 'Arbitrum Testnet for Rinkeby',
		networkId: 421611,
		chainId: 421611,
		hexChainId: '0x9',
		color: '#23A1F0',
		networkType: ArbitrumTestnetRinkeby
	}
};

export const OpNetworks = {
	[OptimismMainnet]: {
		name: OptimismMainnet,
		shortName: OptimismMainnet,
		networkId: 10,
		chainId: 10,
		hexChainId: '0x9',
		color: '#FF0420',
		networkType: OptimismMainnet
	},
	[OptimismTestnetKovan]: {
		name: OptimismTestnetKovan,
		shortName: OptimismTestnetKovan,
		networkId: 69,
		chainId: 69,
		hexChainId: '0x9',
		color: '#FF0420',
		networkType: OptimismTestnetKovan
	}
};

export const PolygonNetworks = {
	[PolygonMainnet]: {
		name: 'Polygon Mainnet',
		shortName: 'Polygon Mainnet',
		networkId: 137,
		chainId: 137,
		hexChainId: '0xa',
		color: '#8247E5',
		networkType: 'Polygon Mainnet'
	},
	[PolygonTestnet]: {
		name: 'Polygon Testnet',
		shortName: 'Polygon Testnet',
		networkId: 80001,
		chainId: 80001,
		hexChainId: '0xb',
		color: '#8247E5',
		networkType: 'Polygon Testnet'
	}
};

export const TronNetworks = {
	[TronMainnet]: {
		name: 'TRON Mainnet',
		shortName: 'TRON Mainnet',
		networkId: 123454321,
		chainId: 123454321,
		hexChainId: '0xa',
		color: '#E51D1E',
		networkType: 'TRON Mainnet'
	},
	[TronShastaTestnet]: {
		name: 'TRON Shasta Testnet',
		shortName: 'TRON Shasta Testnet',
		networkId: 123454322,
		chainId: 123454322,
		hexChainId: '0xb',
		color: '#E51D1E',
		networkType: 'TRON Shasta Testnet'
	}
};

export const HecoNetworks = {
	[HecoMainnet]: {
		name: 'Heco Mainnet',
		shortName: 'Heco Mainnet',
		networkId: 128,
		chainId: 128,
		hexChainId: '0x80',
		color: '#47A150',
		networkType: 'Heco Mainnet'
	},
	[HecoTestnet]: {
		name: 'Heco Testnet',
		shortName: 'Heco Testnet',
		networkId: 256,
		chainId: 256,
		hexChainId: '0x100',
		color: '#47A150',
		networkType: 'Heco Testnet'
	}
};

export const AvaxNetworks = {
	[AvaxMainnet]: {
		name: 'Avalanche Mainnet C-Chain',
		shortName: 'Avalanche Mainnet C-Chain',
		networkId: 43114,
		chainId: 43114,
		hexChainId: '0XA86A',
		color: '#000000',
		networkType: 'Avalanche Mainnet C-Chain'
	},
	[AvaxTestnet]: {
		name: 'Avalanche FUJI C-Chain',
		shortName: 'Avalanche FUJI C-Chain',
		networkId: 43113,
		chainId: 43113,
		hexChainId: '0XA869',
		color: '#000000',
		networkType: 'Avalanche FUJI C-Chain'
	}
};

const NetworkListKeys = Object.keys(NetworkList);

const BscNetworkListKeys = Object.keys(BscNetworks);

const ArbNetworkListKeys = Object.keys(ArbNetworks);

const OpNetworkListKeys = Object.keys(OpNetworks);

const PolygonNetworkListKeys = Object.keys(PolygonNetworks);

const TronNetworkListKeys = Object.keys(TronNetworks);

const HecoNetworkListKeys = Object.keys(HecoNetworks);

const AvaxNetworkListKeys = Object.keys(AvaxNetworks);

export default NetworkList;

export const getAllNetworks = () => NetworkListKeys.filter(name => name !== RPC);

export const getBscAllNetworks = () => BscNetworkListKeys;

export const getArbAllNetworks = () => ArbNetworkListKeys;

export const getOpAllNetworks = () => OpNetworkListKeys;

export const getPolygonAllNetworks = () => PolygonNetworkListKeys;

export const getTronAllNetworks = () => TronNetworkListKeys;

export const getHecoAllNetworks = () => HecoNetworkListKeys;

export const getAvaxAllNetworks = () => AvaxNetworkListKeys;

export const isMainNet = network => network?.provider?.type === MAINNET || network === String(1);

export const getDecimalChainId = chainId => {
	if (!chainId || typeof chainId !== 'string' || !chainId.startsWith('0x')) {
		return chainId;
	}
	return parseInt(chainId, 16).toString(10);
};

export const isMainnetByChainId = chainId => getDecimalChainId(String(chainId)) === String(1);

export const isBSCMainnetByChainId = chainId => getDecimalChainId(String(chainId)) === String(56);

export const isHecoMainnetByChainId = chainId => getDecimalChainId(String(chainId)) === String(128);

export const isAvaxMainnetByChainId = chainId => getDecimalChainId(String(chainId)) === String(43114);

export const getNetworkName = id => NetworkListKeys.find(key => NetworkList[key].networkId === Number(id));

export function getNetworkTypeByChainId(id) {
	if (!id) {
		throw new Error('Missing chain Id');
	}
	let network = NetworkListKeys.filter(key => NetworkList[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = BscNetworkListKeys.filter(key => BscNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = PolygonNetworkListKeys.filter(key => PolygonNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = ArbNetworkListKeys.filter(key => ArbNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = OpNetworkListKeys.filter(key => OpNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = TronNetworkListKeys.filter(key => TronNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = HecoNetworkListKeys.filter(key => HecoNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	network = AvaxNetworkListKeys.filter(key => AvaxNetworks[key].chainId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}
	throw new Error(`Unknown network with chain id ${id}`);
}

export function getChainTypeByChainId(chainId) {
	if (!chainId) {
		return ChainType.Ethereum;
	}
	const chainIdInt = parseInt(chainId, 10);
	let network = BscNetworkListKeys.filter(key => BscNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Bsc;
	}
	network = PolygonNetworkListKeys.filter(key => PolygonNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Polygon;
	}
	network = ArbNetworkListKeys.filter(key => ArbNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Arbitrum;
	}
	network = OpNetworkListKeys.filter(key => OpNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Optimism;
	}
	network = TronNetworkListKeys.filter(key => TronNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Tron;
	}
	network = HecoNetworkListKeys.filter(key => HecoNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Heco;
	}
	network = AvaxNetworkListKeys.filter(key => AvaxNetworks[key].chainId === chainIdInt);
	if (network.length > 0) {
		return ChainType.Avax;
	}
	const rpcType = getRpcChainTypeByChainId(chainId);
	if (rpcType) {
		return rpcType;
	}
	return ChainType.Ethereum;
}

export function hasBlockExplorer(key) {
	return key.toLowerCase() !== RPC;
}

export function isprivateConnection(hostname) {
	return (
		hostname === 'localhost' ||
		/(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/.test(hostname)
	);
}

/**
 * From block explorer url, get rendereable name or undefined
 *
 * @param {string} blockExplorerUrl - block explorer url
 */
export function getBlockExplorerName(blockExplorerUrl) {
	if (!blockExplorerUrl) return undefined;
	const hostname = new URL(blockExplorerUrl).hostname;
	if (!hostname) return undefined;
	const tempBlockExplorerName = hostname.split('.')[0];
	if (!tempBlockExplorerName || !tempBlockExplorerName[0]) return undefined;
	return tempBlockExplorerName[0].toUpperCase() + tempBlockExplorerName.slice(1);
}

export function isPrefixedFormattedHexString(value) {
	if (typeof value !== 'string') {
		return false;
	}
	return /^0x[1-9a-f]+[0-9a-f]*$/iu.test(value);
}
