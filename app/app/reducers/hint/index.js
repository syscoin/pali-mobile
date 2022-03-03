import { REHYDRATE } from 'redux-persist';

const initialState = {
	showHint: false,
	hintText: ''
};

const alertReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			return {
				showHint: false
			};
		case 'SHOW_HINT':
			return {
				...state,
				showHint: true,
				hintText: action.hintText
			};
		case 'HIDE_HINT':
			return {
				...state,
				showHint: false
			};
		default:
			return state;
	}
};
export default alertReducer;
