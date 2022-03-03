import { REHYDRATE } from 'redux-persist';
import { getTxData, getTxMeta } from '../../util/transaction-reducer-helpers';

const initialState = {
	ensRecipient: undefined,
	selectedAsset: {},
	transaction: {
		data: undefined,
		from: undefined,
		gas: undefined,
		gasPrice: undefined,
		to: undefined,
		value: undefined,
		chainId: undefined,
		maxFeePerGas: undefined,
		maxPriorityFeePerGas: undefined,
		estimatedBaseFee: undefined
	},
	transactionTo: undefined,
	transactionToName: undefined,
	transactionFromName: undefined,
	transactionValue: undefined,
	symbol: undefined,
	id: undefined,
	type: undefined,
	nativeCurrency: undefined
};

const transactionReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...initialState
			};
		case 'RESET_TRANSACTION':
			return {
				...state,
				...initialState
			};
		case 'SET_RECIPIENT':
			return {
				...state,
				transaction: { ...state.transaction, from: action.from },
				ensRecipient: action.ensRecipient,
				transactionTo: action.to,
				transactionToName: action.transactionToName,
				transactionFromName: action.transactionFromName
			};
		case 'SET_SELECTED_ASSET': {
			const selectedAsset = action.selectedAsset;
			return {
				...state,
				selectedAsset,
				nativeCurrency: selectedAsset.nativeCurrency
			};
		}
		case 'PREPARE_TRANSACTION':
			return {
				...state,
				transaction: action.transaction
			};
		case 'SET_TRANSACTION_OBJECT': {
			const selectedAsset = action.transaction.selectedAsset;
			if (selectedAsset) {
				action.transaction.nativeCurrency = selectedAsset.nativeCurrency;
			}
			const txMeta = getTxMeta(action.transaction);
			return {
				...state,
				transaction: {
					...state.transaction,
					...getTxData(action.transaction)
				},
				...txMeta
			};
		}
		case 'SET_TOKENS_TRANSACTION': {
			return {
				...state,
				type: 'TOKENS_TRANSACTION',
				selectedAsset: action.asset,
				nativeCurrency: action.asset?.nativeCurrency
			};
		}
		case 'SET_ETHER_TRANSACTION':
			return {
				...state,
				symbol: action.transaction?.ticker,
				nativeCurrency: true,
				selectedAsset: { nativeCurrency: true, symbol: action.transaction?.ticker },
				type: 'ETHER_TRANSACTION',
				...getTxMeta(action.transaction),
				transaction: getTxData(action.transaction)
			};
		case 'SET_INDIVIDUAL_COLLECTIBLE_TRANSACTION':
			return {
				...state,
				selectedAsset: action.collectible,
				type: 'INDIVIDUAL_COLLECTIBLE_TRANSACTION'
			};
		case 'SET_COLLECTIBLE_CONTRACT_TRANSACTION':
			return {
				...state,
				selectedAsset: action.collectible,
				type: 'CONTRACT_COLLECTIBLE_TRANSACTION'
			};
		default:
			return state;
	}
};
export default transactionReducer;
