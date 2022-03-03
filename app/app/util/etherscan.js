import {
	MAINNET,
	PolygonMainnet,
	PolygonTestnet,
	BSCMAINNET,
	BSCTESTNET,
	ArbitrumMainnet,
	HecoMainnet,
	HecoTestnet,
	OptimismMainnet,
	OptimismTestnetKovan,
	AvaxMainnet,
	AvaxTestnet
} from '../constants/network';

/**
 * Gets the etherscan link for an address in a specific network
 *
 * @param {network} string - name of the network
 * @param {address} string - ethereum address to be used on the link
 * @returns - string
 */
export function getEtherscanAddressUrl(network, address) {
	return `${getEtherscanBaseUrl(network)}/address/${address}`;
}

/**
 * Gets the etherscan link for a transaction in a specific network
 *
 * @param {network} string - name of the network
 * @param {tx_hash} string - hash of the transaction to be used on the link
 * @returns - string
 */
export function getEtherscanTransactionUrl(network, tx_hash) {
	return `${getEtherscanBaseUrl(network)}/tx/${tx_hash}`;
}

/**
 * Gets the base etherscan link for a transaction in a specific network
 *
 * @param {network} string - name of the network
 * @returns - string
 */
export function getEtherscanBaseUrl(network) {
	if (network === BSCMAINNET || network === BSCTESTNET) {
		const subdomain = network === BSCMAINNET ? '' : `testnet.`;
		return `https://${subdomain}bscscan.com`;
	}
	if (network === PolygonMainnet) {
		return 'https://polygonscan.com';
	}
	if (network === PolygonTestnet) {
		return 'https://mumbai.polygonscan.com';
	}
	if (network === ArbitrumMainnet) {
		return 'https://arbiscan.io';
	}
	if (network === HecoMainnet || network === HecoTestnet) {
		const subdomain = network === HecoMainnet ? '' : `testnet.`;
		return `https://${subdomain}hecoinfo.com`;
	}
	if (network === AvaxMainnet || network === AvaxTestnet) {
		const subdomain = network === AvaxMainnet ? '' : `testnet.`;
		return `https://${subdomain}snowtrace.io`;
	}
	if (network === OptimismMainnet || network === OptimismTestnetKovan) {
		const subdomain = network === OptimismMainnet ? 'optimistic' : 'kovan-optimistic';
		return `https://${subdomain}.etherscan.io`;
	}
	const subdomain = network.toLowerCase() === MAINNET ? '' : `${network.toLowerCase()}.`;
	return `https://${subdomain}etherscan.io`;
}
