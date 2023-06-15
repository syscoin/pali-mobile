import { getNativeCurrencyBalance, getTokenBalance, isDecimal, isZero, toTokenMinimalUnit, toWei } from './number';
import { strings } from '../../locales/i18n';
import { ChainType, util } from 'paliwallet-core';
import { estimateTransactionTotalGas } from './custom-gas';
import { getRpcProviderChainId } from './ControllerUtils';
import Engine from '../core/Engine';

export const getEstimatedTotalGas = async opt => {
	const { selectedAddress, asset } = opt;
	let txChainId;
	if (util.isRpcChainType(asset.type)) {
		txChainId = getRpcProviderChainId(asset.type);
	} else {
		txChainId = Engine.networks[asset.type]?.state.provider.chainId;
	}
	let minGas;
	if (asset.type === ChainType.Arbitrum) {
		minGas = 800000;
	}
	return await estimateTransactionTotalGas(selectedAddress, selectedAddress, txChainId, minGas);
};

export function validateAmount(inputValue, opt) {
	const { allContractBalances, asset, estimatedTotalGas } = opt;
	let weiBalance, weiInput, amountError;
	if (isDecimal(inputValue) && !isZero(inputValue)) {
		if (asset.nativeCurrency) {
			weiBalance = getNativeCurrencyBalance(asset.type, {
				allContractBalances
			});
			weiInput = toWei(inputValue);
			if (estimatedTotalGas) {
				weiInput = weiInput.add(estimatedTotalGas);
			}
		} else {
			weiBalance = getTokenBalance(asset, {
				allContractBalances
			});
			weiInput = toTokenMinimalUnit(inputValue, asset.decimals);
		}
		amountError = weiBalance && weiBalance.gte(weiInput) ? undefined : strings('transaction.insufficient');
	} else {
		amountError = strings('transaction.invalid_amount');
	}
	return amountError;
}
