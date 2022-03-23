import { ChainType, toChecksumAddress } from 'gopocket-core';
import Engine from '../core/Engine';
import {
	callSqlite,
	isMainnetArb,
	isMainnetAvax,
	isMainnetSyscoin,
	isMainnetBsc,
	isMainnetEthereum,
	isMainnetHeco,
	isMainnetOp,
	isMainnetPolygon,
	isMainnetTron
} from '../util/ControllerUtils';

export async function queryContractMap(types, query, needFuse, fuseCount) {
	if (!types?.length || !query) {
		return { queryAddress: [], querySymbol: [] };
	}
	const validTypes = types?.filter(type => {
		if (type === ChainType.Polygon) {
			if (isMainnetPolygon()) {
				return true;
			}
		} else if (type === ChainType.Bsc) {
			if (isMainnetBsc()) {
				return true;
			}
		} else if (type === ChainType.Arbitrum) {
			if (isMainnetArb()) {
				return true;
			}
		} else if (type === ChainType.Ethereum) {
			if (isMainnetEthereum()) {
				return true;
			}
		} else if (type === ChainType.Heco) {
			if (isMainnetHeco()) {
				return true;
			}
		} else if (type === ChainType.Tron) {
			if (isMainnetTron()) {
				return true;
			}
		} else if (type === ChainType.Optimism) {
			if (isMainnetOp()) {
				return true;
			}
		} else if (type === ChainType.Avax) {
			if (isMainnetAvax()) {
				return true;
			}
		} else if (type === ChainType.Syscoin) {
			if (isMainnetSyscoin()) {
				return true;
			}
		}
		return false;
	});

	if (!validTypes?.length) {
		return { queryAddress: [], querySymbol: [] };
	}

	let { queryAddress, querySymbol } = await callSqlite('findStaticToken', validTypes, query, needFuse, fuseCount);
	if (queryAddress) {
		queryAddress = queryAddress.map(token => {
			return {
				...token,
				type: token.chain_type,
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
				type: token.chain_type,
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
	} else if (type === ChainType.Syscoin) {
		if (!isMainnetSyscoin()) {
			return undefined;
		}
		if (nativeCurrency) {
			return 'syscoin';
		}
	}
	if (address) {
		const token = await callSqlite('getStaticToken', type, address);
		return token?.coin_id;
	}
	return undefined;
}
