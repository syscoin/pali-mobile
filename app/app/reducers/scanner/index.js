import { REHYDRATE } from 'redux-persist';

const initialState = {
	isVisible: false,
	isVisibleInModal: false,
	onStartScan: null,
	onScanError: null,
	onScanSuccess: null
};

const scannerReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...state,
				isVisible: false,
				isVisibleInModal: false
			};
		case 'SHOW_SCANNER':
			return {
				...state,
				isVisible: true,
				onStartScan: action.onStartScan,
				onScanError: action.onScanError,
				onScanSuccess: action.onScanSuccess
			};
		case 'SHOW_SCANNER_IN_MODAL':
			return {
				...state,
				isVisibleInModal: true,
				onStartScan: action.onStartScan,
				onScanError: action.onScanError,
				onScanSuccess: action.onScanSuccess
			};
		case 'HIDE_SCANNER':
			return {
				...state,
				isVisible: false,
				isVisibleInModal: false
			};
		default:
			return state;
	}
};
export default scannerReducer;
