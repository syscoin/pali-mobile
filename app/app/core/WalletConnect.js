import RNWalletConnect from '@walletconnect/client';
import { parseWalletConnectUri } from '@walletconnect/utils';
import Engine from './Engine';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-community/async-storage';
import { CLIENT_OPTIONS, WALLET_CONNECT_ORIGIN } from '../util/walletconnect';
import { WALLETCONNECT_SESSIONS } from '../constants/storage';
import { ChainType, util } from 'gopocket-core';
import { getChainTypeByChainId, isPrefixedFormattedHexString } from '../util/networks';
import { getChainIdByType, getTypeByChainId } from '../util/number';
import { ethErrors } from 'eth-json-rpc-errors';

const hub = new EventEmitter();
let connectors = [];
let initialized = false;
const tempCallIds = [];
let connecting = false;

const persistSessions = async () => {
	const sessions = connectors
		.filter(connector => connector && connector.walletConnector && connector && connector.walletConnector.connected)
		.map(connector => connector.walletConnector.session);

	await AsyncStorage.setItem(WALLETCONNECT_SESSIONS, JSON.stringify(sessions));
};

const waitForInitialization = async () => {
	let i = 0;
	// eslint-disable-next-line no-unmodified-loop-condition
	while (!initialized) {
		await new Promise(res => setTimeout(() => res(), 500));
		if (i++ > 10) break;
	}
};

const waitForKeychainUnlocked = async () => {
	let i = 0;
	const { KeyringController } = Engine.context;
	while (!KeyringController.isUnlocked()) {
		await new Promise(res => setTimeout(() => res(), 500));
		if (i++ > 60) break;
	}
};

const killSessionAndUpdate = async id => {
	const connectorToKill = connectors.find(
		connector => connector && connector.walletConnector && connector.walletConnector.session.peerId === id
	);

	if (connectorToKill) {
		connectors = connectors.filter(
			connector =>
				connector &&
				connector.walletConnector &&
				connector.walletConnector.connected &&
				connector.walletConnector.session.peerId !== id
		);
	}

	if (connectorToKill) {
		await connectorToKill.killSession();
	}
	await persistSessions();
	hub.emit('walletconnectDataChange', '');
};

class WalletConnect {
	selectedAddress = null;
	redirect = null;
	autosign = false;
	chainType = null;

	constructor(options) {
		if (options.redirect) {
			this.redirectUrl = options.redirect;
		}

		if (options.autosign) {
			this.autosign = true;
		}

		this.chainType = options.session && options.session.chainId && getChainTypeByChainId(options.session.chainId);
		this.selectedAddress =
			options.session &&
			options.session.accounts &&
			options.session.accounts.length > 0 &&
			options.session.accounts[0];

		this.walletConnector = new RNWalletConnect({ ...options, ...CLIENT_OPTIONS });
		/**
		 *  Subscribe to session requests
		 */
		this.walletConnector.on('session_request', async (error, payload) => {
			util.logDebug('WC session_request:', JSON.stringify(payload), error);
			if (error) {
				throw error;
			}

			await waitForKeychainUnlocked();

			try {
				const sessionData = {
					...payload.params[0],
					autosign: this.autosign
				};

				await waitForInitialization();
				await this.sessionRequest(sessionData);

				this.chainType = this.chainType || getChainTypeByChainId(sessionData.chainId);

				this.selectedAddress =
					this.selectedAddress || Engine.context.PreferencesController.state.selectedAddress;
				const curNetworkChainId = getChainIdByType(getChainTypeByChainId(sessionData.chainId));
				const approveData = {
					chainId: parseInt(curNetworkChainId, 10),
					accounts: [this.selectedAddress]
				};
				await this.walletConnector.approveSession(approveData);

				//除太坊链外的余额不自动刷新，需手动更新一下
				setTimeout(async () => {
					if (this.chainType !== getChainTypeByChainId(sessionData.chainId)) {
						const approveData = {
							chainId: parseInt(getChainIdByType(this.chainType), 10),
							accounts: [this.selectedAddress]
						};
						await this.walletConnector.updateSession(approveData);
					}
					persistSessions();
					this.redirectIfNeeded();
				}, 50);
			} catch (e) {
				this.walletConnector.rejectSession();
			}
		});

		/**
		 *  Subscribe to call requests
		 */
		this.walletConnector.on('call_request', async (error, payload) => {
			if (tempCallIds.includes(payload.id)) return;
			tempCallIds.push(payload.id);

			await waitForKeychainUnlocked();

			util.logDebug('CALL_REQUEST', JSON.stringify(payload), error);
			if (error) {
				throw error;
			}

			const meta = this.walletConnector.session.peerMeta;

			if (payload.method) {
				if (payload.method === 'eth_sendTransaction') {
					const { TransactionController } = Engine.context;
					try {
						const txParams = {};
						txParams.to = payload.params[0].to;
						txParams.from = payload.params[0].from;
						txParams.value = payload.params[0].value;
						txParams.gas = payload.params[0].gas;
						txParams.gasPrice = payload.params[0].gasPrice;
						txParams.data = payload.params[0].data;
						txParams.chainId = String(this.walletConnector.session.chainId);
						const hash = await (await TransactionController.addTransaction(
							txParams,
							meta ? WALLET_CONNECT_ORIGIN + meta.url : undefined
						)).result;
						this.walletConnector.approveRequest({
							id: payload.id,
							result: hash
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				} else if (payload.method === 'eth_sign') {
					const { MessageManager } = Engine.context;
					let rawSig = null;
					try {
						if (payload.params[2]) {
							throw new Error('Autosign is not currently supported');
							// Leaving this in case we want to enable it in the future
							// once WCIP-4 is defined: https://github.com/WalletConnect/WCIPs/issues/4
							// rawSig = await KeyringController.signPersonalMessage({
							// 	data: payload.params[1],
							// 	from: payload.params[0]
							// });
						} else {
							const data = payload.params[1];
							const from = payload.params[0];
							rawSig = await MessageManager.addUnapprovedMessageAsync({
								data,
								from,
								meta: {
									title: meta && meta.name,
									url: meta && meta.url,
									icon: meta && meta.icons && meta.icons[0]
								},
								origin: WALLET_CONNECT_ORIGIN
							});
						}
						this.walletConnector.approveRequest({
							id: payload.id,
							result: rawSig
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				} else if (payload.method === 'personal_sign') {
					const { PersonalMessageManager } = Engine.context;
					let rawSig = null;
					try {
						if (payload.params[2]) {
							throw new Error('Autosign is not currently supported');
							// Leaving this in case we want to enable it in the future
							// once WCIP-4 is defined: https://github.com/WalletConnect/WCIPs/issues/4
							// rawSig = await KeyringController.signPersonalMessage({
							// 	data: payload.params[1],
							// 	from: payload.params[0]
							// });
						} else {
							const data = payload.params[0];
							const from = payload.params[1];

							rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
								data,
								from,
								meta: {
									title: meta && meta.name,
									url: meta && meta.url,
									icon: meta && meta.icons && meta.icons[0]
								},
								origin: WALLET_CONNECT_ORIGIN
							});
						}
						this.walletConnector.approveRequest({
							id: payload.id,
							result: rawSig
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				} else if (payload.method === 'eth_signTypedData') {
					const { TypedMessageManager } = Engine.context;
					try {
						const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
							{
								data: payload.params[1],
								from: payload.params[0],
								meta: {
									title: meta && meta.name,
									url: meta && meta.url,
									icon: meta && meta.icons && meta.icons[0]
								},
								origin: WALLET_CONNECT_ORIGIN
							},
							'V3'
						);

						this.walletConnector.approveRequest({
							id: payload.id,
							result: rawSig
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				} else if (
					payload.method === 'wallet_switchEthereumChain' ||
					payload.method === 'wallet_addEthereumChain'
				) {
					if (payload.params && payload.params.length > 0 && payload.params[0]) {
						const chainId = payload.params[0].chainId;
						const _chainId = typeof chainId === 'string' && chainId.toLowerCase();
						if (!isPrefixedFormattedHexString(_chainId)) {
							throw ethErrors.rpc.invalidParams(
								`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
							);
						}

						const chainIdDecimal = parseInt(_chainId, 16).toString(10);
						const type = getTypeByChainId(chainIdDecimal);
						if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
							connectors.length > 0 && hub.emit('walletconnectSwitchChainFail', '');
						} else {
							this.networkChange(chainIdDecimal);
							await persistSessions();
							connectors.length > 0 && hub.emit('walletconnectSwitchChainSuccess', '');
						}
					}
				}
				this.redirectIfNeeded();
			}
			// Clean call ids
			tempCallIds.length = 0;
		});

		this.walletConnector.on('disconnect', error => {
			if (error) {
				util.logDebug('WC: disconnect: ', error);
			}

			killSessionAndUpdate(this.walletConnector.session.peerId);
		});

		this.walletConnector.on('session_update', (error, payload) => {
			util.logDebug('WC: Session update', JSON.stringify(payload), error);
		});

		this.selectedAddress = this.selectedAddress || Engine.context.PreferencesController.state.selectedAddress;
	}

	selectedAddressChange = selectedAddress => {
		if (this.selectedAddress !== selectedAddress) {
			this.selectedAddress = selectedAddress;
			const chainId = getChainIdByType(this.chainType);
			const sessionData = {
				chainId: parseInt(chainId, 10),
				accounts: [selectedAddress]
			};
			try {
				this.walletConnector.updateSession(sessionData);
			} catch (e) {
				util.logDebug('Error while updating session', e);
			}
		}
	};

	networkChange = chainId => {
		if (this.walletConnector.session.chainId !== chainId) {
			const selectedAddress = this.selectedAddress || Engine.context.PreferencesController.state.selectedAddress;
			const sessionData = {
				chainId,
				accounts: [selectedAddress]
			};
			try {
				this.walletConnector.updateSession(sessionData);
			} catch (e) {
				util.logDebug('Error while updating session', e);
			}
		}
	};

	killSession = async () => {
		await this.walletConnector?.killSession();
		this.walletConnector = null;
	};

	sessionRequest = peerInfo =>
		new Promise((resolve, reject) => {
			connecting = false;
			hub.emit('walletconnectSessionRequest', peerInfo);

			hub.on('walletconnectSessionRequest::approved', peerId => {
				if (peerInfo.peerId === peerId) {
					resolve(true);
				}
			});
			hub.on('walletconnectSessionRequest::rejected', peerId => {
				if (peerInfo.peerId === peerId) {
					reject(new Error('walletconnectSessionRequest::rejected'));
				}
			});
		});

	redirectIfNeeded = () => {
		if (this.redirectUrl) {
			setTimeout(() => {
				hub.emit('walletconnect:return');
			}, 1500);
		}
	};

	setChainType = chainType => {
		this.chainType = chainType;
	};

	setSelectedAddress = address => {
		this.selectedAddress = address;
	};
}

export default {
	async init() {
		const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
		if (sessionData) {
			const sessions = JSON.parse(sessionData);
			sessions.forEach(session => {
				connectors.push(new WalletConnect({ session }));
			});
		}
		initialized = true;
	},
	killSessionAndUpdate,
	newSession(uri, redirect, autosign) {
		if (connecting) {
			return;
		}
		connecting = true;
		hub.emit('walletconnectSessionLoading', '');
		const data = { uri };
		if (redirect) {
			data.redirect = redirect;
		}
		if (autosign) {
			data.autosign = autosign;
		}
		connectors.push(new WalletConnect(data));
	},
	finishConnect() {
		connecting = false;
	},
	getSessions: async () => {
		let sessions = [];
		const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
		if (sessionData) {
			sessions = JSON.parse(sessionData);
		}
		return sessions;
	},
	onNetworkChanged: async (type, chainId) => {
		await waitForInitialization();
		for (const connector of connectors) {
			if (connector.chainType === type) {
				connector.networkChange(chainId);
			}
		}
	},
	setSingleAccountChange: async (id, selectedAddress) => {
		await waitForInitialization();
		const connector = connectors.find(
			connector => connector && connector.walletConnector && connector.walletConnector.session.peerId === id
		);
		connector.selectedAddressChange(selectedAddress);
		await persistSessions();
		connectors.length > 0 && hub.emit('walletconnectDataChange', '');
	},
	setSingleNetworkChange: async (id, chainId) => {
		await waitForInitialization();
		const connector = connectors.find(
			connector => connector && connector.walletConnector && connector.walletConnector.session.peerId === id
		);

		connector.networkChange(chainId);
		await persistSessions();
		connectors.length > 0 && hub.emit('walletconnectDataChange', '');
	},
	hub,
	isValidUri(uri) {
		const result = parseWalletConnectUri(uri);
		if (!result.handshakeTopic || !result.bridge || !result.key) {
			return false;
		}
		return true;
	},
	setSelectedAddress(peerId, address) {
		const connector = connectors.find(
			connector => connector && connector.walletConnector && connector.walletConnector._peerId === peerId
		);
		connector && connector.setSelectedAddress(address);
	},
	setSelectedNetwork(peerId, chainType) {
		const connector = connectors.find(
			connector => connector && connector.walletConnector && connector.walletConnector._peerId === peerId
		);
		connector && connector.setChainType(chainType);
	},
	removeAccounts: async accounts => {
		if (accounts && accounts.length > 0) {
			let shouldUpdate = false;
			accounts.forEach(address => {
				const deleteConnectors = connectors.filter(
					connector =>
						connector &&
						connector.walletConnector &&
						connector.walletConnector.connected &&
						connector.walletConnector.session.accounts.length > 0 &&
						connector.walletConnector.session.accounts[0]?.toLowerCase() === address?.toLowerCase()
				);
				if (deleteConnectors && deleteConnectors.length > 0) {
					shouldUpdate = true;
					deleteConnectors.forEach(item => {
						item.killSession();
					});
				}
			});
			if (shouldUpdate) {
				await persistSessions();
				hub.emit('walletconnectDataChange', '');
			}
		}
	}
};
