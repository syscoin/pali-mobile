import { URL } from 'gopocket-core';

export const RPC = 'rpc';

export function isprivateConnection(hostname) {
	return (
		hostname === 'localhost' ||
		/(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/.test(hostname)
	);
}

/**
 * From block explorer url, get rendereable name or undefined
 *
 * @param {string} blockExplorerUrl - block explorer url
 */
export function getBlockExplorerName(blockExplorerUrl) {
	if (!blockExplorerUrl) return undefined;
	const hostname = new URL(blockExplorerUrl).hostname;
	if (!hostname) return undefined;
	const tempBlockExplorerName = hostname.split('.')[0];
	if (!tempBlockExplorerName || !tempBlockExplorerName[0]) return undefined;
	return tempBlockExplorerName[0].toUpperCase() + tempBlockExplorerName.slice(1);
}

export function isPrefixedFormattedHexString(value) {
	if (typeof value !== 'string') {
		return false;
	}
	return /^0x[1-9a-f]+[0-9a-f]*$/iu.test(value);
}
