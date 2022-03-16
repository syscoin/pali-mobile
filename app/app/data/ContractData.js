import { ChainType } from 'gopocket-core';
import Engine from '../core/Engine';
import {
	callSqlite,
	isMainnetArb,
	isMainnetAvax,
	isMainnetBsc,
	isMainnetEthereum,
	isMainnetHeco,
	isMainnetOp,
	isMainnetPolygon,
	isMainnetTron
} from '../util/ControllerUtils';

export async function getContractMap(type) {
	if (type === ChainType.Polygon) {
		if (!isMainnetPolygon()) {
			return [];
		}
	} else if (type === ChainType.Bsc) {
		if (!isMainnetBsc()) {
			return [];
		}
	} else if (type === ChainType.Arbitrum) {
		if (!isMainnetArb()) {
			return [];
		}
	} else if (type === ChainType.Ethereum) {
		if (!isMainnetEthereum()) {
			return [];
		}
	} else if (type === ChainType.Heco) {
		if (!isMainnetHeco()) {
			return [];
		}
	} else if (type === ChainType.Tron) {
		if (!isMainnetTron()) {
			return [];
		}
	} else if (type === ChainType.Optimism) {
		if (!isMainnetOp()) {
			return [];
		}
	} else if (type === ChainType.Avax) {
		if (!isMainnetAvax()) {
			return [];
		}
	}

	const tokens = await callSqlite('getStaticTokens', type);
	return tokens || [];
}

export async function getQueryId(type, nativeCurrency, address) {
	const { PolygonNetworkController } = Engine.context;
	if (type === ChainType.Ethereum) {
		if (!isMainnetEthereum()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'ethereum';
		}
	} else if (type === ChainType.Polygon) {
		if (!isMainnetPolygon()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'matic-network';
		}
		if (address) {
			const { MaticWETH } = await PolygonNetworkController.polygonNetworkConfig(
				PolygonNetworkController.state.provider.chainId
			);
			if (address?.toLowerCase() === MaticWETH?.toLowerCase()) {
				return 'ethereum';
			}
		}
	} else if (type === ChainType.Bsc) {
		if (!isMainnetBsc()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'wbnb';
		}
	} else if (type === ChainType.Arbitrum) {
		if (!isMainnetArb()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'ethereum';
		}
	} else if (type === ChainType.Heco) {
		if (!isMainnetHeco()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'huobi-token';
		}
	} else if (type === ChainType.Optimism) {
		if (!isMainnetOp()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'ethereum';
		}
	} else if (type === ChainType.Avax) {
		if (!isMainnetAvax()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'avalanche-2';
		}
	}
	if (address) {
		const token = await callSqlite('getStaticToken', type, address);
		return token?.coin_id;
	}
	return undefined;
}
