import { REHYDRATE } from 'redux-persist';
import { ChainType, util } from 'gopocket-core';
import { SORT_NETWORTH } from '../../constants/storage';

const initialState = {
	testnetVisible: false,
	useTestServer: false,
	updateConfig: {},
	appstoreBaseVersion: 0,
	etherNetworkChanging: null,
	bscNetworkChanging: null,
	polygonNetworkChanging: null,
	arbitrumNetworkChanging: null,
	optimismNetworkChanging: null,
	tronNetworkChanging: null,
	hecoNetworkChanging: null,
	avaxNetworkChanging: null,
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
				return {
					...state,
					...action.payload.settings,
					etherNetworkChanging: null,
					bscNetworkChanging: null,
					polygonNetworkChanging: null,
					arbitrumNetworkChanging: null,
					optimismNetworkChanging: null,
					tronNetworkChanging: null,
					hecoNetworkChanging: null,
					avaxNetworkChanging: null,
					isLockScreen: false
				};
			}
			util.setUseTestServer(false);
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
			switch (action.chainType) {
				case ChainType.Bsc: {
					return {
						...state,
						bscNetworkChanging: action.change
					};
				}
				case ChainType.Polygon: {
					return {
						...state,
						polygonNetworkChanging: action.change
					};
				}
				case ChainType.Arbitrum: {
					return {
						...state,
						arbitrumNetworkChanging: action.change
					};
				}
				case ChainType.Optimism: {
					return {
						...state,
						optimismNetworkChanging: action.change
					};
				}
				case ChainType.Ethereum: {
					return {
						...state,
						etherNetworkChanging: action.change
					};
				}
				case ChainType.Tron: {
					return {
						...state,
						tronNetworkChanging: action.change
					};
				}
				case ChainType.Heco: {
					return {
						...state,
						hecoNetworkChanging: action.change
					};
				}
				case ChainType.Avax: {
					return {
						...state,
						avaxNetworkChanging: action.change
					};
				}
			}
			return state;
		case 'END_NETWORK_CHANGE':
			switch (action.chainType) {
				case ChainType.Bsc: {
					if (state.bscNetworkChanging === action.change) {
						return {
							...state,
							bscNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Polygon: {
					if (state.polygonNetworkChanging === action.change) {
						return {
							...state,
							polygonNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Arbitrum: {
					if (state.arbitrumNetworkChanging === action.change) {
						return {
							...state,
							arbitrumNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Optimism: {
					if (state.optimismNetworkChanging === action.change) {
						return {
							...state,
							optimismNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Ethereum: {
					if (state.etherNetworkChanging === action.change) {
						return {
							...state,
							etherNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Tron: {
					if (state.tronNetworkChanging === action.change) {
						return {
							...state,
							tronNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Heco: {
					if (state.hecoNetworkChanging === action.change) {
						return {
							...state,
							hecoNetworkChanging: null
						};
					}
					break;
				}
				case ChainType.Avax: {
					if (state.avaxNetworkChanging === action.change) {
						return {
							...state,
							avaxNetworkChanging: null
						};
					}
					break;
				}
			}
			return state;
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
