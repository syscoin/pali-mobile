import { ArbConfig } from 'gopocket-core';
import Engine from '../core/Engine';
import EngineImpl from '../core/EngineImpl';

export function arbNetworkConfig(chainId: string) {
	const arbConfig: { [index: string]: any } = ArbConfig;
	for (const i in arbConfig) {
		if (arbConfig[i].provider.chainId === chainId) {
			return arbConfig[i];
		}
	}
	return {};
}

export function arbNetworkConfigByType(type: string) {
	const arbConfig: { [index: string]: any } = ArbConfig;
	return arbConfig[type];
}

export function EngineContext() {
	return Engine?.context || EngineImpl?.context;
}

export function getRpcNickname(chainType: number) {
	return EngineContext().RpcNetworkController.state.networks?.[chainType]?.provider?.nickname;
}

export function getRpcProviderChainId(chainType) {
	return EngineContext().RpcNetworkController.state.networks?.[chainType]?.provider?.chainId;
}

export function getRpcProviderTicker(chainType: number) {
	return EngineContext().RpcNetworkController.state.networks[chainType]?.provider?.ticker;
}

export function isRpcChainId(chainId: string) {
	if (!chainId) {
		return false;
	}
	chainId = String(chainId);
	const networks = EngineContext().RpcNetworkController.state.networks;
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
	const networks = EngineContext().RpcNetworkController.state.networks;
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
	return EngineContext().RpcNetworkController.state.networks?.[chainType]?.explorerUrl;
}

export function isMainnetPolygon() {
	return EngineContext().PolygonNetworkController.state.provider?.chainId === '137';
}

export function isMainnetBsc() {
	return EngineContext().BscNetworkController.state.provider?.chainId === '56';
}

export function isMainnetArb() {
	return EngineContext().ArbNetworkController.state.provider?.chainId === '42161';
}

export function isMainnetEthereum() {
	return EngineContext().NetworkController.state.provider?.chainId === '1';
}

export function isMainnetHeco() {
	return EngineContext().HecoNetworkController.state.provider?.chainId === '128';
}

export function isMainnetTron() {
	return EngineContext().TronNetworkController.state.provider?.chainId === '123454321';
}

export function isMainnetOp() {
	return EngineContext().OpNetworkController.state.provider?.chainId === '10';
}

export function isMainnetAvax() {
	return EngineContext().AvaxNetworkController.state.provider?.chainId === '43114';
}
