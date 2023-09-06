/**
 * Collection of utility functions for consistent formatting and conversion
 */
import {
	BN,
	BignumberJs as BigNumber,
	ChainType,
	EthersUtils,
	LockType,
	NetworkConfig,
	EthjsUnit as convert,
	util
} from 'paliwallet-core';
import numberToBN from 'number-to-bn';
import Engine from '../core/Engine';
import { getChainTypeName } from './ChainTypeImages';
import {
	EngineContext,
	EngineContracts,
	EngineNetworks,
	callSqlite,
	getRpcChainTypeByChainId,
	getRpcNickname,
	getRpcProviderChainId,
	getRpcProviderTicker,
	isRpcChainId
} from './ControllerUtils';
import { safeToChecksumAddress } from './address';
import { CURRENCIES } from './currencies';

/**
 * Converts a BN object to a hex string with a '0x' prefix
 *
 * @param {Object} value - BN instance to convert to a hex string
 * @returns {string} - '0x'-prefixed hex string
 */
export function BNToHex(value) {
	return util.BNToHex(value);
}

/**
 * Converts wei to a different unit
 *
 * @param {number|string|Object} value - Wei to convert
 * @param {string} unit - Unit to convert to, ether by default
 * @returns {string} - String containing the new number
 */
export function fromWei(value = 0, unit = 'ether') {
	return convert.fromWei(value, unit);
}

/**
 * Converts token minimal unit to readable string value
 *
 * @param {number|string|Object} minimalInput - Token minimal unit to convert
 * @param {string} decimals - Token decimals to convert
 * @returns {string} - String containing the new number
 */
export function fromTokenMinimalUnit(minimalInput, decimals) {
	minimalInput = toPlainString(minimalInput);
	let minimal = numberToBN(minimalInput);
	const negative = minimal.lt(new BN(0));
	const base = new BN(Math.pow(10, decimals).toString(16), 16);

	if (negative) {
		minimal = minimal.mul(negative);
	}
	let fraction = minimal.mod(base).toString(10);
	while (fraction.length < decimals) {
		fraction = '0' + fraction;
	}
	fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
	const whole = minimal.div(base).toString(10);
	let value = '' + whole + (fraction === '0' ? '' : '.' + fraction);
	if (negative) {
		value = '-' + value;
	}
	return value;
}

// BN.js Throws from 1e+21 and above so using this make shift function
function toPlainString(num) {
	return ('' + num).replace(/(-?)(\d*)\.?(\d+)e([+-]\d+)/, (a, b, c, d, e) =>
		e < 0 ? b + '0.' + Array(1 - e - c.length).join(0) + c + d : b + c + d + Array(e - d.length + 1).join(0)
	);
}

const INTEGER_REGEX = /^-?\d*(\.0+|\.)?$/;

/**
 * Converts token minimal unit to readable string value
 *
 * @param {string} minimalInput - Token minimal unit to convert
 * @param {number} decimals - Token decimals to convert
 * @returns {string} - String containing the new number
 */
export function fromTokenMinimalUnitString(minimalInput, decimals) {
	if (typeof minimalInput !== 'string') {
		throw new TypeError('minimalInput must be a string');
	}

	const tokenFormat = EthersUtils.formatUnits(minimalInput, decimals);
	const isInteger = Boolean(INTEGER_REGEX.exec(tokenFormat));

	const [integerPart, decimalPart] = tokenFormat.split('.');
	if (isInteger) {
		return integerPart;
	}
	return `${integerPart}.${decimalPart}`;
}

/**
 * Converts some unit to token minimal unit
 *
 * @param {number|string|BN} tokenValue - Value to convert
 * @param {string} decimals - Unit to convert from, ether by default
 * @returns {Object} - BN instance containing the new number
 */
export function toTokenMinimalUnit(tokenValue, decimals) {
	const base = new BN(Math.pow(10, decimals).toString(16), 16);
	let value = convert.numberToString(tokenValue);
	const negative = value.substring(0, 1) === '-';
	if (negative) {
		value = value.substring(1);
	}
	if (value === '.') {
		throw new Error('[number] while converting number ' + tokenValue + ' to token minimal util, invalid value');
	}
	// Split it into a whole and fractional part
	const comps = value.split('.');
	if (comps.length > 2) {
		throw new Error(
			'[number] while converting number ' + tokenValue + ' to token minimal util,  too many decimal points'
		);
	}
	let whole = comps[0],
		fraction = comps[1];
	if (!whole) {
		whole = '0';
	}
	if (!fraction) {
		fraction = '';
	}
	if (fraction.length > decimals) {
		throw new Error(
			'[number] while converting number ' + tokenValue + ' to token minimal util, too many decimal places'
		);
	}
	while (fraction.length < decimals) {
		fraction += '0';
	}
	whole = new BN(whole);
	fraction = new BN(fraction);
	let tokenMinimal = whole.mul(base).add(fraction);
	if (negative) {
		tokenMinimal = tokenMinimal.mul(negative);
	}
	return new BN(tokenMinimal.toString(10), 10);
}

export function renderGwei(value) {
	if (!value) {
		return '0';
	}
	const valueBigNumber = new BigNumber(toGwei(value));
	if (valueBigNumber.isNaN() || !valueBigNumber.gt(0)) {
		return '0';
	}
	if (valueBigNumber.lt(0.0001)) {
		return '< 0.0001';
	}
	return valueBigNumber.dp(4).toString();
}

/**
 * Converts some token minimal unit to render format string, showing 5 decimals
 *
 * @param {Number|String|BN} tokenValue - Token value to convert
 * @param {Number} decimals - Token decimals to convert
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {String} - Number of token minimal unit, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFromTokenMinimalUnit(tokenValue, decimals, decimalsToShow = 5) {
	if (!tokenValue) {
		return '0';
	}
	const minimalUnit = fromTokenMinimalUnit(tokenValue, decimals);
	const minimalUnitBigNumber = new BigNumber(minimalUnit);
	let renderMinimalUnit;
	if (minimalUnitBigNumber.gt(0) && minimalUnitBigNumber.lt(0.00001)) {
		renderMinimalUnit = '< 0.00001';
	} else {
		renderMinimalUnit = decimalsInputValue(minimalUnitBigNumber.toString(10), decimalsToShow);
	}
	return renderMinimalUnit;
}

export function getFromTokenMinimalUnit(tokenValue, decimals) {
	if (!tokenValue) {
		return '0';
	}
	const minimalUnit = fromTokenMinimalUnit(tokenValue, decimals);
	const minimalUnitBigNumber = new BigNumber(minimalUnit);
	let renderMinimalUnit;
	const base = Math.pow(10, decimals);
	const min = new BigNumber(1).div(base);
	if (minimalUnitBigNumber.gt(0) && minimalUnitBigNumber.lt(min)) {
		renderMinimalUnit = '0';
	} else {
		renderMinimalUnit = decimalsNumber(minimalUnit, decimals);
	}
	return renderMinimalUnit;
}

export function decimalsNumber(value: string, decimalsToShow: number) {
	if (value.includes('.')) {
		const comps = value.split('.');
		const whole = comps[0];
		let fraction = comps[1];
		if (fraction.length <= decimalsToShow) {
			return value;
		}
		fraction = fraction.substr(0, decimalsToShow);
		fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
		return '' + whole + (fraction === '0' ? '' : '.' + fraction);
	}
	return value;
}

export function decimalsInputValue(value: string, decimalsToShow: number) {
	if (value && value.toString().includes('.')) {
		const comps = value.split('.');
		const whole = comps[0];
		let fraction = comps[1];
		if (fraction.length <= decimalsToShow) {
			return value;
		}
		fraction = fraction.substr(0, decimalsToShow);
		fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
		return '' + whole + (fraction === '0' ? '' : '.' + fraction);
	}
	return value;
}

/**
 * Converts fiat number as human-readable fiat string to token miniml unit expressed as a BN
 *
 * @param {number|string} fiat - Fiat number
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {number} decimals - Asset decimals
 * @returns {Object} - The converted balance as BN instance
 */
export function fiatNumberToTokenMinimalUnit(fiat, conversionRate, exchangeRate, decimals) {
	const base = Math.pow(10, decimals);
	const weiNumber = new BigNumber(fiat)
		.div(conversionRate * exchangeRate)
		.multipliedBy(base)
		.toFixed(0);
	return new BN(weiNumber);
}

/**
 * Converts wei to render format string, showing 5 decimals
 *
 * @param {Number|String|BN} value - Wei to convert
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {String} - Number of token minimal unit, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFromWei(value, decimalsToShow = 5) {
	const wei = fromWei(value);
	const weiBigNumber = new BigNumber(wei);
	let renderWei;
	if (weiBigNumber.gt(0) && weiBigNumber.lt(0.00001)) {
		renderWei = '< 0.00001';
	} else {
		renderWei = decimalsInputValue(weiBigNumber.toString(10), decimalsToShow);
	}
	return renderWei;
}

/**
 * Converts a hex string to a BN object
 *
 * @param {string} value - Number represented as a hex string
 * @returns {Object} - A BN instance
 */
export function hexToBN(value) {
	return util.hexToBN(value);
}

/**
 * Checks if a value is a BN instance
 *
 * @param {object} value - Value to check
 * @returns {boolean} - True if the value is a BN instance
 */
export function isBN(value) {
	return BN.isBN(value);
}

export function isDecimalValue(value) {
	const valueBigNumber = new BigNumber(value);
	return valueBigNumber.isFinite() && !valueBigNumber.isNaN();
}

/**
 * Determines if a string is a valid decimal
 *
 * @param {string} value - String to check
 * @returns {boolean} - True if the string is a valid decimal
 */
export function isDecimal(value) {
	const valueBigNumber = new BigNumber(value);
	return valueBigNumber.isFinite() && !valueBigNumber.isNaN() && greaterThanZero(value);
}

export function isNumberStr(value: string) {
	if (!value) {
		return false;
	}
	value = value.replace(/\s|[a-zA-Z]/, '').replace(',', '.');
	return /^\d+$|^\d+\.\d+$/g.test(value);
}

export function greaterThanZero(value) {
	return new BigNumber(value).gt(0);
}

export function greaterThanOrEqualValue(value1, value2) {
	if (!isDecimal(value1) || !isDecimal(value2)) {
		return false;
	}
	return new BigNumber(value1).gte(new BigNumber(value2));
}

export function isZero(value) {
	return new BigNumber(value).isZero();
}

export function formatNumberStr(value) {
	return new BigNumber(value).toString(10);
}

export function equalValue(value1: string, value2: string) {
	if (!isDecimal(value1) || !isDecimal(value2)) {
		return false;
	}
	return new BigNumber(value1).eq(new BigNumber(value2));
}

/**
 * Creates a BN object from a string
 *
 * @param {string} value - Some numeric value represented as a string
 * @returns {Object} - BN instance
 */
export function toBN(value) {
	return new BN(value);
}

/**
 * Converts some unit to wei
 *
 * @param {number|string|BN} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {Object} - BN instance containing the new number
 */
export function toWei(value, unit = 'ether') {
	return convert.toWei(value, unit);
}

/**
 * Converts some unit to Gwei
 *
 * @param {number|string|BN} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {Object} - BN instance containing the new number
 */
export function toGwei(value, unit = 'ether') {
	return fromWei(value, unit) * 1000000000;
}

/**
 * Converts wei expressed as a BN instance into a human-readable fiat string
 *
 * @param {number} wei - BN corresponding to an amount of wei
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function weiToFiat(wei, conversionRate, currencyCode, decimalsToShow = 5) {
	const currency = CURRENCIES[currencyCode];
	if (!conversionRate) {
		if (currency?.symbol) {
			return `${currency?.symbol}${0.0}`;
		}
		return `0.00 ${currencyCode}`;
	}
	if (!wei || !isBN(wei) || !conversionRate) {
		if (currency?.symbol) {
			return `${currency?.symbol}${0.0}`;
		}
		return `0.00 ${currencyCode}`;
	}
	const value = renderAmount(weiToFiatNumberStr(wei, conversionRate, decimalsToShow));
	if (currency?.symbol) {
		return `${currency?.symbol}${value}`;
	}
	return `${value} ${currencyCode}`;
}

/**
 * Renders fiat amount with currency symbol if exists
 *
 * @param {number|string} amount  Number corresponding to a currency amount
 * @param {string} currencyCode Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function addCurrencySymbol(amount, currencyCode) {
	const currency = CURRENCIES[currencyCode];
	if (currency?.decimals) {
		amount = new BigNumber(amount).toFixed(currency.decimals);
	}
	amount = renderAmount(amount);
	if (currency?.symbol) {
		return `${currency.symbol}${amount}`;
	}
	return `${amount} ${currencyCode}`;
}

export function onlyAddCurrencySymbol(amount, currencyCode) {
	if (!amount) {
		return;
	}
	const currency = CURRENCIES[currencyCode];
	if (currency?.symbol) {
		return `${currency.symbol}${amount}`;
	}
	return `${amount} ${currencyCode}`;
}

/**
 * Converts wei expressed as a BN instance into a human-readable fiat string
 *
 * @param {number} wei - BN corresponding to an amount of wei
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {string} - The converted balance
 */
export function weiToFiatNumberStr(wei, conversionRate, decimalsToShow = 5) {
	const eth = fromWei(wei || '0').toString();
	const ethBigNumber = new BigNumber(eth);
	return decimalsInputValue(ethBigNumber.multipliedBy(conversionRate).toString(10), decimalsToShow);
}

/**
 * Handles wie input to have less or equal to 18 decimals
 *
 * @param {string} wei - Amount in decimal notation
 * @returns {string} - Number string with less or equal 18 decimals
 */
export function handleWeiNumber(wei) {
	const comps = wei.split('.');
	let fraction = comps[1];
	if (fraction && fraction.length > 18) {
		fraction = fraction.substring(0, 18);
	}
	const finalWei = fraction ? [comps[0], fraction].join('.') : comps[0];
	return finalWei;
}

/**
 * Converts fiat number as human-readable fiat string to wei expressed as a BN
 *
 * @param {number|string} fiat - Fiat number
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @returns {Object} - The converted balance as BN instance
 */
export function fiatNumberToWei(fiat, conversionRate) {
	const base = Math.pow(10, 18);
	const floatFiatConverted = new BigNumber(fiat)
		.div(conversionRate)
		.multipliedBy(base)
		.toFixed(0);

	return new BN(floatFiatConverted);
}

/**
 * Calculates fiat balance of an asset
 *
 * @param {number|string} balance - Number corresponding to a balance of an asset
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function balanceToFiat(balance, conversionRate, exchangeRate, currencyCode) {
	if (balance === undefined || balance === null || exchangeRate === undefined || exchangeRate === 0) {
		return undefined;
	}
	const fiatFixed = balanceToFiatNumberStr(balance, conversionRate, exchangeRate);
	return addCurrencySymbol(fiatFixed, currencyCode);
}

/**
 * Calculates fiat balance of an asset and returns a number
 *
 * @param {number|string} balance - Number or string corresponding to a balance of an asset
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {number} decimalsToShow - Decimals to 5
 * @returns {Number} - The converted balance
 */
export function balanceToFiatNumber(balance, conversionRate, exchangeRate, decimalsToShow = 5) {
	const balanceBigNumber = new BigNumber(balance);
	const fiatFixed = balanceBigNumber
		.multipliedBy(conversionRate)
		.multipliedBy(exchangeRate)
		.decimalPlaces(decimalsToShow, BigNumber.ROUND_FLOOR);
	return fiatFixed.isNaN() ? 0.0 : fiatFixed.toNumber();
}

export function balanceToFiatNumberStr(balance, conversionRate, exchangeRate, decimalsToShow = 5) {
	const balanceBigNumber = new BigNumber(balance);
	return decimalsInputValue(
		balanceBigNumber
			.multipliedBy(conversionRate)
			.multipliedBy(exchangeRate)
			.toString(10),
		decimalsToShow
	);
}

export function renderCoinValue(value: string) {
	if (!value) {
		return value;
	}
	const valueBigNumber = new BigNumber(value);
	if (valueBigNumber.eq(0)) {
		return value;
	}
	if (valueBigNumber.abs().lt(1)) {
		if (valueBigNumber.abs().lt(0.001)) {
			return valueBigNumber
				.toExponential(1)
				.toString()
				.toUpperCase();
		}
		return valueBigNumber.dp(4, BigNumber.ROUND_HALF_UP).toString();
	}
	const places = valueBigNumber.sd(true) - valueBigNumber.decimalPlaces();
	let index = (places - 1) / 3;
	index = new BigNumber(index).toFixed(0, 1);
	if (index <= 0) {
		return valueBigNumber.toFixed(2, BigNumber.ROUND_HALF_UP);
	}
	if (index > 11) {
		index = 11;
	}
	const char = ' KMBTqQsSond'[index];
	const base = Math.pow(10, index * 3);
	const sign = valueBigNumber.lt(0) ? '-' : '';
	const strValue = valueBigNumber
		.abs()
		.div(base)
		.toFixed(1, BigNumber.ROUND_HALF_UP);
	return `${sign}${strValue}${char}`;
}

export function convertUsdValue(value, conversionRate) {
	if (!value) {
		return value;
	}
	const valueBigNumber = new BigNumber(value);
	return valueBigNumber.multipliedBy(conversionRate).toString(10);
}

export function renderUsdValue(value, currencyCode, decimalsToShow = 2) {
	if (!value) {
		return value;
	}
	const ethBigNumber = new BigNumber(value);
	const strValue = ethBigNumber.toFixed(decimalsToShow, BigNumber.ROUND_HALF_UP);
	return onlyAddCurrencySymbol(strValue, currencyCode);
}

export function getCurrencySymbol(currencyCode) {
	const currency = CURRENCIES[currencyCode];
	if (currency?.symbol) {
		return `${currency?.symbol}`;
	}
	return currencyCode;
}

/**
 * Formats a fiat value into a string ready to be rendered
 *
 * @param {number} value - number corresponding to a balance of an asset
 * @param {string} currencyCode - Current currency code to display
 * @param {number} decimalsToShow - Decimals to 5
 * @returns {string} - The converted balance
 */
export function renderFiat(value, currencyCode, decimalsToShow = 5) {
	const valueBigNumber = new BigNumber(value);
	let fiatFixed = valueBigNumber.decimalPlaces(decimalsToShow, BigNumber.ROUND_HALF_UP);
	fiatFixed = fiatFixed.isNaN() ? 0.0 : fiatFixed.toNumber();
	const currency = CURRENCIES[currencyCode];
	if (currency?.symbol) {
		return `${currency.symbol}${fiatFixed}`;
	}
	return `${fiatFixed} ${currencyCode.toUpperCase()}`;
}

/**
 * Converts BN wei value to wei units in string format
 *
 * @param {object} value - Object containing wei value in BN format
 * @returns {string} - Corresponding wei value
 */
export function renderWei(value) {
	if (!value) {
		return '0';
	}
	const wei = fromWei(value);
	const renderWei = wei * Math.pow(10, 18);
	return renderWei.toString();
}

export function renderAmount(amount: string) {
	if (amount === undefined) {
		return amount;
	}
	amount += '';
	if (!isDecimal(amount)) {
		return amount;
	}
	const cd = amount.includes('.');
	amount = (amount + '').replace(/[^\d.\-E]/g, '') + '';
	const l = amount
		.split('.')[0]
		.split('')
		.reverse();
	let r = amount.split('.')[1];
	if (r === undefined && cd) {
		r = '';
	}
	let t = '';
	for (let i = 0; i < l.length; i++) {
		t += l[i] + ((i + 1) % 3 === 0 && i + 1 !== l.length ? ',' : '');
	}
	return r !== undefined
		? t
				.split('')
				.reverse()
				.join('') +
				'.' +
				r
		: t
				.split('')
				.reverse()
				.join('');
}

export function revertAmount(amount: string, decimals: number = undefined) {
	if (!amount) {
		return amount;
	}
	amount = amount.replace(/\s+/g, '');
	while (amount.includes(',')) {
		amount = amount.replace(',', '.');
	}
	if (decimals && amount.includes('.') && isDecimalValue(amount)) {
		const comps = amount.split('.');
		if (comps.length > 2) {
			return amount;
		}
		let fraction = comps[1];
		if (fraction.length <= decimals) {
			return amount;
		}
		fraction = fraction.substr(0, decimals);
		return '' + comps[0] + '.' + fraction;
	}
	return amount;
}

export function randomTransactionId() {
	return Math.random() * 10000000000000000;
}

export function fiatNumber(number: number, currencyCode) {
	if (!number || isNaN(number)) {
		return number;
	}
	const numberStr = number.toString();
	const index = numberStr.indexOf('.');
	if (index === 0) {
		return number;
	}
	const valueBigNumber = new BigNumber(numberStr);
	if (valueBigNumber.lt(1)) {
		if (valueBigNumber.lt(0.001) && valueBigNumber.gt(0)) {
			return valueBigNumber
				.toExponential(1)
				.toString()
				.toUpperCase();
		}
		return valueBigNumber.dp(4, BigNumber.ROUND_HALF_UP);
	}
	const currency = CURRENCIES[currencyCode];
	let decimal = 4;
	if (currency?.decimals) {
		decimal = currency?.decimals;
	}
	return new BigNumber(numberStr).decimalPlaces(decimal, BigNumber.ROUND_FLOOR);
}

export function calcDefiTokenPrices(token, opt) {
	const { currencyCode, currencyCodeRate } = opt;
	const price = token.priceUsd;
	const balanceFiatNumber = balanceToFiatNumber(1, currencyCodeRate, price);
	const balanceFiatUsdNumber = balanceToFiatNumber(1, 1, price);
	const balanceFiat = addCurrencySymbol(balanceFiatNumber, currencyCode);

	return {
		...token,
		priceUsd: price,
		price: fiatNumber(price * currencyCodeRate, currencyCode),
		balanceFiat,
		balanceFiatNumber,
		balanceFiatUsdNumber,
		safetyFactor: 1
	};
}

export function calcAssetPrices(asset, opt) {
	const { allContractBalances, allContractExchangeRates, allCurrencyPrice, currencyCode, currencyCodeRate } = opt;
	const itemAddress = safeToChecksumAddress(asset.address);
	const type = asset.type ? asset.type : ChainType.Ethereum;

	let balance;
	let price;
	let priceChange;

	if (util.isRpcChainType(type)) {
		price = 0;
		priceChange = 0;
		const rpcBalances = allContractBalances[type] || {};
		if (asset.nativeCurrency) {
			balance = '0x0' in rpcBalances ? renderFromWei(rpcBalances['0x0']) : 0;
		} else {
			balance =
				itemAddress in rpcBalances ? renderFromTokenMinimalUnit(rpcBalances[itemAddress], asset.decimals) : 0;
		}
	} else if (asset.lockType) {
		if (asset.nativeCurrency) {
			price = allCurrencyPrice[ChainType.Ethereum].usd;
			priceChange = allCurrencyPrice[ChainType.Ethereum].usd_24h_change;
			balance = renderFromWei(asset.amount);
		} else {
			const contractExchangeRates = allContractExchangeRates[ChainType.Ethereum] || {};
			price = itemAddress in contractExchangeRates ? contractExchangeRates[itemAddress].usd : 0;
			priceChange = itemAddress in contractExchangeRates ? contractExchangeRates[itemAddress].usd_24h_change : 0;
			balance = asset.amount ? renderFromTokenMinimalUnit(asset.amount, asset.decimals) : 0;
		}
	} else {
		if (asset.nativeCurrency) {
			const contractBalances = allContractBalances[type] || {};
			price = allCurrencyPrice[type]?.usd || 0;
			priceChange = allCurrencyPrice[type]?.usd_24h_change || 0;
			balance = '0x0' in contractBalances ? renderFromWei(contractBalances['0x0']) : 0;
		} else {
			if (type === ChainType.Arbitrum) {
				const contractExchangeRates = allContractExchangeRates[ChainType.Ethereum] || {};
				const arbContractBalances = allContractBalances[ChainType.Arbitrum] || {};
				const arbContractExchangeRates = allContractExchangeRates[ChainType.Arbitrum] || {};
				const l1Address = safeToChecksumAddress(asset.l1Address);
				price = arbContractExchangeRates?.[itemAddress]?.usd;
				if (!price) {
					price = l1Address in contractExchangeRates ? contractExchangeRates[l1Address].usd : 0;
				}
				priceChange = arbContractExchangeRates?.[itemAddress]?.usd_24h_change;
				if (!priceChange) {
					priceChange =
						l1Address in contractExchangeRates ? contractExchangeRates[l1Address].usd_24h_change : 0;
				}
				balance =
					itemAddress in arbContractBalances
						? renderFromTokenMinimalUnit(arbContractBalances[itemAddress], asset.decimals)
						: 0;
			} else {
				const contractExchangeRates = allContractExchangeRates[type] || {};
				const contractBalances = allContractBalances[type] || {};
				price = itemAddress in contractExchangeRates ? contractExchangeRates[itemAddress].usd : 0;
				priceChange =
					itemAddress in contractExchangeRates ? contractExchangeRates[itemAddress].usd_24h_change : 0;
				balance =
					itemAddress in contractBalances
						? renderFromTokenMinimalUnit(contractBalances[itemAddress], asset.decimals)
						: 0;
			}
		}
	}

	if (price === undefined) {
		price = 0;
	}
	if (!priceChange === undefined) {
		priceChange = 0;
	}

	const { SecurityController } = EngineContext();
	const securityTokens = SecurityController.state.securityTokens || [];
	const risk_token =
		!asset.nativeCurrency &&
		!asset.lockType &&
		!asset.isTrust &&
		!!securityTokens.find(
			securityToken =>
				getChainIdByType(type) === securityToken.chainId &&
				safeToChecksumAddress(securityToken.address) === itemAddress &&
				securityToken.risk?.length > 0
		);

	const balanceFiatNumber = balanceToFiatNumber(balance, currencyCodeRate, price);
	const balanceFiatUsdNumber = balanceToFiatNumber(balance, 1, price);
	const balanceFiat = addCurrencySymbol(balanceFiatNumber, currencyCode);

	let safetyFactor = 1;
	if (risk_token) {
		safetyFactor = 0;
	}

	return {
		...asset,
		priceUsd: price,
		price: fiatNumber(price * currencyCodeRate, currencyCode),
		priceChange,
		balance,
		balanceFiat,
		balanceFiatNumber,
		balanceFiatUsdNumber,
		safetyFactor
	};
}

export async function calcAllAddressPrices() {
	const { PreferencesController } = Engine.context;
	const identities = PreferencesController.state.identities;
	let allAmountOfChain = {};
	let allBalanceOfChain = {};

	let allAmount = 0;

	const keys = Object.keys(identities);
	for (const ids of keys) {
		if (!(await Engine.context.PreferencesController.isObserveAddress(ids))) {
			const { allUsdAmount, allBalance } = calcAddressPrices(ids);
			for (const type in allUsdAmount) {
				const chainType = Number(type);
				if (!allAmountOfChain[chainType]) {
					allAmountOfChain[chainType] = 0;
				}
				allAmountOfChain[chainType] += allUsdAmount[chainType];
				allAmount += allUsdAmount[chainType];
			}
			for (const type in allBalance) {
				const chainType = Number(type);
				if (!allBalanceOfChain[chainType]) {
					allBalanceOfChain[chainType] = 0;
				}
				allBalanceOfChain[chainType] += allBalance[chainType];
			}
		}
	}

	return {
		allAmount,
		allAmountOfChain,
		allBalanceOfChain
	};
}

export function calcAddressPrices(selectedAddress) {
	const { AssetsController, TokenBalancesController, TokenRatesController } = Engine.context;
	const allTokens = AssetsController.state.allTokens[selectedAddress] || [];
	const allContractBalances = TokenBalancesController.state.allContractBalances[selectedAddress] || {};
	const allContractExchangeRates = TokenRatesController.state.allContractExchangeRates || {};
	const allCurrencyPrice = TokenRatesController.state.allCurrencyPrice;
	const currencyCodeRate = TokenRatesController.state.currencyCodeRate;
	const currencyCode = TokenRatesController.state.currencyCode;

	const { unconfirmed_interval } = EngineContracts()[ChainType.Arbitrum].config;
	let arbWithdraws = EngineContracts()[ChainType.Arbitrum].state.withdraws;
	const arbChainId = EngineNetworks()[ChainType.Arbitrum].state.provider.chainId;
	arbWithdraws = arbWithdraws?.filter(
		item =>
			!(
				item.chainId !== arbChainId ||
				item.processed ||
				item.destination?.toLowerCase() !== selectedAddress.toLowerCase() ||
				(item.unconfirmed_timestamp && Date.now() - item.unconfirmed_timestamp < unconfirmed_interval)
			)
	);
	const { unconfirmed_interval: polygon_unconfirmed_interval } = EngineContracts()[ChainType.Polygon].config;
	let polygonWithdraws = EngineContracts()[ChainType.Polygon].state.withdraws;
	const polygonChainId = EngineNetworks()[ChainType.Polygon].state.provider.chainId;
	polygonWithdraws = polygonWithdraws?.filter(
		item =>
			!(
				item.chainId !== polygonChainId ||
				item.processed ||
				item.destination?.toLowerCase() !== selectedAddress.toLowerCase() ||
				(item.unconfirmed_timestamp && Date.now() - item.unconfirmed_timestamp < polygon_unconfirmed_interval)
			)
	);

	const opt = {
		allContractBalances,
		allContractExchangeRates,
		allCurrencyPrice,
		currencyCode,
		currencyCodeRate
	};

	let allUsdAmount = {};
	let allCurrencyAmount = {};
	let allBalance = {};

	const networks = EngineNetworks();
	for (const type in networks) {
		const chainType = Number(type);
		if (chainType === ChainType.RPCBase) {
			continue;
		}
		const chainId = networks[type].state.provider.chainId;
		const nativeAsset = {
			type: chainType,
			nativeCurrency: true
		};
		const tokens = allTokens[chainId] || [];
		let { totalUsdAmount, totalCurrencyAmount, totalBalance } = calcAddressSinglePrices(
			nativeAsset,
			tokens,
			chainType,
			opt
		);
		allUsdAmount[chainType] = totalUsdAmount;
		allCurrencyAmount[chainType] = totalCurrencyAmount;
		allBalance[chainType] = totalBalance;

		if (chainType === ChainType.Ethereum) {
			if (arbWithdraws?.length) {
				const items = arbWithdraws.map(item => ({
					...item,
					address: item.token.address,
					decimals: item.token.decimals,
					amount: item.token.amount,
					nativeCurrency: item.token.nativeCurrency,
					type: ChainType.Ethereum,
					lockType: LockType.LockArb
				}));
				const result = calcAddressSinglePrices(null, items, ChainType.Ethereum, opt);
				allUsdAmount[chainType] += result.totalUsdAmount;
				allCurrencyAmount[chainType] += result.totalCurrencyAmount;
				allBalance[chainType] += result.totalBalance;
			}

			if (polygonWithdraws?.length) {
				const items = polygonWithdraws.map(item => ({
					...item,
					address: item.token.address,
					decimals: item.token.decimals,
					amount: item.token.amount,
					nativeCurrency: item.token.nativeCurrency,
					type: ChainType.Ethereum,
					lockType: LockType.LockPolygon
				}));
				const result = calcAddressSinglePrices(null, items, ChainType.Ethereum, opt);

				allUsdAmount[chainType] += result.totalUsdAmount;
				allCurrencyAmount[chainType] += result.totalCurrencyAmount;
				allBalance[chainType] += result.totalBalance;
			}
		}
	}

	return {
		allUsdAmount,
		allCurrencyAmount,
		allBalance
	};
}

export function calcAddressSinglePrices(nativeCurrencyAsset, tokens, type, opt) {
	let totalUsdAmount = 0;
	let totalCurrencyAmount = 0;
	let totalBalance = 0;
	if (nativeCurrencyAsset) {
		const { balanceFiatUsdNumber, balanceFiatNumber, balance, safetyFactor } = calcAssetPrices(
			nativeCurrencyAsset,
			opt
		);
		totalUsdAmount += balanceFiatUsdNumber * safetyFactor;
		totalCurrencyAmount += balanceFiatNumber * safetyFactor;
		totalBalance = balance;
	}
	tokens?.forEach(asset => {
		asset.type = type;
		const { balanceFiatUsdNumber, balanceFiatNumber, balance, safetyFactor } = calcAssetPrices(asset, opt);
		totalUsdAmount += balanceFiatUsdNumber * safetyFactor;
		totalCurrencyAmount += balanceFiatNumber * safetyFactor;
		totalBalance = balance;
	});
	if (isNumberStr(totalBalance)) {
		totalBalance = Number(totalBalance);
	} else {
		totalBalance = 0;
	}
	return { totalUsdAmount, totalCurrencyAmount, totalBalance };
}

const rpcLogo = 'https://pali-images.s3.amazonaws.com/files/rpc.png';

export async function getAssetLogo(asset) {
	const type = asset.type ? asset.type : ChainType.Ethereum;
	if (util.isRpcChainType(asset.type)) {
		if (asset.nativeCurrency) {
			const name = getRpcNickname(asset.type);
			if (util.toLowerCaseEquals('eth', name)) {
				return NetworkConfig[ChainType.Ethereum]?.CurrencyLogo;
			}
			return rpcLogo;
		}
	} else if (asset.nativeCurrency) {
		return NetworkConfig[type]?.CurrencyLogo;
	}

	const token = await callSqlite('getStaticToken', type, asset.address, asset.l1Address);
	const result = token?.image;

	if (!util.isEtherscanAvailable() && result && result.includes('coingecko.com')) {
		return `https://pali.pollum.cloud/proxy-png?url=${result}`;
	}
	return result;
}

export function getNativeCurrencyBalance(type, opt) {
	const { allContractBalances } = opt;
	let balanceBN;
	const contractBalances = allContractBalances?.[type];
	if (contractBalances) {
		balanceBN = '0x0' in contractBalances ? contractBalances['0x0'] : new BN(0);
	} else {
		balanceBN = new BN(0);
	}
	return balanceBN;
}

export function getTokenBalance(asset, opt) {
	const { allContractBalances } = opt;
	const { type, address } = asset;
	let weiBalance;
	const contractBalances = allContractBalances?.[type];
	if (contractBalances) {
		weiBalance = address in contractBalances ? contractBalances[address] : new BN(0);
	} else {
		weiBalance = new BN(0);
	}
	return weiBalance;
}

export const getTokenDecimals = async (type, to) => {
	if (util.isRpcChainType(type)) {
		return await EngineContracts()[ChainType.RPCBase].callContract(type, 'getTokenDecimals', to);
	} else {
		return await EngineContracts()[type]?.getTokenDecimals(to);
	}
};

export const getAssetSymbol = async (type, to) => {
	if (util.isRpcChainType(type)) {
		return await EngineContracts()[ChainType.RPCBase].callContract(type, 'getAssetSymbol', to);
	} else {
		return await EngineContracts()[type]?.getAssetSymbol(to);
	}
};

export function getChainTypeByChainId(chainId) {
	chainId = chainId && chainId.toString();
	for (const type in NetworkConfig) {
		const chainType = Number(type);
		for (const key in NetworkConfig[type].Networks) {
			if (NetworkConfig[type].Networks[key].provider.chainId === chainId) {
				return chainType;
			}
		}
	}
	const type = getRpcChainTypeByChainId(chainId);
	if (type) {
		return type;
	}
	return ChainType.Ethereum;
}

export function getChainIdByType(type) {
	if (util.isRpcChainType(type)) {
		return getRpcProviderChainId(type);
	} else {
		return EngineNetworks()[type]?.state.provider.chainId;
	}
}

export function getNetworkController(chainId) {
	chainId = chainId && chainId.toString();
	if (isRpcChainId(chainId)) {
		return EngineNetworks()[ChainType.RPCBase];
	} else {
		return EngineNetworks()[getChainTypeByChainId(chainId)];
	}
}

export async function isEIP1559Compatibility(chainId) {
	chainId = chainId && chainId.toString();
	const networkController = getNetworkController(chainId);
	return networkController?.getEIP1559Compatibility?.();
}

export const toHexadecimal = decimal => {
	if (!decimal) {
		return decimal;
	}
	if (decimal !== typeof 'string') {
		decimal = String(decimal);
	}
	if (decimal.startsWith('0x')) {
		return decimal;
	}
	return new BigNumber(decimal, 10).toString(16);
};

export function getTickerByType(type) {
	if (util.isRpcChainType(type)) {
		return getRpcProviderTicker(type);
	} else {
		return EngineNetworks()[type]?.state.provider.ticker;
	}
}

export const getTokenName = type => {
	if (type === ChainType.Bsc) {
		return 'BEP20';
	} else if (type === ChainType.Heco) {
		return 'HRC20';
	}
	return 'ERC20';
};

export const getChainTypeNameByChainId = chainId => getChainTypeName(getChainTypeByChainId(chainId));

export async function getMigrationContracts() {
	const arbContract = EngineContracts()[ChainType.Arbitrum];
	const polygonContract = EngineContracts()[ChainType.Polygon];
	const contracts = [];
	const addr1 = await arbContract.getdepositETHMethodId();
	if (addr1?.[0]) {
		contracts.push({ addr: addr1[0].toLowerCase(), mid: `0x${addr1[1]}` });
	}
	const addr2 = await arbContract.getdepositMethodId();
	if (addr2?.[0]) {
		contracts.push({ addr: addr2[0].toLowerCase(), mid: `0x${addr2[1]}` });
	}
	const addr3 = await arbContract.getexecuteTransactionMethodId();
	if (addr3?.[0]) {
		contracts.push({ addr: addr3[0].toLowerCase(), mid: `0x${addr3[2]}` });
	}
	if (addr3?.[1]) {
		contracts.push({ addr: addr3[1].toLowerCase(), mid: `0x${addr3[2]}` });
	}
	const addr4 = await polygonContract.getdepositEtherForUserMethodId();
	if (addr4?.[0]) {
		contracts.push({ addr: addr4[0].toLowerCase(), mid: `0x${addr4[1]}` });
	}
	const addr5 = await polygonContract.getdepositERC20ForUserMethodId();
	if (addr5?.[0]) {
		contracts.push({ addr: addr5[0].toLowerCase(), mid: `0x${addr5[1]}` });
	}
	const addr6 = await polygonContract.getexitERC20MethodId();
	if (addr6?.[0]) {
		contracts.push({ addr: addr6[0].toLowerCase(), mid: `0x${addr6[1]}` });
	}
	const addr7 = await polygonContract.getdepositERC20ForUserMethodId2();
	if (addr7?.[0]) {
		contracts.push({ addr: addr7[0].toLowerCase(), mid: `0x${addr7[1]}` });
	}
	return contracts;
}

export async function getClaimContracts() {
	const arbContract = EngineContracts()[ChainType.Arbitrum];
	const contracts = [];
	const addr3 = await arbContract.getexecuteTransactionMethodId();
	if (addr3?.[0]) {
		contracts.push({ addr: addr3[0].toLowerCase(), mid: `0x${addr3[2]}` });
	}
	if (addr3?.[1]) {
		contracts.push({ addr: addr3[1].toLowerCase(), mid: `0x${addr3[2]}` });
	}
	return contracts;
}

export function getClaimValues(txs) {
	const values = {};
	if (!txs) {
		return values;
	}
	txs.forEach(tx => {
		if (tx.transactionHash && tx.transaction?.data) {
			values[tx.transactionHash] = tx.transaction.data.substr(522, 64);
		}
	});
	return values;
}

export function getEip155Url(nft) {
	return `eip155:1/${nft?.asset_contract?.schema_name}:${nft?.address}/${nft?.token_id}`.toLowerCase();
}

export function extractTicker(text) {
	const match = text.match(/<em>([^<]+)<\/em>/);
	return match ? match[1] : text;
}

export default {
	calcAssetPrices,
	getAssetLogo,
	calcDefiTokenPrices
};
