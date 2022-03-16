import { ChainType } from 'gopocket-core';
import { callSqlite } from '../util/ControllerUtils';

export const migrations = {
	2: state => {
		const allTokens = state?.engine?.backgroundState?.AssetsController?.allTokens;
		const allIgnoredTokens = state?.engine?.backgroundState?.AssetsController?.allIgnoredTokens;
		const L1ToL2Address = state?.engine?.backgroundState?.ArbContractController?.L1ToL2Address;
		if (L1ToL2Address && L1ToL2Address.length > 0) {
			if (allTokens) {
				Object.keys(allTokens).forEach(address => {
					Object.keys(allTokens[address]).forEach(chainId => {
						if (chainId === '42161') {
							allTokens[address][chainId].forEach(token => {
								if (token.l1Address === token.address) {
									const pair = L1ToL2Address.find(
										item => item.chainId === '42161' && item.L2 === token.address && item.L1
									);
									if (pair) {
										token.l1Address = pair.L1;
									}
								}
							});
						}
					});
				});
			}
			if (allIgnoredTokens) {
				Object.keys(allIgnoredTokens).forEach(address => {
					Object.keys(allIgnoredTokens[address]).forEach(chainId => {
						if (chainId === '42161') {
							allIgnoredTokens[address][chainId].forEach(token => {
								if (token.l1Address === token.address) {
									const pair = L1ToL2Address.find(
										item => item.chainId === '42161' && item.L2 === token.address && item.L1
									);
									if (pair) {
										token.l1Address = pair.L1;
									}
								}
							});
						}
					});
				});
			}
		}
		return state;
	},
	3: state => {
		const txState = state?.engine?.backgroundState?.TransactionController;
		if (txState?.transactions) {
			const keys = Object.keys(txState.transactions);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTransactions', key, ChainType.Ethereum, txState.transactions[key]);
				}
			}
			delete txState.transactions;
		}
		if (txState?.bscTransactions) {
			const keys = Object.keys(txState.bscTransactions);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTransactions', key, ChainType.Bsc, txState.bscTransactions[key]);
				}
			}
			delete txState.bscTransactions;
		}
		if (txState?.polygonTransactions) {
			const keys = Object.keys(txState.polygonTransactions);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTransactions', key, ChainType.Polygon, txState.polygonTransactions[key]);
				}
			}
			delete txState.polygonTransactions;
		}
		if (txState?.arbTransactions) {
			const keys = Object.keys(txState.arbTransactions);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTransactions', key, ChainType.Arbitrum, txState.arbTransactions[key]);
				}
			}
			delete txState.arbTransactions;
		}
		if (txState?.opTransactions) {
			const keys = Object.keys(txState.opTransactions);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTransactions', key, ChainType.Optimism, txState.opTransactions[key]);
				}
			}
			delete txState.opTransactions;
		}
		if (txState?.hecoTransactions) {
			const keys = Object.keys(txState.hecoTransactions);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTransactions', key, ChainType.Heco, txState.hecoTransactions[key]);
				}
			}
			delete txState.hecoTransactions;
		}

		if (txState?.tokenTxInfos) {
			const keys = Object.keys(txState.tokenTxInfos);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTokenTransactions', key, ChainType.Ethereum, txState.tokenTxInfos[key]);
				}
			}
			delete txState.tokenTxInfos;
		}
		if (txState?.bscTokenTxInfos) {
			const keys = Object.keys(txState.bscTokenTxInfos);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTokenTransactions', key, ChainType.Bsc, txState.bscTokenTxInfos[key]);
				}
			}
			delete txState.bscTokenTxInfos;
		}
		if (txState?.polygonTokenTxInfos) {
			const keys = Object.keys(txState.polygonTokenTxInfos);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTokenTransactions', key, ChainType.Polygon, txState.polygonTokenTxInfos[key]);
				}
			}
			delete txState.polygonTokenTxInfos;
		}
		if (txState?.arbTokenTxInfos) {
			const keys = Object.keys(txState.arbTokenTxInfos);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTokenTransactions', key, ChainType.Arbitrum, txState.arbTokenTxInfos[key]);
				}
			}
			delete txState.arbTokenTxInfos;
		}
		if (txState?.opTokenTxInfos) {
			const keys = Object.keys(txState.opTokenTxInfos);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTokenTransactions', key, ChainType.Optimism, txState.opTokenTxInfos[key]);
				}
			}
			delete txState.opTokenTxInfos;
		}
		if (txState?.hecoTokenTxInfos) {
			const keys = Object.keys(txState.hecoTokenTxInfos);
			if (keys?.length > 0) {
				for (const key of keys) {
					callSqlite('insertTokenTransactions', key, ChainType.Heco, txState.hecoTokenTxInfos[key]);
				}
			}
			delete txState.hecoTokenTxInfos;
		}
		return state;
	},
	4: state => {
		const identities = state?.engine?.backgroundState?.PreferencesController?.identities;
		if (identities) {
			const keys = Object.keys(identities);
			if (keys?.length > 0) {
				for (const key of keys) {
					if (identities[key]?.enabledChains && !identities[key].enabledChains.includes(ChainType.Avax)) {
						identities[key].enabledChains = [...identities[key].enabledChains, ChainType.Avax];
					}
				}
			}
		}
		return state;
	},
	5: state => {
		if (state?.onboarding) {
			delete state.onboarding;
		}
		if (state?.browser) {
			if (state.browser.history) {
				callSqlite('insertBrowserHistory', state.browser.history);
				delete state.browser.history;
			}
			if (state.browser.userSelectedChainTypes) {
				const userSelectedChainTypes = [];
				for (const url in state.browser.userSelectedChainTypes) {
					userSelectedChainTypes.push({ url, chainType: state.browser.userSelectedChainTypes[url] });
				}
				callSqlite('insertUserSelectedChainTypes', userSelectedChainTypes);
				delete state.browser.userSelectedChainTypes;
			}
			if (state.browser.whitelistDapps) {
				const whitelistDapps = [];
				for (const key in state.browser.whitelistDapps) {
					whitelistDapps.push({ key, ...state.browser.whitelistDapps[key] });
				}
				callSqlite('insertWhitelistDapps', whitelistDapps);
				delete state.browser.whitelistDapps;
			}
			if (state.browser.blacklistDapps) {
				const blacklistDapps = [];
				for (const key in state.browser.blacklistDapps) {
					blacklistDapps.push({ ...state.browser.blacklistDapps[key] });
				}
				callSqlite('insertBlacklistDapps', blacklistDapps);
				delete state.browser.blacklistDapps;
			}
		}
		return state;
	}
};

export const version = 5;
