import { REHYDRATE } from 'redux-persist';

const initialState = {
	isVisible: false,
	isIconVisible: false
};

const walletconnectReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				...state,
				isVisible: false
			};
		case 'SHOW_WALLETCONNECT_LIST':
			return {
				...state,
				isVisible: true
			};
		case 'HIDE_WALLETCONNECT_LIST':
			return {
				...state,
				isVisible: false
			};
		case 'SHOW_WALLETCONNECT_ICON':
			return {
				...state,
				isIconVisible: true
			};
		case 'HIDE_WALLETCONNECT_ICON':
			return {
				...state,
				isIconVisible: false
			};
		default:
			return state;
	}
};
export default walletconnectReducer;
