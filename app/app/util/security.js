import { strings } from '../../locales/i18n';
import { EngineContext } from './ControllerUtils';
import { toLowerCaseEquals } from './general';
import { getChainIdByType } from './number';

const ASSET_TYPES = {
	SYSCOIN: 256,
	ROLLUX: 512
};

const secureAddresses = {
	[ASSET_TYPES.SYSCOIN]: [
		'0x7C598c96D02398d89FbCb9d41Eab3DF0C16F227D',
		'0x2bF9b864cdc97b08B6D79ad4663e71B8aB65c45c',
		'0xE18c200A70908c89fFA18C628fE1B83aC0065EA4',
		'0xd3e822f3ef011Ca5f17D82C956D952D8d7C3A1BB',
		'0x6b7a87899490EcE95443e979cA9485CBE7E71522'
	],
	[ASSET_TYPES.ROLLUX]: [
		'0xaA1c53AFd099E415208F47FCFA2C880f659E6904',
		'0x6AaEE51366F8435e1Ad527F5Ecdc276bF1dc0b86',
		'0x368433CaC2A0B8D76E64681a9835502a1f2A8A30',
		'0x28c9c7Fb3fE3104d2116Af26cC8eF7905547349c',
		'0x48023b16c3e81AA7F6eFFbdEB35Bb83f4f31a8fd',
		'0x4200000000000000000000000000000000000006'
	]
};

export function isSecureAddress(asset) {
	const addressesForType = secureAddresses[asset.type];
	return addressesForType && addressesForType.includes(asset.address);
}

export const key2Warn = key => {
	if (key === 'is_open_source') {
		return strings('security.not_open_source');
	} else if (key === 'is_proxy') {
		return strings('security.proxy_contract');
	} else if (key === 'is_mintable') {
		return strings('security.mintable');
	} else if (key === 'slippage_modifiable') {
		return strings('security.mutable_tax');
	} else if (key === 'is_honeypot') {
		return strings('security.unable_to_sell');
	} else if (key === 'transfer_pausable') {
		return strings('security.pausable_trading');
	} else if (key === 'is_blacklisted') {
		return strings('security.blacklist');
	} else if (key === 'is_whitelisted') {
		return strings('security.whitelist');
	} else if (key === 'is_in_dex') {
		return strings('security.no_in_dex');
	} else if (key === 'is_true_token') {
		return strings('security.counterfeit_token');
	} else if (key === 'is_airdrop_scam') {
		return strings('security.airdrop_scam');
	}
	return '';
};

export const key2WarnDesc = key => {
	if (key === 'is_open_source') {
		return strings('security.open_source_desc');
	} else if (key === 'is_proxy') {
		return strings('security.no_proxy_contract_desc');
	} else if (key === 'is_mintable') {
		return strings('security.total_supply_desc');
	} else if (key === 'slippage_modifiable') {
		return strings('security.trading_tax_desc');
	} else if (key === 'is_honeypot') {
		return strings('security.able_to_sell_desc');
	} else if (key === 'transfer_pausable') {
		return strings('security.unpausable_trading_desc');
	} else if (key === 'is_blacklisted') {
		return strings('security.no_blacklist_desc');
	} else if (key === 'is_whitelisted') {
		return strings('security.no_whitelist_desc');
	} else if (key === 'is_in_dex') {
		return strings('security.no_in_dex_desc');
	} else if (key === 'is_true_token') {
		return strings('security.counterfeit_token_desc');
	} else if (key === 'is_airdrop_scam') {
		return strings('security.airdrop_scam_desc');
	}
	return '';
};

export const getSecurityData = asset => {
	if (!asset) {
		return {};
	}
	if (asset.securityData) {
		const { normal, notice, risk } = asset.securityData;
		const normalLength = normal ? normal.length : 0;
		const noticeLength = notice ? notice.length : 0;
		const riskLength = risk ? risk.length : 0;
		if (normalLength !== 0 || noticeLength !== 0 || riskLength !== 0) {
			return asset.securityData;
		}
	}
	const securityTokens = EngineContext().SecurityController.state.securityTokens || [];
	const findData = securityTokens.find(
		token => toLowerCaseEquals(token.address, asset.address) && getChainIdByType(asset.type) === token.chainId
	);
	return findData || {};
};
