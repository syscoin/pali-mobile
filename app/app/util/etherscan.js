import { NetworkConfig } from 'paliwallet-core';

/**
 * Gets the etherscan link for an address in a specific network
 *
 * @param {network} string - name of the network
 * @param {address} string - ethereum address to be used on the link
 * @returns - string
 */
export function getEtherscanAddressUrl(chainId, address) {
	return `${getEtherscanBaseUrl(chainId)}/address/${address}`;
}

/**
 * Gets the etherscan link for a transaction in a specific network
 *
 * @param {network} string - name of the network
 * @param {tx_hash} string - hash of the transaction to be used on the link
 * @returns - string
 */
export function getEtherscanTransactionUrl(chainId, tx_hash) {
	return `${getEtherscanBaseUrl(chainId)}/tx/${tx_hash}`;
}

/**
 * Gets the base etherscan link for a transaction in a specific network
 *
 * @param {network} string - name of the network
 * @returns - string
 */
export function getEtherscanBaseUrl(chainId) {
	chainId = chainId?.toString();
	for (const type in NetworkConfig) {
		for (const network in NetworkConfig[type].Networks) {
			if (NetworkConfig[type].Networks[network].provider.chainId === chainId) {
				return NetworkConfig[type].Networks[network].ExplorerUrl;
			}
		}
	}
	return `https://mainnet.etherscan.io`;
}
