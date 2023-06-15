import { ChainType, util } from 'paiwallet-core';
import { strings } from '../../locales/i18n';
import { RPC } from './networks';
import { getIcTagResource, getTagColor } from './rpcUtil';
import { getRpcNickname } from './ControllerUtils';

export const ChainTypes = [
	ChainType.All,
	ChainType.Ethereum,
	ChainType.Polygon,
	ChainType.Arbitrum,
	ChainType.Bsc,
	ChainType.Heco,
	ChainType.Optimism,
	ChainType.Avax,
	ChainType.Syscoin,
	ChainType.Rollux,
	ChainType.RPCBase
];
export const ChainTypeNames = [
	strings('wallet.all_network'),
	strings('wallet.eth_etwork'),
	strings('wallet.polygon_network'),
	strings('wallet.arbitrum_network'),
	strings('wallet.bsc_network'),
	strings('wallet.heco_network'),
	strings('wallet.optimism_network'),
	strings('wallet.avalanche_network'),
	strings('wallet.syscoin_network'),
	strings('wallet.rollux_network'),
	RPC
];
export const ChainTypeIcons = [
	require('../images/ic_card_all.png'),
	require('../images/ic_card_eth.png'),
	require('../images/ic_card_polygon.png'),
	require('../images/ic_card_arb.png'),
	require('../images/ic_card_bsc.png'),
	require('../images/ic_card_heco.png'),
	require('../images/ic_card_op.png'),
	require('../images/ic_card_avax.png'),
	require('../images/ic_card_syscoin.png'),
	require('../images/ic_card_rollux.png'),
	require('../images/ic_card_other.png')
];
export const ChainTypeMoreIcons = [
	require('../images/ic_card_more_eth.png'), //随意加一个，不使用
	require('../images/ic_card_more_eth.png'),
	require('../images/ic_card_more_polygon.png'),
	require('../images/ic_card_more_arb.png'),
	require('../images/ic_card_more_bsc.png'),
	require('../images/ic_card_more_heco.png'),
	require('../images/ic_card_more_op.png'),
	require('../images/ic_card_more_avax.png'),
	require('../images/ic_card_more_syscoin.png'),
	require('../images/ic_card_more_rollux.png'),
	require('../images/ic_card_more_other.png')
];
export const ChainTypeBg = [
	require('../images/pali-bg.png'),
	require('../images/ethereum-bg.png'),
	require('../images/polygon-bg.png'),
	require('../images/arbitrum-bg.png'),
	require('../images/bnb-bg.png'),
	require('../images/pali-bg.png'),
	require('../images/pali-bg.png'),
	require('../images/avalanche-bg.png'),
	require('../images/syscoin-bg.png'),
	require('../images/rollux-bg.png'),
	require('../images/pali-bg.png')
];

export const ChainTypeBgWithoutShadows = [
	require('../images/pali-bg.png'),
	require('../images/ethereum-bg.png'),
	require('../images/polygon-bg.png'),
	require('../images/arbitrum-bg.png'),
	require('../images/bnb-bg.png'),
	require('../images/pali-bg.png'),
	require('../images/pali-bg.png'),
	require('../images/avalanche-bg.png'),
	require('../images/syscoin-bg.png'),
	require('../images/rollux-bg.png'),
	require('../images/pali-bg.png')
];
export const ChainTypeCheckColorStyle = [
	{ color: '#DBAAF5' },
	{ color: '#FAC6B7' },
	{ color: '#703CD3' },
	{ color: '#24516B' },
	{ color: '#DFBB00' },
	{ color: '#17A878' },
	{ color: '#A5212F' },
	{ color: '#2D374F' },
	{ color: '#030363' },
	{ color: '#9D7DF8' }
];
export const ChainTypeBgOngoing = [
	require('../images/img_ongoing_eth.png'),
	require('../images/img_ongoing_eth.png'),
	require('../images/img_ongoing_polygon.png'),
	require('../images/img_ongoing_arb.png'),
	require('../images/img_ongoing_bsc.png'),
	require('../images/img_ongoing_heco.png'),
	require('../images/img_ongoing_op.png'),
	require('../images/img_ongoing_avax.png'),
	require('../images/img_ongoing_syscoin.png'),
	require('../images/img_ongoing_rollux.png'),
	require('../images/img_ongoing_other.png')
];
export const ChainTypeBgDefi = [
	require('../images/ic_defi_eth.png'),
	require('../images/ic_defi_eth.png'),
	require('../images/ic_defi_polygon.png'),
	require('../images/ic_defi_arb.png'),
	require('../images/ic_defi_bsc.png'),
	require('../images/ic_defi_heco.png'),
	require('../images/ic_defi_op.png'),
	require('../images/ic_defi_avax.png'),
	require('../images/ic_defi_syscoin.png'),
	require('../images/ic_defi_rollux.png'),
	require('../images/letter/ic_defi_other.png')
];
export function getAssetNetworkBarColor(type) {
	return type === ChainType.Bsc
		? '#FEBF27'
		: type === ChainType.Polygon
		? '#8247E5'
		: type === ChainType.Arbitrum
		? '#23A1F0'
		: type === ChainType.Heco
		? '#47A150'
		: type === ChainType.Optimism
		? '#FF0420'
		: type === ChainType.Avax
		? '#000000'
		: type === ChainType.Syscoin
		? '#1F5EFF'
		: type === ChainType.Rollux
		? '#000000'
		: util.isRpcChainType(type)
		? getTagColor(type)
		: '#627EEA';
}
export function getShareImage(type) {
	if (type === ChainType.Polygon) {
		return require('../images/ic_share_polygon.png');
	} else if (type === ChainType.Bsc) {
		return require('../images/ic_share_bsc.png');
	} else if (type === ChainType.Arbitrum) {
		return require('../images/ic_share_arb.png');
	} else if (type === ChainType.Heco) {
		return require('../images/ic_share_heco.png');
	} else if (type === ChainType.Optimism) {
		return require('../images/ic_share_op.png');
	} else if (type === ChainType.Avax) {
		return require('../images/ic_share_avax.png');
	} else if (type === ChainType.Syscoin) {
		return require('../images/ic_share_syscoin.png');
	} else if (type === ChainType.Rollux) {
		return require('../images/ic_share_rollux.png');
	}
	return require('../images/ic_share_eth.png');
}
export function getIcTagByChainType(type) {
	return type === ChainType.Bsc
		? require('../images/ic_bsc_tag.png')
		: type === ChainType.Polygon
		? require('../images/ic_polygon_tag.png')
		: type === ChainType.Arbitrum
		? require('../images/ic_arb_tag.png')
		: type === ChainType.Heco
		? require('../images/ic_heco_tag.png')
		: type === ChainType.Optimism
		? require('../images/ic_op_tag.png')
		: type === ChainType.Avax
		? require('../images/ic_avax_tag.png')
		: type === ChainType.Syscoin
		? require('../images/ic_syscoin_tag.png')
		: type === ChainType.Rollux
		? require('../images/ic_rollux_tag.png')
		: util.isRpcChainType(type)
		? getIcTagResource(type)
		: require('../images/ic_eth_tag.png');
}
export function getTabIcon(type) {
	if (type === ChainType.Polygon) {
		return require('../images/ic_tab_polygon.png');
	} else if (type === ChainType.Bsc) {
		return require('../images/ic_tab_bsc.png');
	} else if (type === ChainType.Arbitrum) {
		return require('../images/ic_tab_arb.png');
	} else if (type === ChainType.Heco) {
		return require('../images/ic_tab_heco.png');
	} else if (type === ChainType.Optimism) {
		return require('../images/ic_tab_op.png');
	} else if (type === ChainType.Avax) {
		return require('../images/ic_tab_avax.png');
	} else if (type === ChainType.Syscoin) {
		return require('../images/ic_tab_syscoin.png');
	} else if (type === ChainType.Rollux) {
		return require('../images/ic_tab_rollux.png');
	}

	return require('../images/ic_tab_eth.png');
}
export const getChainTypeName = type => {
	if (type === ChainType.Bsc) {
		return strings('other.bsc');
	} else if (type === ChainType.Polygon) {
		return strings('other.polygon');
	} else if (type === ChainType.Arbitrum) {
		return strings('other.arbitrum');
	} else if (type === ChainType.Tron) {
		return strings('other.tron');
	} else if (type === ChainType.Heco) {
		return strings('other.heco');
	} else if (type === ChainType.Optimism) {
		return strings('other.optimism');
	} else if (type === ChainType.Avax) {
		return strings('other.avalanche');
	} else if (type === ChainType.Syscoin) {
		return strings('other.syscoin');
	} else if (type === ChainType.Rollux) {
		return strings('other.rollux');
	} else if (util.isRpcChainType(type)) {
		return getRpcNickname(type) || RPC;
	}
	return strings('other.ethereum');
};
export const getDeveloperTitle = type => {
	if (type === ChainType.Bsc) {
		return strings('developer_options.bsc_network');
	} else if (type === ChainType.Polygon) {
		return strings('developer_options.polygon_network');
	} else if (type === ChainType.Arbitrum) {
		return strings('developer_options.arbitrum_network');
	} else if (type === ChainType.Tron) {
		return strings('developer_options.tron_network');
	} else if (type === ChainType.Heco) {
		return strings('developer_options.heco_network');
	} else if (type === ChainType.Optimism) {
		return strings('developer_options.optimism_network');
	} else if (type === ChainType.Avax) {
		return strings('developer_options.avax_network');
	} else if (type === ChainType.Syscoin) {
		return strings('developer_options.syscoin_network');
	} else if (type === ChainType.Rollux) {
		return strings('developer_options.rollux_network');
	}
	return strings('developer_options.ethereum_network');
};
export const ChainTypeSettingsItems = [
	{
		text: strings('wallet.eth_etwork'),
		icon: require('../images/img_asset_eth.png'),
		chainType: ChainType.Ethereum
	},
	{
		text: strings('wallet.polygon_network'),
		icon: require('../images/img_asset_polygon.png'),
		chainType: ChainType.Polygon
	},
	{
		text: strings('wallet.arbitrum_network'),
		icon: require('../images/img_asset_arb.png'),
		chainType: ChainType.Arbitrum
	},
	{
		text: strings('wallet.bsc_network'),
		icon: require('../images/img_asset_bsc.png'),
		chainType: ChainType.Bsc
	},
	{
		text: strings('wallet.heco_network'),
		icon: require('../images/img_asset_heco.png'),
		chainType: ChainType.Heco
	},
	{
		text: strings('wallet.optimism_network'),
		icon: require('../images/img_asset_op.png'),
		chainType: ChainType.Optimism
	},
	{
		text: strings('wallet.avalanche_network'),
		icon: require('../images/img_asset_avax.png'),
		chainType: ChainType.Avax
	},
	{
		text: strings('wallet.syscoin_network'),
		icon: require('../images/img_asset_syscoin.png'),
		chainType: ChainType.Syscoin
	},
	{
		text: strings('wallet.rollux_network'),
		icon: require('../images/img_asset_rollux.png'),
		chainType: ChainType.Rollux
	}
];
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
	if (chain === 9) {
		return ChainType.Syscoin;
	}
	if (chain === 10) {
		return ChainType.Rollux;
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
	if (chainType === ChainType.Syscoin) {
		return 9;
	}
	if (chainType === ChainType.Rollux) {
		return 10;
	}

	return chainType;
};
