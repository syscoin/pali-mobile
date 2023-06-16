import {
	AssetsContractController,
	TronContractController,
	AssetsController,
	AssetsDetectionController,
	KeyringController,
	PersonalMessageManager,
	MessageManager,
	NetworkController,
	RpcContractController,
	PreferencesController,
	TokenBalancesController,
	TokenRatesController,
	TransactionController,
	TypedMessageManager,
	TronNetworkController,
	SecurityController,
	CollectiblesController,
	ApprovalEventsController,
	AssetsDataModel,
	EnsController,
	RpcNetworkController,
	InviteController,
	util,
	DefiProtocolController,
	StaticTokenController,
	NetworkConfig,
	ChainType,
	ArbContractController,
	PolygonContractController
} from 'paliwallet-core';

import { store } from '../store';
import NativeThreads from '../threads/NativeThreads';
import { EventEmitter } from 'events';
import { endNetworkChange } from '../actions/settings';
import WalletConnect from './WalletConnect';
import NotificationManager from './NotificationManager';
import { getInternalFunctions } from '../util/threadUtils';
import { reportError } from '../util/statistics';
import Device from '../util/Device';

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

	getAgentController(controllers: []) {
		const context = {};
		controllers.forEach(controller => {
			const cls = controller.cls;
			const item = controller.name;
			const agent = new Agent(item);
			const keys = getInternalFunctions(cls);
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
			const clsNetworks = [];
			const clsContracts = [];
			for (const type in NetworkConfig) {
				const chainType = Number(type);
				const config = NetworkConfig[chainType];
				if (config.Disabled) {
					continue;
				}
				if (chainType === ChainType.Tron) {
					clsNetworks.push({ cls: TronNetworkController, name: 'TronNetworkController', chainType });
					clsContracts.push({ cls: TronContractController, name: 'TronContractController', chainType });
				} else {
					const networkName = (chainType === ChainType.Ethereum ? '' : config.Name) + 'NetworkController';
					clsNetworks.push({ cls: NetworkController, name: networkName, chainType });
					let clsContract = AssetsContractController;
					if (chainType === ChainType.Arbitrum) {
						clsContract = ArbContractController;
					} else if (chainType === ChainType.Polygon) {
						clsContract = PolygonContractController;
					}
					const contractName =
						chainType === ChainType.Ethereum
							? 'AssetsContractController'
							: config.Name + 'ContractController';
					clsContracts.push({
						cls: clsContract,
						name: contractName,
						chainType
					});
				}
			}
			clsNetworks.push({ cls: RpcNetworkController, name: 'RpcNetworkController', chainType: ChainType.RPCBase });
			clsContracts.push({
				cls: RpcContractController,
				name: 'RpcContractController',
				chainType: ChainType.RPCBase
			});

			const allNetwork = this.getAgentController(clsNetworks);
			const networks = {};
			for (const key in allNetwork) {
				const chainType = clsNetworks.find(clsNetwork => clsNetwork.name === key).chainType;
				networks[chainType] = allNetwork[key];
			}

			const allContracts = this.getAgentController(clsContracts);
			const contracts = {};
			for (const key in allContracts) {
				const chainType = clsContracts.find(clsContract => clsContract.name === key).chainType;
				contracts[chainType] = allContracts[key];
			}
			this.datamodel = {
				networks,
				contracts,
				context: {
					...this.getAgentController([
						{
							cls: KeyringController,
							name: 'KeyringController'
						},
						{ cls: AssetsController, name: 'AssetsController' },
						{ cls: AssetsDetectionController, name: 'AssetsDetectionController' },
						{ cls: PersonalMessageManager, name: 'PersonalMessageManager' },
						{ cls: MessageManager, name: 'MessageManager' },
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
						{ cls: DefiProtocolController, name: 'DefiProtocolController' },
						{ cls: StaticTokenController, name: 'StaticTokenController' }
					]),
					...allNetwork,
					...allContracts
				}
			};
			NativeThreads.get().addListener('state', result => {
				let newState;
				if (result.overwrite) {
					newState = util.rehydrate(result.key, result.state);
				} else {
					const subState = util.rehydrate(result.key, result.state);
					newState = { ...this.datamodel.context[result.key].state, ...subState };
				}
				if (result.key === 'RpcNetworkController' && newState.networks) {
					const types = Object.keys(newState.networks);
					if (types?.length) {
						types.forEach(type => {
							if (!this.datamodel.networks[ChainType.RPCBase].providers[type]) {
								this.datamodel.networks[ChainType.RPCBase].providers[type] = new AgentProvider(
									'RpcNetworkController',
									type
								);
							}
						});
						const beTypes = Object.keys(this.datamodel.networks[ChainType.RPCBase].providers);
						if (beTypes?.length) {
							beTypes.forEach(type => {
								if (!types.includes(type)) {
									delete this.datamodel.networks[ChainType.RPCBase].providers[type];
								}
							});
						}
					} else {
						this.datamodel.networks[ChainType.RPCBase].providers = [];
					}
				}
				this.datamodel.context[result.key]?.notify(newState);
			});
			NativeThreads.get().addListener('emit', result => {
				try {
					this.datamodel.context[result.key]?.hub?.emit(...result.args);
				} catch (e) {
					Device.isAndroid() && reportError(JSON.stringify({ name: 'emit_error', emit: result, error: e }));
					util.logWarn('PPYang NativeThreads emit fail, result:', result, ' , error:', e);
				}
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
				try {
					if (result.key === 'RpcNetworkController') {
						this.datamodel.context[result.key]?.providers?.[result.type]?.emit(...result.args);
					} else {
						this.datamodel.context[result.key]?.provider?.emit(...result.args);
					}
				} catch (e) {
					Device.isAndroid() &&
						reportError(JSON.stringify({ name: 'provider_emit_error', provider_emit: result, error: e }));
					util.logWarn('PPYang NativeThreads provider_emit fail, result:', result, ' , error:', e);
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
	get networks() {
		return instance && instance.datamodel && instance.datamodel.networks;
	},
	get contracts() {
		return instance && instance.datamodel && instance.datamodel.contracts;
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
