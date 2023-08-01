import parseWalletConnectUri from './wc-utils';
import Engine from '../Engine';
import Minimizer from 'react-native-minimizer';
import { recoverPersonalSignature } from 'eth-sig-util';
import { isHexString } from 'ethjs-util';
import { createAsyncMiddleware } from 'json-rpc-engine';
import { resemblesAddress } from '../../util/address';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatJsonRpcResult } from '@json-rpc-tools/utils';
import { WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import { WALLETCONNECTV2_SESSIONS } from '../../constants/storage';
import { ChainType, util } from 'paliwallet-core';
import { isPrefixedFormattedHexString } from '../../util/networks';
import { getChainIdByType, getNetworkController, getChainTypeByChainId } from '../../util/number';

import { ethErrors } from 'eth-json-rpc-errors';
import { Platform } from 'react-native';
import BackgroundBridge from '../BackgroundBridge';
import { Core } from '@walletconnect/core';
import METHODS_TO_REDIRECT from './wc-config';
import { getSdkError } from '@walletconnect/utils';
import AppConstants from '../../core/AppConstants';
import SharedDeeplinkManager from '../../core/DeeplinkManager';
import { Web3Wallet } from '@walletconnect/web3wallet';

const waitForKeychainUnlocked = async () => {
	let i = 0;
	const { KeyringController } = Engine.context;
	while (!KeyringController.isUnlocked()) {
		await new Promise(res => setTimeout(() => res(), 500));
		if (i++ > 60) break;
	}
};

export const getAllUrlParams = url => {
	const queryString = url.split('?')?.[1];
	const obj = {};
	if (queryString) {
		queryString.split('&').forEach(param => {
			const [key, value] = param.split('=');
			obj[key] = value;
		});
	}
	return obj;
};
const PROJECT_ID_WALLET_CONNECT = AppConstants.PROJECT_ID_WALLET_CONNECT;

export const isWC2Enabled = typeof PROJECT_ID_WALLET_CONNECT === 'string' && PROJECT_ID_WALLET_CONNECT?.length > 0;

const getRpcMethodMiddleware = ({ hostname, getProviderState, firstChainType, approveRequest }) =>
	// all user facing RPC calls not implemented by the provider

	createAsyncMiddleware(async (req, res, next) => {
		const getAccounts = async (_url, _hostname) => {
			const preferencesController = Engine.context.PreferencesController;
			const selectedAddress = preferencesController.state.selectedAddress;
			const isEnabled = true;
			return isEnabled && selectedAddress ? [selectedAddress] : [];
		};

		const rpcMethods = {
			eth_chainId: async () => {
				const networkController = Engine.context.NetworkController;

				let chainId = networkController.state.network;
				if (chainId && !chainId.startsWith('0x')) {
					// Convert to hex
					res.result = `0x${parseInt(chainId, 10).toString(16)}`;
				}
			},
			net_version: async () => {
				const networkController = Engine.context.NetworkController;

				let selectedChainId = networkController.state.network;

				res.result = selectedChainId;
			},
			eth_requestAccounts: async () => {
				const preferencesController = Engine.context.PreferencesController;
				const selectedAddress = preferencesController.state.selectedAddress;
				res.result = [selectedAddress];
			},
			eth_accounts: async () => {
				const url = req.meta.url;
				res.result = await getAccounts(url, hostname);
			},
			eth_getCode: async () => {
				const { TransactionController } = Engine.context;
				const code = await TransactionController.getCode(
					getChainTypeByChainId(req.currentChainId),
					req.params[0]
				);
				res.result = code;
			},
			personal_ecRecover: async () => {
				const message = req.params[0];
				const signature = req.params[1];
				const recovered = recoverPersonalSignature({ data: message, sig: signature });

				res.result = recovered;
			},
			eth_coinbase: async () => {
				const url = req.meta.url;
				const accounts = await getAccounts(url, hostname);
				res.result = accounts.length > 0 ? accounts[0] : null;
			},
			eth_sign: async () => {
				const { MessageManager } = Engine.context;
				const pageMeta = req.meta;
				const rawSig = await MessageManager.addUnapprovedMessageAsync({
					data: req.params[1],
					from: req.params[0],
					meta: pageMeta,
					origin: WALLET_CONNECT_ORIGIN
				});

				res.result = rawSig;
			},
			personal_sign: async () => {
				const { PersonalMessageManager } = Engine.context;

				const firstParam = req.params[0];
				const secondParam = req.params[1];
				const params = {
					data: firstParam,
					from: secondParam
				};

				if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
					params.data = secondParam;
					params.from = firstParam;
				}

				const pageMeta = req.meta;

				const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
					data: req.params[0],
					from: req.params[1],
					meta: pageMeta,
					origin: WALLET_CONNECT_ORIGIN
				});

				res.result = rawSig;
			},

			eth_signTypedData: async () => {
				const { TypedMessageManager } = Engine.context;
				const pageMeta = req.meta;
				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[0],
						from: req.params[1],
						...pageMeta
					},
					'V1'
				);

				res.result = rawSig;
			},

			eth_signTypedData_v3: async () => {
				const { TypedMessageManager } = Engine.context;
				const data = JSON.parse(req.params[1]);
				const chainId = data.domain.chainId;

				if (!getNetworkController(chainId)) {
					throw ethErrors.rpc.invalidRequest(`Provided chainId (${chainId}) must match the active chainId`);
				}

				const pageMeta = req.meta;

				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[1],
						from: req.params[0],
						...pageMeta
					},
					'V3'
				);

				res.result = rawSig;
			},
			eth_signTypedData_v4: async () => {
				const { TypedMessageManager } = Engine.context;

				const data = JSON.parse(req.params[1]);
				const chainId = data.domain.chainId;

				if (!getNetworkController(chainId)) {
					throw ethErrors.rpc.invalidRequest(`Provided chainId (${chainId}) must match the active chainId`);
				}

				const pageMeta = req.meta;
				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[1],
						from: req.params[0],
						meta: pageMeta,
						origin: WALLET_CONNECT_ORIGIN
					},
					'V4'
				);

				res.result = rawSig;
			},
			web3_clientVersion: async () => {
				const version = global.appVersion;
				res.result = `MetaMask/${version}/Beta/Mobile`;
			},
			wallet_scanQRCode: () =>
				new Promise((resolve, reject) => {
					SharedDeeplinkManager.handleQRCode('QRScanner', {
						onScanSuccess: data => {
							const regex = new RegExp(req.params[0]);
							if (regex && !regex.exec(data)) {
								reject({ message: 'NO_REGEX_MATCH', data });
							} else if (!regex && !/^(0x){1}[0-9a-fA-F]{40}$/i.exec(data.target_address)) {
								reject({ message: 'INVALID_ETHEREUM_ADDRESS', data: data.target_address });
							}
							let result = data;
							if (data.target_address) {
								result = data.target_address;
							} else if (data.scheme) {
								result = JSON.stringify(data);
							}
							res.result = result;
							resolve();
						},
						onScanError: e => {
							throw ethErrors.rpc.internal(e.toString());
						}
					});
				}),

			wallet_watchAsset: async () => {
				const {
					params: {
						options: { address, decimals, image, symbol },
						type
					}
				} = req;
				switch (type) {
					case 'ERC20':
						util.validateTokenToWatch({ address, decimals, image, symbol });
						break;
					default:
						throw new Error(`Asset of type ${type} not supported`);
				}
				const networkController = Engine.context.NetworkController;

				let selectedChainId = networkController.state.network;

				await Engine.context.AssetsController.addToken(address, symbol, decimals, selectedChainId);
				res.result = address;
			},
			metamask_getProviderState: async () => {
				const url = req.meta.url;
				res.result = {
					...getProviderState(),
					accounts: await getAccounts(url, hostname)
				};
			},
			metamask_logWeb3ShimUsage: () => (res.result = null),
			wallet_addEthereumChain: async () => {
				util.logDebug('leon.w@wallet_addEthereumChain: ', JSON.stringify(req));

				if (!req.params?.[0] || typeof req.params[0] !== 'object') {
					throw ethErrors.rpc.invalidParams({
						message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`
					});
				}
				const params = req.params[0];

				const { chainId } = params;
				const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

				if (!isPrefixedFormattedHexString(_chainId)) {
					throw ethErrors.rpc.invalidParams(
						`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
					);
				}

				const chainIdDecimal = parseInt(_chainId, 16).toString(10);
				const type = getChainTypeByChainId(chainIdDecimal);

				if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
					let data = {};
					const rpcList = require('../../data/rpc-chains.json');
					const rpcItem = rpcList.find(
						rpc =>
							String(rpc.chainId) === chainIdDecimal &&
							rpc.name &&
							rpc.rpc &&
							rpc.rpc.length > 0 &&
							rpc.nativeCurrency?.symbol &&
							rpc.infoURL
					);

					if (rpcItem) {
						const url = req.meta.url;
						let rpcInfo = {
							url,
							icon: req.meta.icon,
							chainId: String(chainIdDecimal),
							nickname: rpcItem.name,
							rpcTarget: rpcItem.rpc[0],
							ticker: rpcItem.nativeCurrency.symbol,
							explorerUrl: rpcItem.infoURL
						};

						data = {
							rpcInfo,
							requestInfo: req.requestEvent,

							selectedAddress: req.selectedAddress
						};

						WC2Manager.hub.emit('walletconnectAddChain', data);
					} else {
						res.result = 'rejected';
						return;
					}
				}

				res.result = null;
			},
			wallet_switchEthereumChain: () => {
				util.logDebug('leon.w@wallet_switchEthereumChain: ', JSON.stringify(req));

				if (!req.params?.[0] || typeof req.params[0] !== 'object') {
					throw ethErrors.rpc.invalidParams({
						message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`
					});
				}
				const params = req.params[0];

				const { chainId } = params;
				const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

				if (!isPrefixedFormattedHexString(_chainId)) {
					throw ethErrors.rpc.invalidParams(
						`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
					);
				}

				const chainIdDecimal = parseInt(_chainId, 16).toString(10);
				const type = getChainTypeByChainId(chainIdDecimal);

				if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
					let data = {};
					const rpcList = require('../../data/rpc-chains.json');
					const rpcItem = rpcList.find(
						rpc =>
							String(rpc.chainId) === chainIdDecimal &&
							rpc.name &&
							rpc.rpc &&
							rpc.rpc.length > 0 &&
							rpc.nativeCurrency?.symbol &&
							rpc.infoURL
					);

					if (rpcItem) {
						const url = req.meta.url;
						let rpcInfo = {
							url,
							icon: req.meta.icon,
							chainId: String(chainIdDecimal),
							nickname: rpcItem.name,
							rpcTarget: rpcItem.rpc[0],
							ticker: rpcItem.nativeCurrency.symbol,
							explorerUrl: rpcItem.infoURL
						};

						data = {
							rpcInfo,
							requestInfo: req.requestEvent,

							selectedAddress: req.selectedAddress
						};

						WC2Manager.hub.emit('walletconnectAddChain', data);
					} else {
						res.result = 'rejected';
						return;
					}
				}

				res.result = null;
			}
		};

		if (!rpcMethods[req.method]) {
			if (firstChainType !== getChainTypeByChainId(req.currentChainId)) {
				return (res.result = null);
			}
			return next();
		}
		await rpcMethods[req.method]();
		if (res.result !== 'rejected') {
			await approveRequest({
				id: req.id,
				result: res.result
			});
		} else {
			console.warn('Rejected');
		}
	});
if (Platform.OS === 'android') {
	// eslint-disable-next-line
	const BigInt = require('big-integer');
	// Force big-integer / BigInt polyfill on android.
	Object.assign(global, {
		BigInt
	});
}

const ERROR_MESSAGES = {
	INVALID_CHAIN: 'Invalid chainId',
	MANUAL_DISCONNECT: 'Manual disconnect',
	USER_REJECT: 'User reject',
	AUTO_REMOVE: 'Automatic removal',
	INVALID_ID: 'Invalid Id'
};

class WalletConnectV2Session {
	backgroundBridge = BackgroundBridge;
	web3Wallet;
	deeplink = null;
	session = {};
	requestsToRedirect = {};
	topicByRequestId = {};

	constructor(options) {
		this.web3Wallet = options.web3Wallet;
		this.deeplink = options.deeplink;
		this.session = options.session;
		this.firstChainType = getChainTypeByChainId(options.session.requiredNamespaces.eip155.chains[0].split(':')[1]);
		const url = options.session.self.metadata.url;
		const name = options.session.self.metadata.name;
		const icons = options.session.self.metadata.icons;

		this.backgroundBridge = new BackgroundBridge({
			webview: null,
			url,
			chain_type: this.firstChainType,
			isWalletConnect: true,
			wcRequestActions: {
				approveRequest: this.approveRequest.bind(this),
				updateSession: this.updateSession.bind(this)
			},
			getRpcMethodMiddleware: ({ getProviderState }) =>
				getRpcMethodMiddleware({
					hostname: url,
					getProviderState,
					firstChainType: this.firstChainType,
					updateSession: this.updateSession.bind(this),
					approveRequest: this.approveRequest.bind(this),
					analytics: {},
					isHomepage: () => false,
					navigation: null, //props.navigation,
					// Website info
					url: {
						current: url
					},
					title: {
						current: name
					},
					icon: {
						current: icons?.[0]
					},
					tabId: '',
					isWalletConnect: true
				}),
			isMainFrame: true
		});

		WC2Manager.hub.on('walletconnectAddChain:approved', async data => {
			await this.updateSession({
				requestEvent: data
			});
		});
	}

	setDeeplink = deeplink => {
		this.deeplink = deeplink;
	};

	approveRequest = async ({ id, result }) => {
		const topic = this.topicByRequestId[id];

		const response = formatJsonRpcResult(id, result);
		try {
			await this.web3Wallet.respondSessionRequest({
				topic: topic,
				response: response
			});
		} catch (err) {
			console.warn(`WC2::approveRequest error while approving request id=${id} topic=${topic}`, err);
		}

		this.needsRedirect(id);
	};

	needsRedirect = id => {
		if (this.requestsToRedirect[id]) {
			delete this.requestsToRedirect[id];
			this.redirect();
		}
	};

	redirect = () => {
		if (!this.deeplink) return;
		setTimeout(() => {
			// Reset the status of deeplink after each redirect
			this.deeplink = false;
			console.log('goBack()');
			Minimizer.goBack();
		}, 300);
	};

	getSessions() {
		const actives = this.web3Wallet.getActiveSessions() || {};
		const sessions = [];
		Object.keys(actives).forEach(async sessionKey => {
			const session = actives[sessionKey];
			sessions.push(session);
		});
		return sessions;
	}

	updateSession = async ({ requestEvent }) => {
		try {
			const activeSession = this.getSessions().find(
				session => session.topic === requestEvent.topic || session.pairingTopic === requestEvent.topic
			);

			if (activeSession) {
				activeSession.namespaces.eip155.accounts.push(
					'eip155:' +
						parseInt(requestEvent.params.request.params[0].chainId) +
						':' +
						activeSession.namespaces.eip155.accounts[0].split(':')[2]
				);

				await this.web3Wallet.updateSession({
					topic: requestEvent.topic,
					namespaces: activeSession.namespaces
				});
				const sessions = this.web3Wallet.getActiveSessions() || {};
				await AsyncStorage.setItem(WALLETCONNECTV2_SESSIONS, JSON.stringify(sessions));
				WC2Manager.hub.emit('walletconnect::updateSessions');

				setTimeout(() => {
					this.web3Wallet.emitSessionEvent({
						topic: requestEvent.topic,
						chainId: `eip155:${parseInt(requestEvent.params.request.params[0].chainId)}`,
						event: {
							name: 'chainChanged',
							data: [activeSession.namespaces.eip155.accounts[0].split(':')[2]]
						}
					});
				}, 100);
			} else {
				console.warn('WC2::updateSession Topic does not exist');
			}
		} catch (err) {
			console.warn(`WC2::updateSession can't update session topic=${this.session.topic}`, err);
		}
	};

	handleRequest = async requestEvent => {
		try {
			this.topicByRequestId[requestEvent.id] = requestEvent.topic;

			const verified = requestEvent.verifyContext?.verified;
			const hostname = verified?.origin;

			let method = requestEvent.params.request.method;

			const methodParams = requestEvent.params.request.params;

			util.logDebug(`WalletConnect2Session::handleRequest  method=${method}`, methodParams);

			// Manage redirects
			if (METHODS_TO_REDIRECT[method]) {
				this.requestsToRedirect[requestEvent.id] = true;
			}

			if (method === 'eth_sendTransaction') {
				try {
					const { TransactionController } = Engine.context;

					const txParams = {};

					txParams.to = requestEvent.params.request.params[0].to;
					txParams.from = requestEvent.params.request.params[0].from;
					txParams.value = requestEvent.params.request.params[0].value;
					txParams.gas = requestEvent.params.request.params[0].gas;
					txParams.gasPrice = requestEvent.params.request.params[0].gasPrice;
					txParams.data = requestEvent.params.request.params[0].data;
					txParams.chainId = String(requestEvent.params.chainId.split(':')[1]);

					const trx = await TransactionController.addTransaction(txParams, hostname);
					const hash = await trx.result;

					await this.approveRequest({ id: requestEvent.id, result: hash });
				} catch (error) {
					console.warn('thales.b@eth_send_transaction', error);
				}

				return;
			} else if (method === 'eth_signTypedData') {
				// Overwrite 'eth_signTypedData' because otherwise metamask use incorrect param order to parse the request.
				method = 'eth_signTypedData_v3';
			}

			const meta = this.session.peer.metadata;

			this.backgroundBridge.onMessage({
				name: 'walletconnect-provider',
				data: {
					id: requestEvent.id,
					topic: requestEvent.topic,
					method,
					currentChainId: requestEvent.params.chainId.split(':')[1],
					meta: {
						title: meta && meta.name,
						url: meta && meta.url,
						icon: meta && meta.icons && meta.icons[0]
					},
					selectedAddress: this.session.namespaces.eip155.accounts[0].split(':')[2],
					requestEvent: requestEvent,
					params: methodParams
				},

				origin: hostname
			});
		} catch (error) {
			console.warn('thales.b@wc::handleRequest', error);
		}
	};
}
export class WC2Manager {
	instance = WC2Manager;
	_initialized = false;
	web3Wallet = Web3Wallet;
	instance = WC2Manager;
	_initialized = false;
	web3Wallet;
	sessions = {};
	deeplinkSessions = {};

	constructor(web3Wallet, deeplinkSessions) {
		this.web3Wallet = web3Wallet;
		this.deeplinkSessions = deeplinkSessions;

		const sessions = web3Wallet.getActiveSessions() || {};

		AsyncStorage.setItem(WALLETCONNECTV2_SESSIONS, JSON.stringify(sessions));

		web3Wallet.on('session_proposal', this.onSessionProposal.bind(this));
		web3Wallet.on('session_request', this.onSessionRequest.bind(this));
		web3Wallet.on('session_delete', async event => {
			const session = this.sessions[event.topic];

			if (session && this.sessions[event.topic]) {
				delete this.sessions[event.topic];
				const wcSessions = this.web3Wallet.getActiveSessions() || {};
				await AsyncStorage.setItem(WALLETCONNECTV2_SESSIONS, JSON.stringify(wcSessions));
				WC2Manager.hub.emit('walletconnect::updateSessions');
			}

			if (session && deeplinkSessions[event.topic]) {
				delete deeplinkSessions[event.topic];
				await AsyncStorage.setItem('wc2sessions_deeplink', JSON.stringify(this.deeplinkSessions));
			}
		});

		//Listener for login modal events to Approve/Reject session
		WC2Manager.hub.on('walletconnectSessionRequest::approved', async data => {
			this.connectSession(data);
		});
		WC2Manager.hub.on('walletconnectSessionRequest::rejected', async data => {
			this.web3Wallet.rejectSession({
				id: data.proposal.id,
				reason: getSdkError('USER_REJECTED_METHODS')
			});
		});

		Object.keys(sessions).forEach(async sessionKey => {
			try {
				const session = sessions[sessionKey];

				this.sessions[sessionKey] = new WalletConnectV2Session({
					web3Wallet,
					deeplink: typeof deeplinkSessions[session.pairingTopic] !== 'undefined',
					session
				});
			} catch (err) {
				console.warn(`WC2::init can't update session ${sessionKey}`);
			}
		});
	}

	static async init() {
		if (this.instance) {
			// already initialized
			return this.instance;
		}

		// Keep at the beginning to prevent double instance from react strict double rendering
		this._initialized = true;

		util.logDebug(`WalletConnectV2::init()`);

		let core;

		try {
			if (typeof PROJECT_ID_WALLET_CONNECT === 'string') {
				core = new Core({
					projectId: PROJECT_ID_WALLET_CONNECT
				});
			} else {
				throw new Error('WC2::init Init Missing projectId');
			}
		} catch (err) {
			console.warn(`WC2::init Init failed due to ${err}`);
			throw err;
		}

		let web3Wallet;
		const options = {
			core: core,
			metadata: {
				name: 'Pali Wallet',
				description: 'Pali Wallet Integration',
				url: 'http://paliwallet.com/',
				icons: []
			}
		};
		try {
			if (core) web3Wallet = await Web3Wallet.init(options);
		} catch (err) {
			// TODO Sometime needs to init twice --- not sure why...
			console.warn(`WC2::init Web3Wallet.init() failed due to ${err}`);
			if (core) web3Wallet = await Web3Wallet.init(options);
		}

		let deeplinkSessions = {};
		try {
			const unparsedDeeplinkSessions = await AsyncStorage.getItem('wc2sessions_deeplink');

			if (unparsedDeeplinkSessions) {
				deeplinkSessions = JSON.parse(unparsedDeeplinkSessions);
			}
		} catch (err) {
			console.warn(`WC2@init() Failed to parse storage values`);
		}
		this.instance = new WC2Manager(web3Wallet, deeplinkSessions);

		return this.instance;
	}

	static hub = new EventEmitter();

	static getWCSessions = async () => {
		let sessions = [];
		const sessionData = await AsyncStorage.getItem(WALLETCONNECTV2_SESSIONS);
		if (sessionData) {
			sessions = JSON.parse(sessionData);
		}
		return sessions;
	};

	static async getInstance() {
		let waitCount = 1;
		return new Promise(resolve => {
			const interval = setInterval(() => {
				if (this.instance) {
					if (waitCount % 10 === 0) {
						util.logDebug(`WalletConnectV2::getInstance() slow waitCount=${waitCount}`);
					}
					clearInterval(interval);
					resolve(this.instance);
				}
				waitCount += 1;
			}, 100);
		});
	}

	getSessions() {
		const actives = this.web3Wallet.getActiveSessions() || {};
		const sessions = [];
		Object.keys(actives).forEach(async sessionKey => {
			const session = actives[sessionKey];
			sessions.push(session);
		});
		return sessions;
	}

	async removeAccounts(data) {
		this.deeplinkSessions = {};
		const actives = this.web3Wallet.getActiveSessions() || {};
		try {
			try {
				await Promise.all(
					Object.values(actives).map(async session => {
						for (const account of data) {
							if (session.namespaces.eip155.accounts[0].split(':')[2] === account) {
								await this.web3Wallet.disconnectSession({
									topic: session.topic,
									reason: getSdkError('USER_DISCONNECTED')
								});
							}
						}
					})
				);
			} catch (e) {
				console.log(e, 'thales.b@removeSession');
			}
		} catch (err) {
			console.warn(err, 'thales.b@removeSession');
		}

		const sessions = this.web3Wallet.getActiveSessions() || {};

		await AsyncStorage.setItem(WALLETCONNECTV2_SESSIONS, JSON.stringify(sessions));
		WC2Manager.hub.emit('walletconnect::updateSessions');
	}

	async removeSession(topic) {
		try {
			await new Promise((resolve, reject) => {
				this.web3Wallet
					.disconnectSession({
						topic,
						reason: getSdkError('USER_DISCONNECTED')
					})
					.then(resolve)
					.catch(e => {
						console.log(e, 'thales.b@removeSession');
						reject();
					});
			});
		} catch (err) {
			console.log(err, 'thales.b@removeSession');
		}
		const sessions = this.web3Wallet.getActiveSessions() || {};

		await AsyncStorage.setItem(WALLETCONNECTV2_SESSIONS, JSON.stringify(sessions));
		WC2Manager.hub.emit('walletconnect::updateSessions');
	}

	async removePendings() {
		const pending = this.web3Wallet.getPendingSessionProposals() || {};

		Object.values(pending).forEach(async session => {
			this.web3Wallet
				.rejectSession({
					id: session.id,
					reason: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE }
				})
				.catch(err => {
					console.warn(`Can't remove pending session ${session.id}`, err);
				});
		});

		const requests = this.web3Wallet.getPendingSessionRequests() || [];
		requests.forEach(async request => {
			try {
				await this.web3Wallet.rejectSession({
					id: request.id,
					reason: { code: 1, message: ERROR_MESSAGES.USER_REJECT }
				});
			} catch (err) {
				console.warn(`Can't remove request ${request.id}`, err);
			}
		});
	}

	async onSessionProposal(proposal) {
		//  Open session proposal modal for confirmation / rejection
		const { id, params } = proposal;
		const {
			proposer,
			requiredNamespaces,
			optionalNamespaces,
			// sessionProperties,
			relays
		} = params;

		util.logDebug(`WC2::session_proposal id=${id}`, params, params.proposer.metadata);

		// If our wallet does not support the chain, reject the session
		if (!params.requiredNamespaces.eip155) {
			await this.web3Wallet.rejectSession({
				id: proposal.id,
				reason: getSdkError('UNSUPPORTED_CHAINS')
			});

			util.logWarn(`Unsupported chain`);
			return;
		}

		try {
			const preferencesController = Engine.context.PreferencesController;
			const selectedAddress = preferencesController.state.selectedAddress;

			const namespaces = {};
			const allType = preferencesController.state.allChains;
			let chainsEnabled = [];

			if (allType) {
				for (const chainType of allType) {
					const chainIdByType = getChainIdByType(chainType);
					chainsEnabled.push(chainIdByType);
				}
			}

			Object.keys(requiredNamespaces).forEach(key => {
				const accounts = [];

				requiredNamespaces[key].chains.map(chain => {
					[selectedAddress].map(acc => accounts.push(`${chain}:${acc}`));
				});

				namespaces[key] = {
					accounts,
					methods: requiredNamespaces[key].methods,
					events: requiredNamespaces[key].events
				};
			});

			Object.keys(optionalNamespaces).forEach(key => {
				const accounts = [];

				optionalNamespaces[key].chains.map(chain => {
					if (chainsEnabled.includes(chain.split(':')[1]))
						[selectedAddress].map(acc => {
							if (!namespaces.eip155.accounts.includes(`${chain}:${acc}`)) {
								return accounts.push(`${chain}:${acc}`);
							}
						});
				});

				if (!namespaces[key]) {
					namespaces[key] = {
						accounts,
						methods: optionalNamespaces[key].methods,
						events: optionalNamespaces[key].events
					};
				} else {
					namespaces[key] = {
						accounts: [...namespaces[key].accounts, ...accounts],
						methods: [...new Set([...namespaces[key].methods, ...optionalNamespaces[key].methods])],
						events: [...new Set([...namespaces[key].events, ...optionalNamespaces[key].events])]
					};
				}
			});

			try {
				WC2Manager.hub.emit('walletconnectSessionRequest', {
					proposal,
					namespaces,
					relays,
					currentPageInformation: proposer
				});
			} catch (err) {
				await this.web3Wallet.rejectSession({
					id: proposal.id,
					reason: getSdkError('USER_REJECTED_METHODS')
				});
			}
		} catch (err) {
			console.error(`invalid wallet status`, err);
		}
	}

	async onSessionRequest(requestEvent) {
		const { KeyringController } = Engine.context;

		await waitForKeychainUnlocked({ KeyringController });

		try {
			const session = this.sessions[requestEvent.topic];

			if (!session) {
				console.warn(`WC2 invalid session topic ${requestEvent.topic}`);

				return;
			}

			await session.handleRequest(requestEvent);
		} catch (err) {
			console.error(`WC2::onSessionRequest() Error while handling request`, err);
		}
	}

	async connect({ wcUri, redirectUrl, origin }) {
		try {
			util.logDebug(`WC2Manager::connect ${wcUri} origin=${origin} redirectUrl=${redirectUrl}`);
			const params = parseWalletConnectUri(wcUri);

			const isDeepLink = origin === 'deeplink';

			const rawParams = getAllUrlParams(wcUri);

			// First check if the url contains sessionTopic, meaning it is only here from an existing connection (so we don't need to create pairing)
			if (rawParams.sessionTopic) {
				const { sessionTopic } = rawParams;

				this.sessions[sessionTopic]?.setDeeplink(true);
				return;
			}

			if (params.version === 1) {
				console.warn('WalletConnect Version 1 not supported');
			} else if (params.version === 2) {
				// check if already connected

				const activeSession = this.getSessions().find(
					session => session.topic === params.topic || session.pairingTopic === params.topic
				);

				if (activeSession) {
					this.sessions[activeSession.topic]?.setDeeplink(isDeepLink);
					return;
				}

				// cleanup uri before pairing.
				const cleanUri = wcUri.startsWith('wc://') ? wcUri.replace('wc://', 'wc:') : wcUri;
				const paired = await this.web3Wallet.core.pairing.pair({
					uri: cleanUri
				});

				if (isDeepLink) {
					this.deeplinkSessions[paired.topic] = {
						redirectUrl,
						origin
					};
					// keep list of deeplinked origin
					await AsyncStorage.setItem('deeplink', JSON.stringify(this.deeplinkSessions));
				}
			} else {
				console.warn(`Invalid wallet connect uri`, wcUri);
			}
		} catch (err) {
			console.error(`Failed to connect uri=${wcUri}`, err);
		}
	}

	async connectSession({ proposal, relays, namespaces }) {
		const activeSession = await this.web3Wallet.approveSession({
			id: proposal.id,
			relayProtocol: relays[0].protocol,
			namespaces
		});

		const deeplink = typeof this.deeplinkSessions[activeSession.pairingTopic] !== 'undefined';
		const session = new WalletConnectV2Session({
			session: activeSession,
			deeplink,
			web3Wallet: this.web3Wallet
		});

		this.sessions[activeSession.topic] = session;
		if (deeplink) {
			session.redirect();
		}

		const sessions = this.web3Wallet.getActiveSessions() || {};
		await AsyncStorage.setItem(WALLETCONNECTV2_SESSIONS, JSON.stringify(sessions));
		WC2Manager.hub.emit('walletconnect::updateSessions');
	}
}

export default WC2Manager;
