import { ChainType, util, URL } from 'paliwallet-core';
import { JsonRpcEngine } from 'json-rpc-engine';
import { JS_POST_MESSAGE_TO_PROVIDER, JS_IFRAME_POST_MESSAGE_TO_PROVIDER } from '../util/browserScripts';
import MobilePortStream from './MobilePortStream';
import { setupMultiplex } from '../util/streams';
import { createOriginMiddleware, createLoggerMiddleware } from '../util/middlewares';
import Engine from './Engine';
import AppConstants from './AppConstants';
import { createEngineStream } from 'json-rpc-middleware-stream';
import { getChainIdByType } from '../util/number';

const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const EthBlockTracker = require('eth-block-tracker');
const pump = require('pump');
const EventEmitter = require('events').EventEmitter;
const { NOTIFICATION_NAMES } = AppConstants;

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */

class Port extends EventEmitter {
	constructor(window, isMainFrame) {
		super();
		this._window = window;
		this._isMainFrame = isMainFrame;
	}

	postMessage = (msg, origin = '*') => {
		const js = this._isMainFrame
			? JS_POST_MESSAGE_TO_PROVIDER(msg, origin)
			: JS_IFRAME_POST_MESSAGE_TO_PROVIDER(msg, origin);
		if (this._window && this._window.webViewRef && this._window.webViewRef.current) {
			this._window.injectJavaScript(js);
		}
	};
}

export class BackgroundBridge extends EventEmitter {
	constructor({ webview, url, chain_type, getRpcMethodMiddleware, isMainFrame, isWalletConnect }) {
		super();
		this.url = url;
		this.chain_type = chain_type;
		this.hostname = new URL(url).hostname;
		this.isMainFrame = isMainFrame;
		this._webviewRef = webview && webview.current;
		this.isWalletConnect = isWalletConnect;
		this.createMiddleware = getRpcMethodMiddleware;
		this.chain_type = chain_type;
		this.chain_id = getChainIdByType(chain_type);
		if (util.isRpcChainType(this.chain_type)) {
			this.provider = Engine.networks[ChainType.RPCBase].providers[this.chain_type];
		} else {
			this.provider = Engine.networks[this.chain_type]?.provider;
			Engine.networks[this.chain_type]?.subscribe(this.sendStateUpdate);
		}
		if (this.provider) {
			this.blockTracker = new EthBlockTracker({
				provider: this.provider,
				pollingInterval: 4000,
				setSkipCacheFlag: true
			});
		}

		this.port = new Port(this._webviewRef, isMainFrame);

		this.engine = null;

		this.chainIdSent = null;

		const portStream = new MobilePortStream(this.port, url);
		// setup multiplexing
		const mux = setupMultiplex(portStream);
		// connect features
		this.setupProviderConnection(
			mux.createStream(isWalletConnect ? 'walletconnect-provider' : 'metamask-provider')
		);

		Engine.context.PreferencesController.subscribe(this.sendStateUpdate);
		Engine.context.KeyringController.onLock(this.onLock.bind(this));
		Engine.context.KeyringController.onUnlock(this.onUnlock.bind(this));

		this.on('update', this.onStateUpdate);
	}

	onUnlock() {
		this.sendNotification({
			method: NOTIFICATION_NAMES.unlockStateChanged,
			params: true
		});
	}

	onLock() {
		this.sendNotification({
			method: NOTIFICATION_NAMES.unlockStateChanged,
			params: false
		});
	}

	getProviderNetworkState({ network }) {
		let chainId = this.chain_id;

		if (chainId && !chainId.startsWith('0x')) {
			// Convert to hex
			chainId = `0x${parseInt(chainId, 10).toString(16)}`;
		}

		const result = {
			networkVersion: network,
			chainId
		};
		return result;
	}

	onStateUpdate(memState) {
		if (!memState) {
			memState = this.getState();
		}
		const publicState = this.getProviderNetworkState(memState);

		// Check if update already sent
		if (this.chainIdSent === publicState.chainId) return;
		this.chainIdSent = publicState.chainId;

		this.sendNotification({
			method: NOTIFICATION_NAMES.chainChanged,
			params: publicState
		});
	}

	isUnlocked() {
		return Engine.context.KeyringController.isUnlocked();
	}

	getProviderState() {
		const memState = this.getState();
		return {
			isUnlocked: this.isUnlocked(),
			...this.getProviderNetworkState(memState)
		};
	}

	sendStateUpdate = () => {
		this.emit('update');
	};

	onMessage = msg => {
		this.port.emit('message', { name: msg.name, data: msg.data });
	};

	onDisconnect = () => {
		this.port.emit('disconnect', { name: this.port.name, data: null });
	};

	/**
	 * A method for serving our ethereum provider over a given stream.
	 * @param {*} outStream - The stream to provide over.
	 */
	setupProviderConnection(outStream) {
		this.engine = this.setupProviderEngine();

		// setup connection
		const providerStream = createEngineStream({ engine: this.engine });

		pump(outStream, providerStream, outStream, err => {
			// handle any middleware cleanup
			this.engine._middleware.forEach(mid => {
				if (mid.destroy && typeof mid.destroy === 'function') {
					mid.destroy();
				}
			});
			if (err) util.logDebug('Error with provider stream conn', err);
		});
	}

	/**
	 * A method for creating a provider that is safely restricted for the requesting domain.
	 **/
	setupProviderEngine() {
		const origin = this.hostname;
		// setup json rpc engine stack
		const engine = new JsonRpcEngine();
		const provider = this.provider;

		const blockTracker = this.blockTracker;

		// create filter polyfill middleware
		const filterMiddleware = createFilterMiddleware({ provider, blockTracker });

		// create subscription polyfill middleware
		const subscriptionManager = createSubscriptionManager({ provider, blockTracker });
		subscriptionManager.events.on('notification', message => engine.emit('notification', message));

		// metadata
		engine.push(createOriginMiddleware({ origin }));
		engine.push(createLoggerMiddleware({ origin }));
		// filter and subscription polyfills
		engine.push(filterMiddleware);
		engine.push(subscriptionManager.middleware);
		// watch asset

		// user-facing RPC methods
		engine.push(
			this.createMiddleware({
				hostname: this.hostname,
				getProviderState: this.getProviderState.bind(this)
			})
		);

		// forward to metamask primary provider
		engine.push(providerAsMiddleware(provider));
		return engine;
	}

	sendNotification(payload) {
		this.engine && this.engine.emit('notification', payload);
	}

	getState() {
		const vault = Engine.context.KeyringController.state.vault;
		const { selectedAddress } = Engine.context.PreferencesController.state;
		const network = this.chain_id;
		return {
			isInitialized: !!vault,
			isUnlocked: true,
			network,
			selectedAddress
		};
	}
}

export default BackgroundBridge;
