import { ChainType } from 'gopocket-core';
import { strings } from '../../locales/i18n';
import { RPC } from '../constants/network';

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
	require('../images/ic_card_more_other.png')
];
export const ChainTypeBg = [
	require('../images/img_card_all.png'),
	require('../images/img_card_eth.png'),
	require('../images/img_card_polygon.png'),
	require('../images/img_card_arb.png'),
	require('../images/img_card_bsc.png'),
	require('../images/img_card_heco.png'),
	require('../images/img_card_op.png'),
	require('../images/img_card_avax.png'),
	require('../images/img_card_syscoin.png'),
	require('../images/img_card_other.png')
];
export const ChainTypeBgWithoutShadows = [
	require('../images/img_card_all_nsd.png'),
	require('../images/img_card_eth_nsd.png'),
	require('../images/img_card_polygon_nsd.png'),
	require('../images/img_card_arb_nsd.png'),
	require('../images/img_card_bsc_nsd.png'),
	require('../images/img_card_heco_nsd.png'),
	require('../images/img_card_op_nsd.png'),
	require('../images/img_card_avax_nsd.png'),
	require('../images/img_card_syscoin_nsd.png'),
	require('../images/img_card_other_nsd.png')
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
