import { ChainType } from 'gopocket-core';

//node: lowercase address
export const CBRIDGE_SUPPORT_TOKENS = {
	[ChainType.Ethereum]: {
		//MCB
		'0x4e352cf164e64adcbad318c3a1e222e9eba4ce42': [ChainType.Bsc],
		//DODO
		'0x43dfc4159d86f3a37a5a4b3d4580b888ad7d4ddd': [ChainType.Bsc],
		//USDC
		'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': [ChainType.Bsc],
		//BUSD
		'0x4fabb145d64652a948d72533023f6e7a623c7c53': [ChainType.Bsc],
		//USDT
		'0xdac17f958d2ee523a2206206994597c13d831ec7': [ChainType.Bsc],
		//ETH
		ETH: [ChainType.Bsc],
		//DOMI
		'0x45c2f8c9b4c0bdc76200448cc26c48ab6ffef83f': [ChainType.Bsc],
		//IMX(Impermax)
		'0x7b35ce522cb72e4077baeb96cb923a5529764a00': [ChainType.Polygon, ChainType.Avax, ChainType.Arbitrum],
		//LYRA
		'0x01ba67aac7f75f647d94220cc98fb30fcc5105bf': [ChainType.Optimism]
	},
	[ChainType.Bsc]: {
		//MCB
		'0x5fe80d2cd054645b9419657d3d10d26391780a7b': [ChainType.Ethereum, ChainType.Arbitrum],
		//DODO
		'0x67ee3Cb086F8a16f34beE3ca72FAD36F7Db929e2': [
			ChainType.Polygon,
			ChainType.Arbitrum,
			ChainType.Ethereum,
			ChainType.Avax,
			ChainType.Optimism
		],
		//USDC
		'0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': [
			ChainType.Polygon,
			ChainType.Arbitrum,
			ChainType.Ethereum,
			ChainType.Avax,
			ChainType.Optimism
		],
		//BUSD
		'0xe9e7cea3dedca5984780bafc599bd69add087d56': [ChainType.Ethereum],
		//USDT
		'0x55d398326f99059ff775485246999027b3197955': [
			ChainType.Polygon,
			ChainType.Arbitrum,
			ChainType.Ethereum,
			ChainType.Avax,
			ChainType.Optimism
		],
		//ETH
		'0x2170ed0880ac9a755fd29b2688956bd959f933f8': [
			ChainType.Polygon,
			ChainType.Arbitrum,
			ChainType.Ethereum,
			ChainType.Avax,
			ChainType.Optimism
		],
		//DOMI
		'0xbbca42c60b5290f2c48871a596492f93ff0ddc82': [ChainType.Ethereum]
	},
	[ChainType.Polygon]: {
		//WETH
		'0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': [
			ChainType.Ethereum,
			ChainType.Arbitrum,
			ChainType.Bsc,
			ChainType.Optimism,
			ChainType.Avax
		],
		//USDC
		'0x2791bca1f2de4661ed88a30c99a7a9449aa84174': [
			ChainType.Ethereum,
			ChainType.Arbitrum,
			ChainType.Bsc,
			ChainType.Optimism,
			ChainType.Avax
		],
		//IMX(Impermax)
		'0x60bb3d364b765c497c8ce50ae0ae3f0882c5bd05': [ChainType.Arbitrum, ChainType.Ethereum, ChainType.Avax],
		//USDT
		'0xc2132d05d31c914a87c6611c10748aeb04b58e8f': [
			ChainType.Ethereum,
			ChainType.Arbitrum,
			ChainType.Bsc,
			ChainType.Optimism,
			ChainType.Avax
		]
	},
	[ChainType.Arbitrum]: {
		//DODO
		'0x69eb4fa4a2fbd498c257c57ea8b7655a2559a581': [ChainType.Ethereum, ChainType.Bsc],
		//USDT
		'0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': [
			ChainType.Ethereum,
			ChainType.Polygon,
			ChainType.Bsc,
			ChainType.Optimism,
			ChainType.Avax
		],
		//USDC
		'0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': [
			ChainType.Ethereum,
			ChainType.Polygon,
			ChainType.Bsc,
			ChainType.Optimism,
			ChainType.Avax
		],
		//ETH
		ETH: [ChainType.Ethereum, ChainType.Polygon, ChainType.Bsc, ChainType.Optimism, ChainType.Avax],
		//IMX(Impermax)
		'0x9c67ee39e3c4954396b9142010653f17257dd39c': [ChainType.Ethereum, ChainType.Polygon, ChainType.Avax],
		//MCB
		'0x4e352cf164e64adcbad318c3a1e222e9eba4ce42': [ChainType.Ethereum, ChainType.Bsc]
	},
	[ChainType.Avax]: {
		//USDT
		'0xc7198437980c041c805a1edcba50c1ce5db95118': [
			ChainType.Ethereum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Optimism,
			ChainType.Arbitrum
		],
		//USDC
		'0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664': [
			ChainType.Ethereum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Optimism,
			ChainType.Arbitrum
		],
		//WETH.e
		'0x9b71805c8d82e0da861ca3c2b6c11a331bd6a318': [
			ChainType.Ethereum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Optimism,
			ChainType.Arbitrum
		],
		//IMX.a(Impermax)
		'0xea6887e4a9cda1b77e70129e5fba830cdb5cddef': [ChainType.Ethereum, ChainType.Polygon, ChainType.Arbitrum]
	},
	[ChainType.Optimism]: {
		//USDT
		'0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': [
			ChainType.Ethereum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Avax,
			ChainType.Arbitrum
		],
		//USDC
		'0x7f5c764cbc14f9669b88837ca1490cca17c31607': [
			ChainType.Ethereum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Avax,
			ChainType.Arbitrum
		],
		//ETH
		ETH: [ChainType.Ethereum, ChainType.Bsc, ChainType.Polygon, ChainType.Avax, ChainType.Arbitrum],
		//LYRA
		'0x50c5725949a6f0c72e6c4a641f24049a917db0cb': [ChainType.Ethereum]
	}
};

//node: lowercase address
export const MULTICHAIN_SUPPORT_TOKENS = {
	[ChainType.Ethereum]: {
		//USDC
		'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': [ChainType.Syscoin],
		//USDT
		'0xdac17f958d2ee523a2206206994597c13d831ec7': [ChainType.Syscoin],
		//ETH
		ETH: [ChainType.Syscoin]
	},
	[ChainType.Syscoin]: {
		//ETH
		'0x7c598c96d02398d89fbcb9d41eab3df0c16f227d': [ChainType.Ethereum],
		//USDC
		'0x2bf9b864cdc97b08b6d79ad4663e71b8ab65c45c': [ChainType.Ethereum],
		//USDT
		'0x922d641a426dcffaef11680e5358f34d97d112e1': [ChainType.Ethereum]
	}
};

export const TYPE_UNKNOWN = 0;
export const TYPE_CBRIDGE = 1;
export const TYPE_MULTICHAIN = 2;

function getSupportMigrationByTokens(tokens, asset) {
	const chainBridge = tokens[asset.type];
	if (!chainBridge) {
		return [];
	}
	if (asset.nativeCurrency) {
		return chainBridge[asset.symbol] || [];
	}
	return chainBridge[asset.address?.toLowerCase()] || [];
}

export function getSupportMigrationCBridge(asset) {
	return getSupportMigrationByTokens(CBRIDGE_SUPPORT_TOKENS, asset);
}

export function getSupportMigrationMultichain(asset) {
	return getSupportMigrationByTokens(MULTICHAIN_SUPPORT_TOKENS, asset);
}

export function getSupportMigration(asset) {
	const supports = [];
	const cBridge = getSupportMigrationCBridge(asset);
	if (cBridge?.length) {
		supports.push(...cBridge);
	}
	const multichain = getSupportMigrationMultichain(asset);
	if (multichain?.length) {
		supports.push(...multichain);
	}
	return supports;
}

export function getSupportBridgeType(asset, selectType) {
	const cBridge = getSupportMigrationCBridge(asset);
	if (cBridge?.find(type => type === selectType)) {
		return TYPE_CBRIDGE;
	}
	const multichain = getSupportMigrationMultichain(asset);
	if (multichain?.find(type => type === selectType)) {
		return TYPE_MULTICHAIN;
	}
	return TYPE_UNKNOWN;
}

export function isSupportCBridge(asset, selectType) {
	const cBridge = getSupportMigrationCBridge(asset);
	if (cBridge?.find(type => type === selectType)) {
		return true;
	}
	return false;
}

export function isSupportMultichain(asset, selectType) {
	const multichain = getSupportMigrationMultichain(asset);
	if (multichain?.find(type => type === selectType)) {
		return true;
	}
	return false;
}

export function supportMigration(asset) {
	return getSupportMigration(asset).length > 0;
}
