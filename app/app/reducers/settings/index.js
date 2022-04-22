import { REHYDRATE } from 'redux-persist';
import { util } from 'gopocket-core';
import { SORT_NETWORTH } from '../../constants/storage';
import NativeThreads from '../../threads/NativeThreads';

const initialState = {
	testnetVisible: false,
	useTestServer: false,
	updateConfig: {},
	appstoreBaseVersion: 0,
	allNetworkChanging: {},
	contractList: [],
	approveList: [],
	isLockScreen: false,
	currentSortType: SORT_NETWORTH,
	hideRiskTokens: true,
	famousAccounts: []
};

const settingsReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.settings) {
				const useTestServer = action.payload.settings.useTestServer
					? action.payload.settings.useTestServer
					: false;
				util.setUseTestServer(useTestServer);
				NativeThreads.get().callEngineAsync('setUseTestServer', useTestServer);
				return {
					...state,
					...action.payload.settings,
					allNetworkChanging: {},
					isLockScreen: false
				};
			}
			util.setUseTestServer(false);
			NativeThreads.get().callEngineAsync('setUseTestServer', false);
			return state;
		case 'TOGGLE_TESTNET_VISIBILE':
			return {
				...state,
				testnetVisible: !state.testnetVisible
			};
		case 'USE_TEST_SERVER':
			return {
				...state,
				useTestServer: action.useTestServer
			};
		case 'SET_UPDATE_CONFIG':
			return {
				...state,
				updateConfig: action.updateConfig
			};
		case 'SET_APPSTORE_BASE_VERSION':
			return {
				...state,
				appstoreBaseVersion: action.appstoreBaseVersion
			};
		case 'START_NETWORK_CHANGE':
			state.allNetworkChanging[action.chainType] = action.change;
			return { ...state };
		case 'END_NETWORK_CHANGE':
			state.allNetworkChanging[action.chainType] = null;
			return { ...state };
		case 'UPDATE_CONTRACT_LIST':
			return {
				...state,
				contractList: action.contractList
			};
		case 'ADD_APPROVE_INFO':
			if (state.approveList.find(info => info.metaID === action.info.metaID)) {
				return state;
			}
			return {
				...state,
				approveList: [state.approveList, { ...action.info }]
			};
		case 'REMOVE_APPROVE_INFO':
			return {
				...state,
				approveList: [...state.approveList.filter(info => info.metaID !== action.metaID)]
			};
		case 'UPDATE_LOCK_SCREEN':
			return {
				...state,
				isLockScreen: action.locked
			};
		case 'UPDATE_SORT_TYPE':
			return {
				...state,
				currentSortType: action.sortType
			};
		case 'SET_HIDE_RISK_TOKENS':
			return {
				...state,
				hideRiskTokens: action.hideRiskTokens
			};
		case 'UPDATE_FAMOUS_ACCOUNTS':
			return {
				...state,
				famousAccounts: action.famousAccounts
			};
		default:
			return state;
	}
};
export default settingsReducer;
