import './shim.js';
import { self } from 'react-native-threads';
import EngineImpl from './app/core/EngineImpl';
import { Sqlite, util } from 'gopocket-core';
import { randomTransactionId } from './app/util/number';
import NativeWorker from './NativeWorker';

function handlePromise(initData: any, p: Promise<any>) {
	p.then(
		value => {
			// send a message, strings only
			self.postMessage(
				JSON.stringify({
					status: 'ok',
					_id: initData._id,
					value: value || ''
				})
			);
		},
		err => {
			// send a message, strings only
			self.postMessage(
				JSON.stringify({
					status: 'error',
					_id: initData._id,
					value: err.message
				})
			);
		}
	);
}

class TodoApi {
	listeners = {};
	engine;
	transactionResult = {};
	agents = {};

	async callRegisterCls(objs) {
		if (!objs) {
			return;
		}
		objs.forEach(obj => {
			const agent = [];
			obj.funcs?.forEach(
				name =>
					(agent[name] = function(...args) {
						return NativeWorker.Api.postAsync('call_register', obj.name, name, ...args);
					})
			);
			this.agents[obj.name] = agent;
		});
		if (this.agents.TsUtils) {
			util.setAgentUtil(this.agents.TsUtils);
		}
	}

	async callTransactionResult(id) {
		if (this.transactionResult[id]) {
			return this.transactionResult[id];
		}
		throw new Error('not found transaction result!');
	}
	async callController(name, method, ...args) {
		if (!this.engine) {
			return 'engine not init';
		}
		if (name === 'TransactionController' && method === 'addTransaction') {
			const end = await EngineImpl.context[name]?.[method]?.(...args);
			if (end.result && end.transactionMeta) {
				this.transactionResult[end.transactionMeta.id] = end.result;
			}
			return end;
		}
		return EngineImpl.context[name]?.[method]?.(...args);
	}
	async callSqlite(method, ...args) {
		return Sqlite.getInstance()[method]?.(...args);
	}
	async callProvider(name, type, method, ...args) {
		return await new Promise(resolve => {
			if (name === 'RpcNetworkController') {
				const provider = EngineImpl.context.RpcNetworkController.providers?.[type];
				if (provider) {
					provider[method](...args, (error, resultObj) => {
						resolve({ error, resultObj });
					});
				} else {
					resolve({ error: 'Not found provider!' });
				}
			} else {
				EngineImpl.context[name].provider[method](...args, (error, resultObj) => {
					resolve({ error, resultObj });
				});
			}
		});
	}
	async callEngine(method, ...args) {
		if (method === 'init') {
			this.engine = EngineImpl.init(...args);
			// 监听controllers state变化
			for (const item in EngineImpl.context) {
				EngineImpl.context[item].subscribe((state, subState) => {
					this.dispatchControllerState(item, subState, false);
				});
			}
			for (const item in EngineImpl.context) {
				this.dispatchControllerState(item, EngineImpl.context[item].state, true);
			}
			this.patchEmitter('TransactionController', 'emit', EngineImpl.context.TransactionController.hub);
			this.patchEmitter('MessageManager', 'emit', EngineImpl.context.MessageManager.hub);
			this.patchEmitter('PersonalMessageManager', 'emit', EngineImpl.context.PersonalMessageManager.hub);
			this.patchEmitter('TypedMessageManager', 'emit', EngineImpl.context.TypedMessageManager.hub);
			EngineImpl.context.KeyringController.onLock(this.dispatchKeyringControllerOnLock);
			EngineImpl.context.KeyringController.onUnlock(this.dispatchKeyringControllerOnUnlock);
		} else if (this.engine) {
			return EngineImpl[method](...args);
		} else {
			return 'engine not init';
		}
	}
	patchEmitter(name, status, emitter) {
		const oldEmit = emitter.emit;
		emitter.emit = function(...args) {
			oldEmit.apply(emitter, args);
			self.postMessage(
				JSON.stringify({
					status,
					value: { key: name, args }
				})
			);
		};
	}
	dispatchKeyringControllerOnLock() {
		self.postMessage(
			JSON.stringify({
				status: 'OnLock'
			})
		);
	}
	dispatchKeyringControllerOnUnlock() {
		self.postMessage(
			JSON.stringify({
				status: 'onUnlock'
			})
		);
	}
	dispatchControllerState(key, state, overwrite) {
		self.postMessage(
			JSON.stringify({
				status: 'state',
				value: { key, state, overwrite }
			})
		);
	}
	dispatchNotification(type, needUpdate) {
		self.postMessage(
			JSON.stringify({
				status: 'notification',
				value: { type, needUpdate }
			})
		);
	}
	dispatchNetworkChanged(type, chainId) {
		self.postMessage(
			JSON.stringify({
				status: 'network_changed',
				value: { type, chainId }
			})
		);
	}
	dispatchEndNetworkChange(type, providerType) {
		self.postMessage(
			JSON.stringify({
				status: 'end_network_change',
				value: { type, providerType }
			})
		);
	}
	async useOffchainEndPoint() {
		return this.postAsync('useOffchainEndPoint');
	}
	async postAsync(funcName: any, ...args) {
		const message = this.toMessage(funcName, args);
		return new Promise((resolve, reject) => {
			this.postAndCallback(message, result => {
				if (result.status === 'ok') {
					resolve(result.value);
				} else {
					reject(new Error(result.value));
				}
			});
		});
	}
	postAndCallback(message, callback) {
		if (callback) {
			const _id = randomTransactionId().toString();
			this.listeners[_id] = callback;
			message._id = _id;
		}
		self.postMessage(JSON.stringify(message));
	}
	toMessage(funcName: any, args = []) {
		return {
			status: 'callback',
			api: funcName,
			args
		};
	}
	handCallback(data) {
		this.listeners[data._id](data);
		delete this.listeners[data._id];
	}
	async error() {
		return 'route not found';
	}
}

const api = new TodoApi();

// listen for messages
self.onmessage = message => {
	const data = JSON.parse(message);
	// util.logDebug('PPYang NativeWorker data:', data);
	if (data.status && data._id) {
		api.handCallback(data);
		return;
	}
	switch (data.api) {
		case 'controller':
			return handlePromise(
				data,
				// eslint-disable-next-line no-useless-call,prefer-spread
				api.callController.apply(api, data.args)
			);
		case 'engine':
			return handlePromise(
				data,
				// eslint-disable-next-line no-useless-call,prefer-spread
				api.callEngine.apply(api, data.args)
			);
		case 'sqlite':
			return handlePromise(
				data,
				// eslint-disable-next-line no-useless-call,prefer-spread
				api.callSqlite.apply(api, data.args)
			);
		case 'agent_provider':
			return handlePromise(
				data,
				// eslint-disable-next-line no-useless-call,prefer-spread
				api.callProvider.apply(api, data.args)
			);
		case 'transaction_result':
			return handlePromise(
				data,
				// eslint-disable-next-line no-useless-call,prefer-spread
				api.callTransactionResult.apply(api, data.args)
			);
		case 'register_cls':
			return handlePromise(
				data,
				// eslint-disable-next-line no-useless-call,prefer-spread
				api.callRegisterCls.apply(api, data.args)
			);
		default:
			handlePromise(data, api.error.apply(api));
	}
};

export default {
	get Api() {
		return api;
	},
	get Agents() {
		return api.agents;
	}
};
