import { ChainType } from 'paliwallet-core';
import { callSqlite } from './ControllerUtils';
import { chainToChainType } from './ChainTypeImages';

export const CLIENT_OPTIONS = {
	clientMeta: {
		// Required
		description: 'Pali Wallet Mobile app',
		url: 'https://paliwallet.com',
		icons: ['https://pali-images.s3.amazonaws.com/files/main_title.png'],
		name: 'Pali Wallet',
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

export const matchWhitelistDapps = async _hostname => {
	const dapp = await callSqlite('getWhitelistDapp', _hostname);
	if (dapp && dapp.chain) {
		return { found: true, chain_type: chainToChainType(dapp.chain) };
	}
	return { found: false, chain_type: ChainType.Ethereum };
};
