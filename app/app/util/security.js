import { strings } from '../../locales/i18n';
import { EngineContext } from './ControllerUtils';
import { toLowerCaseEquals } from './general';
import { getChainIdByType } from './number';

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
