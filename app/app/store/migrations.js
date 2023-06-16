import { ChainType } from 'paliwallet-core';
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
	},
	6: state => {
		const identities = state?.engine?.backgroundState?.PreferencesController?.identities;
		if (identities) {
			const keys = Object.keys(identities);
			if (keys?.length > 0) {
				for (const key of keys) {
					if (identities[key]?.enabledChains && !identities[key].enabledChains.includes(ChainType.Syscoin)) {
						identities[key].enabledChains = [...identities[key].enabledChains, ChainType.Syscoin];
					}
				}
			}
		}
		const allChains = state?.engine?.backgroundState?.PreferencesController?.allChains;
		if (allChains && !allChains.includes(ChainType.Syscoin)) {
			allChains.push(ChainType.Syscoin);
		}
		return state;
	},
	7: state => {
		callSqlite('deleteOldStaticTokens');
		const TokenRatesController = state?.engine?.backgroundState?.TokenRatesController;
		if (TokenRatesController) {
			if (!TokenRatesController.allContractExchangeRates) {
				TokenRatesController.allContractExchangeRates = {};
			}
			const contractExchangeRates = TokenRatesController.contractExchangeRates;
			if (contractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Ethereum] = { ...contractExchangeRates };
				delete TokenRatesController.contractExchangeRates;
			}
			const arbContractExchangeRates = TokenRatesController.arbContractExchangeRates;
			if (arbContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Arbitrum] = { ...arbContractExchangeRates };
				delete TokenRatesController.arbContractExchangeRates;
			}
			const bscContractExchangeRates = TokenRatesController.bscContractExchangeRates;
			if (bscContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Bsc] = { ...bscContractExchangeRates };
				delete TokenRatesController.bscContractExchangeRates;
			}
			const polygonContractExchangeRates = TokenRatesController.polygonContractExchangeRates;
			if (polygonContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Polygon] = { ...polygonContractExchangeRates };
				delete TokenRatesController.polygonContractExchangeRates;
			}
			const hecoContractExchangeRates = TokenRatesController.hecoContractExchangeRates;
			if (hecoContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Heco] = { ...hecoContractExchangeRates };
				delete TokenRatesController.hecoContractExchangeRates;
			}
			const opContractExchangeRates = TokenRatesController.opContractExchangeRates;
			if (opContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Optimism] = { ...opContractExchangeRates };
				delete TokenRatesController.opContractExchangeRates;
			}
			const avaxContractExchangeRates = TokenRatesController.avaxContractExchangeRates;
			if (avaxContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Avax] = { ...avaxContractExchangeRates };
				delete TokenRatesController.avaxContractExchangeRates;
			}
			const syscoinContractExchangeRates = TokenRatesController.syscoinContractExchangeRates;
			if (syscoinContractExchangeRates) {
				TokenRatesController.allContractExchangeRates[ChainType.Syscoin] = { ...syscoinContractExchangeRates };
				delete TokenRatesController.syscoinContractExchangeRates;
			}
			if (!TokenRatesController.allCurrencyPrice) {
				TokenRatesController.allCurrencyPrice = {};
			}
			if (TokenRatesController.ethPrice) {
				TokenRatesController.allCurrencyPrice[ChainType.Ethereum] = { ...TokenRatesController.ethPrice };
				delete TokenRatesController.ethPrice;
			}
			if (TokenRatesController.bnbPrice) {
				TokenRatesController.allCurrencyPrice[ChainType.Bsc] = { ...TokenRatesController.bnbPrice };
				delete TokenRatesController.bnbPrice;
			}
			if (TokenRatesController.polygonPrice) {
				TokenRatesController.allCurrencyPrice[ChainType.Polygon] = { ...TokenRatesController.polygonPrice };
				delete TokenRatesController.polygonPrice;
			}
			if (TokenRatesController.hecoPrice) {
				TokenRatesController.allCurrencyPrice[ChainType.Heco] = { ...TokenRatesController.hecoPrice };
				delete TokenRatesController.hecoPrice;
			}
			if (TokenRatesController.avaxPrice) {
				TokenRatesController.allCurrencyPrice[ChainType.Avax] = { ...TokenRatesController.avaxPrice };
				delete TokenRatesController.avaxPrice;
			}
			if (TokenRatesController.syscoinPrice) {
				TokenRatesController.allCurrencyPrice[ChainType.Syscoin] = { ...TokenRatesController.syscoinPrice };
				delete TokenRatesController.syscoinPrice;
			}
		}

		const TokenBalancesController = state?.engine?.backgroundState?.TokenBalancesController;
		if (TokenBalancesController) {
			if (!TokenBalancesController.allContractBalances) {
				TokenBalancesController.allContractBalances = {};
			}
			if (TokenBalancesController.contractBalances) {
				for (const selectedAddress in TokenBalancesController.contractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Ethereum] = {
						...TokenBalancesController.contractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.contractBalances;
			}
			if (TokenBalancesController.arbContractBalances) {
				for (const selectedAddress in TokenBalancesController.arbContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Arbitrum] = {
						...TokenBalancesController.arbContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.arbContractBalances;
			}
			if (TokenBalancesController.opContractBalances) {
				for (const selectedAddress in TokenBalancesController.opContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Optimism] = {
						...TokenBalancesController.opContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.opContractBalances;
			}
			if (TokenBalancesController.bscContractBalances) {
				for (const selectedAddress in TokenBalancesController.bscContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Bsc] = {
						...TokenBalancesController.bscContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.bscContractBalances;
			}
			if (TokenBalancesController.polygonContractBalances) {
				for (const selectedAddress in TokenBalancesController.polygonContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Polygon] = {
						...TokenBalancesController.polygonContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.polygonContractBalances;
			}
			if (TokenBalancesController.hecoContractBalances) {
				for (const selectedAddress in TokenBalancesController.hecoContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Heco] = {
						...TokenBalancesController.hecoContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.hecoContractBalances;
			}
			if (TokenBalancesController.tronContractBalances) {
				for (const selectedAddress in TokenBalancesController.tronContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Tron] = {
						...TokenBalancesController.tronContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.tronContractBalances;
			}
			if (TokenBalancesController.avaxContractBalances) {
				for (const selectedAddress in TokenBalancesController.avaxContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Avax] = {
						...TokenBalancesController.avaxContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.avaxContractBalances;
			}
			if (TokenBalancesController.syscoinContractBalances) {
				for (const selectedAddress in TokenBalancesController.syscoinContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					TokenBalancesController.allContractBalances[selectedAddress][ChainType.Syscoin] = {
						...TokenBalancesController.syscoinContractBalances[selectedAddress]
					};
				}
				delete TokenBalancesController.syscoinContractBalances;
			}
			if (TokenBalancesController.rpcContractBalances) {
				for (const selectedAddress in TokenBalancesController.rpcContractBalances) {
					if (!TokenBalancesController.allContractBalances[selectedAddress]) {
						TokenBalancesController.allContractBalances[selectedAddress] = {};
					}
					if (TokenBalancesController.rpcContractBalances[selectedAddress]) {
						for (const chainId in TokenBalancesController.rpcContractBalances[selectedAddress]) {
							const chainType = ChainType.RPCBase + Number(chainId);
							TokenBalancesController.allContractBalances[selectedAddress][chainType] = {
								...TokenBalancesController.rpcContractBalances[selectedAddress][chainId]
							};
						}
					}
				}
				delete TokenBalancesController.rpcContractBalances;
			}
		}
		return state;
	},
	8: state => {
		const withdraws = state?.engine?.backgroundState?.ArbContractController?.withdraws;
		if (withdraws && withdraws.length > 0) {
			state.engine.backgroundState.ArbContractController.withdraws = [];
		}
		return state;
	}
};

export const version = 8;
