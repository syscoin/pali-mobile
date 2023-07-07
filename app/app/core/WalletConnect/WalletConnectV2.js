import RNWalletConnect from '@walletconnect/client';
import parseWalletConnectUri from './wc-utils';
import Engine from '../Engine';
import Minimizer from 'react-native-minimizer';
import { createAsyncMiddleware } from 'json-rpc-engine';
import { resemblesAddress } from '../../util/address';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-community/async-storage';
import { CLIENT_OPTIONS, WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import { WALLETCONNECT_SESSIONS } from '../../constants/storage';
import { ChainType, util } from 'paliwallet-core';
import { isPrefixedFormattedHexString } from '../../util/networks';
import { getChainIdByType, getChainTypeByChainId } from '../../util/number';
import { ethErrors } from 'eth-json-rpc-errors';
import { Platform } from 'react-native';
import BackgroundBridge from '../BackgroundBridge';
import Client, { SingleEthereum, SingleEthereumTypes } from '@walletconnect/se-sdk';
import { Core } from '@walletconnect/core';
import METHODS_TO_REDIRECT from './wc-config';
import { request } from 'http';

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

const getRpcMethodMiddleware = ({ hostname, getProviderState }) =>
	// all user facing RPC calls not implemented by the provider
	createAsyncMiddleware(async (req, res, next) => {
		const getAccounts = async (_url, _hostname) => {
			const { selectedAddress } = props;
			const isEnabled = true;
			return isEnabled && selectedAddress ? [selectedAddress] : [];
		};

		const rpcMethods = {
			eth_chainId: async () => {
				const chainId = getChainIdByType(chain_type.current);
				if (chainId && !chainId.startsWith('0x')) {
					// Convert to hex
					res.result = `0x${parseInt(chainId, 10).toString(16)}`;
				}
			},
			net_version: async () => {
				const chainId = getChainIdByType(chain_type.current);
				res.result = chainId;
			},
			eth_requestAccounts: async () => {
				const { selectedAddress } = props;
				res.result = [selectedAddress];
			},
			eth_accounts: async () => {
				res.result = await getAccounts(url, hostname);
			},
			eth_coinbase: async () => {
				const accounts = await getAccounts(url, hostname);
				res.result = accounts.length > 0 ? accounts[0] : null;
			},
			eth_sign: async () => {
				const { MessageManager } = Engine.context;
				const pageMeta = {
					meta: {
						url,
						title,
						icon: icon.current
					}
				};
				const rawSig = await MessageManager.addUnapprovedMessageAsync({
					data: req.params[1],
					from: req.params[0],
					...pageMeta
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

				const pageMeta = {
					meta: {
						url,
						title,
						icon: icon.current
					}
				};
				const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
					...params,
					...pageMeta
				});

				res.result = rawSig;
			},
			eth_signTypedData: async () => {
				const { TypedMessageManager } = Engine.context;
				const pageMeta = {
					meta: {
						url,
						title,
						icon: icon.current
					}
				};
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

				const pageMeta = {
					meta: {
						url,
						title,
						icon: icon.current
					}
				};

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

				const pageMeta = {
					meta: {
						url,
						title,
						icon: icon.current
					}
				};
				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[1],
						from: req.params[0],
						...pageMeta
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
					this.props.navigation.navigate('QRScanner', {
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
				await Engine.context.AssetsController.addToken(address, symbol, decimals, chain_type.current);
				res.result = address;
				setTimeout(() => props.toggleShowHint(strings('browser.add_asset_tip', { symbol })), 1000);
			},
			metamask_getProviderState: async () => {
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
					add_chain_request.current = {
						url,
						chainId: String(chainIdDecimal),
						nickname: chainName,
						rpcTarget: rpcUrls[0],
						ticker: symbol,
						explorerUrl: blockExplorerUrls[0]
					};
					setAddChainModalVisible(true);
					res.result = null;
					return;
				}
				if (type !== chain_type.current) {
					setTimeout(() => setChainType(type), 100);
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
						add_chain_request.current = {
							url,
							chainId: String(chainIdDecimal),
							nickname: rpcItem.name,
							rpcTarget: rpcItem.rpc[0],
							ticker: rpcItem.nativeCurrency.symbol,
							explorerUrl: rpcItem.infoURL
						};
						setAddChainModalVisible(true);
					}
					res.result = null;
					return;
				}
				if (type !== chain_type.current) {
					setTimeout(() => setChainType(type), 100);
				}
				res.result = null;
			}
		};

		if (!rpcMethods[req.method]) {
			return next();
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
				getRpcMethodMiddleware({
					hostname: url,
					getProviderState,
					setApprovedHosts: () => false,
					getApprovedHosts: () => false,
					analytics: {},
					isMMSDK: false,
					isHomepage: () => false,
					fromHomepage: { current: false },
					approveHost: () => false,
					injectHomePageScripts: () => false,
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
					toggleUrlModal: () => null,
					wizardScrollAdjusted: { current: false },
					tabId: '',
					isWalletConnect: true
				}),
			isMMSDK: false,
			isMainFrame: true,
			getApprovedHosts: undefined,
			isRemoteConn: false,
			sendMessage: undefined,
			remoteConnHost: undefined
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

		try {
			await this.web3Wallet.rejectRequest({
				id: parseInt(id),
				topic,
				error
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

		setTimeout(() => {
			// Reset the status of deeplink after each redirect
			this.deeplink = false;
			// Minimizer.goBack();
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

			const verified = requestEvent.verifyContext.verified;
			const hostname = verified?.origin;

			let method = requestEvent.params.request.method;
			const chainId = requestEvent.params.chainId;
			const methodParams = requestEvent.params.request.params;
			util.logDebug(`WalletConnect2Session::handleRequest chainId=${chainId} method=${method}`, methodParams);
			// TODO: check chainId
			// const networkController = Engine.context.NetworkController
			// const selectedChainId = networkController.state.network;
			const networkController = Engine.context.NetworkController;

			let selectedChainId = networkController.state.network;
			if (selectedChainId !== chainId) {
				console.log('crashou aqui');
				await this.web3Wallet.rejectRequest({
					id: parseInt(chainId),
					topic: this.session.topic,
					error: { code: 1, message: ERROR_MESSAGES.INVALID_CHAIN }
				});
				console.log('crashou aqui2');
			}

			// Manage redirects
			if (METHODS_TO_REDIRECT[method]) {
				this.requestsToRedirect[requestEvent.id] = true;
			}
			console.log('chegamos aqui', method);
			if (method === 'eth_sendTransaction') {
				try {
					const { TransactionController } = Engine.context;
					// ver se esse addTransaction está certo
					console.log(requestEvent.params, 'gangue porra');
					const txParams = {};
					txParams.to = requestEvent.params[0].to;
					txParams.from = requestEvent.params[0].from;
					txParams.value = requestEvent.params[0].value;
					txParams.gas = requestEvent.params[0].gas;
					txParams.gasPrice = requestEvent.params[0].gasPrice;
					txParams.data = requestEvent.params[0].data;
					txParams.chainId = String(requestEvent.params.chainId);
					const trx = await TransactionController.addTransaction(txParams, hostname);
					const hash = await trx.result;

					await this.approveRequest({ id: requestEvent.id + '', result: hash });
				} catch (error) {
					await this.rejectRequest({ id: requestEvent.id + '', error });
				}

				return;
			} else if (method === 'personal_sign') {
				const { PersonalMessageManager } = Engine.context;
				let rawSig = null;
				try {
					console.log(requestEvent.params.request.params, 'vamos la');
					if (methodParams[2]) {
						throw new Error('Autosign is not currently supported');
						// Leaving this in case we want to enable it in the future
						// once WCIP-4 is defined: https://github.com/WalletConnect/WCIPs/issues/4
						// rawSig = await KeyringController.signPersonalMessage({
						// 	data: payload.params[1],
						// 	from: payload.params[0]
						// });
					} else {
						console.log('etapa73');
						const data = methodParams[0];
						const from = methodParams[1];

						const meta = this.session.self.metadata;

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
					console.log(requestEvent.id, rawSig, 'salve gangue', this.web3Wallet.approveRequest);

					await this.approveRequest({
						id: requestEvent.id,
						result: rawSig
					});
					console.log('etapa3');
				} catch (error) {
					console.log('etapa4', error);
					await this.web3Wallet.rejectRequest({
						id: requestEvent.id,
						error
					});
				}
			} else if (method === 'eth_signTypedData') {
				console.log('etapa7');
				// Overwrite 'eth_signTypedData' because otherwise metamask use incorrect param order to parse the request.
				method = 'eth_signTypedData_v3';
			}

			// TODO: this does not work
			this.backgroundBridge.onMessage({
				name: 'walletconnect-provider',
				data: {
					id: requestEvent.id,
					topic: requestEvent.topic,
					method,
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
			core = new Core({
				projectId: '6166082a19efffd141f1ce9ae338ac6c'
				// logger: 'debug',
			});
		} catch (err) {
			console.warn(`WC2::init Init failed due to missing key: ${err}`);
		}

		let web3Wallet;
		try {
			console.log('salve1');
			web3Wallet = await SingleEthereum.init({
				core: core,
				metadata: {
					name: 'Pali Wallet',
					description: 'Pali Wallet Integration',
					url: 'http://paliwallet.com/',
					icons: []
				}
			});
			console.log('salve2');
		} catch (err) {
			// TODO Sometime needs to init twice --- not sure why...
			web3Wallet = await SingleEthereum.init({
				core: core,
				metadata: {
					name: 'Pali Wallet',
					description: 'Pali Wallet Integration',
					url: 'http://paliwallet.com/',
					icons: []
				}
			});
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
		const url = proposer.metadata.url ?? '';
		const name = proposer.metadata.description ?? '';
		const icons = proposer.metadata.icons;

		//Não temos approval controler ver o motivo disso
		const { TransactionController } = Engine.context;

		console.log('1111');

		try {
			// Permissions approved.
			new Promise((resolve, reject) => {
				connecting = false;
				hub.emit('walletconnectSessionRequest', { id: id, walletConnectRequestInfo: proposer.metadata });

				hub.on('walletconnectSessionRequest::approved', id => {
					if (peerInfo.id === id) {
						resolve(true);
					}
				});
				hub.on('walletconnectSessionRequest::rejected', id => {
					if (peerInfo.id === id) {
						reject(new Error('walletconnectSessionRequest::rejected'));
					}
				});
			});
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
			console.error(`Error while handling request`, err);
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
