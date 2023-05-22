import { REHYDRATE } from 'redux-persist';
import { URL, util } from 'gopocket-core';
import { getLanguageDapp, setActiveTab } from '../../util/browser';
import AppConstants from '../../core/AppConstants';

const initialState = {
	defaultChainTypesV2: {
		'app.dodoex.co|||network=mainnet': 1,
		'app.dodoex.co|||network=bsc-mainnet': 4,
		'app.dodoex.co|||network=matic': 8,
		'app.dodoex.io|||network=mainnet': 1,
		'app.dodoex.io|||network=bsc-mainnet': 4,
		'app.dodoex.io|||network=matic': 8,
		'app.1inch.io|||#/1/': 1,
		'app.1inch.io|||#/56/': 4,
		'app.1inch.io|||#/137/': 8
	},
	dappPage: {},
	tabs: [],
	// url: string, hostname: string, name: string, desc: string, chain: number, logo: string, pos: number, del: number, timestamp: string
	favouriteDapps: []
};

const { HOMEPAGE_URL } = AppConstants;

const MAX_POS = 0x100000000;

const browserReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.browser) {
				return { ...state, ...action.payload.browser };
			}
			return state;
		case 'UPDATE_DEFAULT_CHAIN_TYPES':
			return {
				...state,
				defaultChainTypesV2: action.chainTypes
			};
		case 'UPDATE_DAPP_PAGE':
			return {
				...state,
				dappPage: { ...action.dappPage, timestamp: Date.now() }
			};
		case 'CLOSE_TAB': {
			const currentTab = state.tabs.find(tab => tab.id === action.id);
			const activeIndex = state.tabs.indexOf(currentTab);

			const filterTabs = state.tabs.filter(tab => tab.id !== action.id);
			let activeTab = state.tabs.find(tab => tab.id === action.activeTabId);
			if (filterTabs.length > 0) {
				if (activeIndex <= filterTabs.length - 1) {
					activeTab = filterTabs[activeIndex];
				} else {
					activeTab = filterTabs[activeIndex - 1];
				}
			}
			setActiveTab(activeTab);

			return {
				...state,
				tabs: [...filterTabs]
			};
		}
		case 'CLOSE_ALL_TABS': {
			const activeTab = { id: action.activeTabId, url: HOMEPAGE_URL };
			setActiveTab(activeTab);

			return {
				...state,
				tabs: []
			};
		}
		case 'CREATE_NEW_TAB': {
			const newTabs = [...state.tabs];
			let activeIndex = 0;
			const activeTabId = action.activeTabId;
			if (!activeTabId || activeTabId === null) {
				newTabs.splice(0, 0, { url: action.url, id: action.id });
			} else {
				const activeTab = newTabs.find(tab => tab.id === activeTabId);
				activeIndex = newTabs.indexOf(activeTab);
				if (action.addRight) {
					activeIndex += 1;
					newTabs.splice(activeIndex, 0, {
						url: action.url,
						id: action.id
					});
				} else {
					newTabs.splice(activeIndex, 0, {
						url: action.url,
						id: action.id
					});
				}
			}
			const activeTab = newTabs[activeIndex];
			setActiveTab(activeTab);

			return {
				...state,
				tabs: [...newTabs]
			};
		}
		case 'CREATE_NEW_TAB_LAST': {
			const newTabs = [...state.tabs];
			const activeIndex = state.tabs.length + 1;

			newTabs.push({
				url: action.url,
				id: action.id
			});

			const activeTab = newTabs[activeIndex];
			setActiveTab(activeTab);

			return {
				...state,
				tabs: [...newTabs]
			};
		}
		case 'SET_ACTIVE_TAB':
			return {
				...state
			};
		case 'UPDATE_TAB':
			return {
				...state,
				tabs: state.tabs.map(tab => {
					if (tab.id === action.id) {
						return { ...tab, ...action.data };
					}
					return { ...tab };
				})
			};
		case 'SAVE_TABS': {
			const saveNum = action.saveNum;
			if (state.tabs.length <= saveNum) {
				return {
					...state
				};
			}
			const newTabs = [...state.tabs];
			const tabLength = newTabs.length;
			let activeIndex = 0;
			const activeTabId = action.activeTabId;
			if (activeTabId !== null) {
				const activeTab = state.tabs.find(tab => tab.id === activeTabId);
				activeIndex = state.tabs.indexOf(activeTab);
			}
			const removeNum = tabLength - saveNum;
			if (activeIndex >= removeNum) {
				newTabs.splice(0, removeNum);
			} else {
				const lastRemoveNum = removeNum - activeIndex;
				newTabs.splice(tabLength - lastRemoveNum, lastRemoveNum);
				newTabs.splice(0, activeIndex);
			}
			return {
				...state,
				tabs: [...newTabs]
			};
		}
		case 'UPDATE_FAVOURITE_DAPPS': {
			return {
				...state,
				favouriteDapps: [...action.dapps]
			};
		}
		case 'ADD_FAVOURITE_DAPPS': {
			if (!action.dapps) {
				return state;
			}
			let needUpdate = false;

			action.dapps.forEach(dapp => {
				if (
					!state.favouriteDapps.find(
						favourite => favourite.url === dapp.url && favourite.chain === dapp.chain
					)
				) {
					needUpdate = true;
					const hostname = new URL(dapp.url).hostname;
					state.favouriteDapps.unshift({ hostname, pos: MAX_POS, timestamp: Date.now(), ...dapp });
				}
			});
			if (needUpdate) {
				return {
					...state,
					favouriteDapps: [...state.favouriteDapps]
				};
			}
			return state;
		}
		case 'ADD_FAVOURITE_DAPP': {
			const dapp = action.dapp;
			const hostname = new URL(dapp.url).hostname;
			const configDapp = getLanguageDapp(state.dappPage)?.favourites?.find(
				fDapp => fDapp.url && util.toLowerCaseEquals(new URL(fDapp.url).hostname, hostname)
			);
			let updateDapp;
			if (configDapp && !configDapp.chain) {
				updateDapp = state.favouriteDapps.find(favourite =>
					util.toLowerCaseEquals(favourite.hostname, hostname)
				);
			} else {
				updateDapp = state.favouriteDapps.find(
					favourite => favourite.url === dapp.url && favourite.chain === dapp.chain
				);
			}
			if (updateDapp) {
				updateDapp.del = 0;
				updateDapp.pos = MAX_POS;
				updateDapp.timestamp = Date.now();
				return {
					...state,
					favouriteDapps: [...state.favouriteDapps]
				};
			}
			state.favouriteDapps.push({ hostname, pos: MAX_POS, timestamp: Date.now(), ...dapp });
			return {
				...state,
				favouriteDapps: [...state.favouriteDapps]
			};
		}
		case 'REMOVE_FAVOURITE_DAPP': {
			const dapp = action.dapp;
			const hostname = new URL(dapp.url).hostname;
			const updateDapp = state.favouriteDapps.find(
				favourite =>
					!favourite.del &&
					favourite.hostname === hostname &&
					(!favourite.chain || favourite.chain === dapp.chain)
			);
			if (updateDapp) {
				updateDapp.del = 1;
				return {
					...state,
					favouriteDapps: [...state.favouriteDapps]
				};
			}
			return state;
		}
		default:
			return state;
	}
};
export default browserReducer;
