import { ChainType, util } from 'gopocket-core';
import Engine from '../core/Engine';
import { callSqlite, getRpcProviderChainId } from './ControllerUtils';

export const CLIENT_OPTIONS = {
	clientMeta: {
		// Required
		description: 'GoPocket Mobile app',
		url: 'https://gopocket.finance/',
		icons: ['https://gopocket.finance/images/index/main_title.png'],
		name: 'GoPocket',
		ssl: true
	}
};

export const WALLET_CONNECT_ORIGIN = 'wc::';

export const matchDefaultChainType = (_url, _hostname, defaultChainTypes) => {
	for (const key in defaultChainTypes) {
		if (!key.includes('|||')) {
			if (_hostname && _hostname.endsWith(key)) {
				return { found: true, chain_type: defaultChainTypes[key] };
			}
			continue;
		}
		const keys = key.split('|||');
		if (keys && keys.length === 2) {
			if (_hostname && _hostname.endsWith(keys[0])) {
				if (_url && _url.includes(keys[1])) {
					return { found: true, chain_type: defaultChainTypes[key] };
				}
			}
		}
	}
	return { found: false, chain_type: ChainType.Ethereum };
};

export const matchUserSelectedChainType = async _hostname => {
	const chain_type = await callSqlite('getUserSelectedChainType', _hostname);
	if (chain_type) {
		return { found: true, chain_type };
	}
	return { found: false, chain_type: ChainType.Ethereum };
};

export const chainToChainType = chain => {
	if (chain === 1) {
		return ChainType.Ethereum;
	}
	if (chain === 2) {
		return ChainType.Bsc;
	}
	if (chain === 3) {
		return ChainType.Polygon;
	}
	if (chain === 4) {
		return ChainType.Arbitrum;
	}
	if (chain === 6) {
		return ChainType.Heco;
	}
	if (chain === 7) {
		return ChainType.Optimism;
	}
	if (chain === 8) {
		return ChainType.Avax;
	}
	return chain;
};

export const chainTypeTochain = chainType => {
	if (chainType === ChainType.Ethereum) {
		return 1;
	}
	if (chainType === ChainType.Bsc) {
		return 2;
	}
	if (chainType === ChainType.Polygon) {
		return 3;
	}
	if (chainType === ChainType.Arbitrum) {
		return 4;
	}
	if (chainType === ChainType.Heco) {
		return 6;
	}
	if (chainType === ChainType.Optimism) {
		return 7;
	}
	if (chainType === ChainType.Avax) {
		return 8;
	}
	return chainType;
};

export const matchWhitelistDapps = async _hostname => {
	const dapp = await callSqlite('getWhitelistDapp', _hostname);
	if (dapp && dapp.chain) {
		return { found: true, chain_type: chainToChainType(dapp.chain) };
	}
	return { found: false, chain_type: ChainType.Ethereum };
};

export const getChainId = chainType => {
	if (chainType === ChainType.Ethereum) {
		return Engine.context.NetworkController.state.provider.chainId;
	}
	if (chainType === ChainType.Arbitrum) {
		return Engine.context.ArbNetworkController.state.provider.chainId;
	}
	if (chainType === ChainType.Bsc) {
		return Engine.context.BscNetworkController.state.provider.chainId;
	}
	if (chainType === ChainType.Heco) {
		return Engine.context.HecoNetworkController.state.provider.chainId;
	}
	if (chainType === ChainType.Optimism) {
		return Engine.context.OpNetworkController.state.provider.chainId;
	}
	if (chainType === ChainType.Avax) {
		return Engine.context.AvaxNetworkController.state.provider.chainId;
	}
	if (util.isRpcChainType(chainType)) {
		return getRpcProviderChainId(chainType);
	}
	return Engine.context.PolygonNetworkController.state.provider.chainId;
};
