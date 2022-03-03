import { REHYDRATE } from 'redux-persist';
import Engine from '../../core/Engine';
import { store } from '../../store';

const initialState = {
	backgroundState: {}
};

const engineReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE: {
			// 构造controllers对象并初始化state
			Engine.init(action.payload && action.payload.engine && action.payload.engine.backgroundState);

			// 监听controllers state变化
			for (const item in Engine.context) {
				Engine.context[item].subscribe(state => {
					store.dispatch({ type: 'UPDATE_BG_STATE', key: item, state });
				});
			}
			const _state = (action.payload && action.payload.engine && action.payload.engine.backgroundState) || {};
			return { backgroundState: { ..._state } };
		}
		case 'UPDATE_BG_STATE':
			return {
				backgroundState: { ...state.backgroundState, [action.key]: action.state }
			};
		default:
			return state;
	}
};

export default engineReducer;
