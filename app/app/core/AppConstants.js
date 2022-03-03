export default {
	TX_CHECK_MAX_FREQUENCY: 10000,
	TX_CHECK_NORMAL_FREQUENCY: 30000,
	TX_CHECK_BACKGROUND_FREQUENCY: 60000,
	IPFS_DEFAULT_GATEWAY_URL: 'https://cf-ipfs.com/ipfs/',
	IPNS_DEFAULT_GATEWAY_URL: 'https://cloudflare-ipfs.com/ipns/',
	SWARM_DEFAULT_GATEWAY_URL: 'https://swarm-gateways.net/bzz:/',
	MAX_PUSH_NOTIFICATION_PROMPT_TIMES: 2,
	SAI_ADDRESS: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
	HOMEPAGE_URL: 'gopocket://homepage',
	ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
	USER_AGENT:
		'Mozilla/5.0 (Linux; Android 10; Android SDK built for x86 Build/OSM1.180201.023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.92 Mobile Safari/537.36',
	//'Mozilla/5.0 (iPhone; CPU iPhone OS 13_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/76.0.3809.123 Mobile/15E148 Safari/605.1',
	NOTIFICATION_NAMES: {
		accountsChanged: 'metamask_accountsChanged',
		unlockStateChanged: 'metamask_unlockStateChanged',
		chainChanged: 'metamask_chainChanged'
	},
	DEEPLINKS: {
		ORIGIN_DEEPLINK: 'deeplink',
		ORIGIN_QR_CODE: 'qr-code'
	},
	MAX_SAFE_CHAIN_ID: 4503599627370476,
	ERRORS: {
		INFURA_BLOCKED_MESSAGE: 'EthQuery - RPC Error - This service is not available in your country'
	}
};
