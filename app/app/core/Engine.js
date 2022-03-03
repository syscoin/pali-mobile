import {
	AssetsContractController,
	ArbContractController,
	OpContractController,
	BscContractController,
	PolygonContractController,
	TronContractController,
	HecoContractController,
	AvaxContractController,
	AssetsController,
	AssetsDetectionController,
	KeyringController,
	PersonalMessageManager,
	MessageManager,
	NetworkController,
	ArbNetworkController,
	OpNetworkController,
	RpcContractController,
	PreferencesController,
	TokenBalancesController,
	TokenRatesController,
	TransactionController,
	TypedMessageManager,
	BscNetworkController,
	PolygonNetworkController,
	TronNetworkController,
	HecoNetworkController,
	AvaxNetworkController,
	BscBridgeController,
	SecurityController,
	CollectiblesController,
	ApprovalEventsController,
	AssetsDataModel,
	EnsController,
	RpcNetworkController,
	InviteController,
	util,
	DefiProtocolController
} from 'gopocket-core';

import { store } from '../store';
import NativeThreads from '../threads/NativeThreads';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import { endNetworkChange } from '../actions/settings';
import WalletConnect from './WalletConnect';
import NotificationManager from './NotificationManager';

class AgentProvider extends EventEmitter {
	name;
	type;

	constructor(name, type = undefined) {
		super();
		this.name = name;
		this.type = type;
	}

	async sendAsync(payload, cb) {
		const result = await NativeThreads.get().callAgentProvider(this.name, this.type, 'sendAsync', payload);
		cb && cb(result.error, result.resultObj);
	}
}

class Agent {
	listeners = [];
	name;
	config = {};

	constructor(name) {
		this.name = name;
	}

	get state() {
		// eslint-disable-next-line no-undef
		const state = store.getState();
		if (state?.engine?.backgroundState?.[this.name]) {
			return state?.engine?.backgroundState?.[this.name];
		}
		return {};
	}

	subscribe(listener) {
		this.listeners.push(listener);
	}

	unsubscribe(listener) {
		const index = this.listeners.findIndex(cb => listener === cb);
		index > -1 && this.listeners.splice(index, 1);
		return index > -1;
	}

	notify(state: any) {
		this.listeners.forEach(listener => {
			try {
				listener(state);
			} catch (e) {
				util.logDebug(`leon.w@${this.name} Agent notify listener failed: `, e);
				throw e;
			}
		});
	}

	configure(config) {
		this.config = { ...this.config, ...config };
		return NativeThreads.get().callControllerAsync(this.name, 'configure', config);
	}
}

class Engine {
	datamodel;

	getAllFuncs(cls) {
		if (!cls) {
			return [];
		}
		const funcs = [];
		if (cls.prototype) {
			const props = Object.getOwnPropertyNames(cls.prototype);
			props && funcs.push(...props);
		}
		const obj = Object.getPrototypeOf(cls);
		if (obj) {
			funcs.push(...this.getAllFuncs(obj));
		}
		return funcs;
	}

	getAgentController(controllers: []) {
		const context = {};
		controllers.forEach(controller => {
			const cls = controller.cls;
			const item = controller.name;
			const agent = new Agent(item);
			const keys = this.getAllFuncs(cls);
			keys?.forEach(key => {
				if (key !== 'state' && !agent[key]) {
					agent[key] = function(...args) {
						return NativeThreads.get().callControllerAsync(item, key, ...args);
					};
				}
			});
			if (
				item === 'TransactionController' ||
				item === 'MessageManager' ||
				item === 'PersonalMessageManager' ||
				item === 'TypedMessageManager'
			) {
				agent.hub = new EventEmitter();
			}
			if (item === 'TransactionController') {
				agent.addTransaction = async function(...args) {
					const end = await NativeThreads.get().callControllerAsync(item, 'addTransaction', ...args);
					if (end.result && end.transactionMeta) {
						return {
							result: NativeThreads.get().callTransactionResult(end.transactionMeta.id),
							transactionMeta: end.transactionMeta
						};
					}
					return end;
				};
			}
			if (item === 'ArbContractController') {
				agent.config.unconfirmed_interval = 180000;
			}
			if (item === 'KeyringController') {
				agent.onLockListeners = [];
				agent.onUnlockListeners = [];
				agent._isUnlocked = false;
				agent.isUnlocked = function() {
					return agent._isUnlocked;
				};
				agent.onLock = function(listener) {
					agent.onLockListeners.push(listener);
				};
				agent.onUnlock = function(listener) {
					agent.onUnlockListeners.push(listener);
				};
				agent.notifyOnLock = function() {
					agent._isUnlocked = false;
					agent.onLockListeners.forEach(listener => {
						listener();
					});
				};
				agent.notifyOnUnlock = function() {
					agent._isUnlocked = true;
					agent.onUnlockListeners.forEach(listener => {
						listener();
					});
				};
			}
			if (item === 'RpcNetworkController') {
				agent.providers = {};
			} else if (item.endsWith('NetworkController')) {
				agent.provider = new AgentProvider(item);
			}
			context[item] = agent;
		});
		return context;
	}

	constructor(initialState = {}) {
		if (!Engine.instance) {
			this.datamodel = {
				context: this.getAgentController([
					{
						cls: KeyringController,
						name: 'KeyringController'
					},
					{ cls: AssetsContractController, name: 'AssetsContractController' },
					{ cls: ArbContractController, name: 'ArbContractController' },
					{ cls: OpContractController, name: 'OpContractController' },
					{ cls: BscContractController, name: 'BscContractController' },
					{ cls: PolygonContractController, name: 'PolygonContractController' },
					{ cls: TronContractController, name: 'TronContractController' },
					{ cls: HecoContractController, name: 'HecoContractController' },
					{ cls: AvaxContractController, name: 'AvaxContractController' },
					{ cls: RpcContractController, name: 'RpcContractController' },
					{ cls: AssetsController, name: 'AssetsController' },
					{ cls: AssetsDetectionController, name: 'AssetsDetectionController' },
					{ cls: PersonalMessageManager, name: 'PersonalMessageManager' },
					{ cls: MessageManager, name: 'MessageManager' },
					{ cls: BscBridgeController, name: 'BscBridgeController' },
					{ cls: NetworkController, name: 'NetworkController' },
					{ cls: ArbNetworkController, name: 'ArbNetworkController' },
					{ cls: OpNetworkController, name: 'OpNetworkController' },
					{ cls: BscNetworkController, name: 'BscNetworkController' },
					{ cls: PolygonNetworkController, name: 'PolygonNetworkController' },
					{ cls: TronNetworkController, name: 'TronNetworkController' },
					{ cls: HecoNetworkController, name: 'HecoNetworkController' },
					{ cls: AvaxNetworkController, name: 'AvaxNetworkController' },
					{ cls: RpcNetworkController, name: 'RpcNetworkController' },
					{ cls: PreferencesController, name: 'PreferencesController' },
					{ cls: TokenBalancesController, name: 'TokenBalancesController' },
					{ cls: TokenRatesController, name: 'TokenRatesController' },
					{ cls: TransactionController, name: 'TransactionController' },
					{ cls: TypedMessageManager, name: 'TypedMessageManager' },
					{ cls: SecurityController, name: 'SecurityController' },
					{ cls: CollectiblesController, name: 'CollectiblesController' },
					{ cls: ApprovalEventsController, name: 'ApprovalEventsController' },
					{ cls: AssetsDataModel, name: 'AssetsDataModel' },
					{ cls: EnsController, name: 'EnsController' },
					{ cls: InviteController, name: 'InviteController' },
					{ cls: DefiProtocolController, name: 'DefiProtocolController' }
				])
			};
			NativeThreads.get().addListener('state', result => {
				const newState = util.rehydrate(result.key, result.state);
				if (result.key === 'RpcNetworkController' && newState.networks) {
					const types = Object.keys(newState.networks);
					if (types?.length) {
						types.forEach(type => {
							if (!this.datamodel.context.RpcNetworkController.providers[type]) {
								this.datamodel.context.RpcNetworkController.providers[type] = new AgentProvider(
									'RpcNetworkController',
									type
								);
							}
						});
						const beTypes = Object.keys(this.datamodel.context.RpcNetworkController.providers);
						if (beTypes?.length) {
							beTypes.forEach(type => {
								if (!types.includes(type)) {
									delete this.datamodel.context.RpcNetworkController.providers[type];
								}
							});
						}
					} else {
						this.datamodel.context.RpcNetworkController.providers = [];
					}
				}
				this.datamodel.context[result.key]?.notify(newState);
			});
			NativeThreads.get().addListener('emit', result => {
				this.datamodel.context[result.key]?.hub?.emit(...result.args);
			});
			NativeThreads.get().addListener('notification', result => {
				NotificationManager.gotIncomingTransaction(result.type, result.needUpdate);
			});
			NativeThreads.get().addListener('network_changed', result => {
				WalletConnect.onNetworkChanged(result.type, result.chainId);
			});
			NativeThreads.get().addListener('end_network_change', result => {
				store.dispatch(endNetworkChange(result.type, result.providerType));
			});
			NativeThreads.get().addListener('OnLock', () => {
				this.datamodel.context.KeyringController.notifyOnLock?.();
			});
			NativeThreads.get().addListener('onUnlock', () => {
				this.datamodel.context.KeyringController.notifyOnUnlock?.();
			});
			NativeThreads.get().addListener('provider_emit', result => {
				if (result.key === 'RpcNetworkController') {
					this.datamodel.context[result.key]?.providers?.[result.type]?.emit(...result.args);
				} else {
					this.datamodel.context[result.key]?.provider?.emit(...result.args);
				}
			});
			NativeThreads.get().callEngineAsync('init', initialState);
			Engine.instance = this;
		}
		return Engine.instance;
	}
}

let instance;

export default {
	get context() {
		return instance && instance.datamodel && instance.datamodel.context;
	},
	async resetState() {
		return NativeThreads.get().callEngineAsync('resetState');
	},
	async getScanKey(type) {
		return NativeThreads.get().callEngineAsync('getScanKey', type);
	},
	async refreshTransactionHistory(selectedAddress, forceCheck = false) {
		return NativeThreads.get().callEngineAsync('refreshTransactionHistory', selectedAddress, forceCheck);
	},
	async fetchAssetsSafety(forceCheck = false) {
		return NativeThreads.get().callEngineAsync('fetchAssetsSafety', forceCheck);
	},
	init(state) {
		instance = new Engine(state);
		Object.freeze(instance);
		return instance;
	}
};
