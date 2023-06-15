import { ChainType, NetworkConfig, Sqlite } from 'paiwallet-core';
import Engine from '../core/Engine';
import EngineImpl from '../core/EngineImpl';
import NativeThreads from '../threads/NativeThreads';

export function EngineContext() {
	return Engine?.context || EngineImpl?.context;
}

export function EngineNetworks() {
	return Engine?.networks || EngineImpl?.networks;
}

export function EngineContracts() {
	return Engine?.contracts || EngineImpl?.contracts;
}

export function getRpcNickname(chainType: number) {
	return EngineNetworks()[ChainType.RPCBase].state.networks?.[chainType]?.provider?.nickname;
}

export function getRpcProviderChainId(chainType) {
	return EngineNetworks()[ChainType.RPCBase].state.networks?.[chainType]?.provider?.chainId;
}

export function getRpcProviderTicker(chainType: number) {
	return EngineNetworks()[ChainType.RPCBase].state.networks[chainType]?.provider?.ticker;
}

export function isRpcChainId(chainId: string) {
	if (!chainId) {
		return false;
	}
	chainId = String(chainId);
	const networks = EngineNetworks()[ChainType.RPCBase].state.networks;
	if (!networks) {
		return false;
	}
	for (const type in networks) {
		if (chainId === networks[type]?.provider?.chainId) {
			return true;
		}
	}
	return false;
}

export function getRpcChainTypeByChainId(chainId) {
	if (!chainId) {
		return null;
	}
	chainId = String(chainId);
	const networks = EngineNetworks()[ChainType.RPCBase].state.networks;
	if (!networks) {
		return false;
	}
	for (const type in networks) {
		if (chainId === networks[type]?.provider?.chainId) {
			return Number(type);
		}
	}
	return null;
}

export function getRpcProviderExplorerUrl(chainType: number) {
	return EngineNetworks()[ChainType.RPCBase].state.networks?.[chainType]?.explorerUrl;
}

export function isMainnetChain(chainType) {
	if (!EngineNetworks()[chainType]) {
		return false;
	}
	return EngineNetworks()[chainType]?.state.provider?.chainId === NetworkConfig[chainType]?.MainChainId;
}

export function isMainnetByChainType(chainType, chainId) {
	return NetworkConfig[chainType]?.MainChainId === chainId?.toString();
}

export function getNetworkConfig(chainType: ChainType, chainId: string) {
	const networkConfig = NetworkConfig[chainType].Networks;
	for (const i in networkConfig) {
		if (networkConfig[i].provider.chainId === chainId) {
			return networkConfig[i];
		}
	}
	return {};
}

export async function callSqlite(method, ...args) {
	if (EngineImpl?.context) {
		return Sqlite.getInstance()[method]?.(...args);
	} else {
		return NativeThreads.get().callSqliteAsync(method, ...args);
	}
}

export function getAllChainId(state) {
	const allChainId = {};
	const networks = EngineNetworks();
	for (const type in networks) {
		const chainType = Number(type);
		if (chainType === ChainType.RPCBase) {
			continue;
		}
		allChainId[chainType] = state.engine.backgroundState[networks[chainType].name].provider.chainId;
	}
	return allChainId;
}

export function getAllChainIdArray(state) {
	const allChainId = [];
	const networks = EngineNetworks();
	for (const type in networks) {
		const chainType = Number(type);
		if (chainType === ChainType.RPCBase) {
			continue;
		}
		allChainId.push(state.engine.backgroundState[networks[chainType].name].provider.chainId);
	}
	return allChainId;
}

export function getAllProvider(state) {
	const allProvider = {};
	const networks = EngineNetworks();
	for (const type in networks) {
		const chainType = Number(type);
		if (chainType === ChainType.RPCBase) {
			continue;
		}
		allProvider[chainType] = state.engine.backgroundState[networks[chainType].name].provider;
	}
	return allProvider;
}
