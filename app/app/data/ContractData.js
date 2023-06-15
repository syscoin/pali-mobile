import { ChainType, NetworkConfig, toChecksumAddress, util } from 'paiwallet-core';
import Engine from '../core/Engine';
import { callSqlite, isMainnetChain } from '../util/ControllerUtils';

export async function queryContractMap(types, query, needFuse, fuseCount) {
	if (!types?.length || !query) {
		return { queryAddress: [], querySymbol: [] };
	}
	const validTypes = types?.filter(type => {
		if (util.isRpcChainType(type)) {
			return false;
		}
		if (isMainnetChain(type)) {
			return true;
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
	if (!isMainnetChain(type)) {
		return undefined;
	}
	if (nativeCurrency) {
		return NetworkConfig[type]?.CoingeckoId;
	}
	if (type === ChainType.Polygon) {
		if (address) {
			const polygonNetwork = Engine.networks[ChainType.Polygon];
			const { MaticWETH } = await polygonNetwork.getNetworkConfig(polygonNetwork.state.provider.chainId);
			if (address?.toLowerCase() === MaticWETH?.toLowerCase()) {
				return NetworkConfig[ChainType.Ethereum]?.CoingeckoId;
			}
		}
	}
	if (address) {
		const token = await callSqlite('getStaticToken', type, address);
		return token?.coin_id;
	}
	return undefined;
}
