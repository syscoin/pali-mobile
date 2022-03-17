import { ChainType, toChecksumAddress } from 'gopocket-core';
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

export async function queryContractMap(type, query, needFuse, fuseCount) {
	if (type === ChainType.Polygon) {
		if (!isMainnetPolygon()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Bsc) {
		if (!isMainnetBsc()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Arbitrum) {
		if (!isMainnetArb()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Ethereum) {
		if (!isMainnetEthereum()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Heco) {
		if (!isMainnetHeco()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Tron) {
		if (!isMainnetTron()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Optimism) {
		if (!isMainnetOp()) {
			return { queryAddress: [], querySymbol: [] };
		}
	} else if (type === ChainType.Avax) {
		if (!isMainnetAvax()) {
			return { queryAddress: [], querySymbol: [] };
		}
	}

	let { queryAddress, querySymbol } = await callSqlite('findStaticToken', type, query, needFuse, fuseCount);
	if (queryAddress) {
		queryAddress = queryAddress.map(token => {
			return {
				...token,
				type: type,
				logo: token.image,
				address: toChecksumAddress(token.address),
				l1Address: token.l1_address ? toChecksumAddress(token.l1_address) : undefined
			};
		});
	}
	if (querySymbol) {
		querySymbol = querySymbol.map(token => {
			return {
				...token,
				type: type,
				logo: token.image,
				address: toChecksumAddress(token.address),
				l1Address: token.l1_address ? toChecksumAddress(token.l1_address) : undefined
			};
		});
	}
	return { queryAddress, querySymbol };
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
