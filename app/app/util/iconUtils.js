import { ChainType, util } from 'gopocket-core';
import { getIcTagResource } from './rpcUtil';

// eslint-disable-next-line import/prefer-default-export
export function getIcTagByChainType(type) {
	return type === ChainType.Ethereum
		? require('../images/ic_eth_tag.png')
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
		: util.isRpcChainType(type)
		? getIcTagResource(type)
		: require('../images/ic_bsc_tag.png');
}
