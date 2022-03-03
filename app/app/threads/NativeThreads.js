import { Thread } from 'react-native-threads';
import { randomTransactionId } from '../util/number';
import AsyncStorage from '@react-native-community/async-storage';
import { useOffchainEndPoint } from '../util/ApiClient';

class NativeThreads {
	listeners = {};
	thread;
	constructor() {
		// start a new react native JS process
		this.thread = new Thread('./NativeWorker.js');
		// listen for messages
		this.thread.onmessage = message => {
			if (!message) {
				return;
			}
			const end = JSON.parse(message);
			// console.log('PPYang NativeThreads end：', end);
			if (end.status === 'callback') {
				this.handCallback(end);
			} else if (this.listeners[end._id]) {
				this.listeners[end._id](end);
				delete this.listeners[end._id];
			} else if (this.listeners[end.status]) {
				this.listeners[end.status](end.value);
			}
		};
	}
	handCallback(data) {
		switch (data.api) {
			case 'async_storage':
				return this.handlePromise(
					data,
					// eslint-disable-next-line no-useless-call,prefer-spread
					this.callAsyncStorage.apply(this, data.args)
				);
			case 'useOffchainEndPoint':
				return this.handlePromise(
					data,
					// eslint-disable-next-line no-useless-call,prefer-spread
					this.callUseOffchainEndPoint.apply(this, data.args)
				);
			default:
				this.handlePromise(data, this.error.apply(this));
		}
	}
	handlePromise(initData: any, p: Promise<any>) {
		p.then(
			value => {
				// send a message, strings only
				this.thread.postMessage(
					JSON.stringify({
						status: 'ok',
						_id: initData._id,
						value: value || ''
					})
				);
			},
			err => {
				// send a message, strings only
				this.thread.postMessage(
					JSON.stringify({
						status: 'error',
						_id: initData._id,
						value: err.message
					})
				);
			}
		);
	}
	async callAsyncStorage(type, name, value) {
		if (type === 0) {
			return await AsyncStorage.getItem(name, value);
		}
		return await AsyncStorage.setItem(name, value);
	}

	async callUseOffchainEndPoint() {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		return await useOffchainEndPoint();
	}

	async error() {
		return 'route not found';
	}

	addListener(name, listener) {
		this.listeners[name] = listener;
	}

	async callTransactionResult(id) {
		return this.postAsync('transaction_result', id);
	}

	async callControllerAsync(name, method, ...args) {
		return this.postAsync('controller', name, method, ...args);
	}

	async callEngineAsync(name, ...args) {
		return this.postAsync('engine', name, ...args);
	}

	async callSqliteAsync(method, ...args) {
		return this.postAsync('sqlite', method, ...args);
	}

	async callAgentProvider(name, type, method, ...args) {
		return this.postAsync('agent_provider', name, type, method, ...args);
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
		this.postMessage(message);
	}

	postMessage(message) {
		this.thread.postMessage(JSON.stringify(message));
	}

	toMessage(funcName: any, args = []) {
		return {
			api: funcName,
			args
		};
	}

	terminate() {
		this.thread?.terminate();
	}
}

let instance;

export default {
	get() {
		if (!instance) {
			instance = new NativeThreads();
		}
		return instance;
	},
	terminate() {
		instance?.terminate();
	}
};
