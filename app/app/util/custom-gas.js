import { hexToBN, isEIP1559Compatibility, renderFromWei, toWei, weiToFiat } from './number';
import { strings } from '../../locales/i18n';
import TransactionTypes from '../core/TransactionTypes';
import Engine from '../core/Engine';
import {
	isAvaxMainnetByChainId,
	isBSCMainnetByChainId,
	isHecoMainnetByChainId,
	isMainnetByChainId,
	isPolygonMainnetByChainId
} from '../util/networks';
import { BN, ChainType, util } from 'gopocket-core';
import { conversionUtil } from './conversion-util';

export const ETH = 'ETH';
export const GWEI = 'GWEI';
export const WEI = 'WEI';

/**
 * Calculates wei value of estimate gas price in gwei
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @returns {Object} - BN instance containing gas price in wei
 */
export function apiEstimateModifiedToWEI(estimate) {
	return toWei(estimate, 'gwei');
}

/**
 * Calculates GWEI value of estimate gas price from ethgasstation.info
 *
 * @param {number} val - Number corresponding to api gas price estimation
 * @returns {string} - The GWEI value as a string
 */
export function convertApiValueToGWEI(val) {
	return parseInt(val, 10).toString();
}

/**
 * Calculates gas fee in wei
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getWeiGasFee(estimate, gasLimit = 21000) {
	const apiEstimate = apiEstimateModifiedToWEI(estimate);
	const gasFee = apiEstimate.mul(new BN(gasLimit, 10));
	return gasFee;
}

/**
 * Calculates gas fee in eth
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getRenderableEthGasFee(estimate, gasLimit = 21000) {
	const gasFee = getWeiGasFee(estimate, gasLimit);
	return renderFromWei(gasFee);
}

export function getEthGasFee(weiGas, gasLimitBN) {
	const gasFee = weiGas.mul(gasLimitBN);
	return renderFromWei(gasFee);
}

/**
 * Calculates gas fee in fiat
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} conversionRate - Number corresponding to conversion rate for current `currencyCode`
 * @param {string} currencyCode - String corresponding to code of current currency
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getRenderableFiatGasFee(estimate, conversionRate, currencyCode, gasLimit = 21000) {
	const wei = getWeiGasFee(estimate, gasLimit);
	return weiToFiat(wei, conversionRate, currencyCode);
}

export function getFiatGasFee(weiGas, conversionRate, currencyCode, gasLimit = 21000) {
	const wei = weiGas.mul(new BN(gasLimit, 10));
	return weiToFiat(wei, conversionRate, currencyCode);
}

/**
 * Parse minutes number to readable wait time
 *
 * @param {number} min - Minutes
 * @returns {string} - Readable wait time
 */
export function parseWaitTime(min) {
	let tempMin = min,
		parsed = '',
		val;
	const timeUnits = [
		[strings('unit.week'), 10080],
		[strings('unit.day'), 1440],
		[strings('unit.hour'), 60],
		[strings('unit.minute'), 1]
	];
	timeUnits.forEach(unit => {
		if (parsed.includes(' ')) {
			return;
		}
		val = Math.floor(tempMin / unit[1]);
		if (val) {
			if (parsed !== '') {
				parsed += ' ';
			}
			parsed += `${val}${unit[0]}`;
		}
		tempMin = min % unit[1];
	});
	if (parsed === '') {
		val = (Math.round(tempMin * 100) * 3) / 5;
		if (val) {
			parsed += ` ${Math.ceil(val)}${strings('unit.second')}`;
		}
	}
	return parsed.trim();
}

/**
 * Fetches gas estimated from gas station
 *
 * @returns {Object} - Object containing basic estimates
 */
export async function fetchMainnetGasEstimates() {
	// Timeout in 7 seconds
	const timeout = 5000;
	const key = await Engine.getScanKey(ChainType.Ethereum);
	const { url, options } = await util.getAvailableUrl(
		`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${key}`,
		{
			headers: {},
			body: null,
			method: 'GET'
		}
	);
	const fetchPromise = fetch(url, options)
		.then(r => r.json())
		.then(({ result }) => ({
			average: result.ProposeGasPrice,
			safeLow: result.SafeGasPrice,
			fast: result.FastGasPrice
		}));
	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export async function fetchBscGasEstimates() {
	// Timeout in 7 seconds
	const timeout = 5000;
	const key = await Engine.getScanKey(ChainType.Bsc);
	const { url, options } = await util.getAvailableUrl(
		`https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=${key}`,
		{
			headers: {},
			body: null,
			method: 'GET'
		}
	);
	const fetchPromise = fetch(url, options)
		.then(r => r.json())
		.then(({ result }) => ({
			average: result.ProposeGasPrice,
			safeLow: result.SafeGasPrice,
			fast: result.FastGasPrice
		}));
	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export async function fetchHecoGasEstimates() {
	// Timeout in 7 seconds
	const timeout = 5000;
	const { url, options } = await util.getAvailableUrl('https://tc.hecochain.com/price/prediction', {
		headers: {},
		body: null,
		method: 'GET'
	});
	const fetchPromise = fetch(url, options)
		.then(r => r.json())
		.then(({ prices }) => {
			if (!prices) {
				return null;
			}
			return {
				average: prices.median,
				safeLow: prices.low,
				fast: prices.fast
			};
		});
	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export async function fetchAvaxGasEstimates() {
	// Timeout in 7 seconds
	const timeout = 5000;
	const { url, options } = await util.getAvailableUrl(
		'https://gavax.blockscan.com/gasapi.ashx?apikey=key&method=gasoracle',
		{
			headers: {},
			body: null,
			method: 'GET'
		}
	);
	const fetchPromise = fetch(url, options)
		.then(r => r.json())
		.then(({ status, message, result }) => {
			if (status !== '1' || message !== 'OK') {
				return null;
			}
			return {
				average: result.ProposeGasPrice,
				safeLow: result.SafeGasPrice,
				fast: result.FastGasPrice
			};
		});
	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export async function getBasicGasEstimates(transaction) {
	const { TransactionController } = Engine.context;
	const chainId = transaction.chainId;

	let averageGasPrice, gasLimit, basicGasEstimates;
	try {
		const estimation = await TransactionController.estimateGas({
			from: transaction.from,
			data: transaction.data,
			to: transaction.to,
			value: transaction.value,
			gas: transaction.gas,
			chainId
		});
		averageGasPrice = hexToBN(estimation.gasPrice);
		gasLimit = hexToBN(estimation.gas);
	} catch (error) {
		averageGasPrice = apiEstimateModifiedToWEI(TransactionTypes.CUSTOM_GAS.AVERAGE_GAS);
		gasLimit = hexToBN(TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT);
		util.logInfo(
			'PPYang, Error while trying to get gas price from the network',
			error,
			' transaction:',
			transaction
		);
	}

	try {
		let fetchGas;
		if (isMainnetByChainId(chainId)) {
			fetchGas = await fetchMainnetGasEstimates();
		} else if (isBSCMainnetByChainId(chainId)) {
			fetchGas = await fetchBscGasEstimates();
		} else if (isHecoMainnetByChainId(chainId)) {
			fetchGas = await fetchHecoGasEstimates();
		} else if (isAvaxMainnetByChainId(chainId)) {
			fetchGas = await fetchAvaxGasEstimates();
		}
		if (fetchGas) {
			basicGasEstimates = {
				averageGwei: apiEstimateModifiedToWEI(fetchGas.average),
				fastGwei: apiEstimateModifiedToWEI(fetchGas.fast),
				safeLowGwei: apiEstimateModifiedToWEI(fetchGas.safeLow)
			};
		}
	} catch (error) {
		util.logWarn('PPYang, Error while trying to get gas limit estimates', error);
	}
	if (!basicGasEstimates) {
		let safeLow;
		if (averageGasPrice.isZero()) {
			safeLow = new BN(0);
		} else {
			safeLow = averageGasPrice.muln(0.5);
		}

		basicGasEstimates = {
			averageGwei: averageGasPrice,
			fastGwei: averageGasPrice.muln(1.5),
			safeLowGwei: safeLow
		};
	} else {
		averageGasPrice = basicGasEstimates.averageGwei;
	}
	basicGasEstimates = { gas: gasLimit, gasPrice: averageGasPrice, ...basicGasEstimates };
	util.logDebug('PPYang basicGasEstimates', basicGasEstimates);
	return basicGasEstimates;
}

async function getRpcSuggestedGasFees(chainId) {
	try {
		const { TransactionController } = Engine.context;
		const { maxPriorityFeePerGas, baseFeePerGas } = await TransactionController.getRpcSuggestedGasFees(chainId);
		if (maxPriorityFeePerGas && baseFeePerGas) {
			const bnMax = hexToBN(maxPriorityFeePerGas);
			const estimatedBaseFee = hexToBN(baseFeePerGas);
			return {
				averageGwei: bnMax,
				fastGwei: bnMax.muln(1.5),
				safeLowGwei: bnMax.muln(0.5),
				estimatedBaseFee
			};
		}
	} catch (e) {
		util.logDebug('getRpcSuggestedGasFees error:', e);
	}
	return undefined;
}

export async function fetchSuggestedGasFees(chainId: string | number) {
	// Timeout in 7 seconds
	const timeout = 14000;

	if (typeof chainId === 'string') {
		chainId = Number(chainId);
	}
	const EIP1559APIEndpoint = `https://gas-api.metaswap.codefi.network/networks/${chainId}/suggestedGasFees`;
	const fetchPromise = fetch(EIP1559APIEndpoint).then(r => r.json());

	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export async function fetchPolygonSuggestedGasFees() {
	// Timeout in 7 seconds
	const timeout = 14000;

	const EIP1559APIEndpoint = 'https://gasstation-mainnet.matic.network/v2';
	const fetchPromise = fetch(EIP1559APIEndpoint).then(r => r.json());

	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

let getSuggestedGasFees_timestamp = 0;
let temp_suggestedGasFees = null;

export async function getSuggestedGasFees(chainId: string | number) {
	if (isPolygonMainnetByChainId(chainId)) {
		return getPolygonSuggestedGasFees();
	}
	return getOtherSuggestedGasFees(chainId);
}

export async function getOtherSuggestedGasFees(chainId: string | number) {
	try {
		if (temp_suggestedGasFees && Date.now() - getSuggestedGasFees_timestamp <= 3000) {
			return temp_suggestedGasFees;
		}
		const fetchGas = await fetchSuggestedGasFees(chainId);
		if (!fetchGas?.high) {
			return null;
		}
		const allGwei = [
			decGWEIToBNWEI(fetchGas.high.suggestedMaxPriorityFeePerGas),
			decGWEIToBNWEI(fetchGas.medium.suggestedMaxPriorityFeePerGas),
			decGWEIToBNWEI(fetchGas.low.suggestedMaxPriorityFeePerGas)
		];
		allGwei.sort((a, b) => a.lt(b));
		const suggestedGasFees = {
			averageGwei: allGwei[1],
			fastGwei: allGwei[0],
			safeLowGwei: allGwei[2],
			estimatedBaseFee: decGWEIToBNWEI(fetchGas.estimatedBaseFee)
		};
		temp_suggestedGasFees = suggestedGasFees;
		getSuggestedGasFees_timestamp = Date.now();
		return suggestedGasFees;
	} catch (e) {
		util.logDebug('getOtherSuggestedGasFees error:', e);
	}
	return null;
}

export async function getPolygonSuggestedGasFees() {
	try {
		const fetchGas = await fetchPolygonSuggestedGasFees();
		const allGwei = [
			decGWEIToBNWEI(fetchGas.fast.maxPriorityFee),
			decGWEIToBNWEI(fetchGas.standard.maxPriorityFee),
			decGWEIToBNWEI(fetchGas.safeLow.maxPriorityFee)
		];
		allGwei.sort((a, b) => a.lt(b));
		const suggestedGasFees = {
			averageGwei: allGwei[1],
			fastGwei: allGwei[0],
			safeLowGwei: allGwei[2],
			estimatedBaseFee: decGWEIToBNWEI(fetchGas.estimatedBaseFee)
		};
		return suggestedGasFees;
	} catch (e) {
		util.logDebug('getPolygonSuggestedGasFees error:', e);
	}
	return null;
}

export async function estimateTransactionTotalGas(from, to, chainId: string | number, minGas: number = null) {
	const { gas, gasPrice } = await getBasicGasEstimates({
		from,
		to,
		chainId
	});
	let targetGas = gas;
	if (minGas) {
		targetGas = targetGas.ltn(minGas) ? new BN(minGas) : targetGas;
	}
	if (await isEIP1559Compatibility(chainId)) {
		let suggestedGasFees = await getSuggestedGasFees(chainId);
		if (!suggestedGasFees) {
			suggestedGasFees = await getRpcSuggestedGasFees(chainId);
		}
		if (suggestedGasFees) {
			return suggestedGasFees.averageGwei.add(suggestedGasFees.estimatedBaseFee.muln(2)).mul(targetGas);
		}
	}
	return gas.mul(gasPrice);
}

export async function getSuggestedGasEstimates(transaction, forceNormalFee = false) {
	const gasEstimates = await getBasicGasEstimates(transaction);
	if (!forceNormalFee && (await isEIP1559Compatibility(transaction.chainId))) {
		let suggestedGasFees = await getSuggestedGasFees(transaction.chainId);
		if (!suggestedGasFees) {
			suggestedGasFees = await getRpcSuggestedGasFees(transaction.chainId);
		}
		if (suggestedGasFees) {
			const maxFeePerGas = suggestedGasFees.averageGwei.add(suggestedGasFees.estimatedBaseFee.muln(2));
			return {
				...gasEstimates,
				...suggestedGasFees,
				maxPriorityFeePerGas: suggestedGasFees.averageGwei,
				maxFeePerGas,
				gasPrice: maxFeePerGas,
				isEIP1559: true
			};
		}
	}
	return {
		...gasEstimates,
		isEIP1559: false
	};
}

export async function getSuggestedGasEstimatesAndId(transaction, curTransactionId) {
	const { data, to, from, chainId } = transaction;
	const estimation = await getSuggestedGasEstimates({
		from,
		data,
		to,
		chainId
	});
	return { ...estimation, curTransactionId };
}

export function getIncreasedPrice(gasEstimates, rate) {
	if (!gasEstimates) {
		return gasEstimates;
	}
	if (gasEstimates.maxFeePerGas && gasEstimates.maxPriorityFeePerGas && gasEstimates.estimatedBaseFee) {
		gasEstimates.maxPriorityFeePerGas = gasEstimates.maxPriorityFeePerGas.muln(rate);
		gasEstimates.maxFeePerGas = gasEstimates.estimatedBaseFee.add(gasEstimates.maxPriorityFeePerGas);
		gasEstimates.gasPrice = gasEstimates.maxFeePerGas;
	} else {
		gasEstimates.gasPrice = gasEstimates.gasPrice.muln(rate);
	}
	return gasEstimates;
}

export function decGWEIToBNWEI(decGWEI) {
	return hexToBN(decGWEIToHexWEI(decGWEI));
}

export function decGWEIToHexWEI(decGWEI) {
	return conversionUtil(decGWEI, {
		fromNumericBase: 'dec',
		toNumericBase: 'hex',
		fromDenomination: 'GWEI',
		toDenomination: 'WEI'
	});
}
