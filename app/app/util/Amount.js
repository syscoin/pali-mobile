import { getNativeCurrencyBalance, getTokenBalance, isDecimal, isZero, toTokenMinimalUnit, toWei } from './number';
import { strings } from '../../locales/i18n';
import { ChainType, util } from 'gopocket-core';
import { estimateTransactionTotalGas } from './custom-gas';
import { getRpcProviderChainId } from './ControllerUtils';

export const getEstimatedTotalGas = async opt => {
	const {
		selectedAddress,
		asset,
		arbChainId,
		chainId,
		bscChainId,
		polygonChainId,
		hecoChainId,
		opChainId,
		avaxChainId
	} = opt;
	let txChainId;
	if (asset.type === ChainType.Bsc) {
		txChainId = bscChainId;
	} else if (asset.type === ChainType.Arbitrum) {
		txChainId = arbChainId;
	} else if (asset.type === ChainType.Polygon) {
		txChainId = polygonChainId;
	} else if (asset.type === ChainType.Heco) {
		txChainId = hecoChainId;
	} else if (asset.type === ChainType.Optimism) {
		txChainId = opChainId;
	} else if (asset.type === ChainType.Avax) {
		txChainId = avaxChainId;
	} else if (util.isRpcChainType(asset.type)) {
		txChainId = getRpcProviderChainId(asset.type);
	} else {
		txChainId = chainId;
	}
	let minGas;
	if (asset.type === ChainType.Arbitrum) {
		minGas = 800000;
	}
	return await estimateTransactionTotalGas(selectedAddress, selectedAddress, txChainId, minGas);
};

export function validateAmount(inputValue, opt) {
	const {
		contractBalances,
		asset,
		arbContractBalances,
		opContractBalances,
		bscContractBalances,
		polygonContractBalances,
		hecoContractBalances,
		avaxContractBalances,
		rpcContractBalances,
		estimatedTotalGas
	} = opt;
	let weiBalance, weiInput, amountError;
	if (isDecimal(inputValue) && !isZero(inputValue)) {
		if (asset.nativeCurrency) {
			weiBalance = getNativeCurrencyBalance(asset.type, {
				contractBalances,
				bscContractBalances,
				arbContractBalances,
				opContractBalances,
				polygonContractBalances,
				hecoContractBalances,
				avaxContractBalances,
				rpcContractBalances
			});
			weiInput = toWei(inputValue);
			if (estimatedTotalGas) {
				weiInput = weiInput.add(estimatedTotalGas);
			}
		} else {
			weiBalance = getTokenBalance(asset, {
				contractBalances,
				bscContractBalances,
				arbContractBalances,
				opContractBalances,
				polygonContractBalances,
				hecoContractBalances,
				avaxContractBalances,
				rpcContractBalances
			});
			weiInput = toTokenMinimalUnit(inputValue, asset.decimals);
		}
		amountError = weiBalance && weiBalance.gte(weiInput) ? undefined : strings('transaction.insufficient');
	} else {
		amountError = strings('transaction.invalid_amount');
	}
	return amountError;
}
