import { REHYDRATE } from 'redux-persist';

const initialState = {
	collectibleContractModalVisible: false,
	receiveModalVisible: false,
	receiveAsset: undefined,
	dappTransactionModalVisible: false,
	approveModalVisible: false,
	approveModalVisibleInModal: false,
	ongoingTransactionsModalVisible: false
};

const modalsReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...state,
				approveModalVisibleInModal: false,
				approveModalVisible: false
			};
		case 'TOGGLE_RECEIVE_MODAL': {
			return {
				...state,
				receiveModalVisible: !state.receiveModalVisible,
				receiveAsset: action.asset
			};
		}
		case 'TOGGLE_COLLECTIBLE_CONTRACT_MODAL':
			return {
				...state,
				collectibleContractModalVisible: !state.collectibleContractModalVisible
			};
		case 'TOGGLE_DAPP_TRANSACTION_MODAL':
			return {
				...state,
				dappTransactionModalVisible: action.show === null ? !state.dappTransactionModalVisible : action.show
			};
		case 'TOGGLE_APPROVE_MODAL':
			return {
				...state,
				approveModalVisible: !state.approveModalVisible
			};
		case 'TOGGLE_APPROVE_MODAL_IN_MODAL':
			return {
				...state,
				approveModalVisibleInModal: !state.approveModalVisibleInModal
			};
		case 'TOGGLE_ONGOING_TRANSACTIONS_MODAL':
			return {
				...state,
				ongoingTransactionsModalVisible:
					action.show === null ? !state.ongoingTransactionsModalVisible : action.show
			};
		default:
			return state;
	}
};
export default modalsReducer;
