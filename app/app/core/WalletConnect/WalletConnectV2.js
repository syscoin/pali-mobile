import parseWalletConnectUri from './wc-utils';
import Engine from '../Engine';
import Minimizer from 'react-native-minimizer';
import { recoverPersonalSignature } from 'eth-sig-util';
import { createAsyncMiddleware } from 'json-rpc-engine';
import { resemblesAddress } from '../../util/address';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLIENT_OPTIONS, WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import { WALLETCONNECT_SESSIONS } from '../../constants/storage';
import { ChainType, util } from 'paliwallet-core';
import { isPrefixedFormattedHexString } from '../../util/networks';
import { getChainIdByType, getNetworkController, getChainTypeByChainId } from '../../util/number';
import { strings } from '../../../locales/i18n';
import { ethErrors } from 'eth-json-rpc-errors';
import { Platform } from 'react-native';
import BackgroundBridge from '../BackgroundBridge';
import Client, { SingleEthereum, SingleEthereumTypes } from '@walletconnect/se-sdk';
import { Core } from '@walletconnect/core';
import METHODS_TO_REDIRECT from './wc-config';
import { getSdkError } from '@walletconnect/utils';
import AppConstants from '../../core/AppConstants';
import SharedDeeplinkManager from '../../core/DeeplinkManager';

const hub = new EventEmitter();

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

const getRpcMethodMiddleware = ({ hostname, getProviderState, updateSession, approveRequest }) =>
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
				console.log(req.params, 'gangueee');
				const firstParam = req.params[0];
				const secondParam = req.params[1];
				const params = {
					data: firstParam,
					from: secondParam
				};
				console.log('1');
				if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
					params.data = secondParam;
					params.from = firstParam;
				}
				console.log('2');
				const pageMeta = req.meta;
				console.log('333333', req.params[0], pageMeta);
				const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
					data: req.params[0],
					from: req.params[1],
					meta: pageMeta,
					origin: WALLET_CONNECT_ORIGIN
				});
				console.log(rawSig, req.meta, 'rawSig', req.id, approveRequest);
				await approveRequest({
					id: req.id,
					result: rawSig
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
				console.log('v4 1');
				const data = JSON.parse(req.params[1]);
				const chainId = data.domain.chainId;
				console.log('v4 3');
				if (!getNetworkController(chainId)) {
					throw ethErrors.rpc.invalidRequest(`Provided chainId (${chainId}) must match the active chainId`);
				}
				console.log('v4 2');
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
				console.log(approveRequest, 'adsadasdas');
				await approveRequest({
					id: req.id,
					result: rawSig
				});
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
				//TODO: not sure if it's worth our time to show this
				// setTimeout(() => props.toggleShowHint(strings('browser.add_asset_tip', { symbol })), 1000);
			},
			metamask_getProviderState: async () => {
				const url = req.meta.url;
				res.result = {
					...getProviderState(),
					accounts: await getAccounts(url, hostname)
				};
			},
			metamask_logWeb3ShimUsage: () => (res.result = null),
			wallet_addEthereumChain: () => {
				util.logDebug('leon.w@wallet_addEthereumChain: ', JSON.stringify(req));
				if (!req.params?.[0] || typeof req.params[0] !== 'object') {
					throw ethErrors.rpc.invalidParams({
						message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`
					});
				}
				const params = req.params[0];
				const {
					chainId,
					chainName,
					nativeCurrency: { symbol },
					rpcUrls,
					blockExplorerUrls
				} = params;
				const _chainId = typeof chainId === 'string' && chainId.toLowerCase();
				if (!isPrefixedFormattedHexString(_chainId)) {
					throw ethErrors.rpc.invalidParams(
						`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
					);
				}

				const chainIdDecimal = parseInt(_chainId, 16).toString(10);
				const type = getChainTypeByChainId(chainIdDecimal);
				// 如下逻辑成立，表示不存在当前chainId

				if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
					// TODO: add logic to add new chain.
					//const url = req.meta.url;
					// add_chain_request.current = {
					// 	url,
					// 	chainId: String(chainIdDecimal),
					// 	nickname: chainName,
					// 	rpcTarget: rpcUrls[0],
					// 	ticker: symbol,
					// 	explorerUrl: blockExplorerUrls[0]
					// };
					// setAddChainModalVisible(true);
					res.result = null;
					return;
				}
				const preferencesController = Engine.context.PreferencesController;

				const selectedAddress = preferencesController.state.selectedAddress;

				setTimeout(
					() =>
						updateSession({
							chainId: chainIdDecimal,
							accounts: [selectedAddress]
						}),
					100
				);

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
				console.log(params, 'vamos ver need');
				const { chainId } = params;
				const _chainId = typeof chainId === 'string' && chainId.toLowerCase();
				if (!isPrefixedFormattedHexString(_chainId)) {
					throw ethErrors.rpc.invalidParams(
						`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
					);
				}

				const chainIdDecimal = parseInt(_chainId, 16).toString(10);
				const type = getChainTypeByChainId(chainIdDecimal);
				// 如下逻辑成立，表示不存在当前chainId
				if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
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
						// TODO: add logic to add new chain.
						// const url = req.meta.url;
						// add_chain_request.current = {
						// 	url,
						// 	chainId: String(chainIdDecimal),
						// 	nickname: rpcItem.name,
						// 	rpcTarget: rpcItem.rpc[0],
						// 	ticker: rpcItem.nativeCurrency.symbol,
						// 	explorerUrl: rpcItem.infoURL
						// };
						// setAddChainModalVisible(true);
					}
					res.result = null;
					return;
				}
				const preferencesController = Engine.context.PreferencesController;
				const selectedAddress = preferencesController.state.selectedAddress;

				console.log(chainIdDecimal, 'wowwww');
				setTimeout(
					() =>
						updateSession({
							chainId: chainIdDecimal,
							accounts: [selectedAddress]
						}),
					100
				);

				res.result = null;
			}
		};

		if (!rpcMethods[req.method]) {
			console.log(req.method, 'aquiii');

			res.jsonrpc = '2.0';
			return;
		}
		await rpcMethods[req.method]();
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
		const url = options.session.self.metadata.url;
		const name = options.session.self.metadata.name;
		const icons = options.session.self.metadata.icons;

		this.backgroundBridge = new BackgroundBridge({
			webview: null,
			url,
			isWalletConnect: true,
			wcRequestActions: {
				approveRequest: this.approveRequest.bind(this),
				rejectRequest: this.rejectRequest.bind(this),
				updateSession: this.updateSession.bind(this)
			},
			getRpcMethodMiddleware: ({ hostname, getProviderState }) =>
				// que porra esse providerState
				getRpcMethodMiddleware({
					hostname: url,
					getProviderState,
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
	}

	setDeeplink = deeplink => {
		this.deeplink = deeplink;
	};

	approveRequest = async ({ id, result }) => {
		console.log('gangue do br?', id, topic, result);
		const topic = this.topicByRequestId[id];

		try {
			await this.web3Wallet.approveRequest({
				id: parseInt(id),
				topic,
				result
			});
			console.log('gangue do crash');
		} catch (err) {
			console.warn(`WC2::approveRequest error while approving request id=${id} topic=${topic}`, err);
		}

		this.needsRedirect(id);
	};

	rejectRequest = async (id, error) => {
		const topic = this.topicByRequestId[id];

		let errorMsg = '';
		if (error instanceof Error) {
			errorMsg = error.message;
		} else if (typeof error === 'string') {
			errorMsg = error;
		} else {
			errorMsg = JSON.stringify(error);
		}

		// Convert error to correct format
		const errorResponse = {
			code: 5000,
			message: errorMsg
		};

		try {
			await this.web3Wallet.rejectRequest({
				id: parseInt(id),
				topic,
				errorResponse
			});
		} catch (err) {
			console.warn(`WC2::rejectRequest error while rejecting request id=${id} topic=${topic}`, err);
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
		console.log(this.deeplink, 'wow');
		setTimeout(() => {
			// Reset the status of deeplink after each redirect
			this.deeplink = false;
			console.log('goBack');
			Minimizer.goBack();
		}, 300);
	};

	updateSession = async ({ chainId, accounts }) => {
		try {
			console.log('chegou aqui pelo menos', chainId, accounts, this.session.topic);
			await this.web3Wallet.updateSession({
				topic: this.session.topic,
				chainId: parseInt(chainId),
				accounts
			});
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
			requestEvent.params.request.meta.url;
			const chainId = parseInt(requestEvent.params.chainId);
			console.log(chainId, 'wow', requestEvent);

			const methodParams = requestEvent.params.request.params;
			util.logDebug(`WalletConnect2Session::handleRequest chainId=${chainId} method=${method}`, methodParams);

			const networkController = Engine.context.NetworkController;

			let selectedChainId = parseInt(networkController.state.network);
			if (selectedChainId !== chainId) {
				console.log('crashou aqui');
				try {
					// await this.web3Wallet.rejectRequest({
					// 	id: chainId,
					// 	topic: this.session.topic,
					// 	error: { code: 1, message: ERROR_MESSAGES.INVALID_CHAIN }
					// });
				} catch (err) {}
				console.log('crashou aqui2');
			}

			// Manage redirects
			if (METHODS_TO_REDIRECT[method]) {
				this.requestsToRedirect[requestEvent.id] = true;
			}
			console.log('chegamos aqui', method);

			// if (method === 'wallet_switchEthereumChain') {
			// 	this.updateSession({
			// 		chainId: methodParams[0].chainId,
			// 		accounts: [selectedAddress]
			// 	});
			// 	hub.emit('walletconnectSwitchChainSuccess', '');
			// }
			if (method === 'eth_sendTransaction') {
				try {
					const { TransactionController } = Engine.context;
					// ver se esse addTransaction está certo
					console.log(requestEvent, 'gangue porra', requestEvent.params);
					const txParams = {};
					console.log('1', requestEvent.params.request.params[0]);
					txParams.to = requestEvent.params.request.params[0].to;
					txParams.from = requestEvent.params.request.params[0].from;
					console.log('2');
					txParams.value = requestEvent.params.request.params[0].value;
					txParams.gas = requestEvent.params.request.params[0].gas;
					console.log('3');
					txParams.gasPrice = requestEvent.params.request.params[0].gasPrice;
					txParams.data = requestEvent.params.request.params[0].data;
					console.log('4');
					txParams.chainId = String(requestEvent.params.chainId);
					console.log('parou aqui');
					const trx = await TransactionController.addTransaction(txParams, hostname);
					const hash = await trx.result;
					console.log('passou ate aqui', requestEvent.id + '', hash);
					await this.approveRequest({ id: requestEvent.id, result: hash });
				} catch (error) {
					// await this.rejectRequest({ id: requestEvent.id, error });
				}

				return;
			} else if (method === 'eth_signTypedData') {
				console.log('etapa7');
				// Overwrite 'eth_signTypedData' because otherwise metamask use incorrect param order to parse the request.
				method = 'eth_signTypedData_v3';
			}

			console.log(requestEvent.id, requestEvent.topic, method, methodParams, 'ahhhhhhhh');
			const meta = this.session.self.metadata;
			// TODO: this does not work

			this.backgroundBridge.onMessage({
				name: 'walletconnect-provider',
				data: {
					id: requestEvent.id,
					topic: requestEvent.topic,
					method,
					meta: {
						title: meta && meta.name,
						url: meta && meta.url,
						icon: meta && meta.icons && meta.icons[0]
					},
					params: methodParams
				},
				origin: hostname
			});
			console.log('etapa72');
		} catch (error) {
			console.warn('porque sera', error);
		}
	};
}
export class WC2Manager {
	instance = WC2Manager;
	_initialized = false;
	web3Wallet = Client;
	instance = WC2Manager;
	_initialized = false;
	web3Wallet;
	sessions = {};
	deeplinkSessions = {};

	constructor(web3Wallet, deeplinkSessions) {
		this.web3Wallet = web3Wallet;
		this.deeplinkSessions = deeplinkSessions;

		const sessions = web3Wallet.getActiveSessions() || {};

		web3Wallet.on('session_proposal', this.onSessionProposal.bind(this));
		web3Wallet.on('session_request', this.onSessionRequest.bind(this));
		web3Wallet.on('session_delete', async event => {
			const session = sessions[event.topic];
			if (session && deeplinkSessions[(session?.pairingTopic)]) {
				delete deeplinkSessions[session.pairingTopic];
				await AsyncStorage.setItem('wc2sessions_deeplink', JSON.stringify(this.deeplinkSessions));
			}
		});

		const preferencesController = Engine.context.PreferencesController;

		const networkController = Engine.context.NetworkController;
		const selectedAddress = preferencesController.state.selectedAddress;

		// const chainId = networkController.state.network;
		let chainId = networkController.state.network;
		console.log(chainId, 'youtube');
		Object.keys(sessions).forEach(async sessionKey => {
			try {
				const session = sessions[sessionKey];

				this.sessions[sessionKey] = new WalletConnectV2Session({
					web3Wallet,
					deeplink: typeof deeplinkSessions[session.pairingTopic] !== 'undefined',
					session
				});
				console.log('porra esse crash de corno puta merda', chainId, selectedAddress);
				await this.sessions[sessionKey].updateSession({
					chainId: chainId,
					accounts: [selectedAddress]
				});
				console.log('não crashou???');
			} catch (err) {
				console.warn(`WC2::init can't update session ${sessionKey}`);
			}
		});
	}

	static async init() {
		console.log('salve');
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
					projectId: PROJECT_ID_WALLET_CONNECT,
					logger: 'fatal'
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
			console.log('salve1');
			if (core) web3Wallet = await SingleEthereum.init(options);
			console.log('salve2');
		} catch (err) {
			// TODO Sometime needs to init twice --- not sure why...
			if (core) web3Wallet = await SingleEthereum.init(options);
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
		console.log('salve2');
		return this.instance;
	}

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
	async removeSession(session) {
		try {
			console.log('crashou aqui3');
			await this.web3Wallet.disconnectSession({
				topic: session.topic,
				error: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT }
			});
		} catch (err) {
			// Fallback method because of bug in wc2 sdk
			console.log('crashou aqui4');
			await this.web3Wallet.engine.web3wallet.engine.signClient.session.delete(
				session.topic,
				getSdkError('USER_DISCONNECTED')
			);
		}
	}
	async removeAll() {
		this.deeplinkSessions = {};
		const actives = this.web3Wallet.getActiveSessions() || {};
		console.log('crashou aqui5');
		Object.values(actives).forEach(async session => {
			this.web3Wallet
				.disconnectSession({
					topic: session.topic,
					error: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT }
				})
				.catch(err => {
					console.warn(`Can't remove active session ${session.topic}`, err);
				});
		});
		console.log('crashou aqui6');
		await AsyncStorage.setItem('wc2sessions_deeplink', JSON.stringify(this.deeplinkSessions));
	}

	async removePendings() {
		const pending = this.web3Wallet.getPendingSessionProposals() || {};
		console.log('crashou aqui7');
		Object.values(pending).forEach(async session => {
			this.web3Wallet
				.rejectSession({
					id: session.id,
					error: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE }
				})
				.catch(err => {
					console.warn(`Can't remove pending session ${session.id}`, err);
				});
		});

		const requests = this.web3Wallet.getPendingSessionRequests() || [];
		requests.forEach(async request => {
			try {
				await this.web3Wallet.rejectRequest({
					id: request.id,
					topic: request.topic,
					error: { code: 1, message: ERROR_MESSAGES.USER_REJECT }
				});
			} catch (err) {
				console.warn(`Can't remove request ${request.id}`, err);
			}
		});
		console.log('crashou aqui8');
	}

	async onSessionProposal(proposal) {
		//  Open session proposal modal for confirmation / rejection
		const { id, params } = proposal;
		const {
			proposer
			// requiredNamespaces,
			// optionalNamespaces,
			// sessionProperties,
			// relays,
		} = params;

		util.logDebug(`WC2::session_proposal id=${id}`, params);

		console.log('1111', proposer);

		try {
			//TODO: this is for send the information to main so it updates
			// The wallet connect list of sessions so it shows on the UI
			// Permissions approved.
			// new Promise((resolve, reject) => {
			// 	connecting = false;
			// 	hub.emit('walletconnectSessionRequest', { id: id, walletConnectRequestInfo: proposer.metadata });

			// 	hub.on('walletconnectSessionRequest::approved', id => {
			// 		if (peerInfo.id === id) {
			// 			resolve(true);
			// 		}
			// 	});
			// 	hub.on('walletconnectSessionRequest::rejected', id => {
			// 		if (peerInfo.id === id) {
			// 			reject(new Error('walletconnectSessionRequest::rejected'));
			// 		}
			// 	});
			// });
			console.log('22222');
		} catch (err) {
			// Failed permissions request - reject session
			await this.web3Wallet.rejectSession({
				id: proposal.id,
				error: getSdkError('USER_REJECTED_METHODS')
			});
		}

		try {
			const preferencesController = Engine.context.PreferencesController;

			const networkController = Engine.context.NetworkController;
			const selectedAddress = preferencesController.state.selectedAddress;
			const chainId = networkController.state.network;

			const activeSession = await this.web3Wallet.approveSession({
				id: proposal.id,
				chainId: parseInt(chainId),
				accounts: [selectedAddress]
			});

			const deeplink = typeof this.deeplinkSessions[activeSession.pairingTopic] !== 'undefined';
			const session = new WalletConnectV2Session({
				session: activeSession,
				deeplink,
				web3Wallet: this.web3Wallet
			});
			console.log('teste7');
			this.sessions[activeSession.topic] = session;
			if (deeplink) {
				console.log('redirectdeeplink ', deeplink);
				session.redirect();
			}
			console.log('crashou aqui22');
		} catch (err) {
			console.error(`invalid wallet status`, err);
		}
		console.log('acabouuuuuu');
	}

	async onSessionRequest(requestEvent) {
		const { KeyringController } = Engine.context;
		// waitfor n existe!
		await waitForKeychainUnlocked({ KeyringController });

		try {
			const session = this.sessions[requestEvent.topic];

			if (!session) {
				console.warn(`WC2 invalid session topic ${requestEvent.topic}`);
				await this.web3Wallet.rejectRequest({
					topic: requestEvent.topic,
					id: requestEvent.id,
					error: { code: 1, message: ERROR_MESSAGES.INVALID_ID }
				});

				return;
			}
			console.log('teste3');
			await session.handleRequest(requestEvent);
			console.log('teste4');
		} catch (err) {
			console.error(`WC2::onSessionRequest() Error while handling request`, err);
		}
	}

	async connect({ wcUri, redirectUrl, origin }) {
		try {
			util.logDebug(`WC2Manager::connect ${wcUri} origin=${origin} redirectUrl=${redirectUrl}`);
			const params = parseWalletConnectUri(wcUri);

			const isDeepLink = true;

			const rawParams = getAllUrlParams(wcUri);
			console.log(origin, 'origin', rawParams.sessionTopic, 'salve', this.sessions);
			// First check if the url continas sessionTopic, meaning it is only here from an existing connection (so we don't need to create pairing)
			if (rawParams.sessionTopic) {
				const { sessionTopic } = rawParams;
				console.log('não tem então?', sessionTopic);
				this.sessions[sessionTopic]?.setDeeplink(true);
				return;
			}
			// TODO: parei aqui
			console.log('não tem session topic', params);
			if (params.version === 1) {
				console.log('versao 1');
			} else if (params.version === 2) {
				// check if already connected
				console.log('teste');
				const activeSession = this.getSessions().find(
					session => session.topic === params.topic || session.pairingTopic === params.topic
				);
				console.log('teste2');
				if (activeSession) {
					this.sessions[activeSession.topic]?.setDeeplink(isDeepLink);
					return;
				}
				console.log('crashou aqui88');
				// cleanup uri before pairing.
				const cleanUri = wcUri.startsWith('wc://') ? wcUri.replace('wc://', 'wc:') : wcUri;
				const paired = await this.web3Wallet.core.pairing.pair({
					uri: cleanUri
				});
				console.log('ué que foi isso vei');
				if (isDeepLink) {
					this.deeplinkSessions[paired.topic] = {
						redirectUrl,
						origin
					};
					// keep list of deeplinked origin
					await AsyncStorage.setItem('deeplink', JSON.stringify(this.deeplinkSessions));
				} else {
					console.warn(`Invalid wallet connect uri`, wcUri);
				}
			}
		} catch (err) {
			console.error(`Failed to connect uri=${wcUri}`, err);
		}
		console.log('terminou');
	}
}

export default WC2Manager;
