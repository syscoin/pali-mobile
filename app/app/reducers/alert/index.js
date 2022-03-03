const initialState = {
	isVisible: false,
	autodismiss: null,
	content: null,
	data: null,
	flag: null
};

const alertReducer = (state = initialState, action) => {
	switch (action.type) {
		case 'SHOW_ALERT':
			return {
				...state,
				isVisible: true,
				autodismiss: action.autodismiss,
				content: action.content,
				data: action.data,
				flag: action.flag
			};
		case 'HIDE_ALERT':
			return {
				...state,
				isVisible: false,
				autodismiss: null,
				flag: null
			};
		default:
			return state;
	}
};
export default alertReducer;
