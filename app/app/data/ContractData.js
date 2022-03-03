import {
	ETH_JSON,
	BSC_JSON,
	POLYGON_JSON,
	ChainType,
	HECO_JSON,
	TRON_JSON,
	OP_JSON,
	AVAX_JSON,
	ARB_JSON
} from 'gopocket-core';
import Engine from '../core/Engine';
import {
	isMainnetArb,
	isMainnetAvax,
	isMainnetBsc,
	isMainnetEthereum,
	isMainnetHeco,
	isMainnetOp,
	isMainnetPolygon,
	isMainnetTron
} from '../util/ControllerUtils';

// eslint-disable-next-line import/prefer-default-export
export function getContractMap(type) {
	if (type === ChainType.Polygon) {
		if (isMainnetPolygon()) {
			return POLYGON_JSON;
		}
	} else if (type === ChainType.Bsc) {
		if (isMainnetBsc()) {
			return BSC_JSON;
		}
	} else if (type === ChainType.Arbitrum) {
		if (isMainnetArb()) {
			return ARB_JSON;
		}
		return {};
	} else if (type === ChainType.Ethereum) {
		if (isMainnetEthereum()) {
			return ETH_JSON;
		}
	} else if (type === ChainType.Heco) {
		if (isMainnetHeco()) {
			return HECO_JSON;
		}
	} else if (type === ChainType.Tron) {
		if (isMainnetTron()) {
			return TRON_JSON;
		}
	} else if (type === ChainType.Optimism) {
		if (isMainnetOp()) {
			return OP_JSON;
		}
	} else if (type === ChainType.Avax) {
		if (isMainnetAvax()) {
			return AVAX_JSON;
		}
	}
	return {};
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
		const contractMap = getContractMap(type);
		return contractMap[address?.toLowerCase()]?.id;
	}
	return undefined;
}
