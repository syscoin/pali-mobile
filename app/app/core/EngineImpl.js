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
	ComposableController,
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
	ChainType,
	SecurityController,
	CollectiblesController,
	util,
	TxChangedType,
	ApprovalEventsController,
	AssetsDataModel,
	EnsController,
	Mutex,
	RpcNetworkController,
	InviteController,
	DefiProtocolController,
	StaticTokenController
} from 'gopocket-core';

import Encryptor from './Encryptor';
import AppConstants from './AppConstants';
import {
	LAST_INCOMING_TX_BLOCK_INFO,
	LAST_BSC_INCOMING_TX_BLOCK_INFO,
	LAST_POLYGON_INCOMING_TX_BLOCK_INFO,
	ETHERSCAN_KEY,
	BSCSCAN_KEY,
	POLYGONSCAN_KEY,
	LAST_ARB_INCOMING_TX_BLOCK_INFO,
	LAST_HECO_INCOMING_TX_BLOCK_INFO,
	LAST_OP_INCOMING_TX_BLOCK_INFO,
	LAST_AVAX_INCOMING_TX_BLOCK_INFO,
	BACKUP_VAULT
} from '../constants/storage';
import numberUtil from '../util/number';
import NativeWorker from '../../NativeWorker';
import importAdditionalAccounts from '../util/importAdditionalAccounts';
import { strings } from '../../locales/i18n';

import { INFURA_PROJECTID, OPENSEA_APIKEY, ETHERSCAN_APIKEYS, BSCSCAN_APIKEYS, POLYGONSCAN_APIKEYS } from '@env';

const encryptor = new Encryptor();
let currentChainId;
let currentBscChainId;
let currentPolygonChainId;
let currentArbChainId;
let currentOpChainId;
let currentTronChainId;
let currentHecoChainId;
let currentAvaxChainId;
let etherHandle: NodeJS.Timer = null;
let bscHandle: NodeJS.Timer = null;
let polygonHandle: NodeJS.Timer = null;
let arbHandle: NodeJS.Timer = null;
let opHandle: NodeJS.Timer = null;
let tronHandle: NodeJS.Timer = null;
let hecoHandle: NodeJS.Timer = null;
let avaxHandle: NodeJS.Timer = null;
let addresses;
const mutex = new Mutex();
let etherscanKey = null;
let bscscanKey = null;
let polygonscanKey = null;
let removeTxInfosIfNecessaryDone = false;

class EngineImpl {
	datamodel;

	constructor(initialState = {}) {
		if (!EngineImpl.instance) {
			this.datamodel = new ComposableController(
				[
					new KeyringController({ encryptor }),
					new AssetsContractController(),
					new ArbContractController(),
					new OpContractController(),
					new BscContractController(),
					new PolygonContractController(),
					new TronContractController(),
					new HecoContractController(),
					new AvaxContractController(),
					new RpcContractController(),
					new AssetsController(),
					new AssetsDetectionController(),
					new PersonalMessageManager(),
					new MessageManager(),
					new BscBridgeController(),
					new NetworkController({
						infuraProjectId: INFURA_PROJECTID,
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new ArbNetworkController({
						infuraProjectId: INFURA_PROJECTID,
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new OpNetworkController({
						infuraProjectId: INFURA_PROJECTID,
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new BscNetworkController({
						infuraProjectId: '',
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new PolygonNetworkController({
						infuraProjectId: INFURA_PROJECTID,
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new TronNetworkController({
						infuraProjectId: '',
						getProviderConfig: undefined
					}),
					new HecoNetworkController({
						infuraProjectId: '',
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new AvaxNetworkController({
						infuraProjectId: '',
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new RpcNetworkController({
						infuraProjectId: '',
						getProviderConfig: this.getProviderConfig.bind(this)
					}),
					new PreferencesController({
						mainAccount: strings('other.main_account'),
						otherAccount: strings('other.other_account'),
						observeAccount: strings('other.observe_account')
					}),
					new TokenBalancesController({ interval: 30000 }),
					new TokenRatesController(),
					new TransactionController(),
					new TypedMessageManager(),
					new SecurityController({
						interval: 10 * 60 * 1000,
						acceptLanguage: strings('other.accept_language')
					}),
					new CollectiblesController(
						{ getScanKey: this.getScanKey },
						{
							openSeaApiKey: OPENSEA_APIKEY
						}
					),
					new ApprovalEventsController(),
					new AssetsDataModel({ numberUtil }),
					new EnsController(),
					new InviteController(),
					new DefiProtocolController(),
					new StaticTokenController()
				],
				initialState
			);

			try {
				const {
					KeyringController: keyring,
					NetworkController: network,
					ArbNetworkController: arbnetwork,
					OpNetworkController: opnetwork,
					BscNetworkController: bscnetwork,
					PolygonNetworkController: polygonnetwork,
					TronNetworkController: tronnetwork,
					HecoNetworkController: heconetwork,
					AvaxNetworkController: avaxnetwork,
					RpcNetworkController: rpcnetwork,
					TransactionController: transaction,
					PreferencesController: preferences
				} = this.datamodel.context;
				network.refreshNetwork();
				setTimeout(
					async () => arbnetwork.refreshNetwork(await NativeWorker.Agents.ApiClient.useOffchainEndPoint()),
					100
				);
				opnetwork.refreshNetwork();
				bscnetwork.refreshNetwork();
				polygonnetwork.refreshNetwork();
				if (util.TRON_ENABLED) {
					tronnetwork.refreshNetwork();
				}
				heconetwork.refreshNetwork();
				avaxnetwork.refreshNetwork();
				rpcnetwork.refreshNetwork();
				transaction.configure({ sign: keyring.signTransaction.bind(keyring) });
				network.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentChainId) {
						currentChainId = state.network;
						etherHandle && clearTimeout(etherHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Ethereum, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						etherHandle = setTimeout(() => {
							this.configureControllersOnNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(network.name, 'provider_emit', network.provider);
					}
				});

				bscnetwork.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentBscChainId) {
						currentBscChainId = state.network;
						bscHandle && clearTimeout(bscHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Bsc, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						bscHandle = setTimeout(() => {
							this.configureControllersOnBscNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(bscnetwork.name, 'provider_emit', bscnetwork.provider);
					}
				});

				polygonnetwork.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentPolygonChainId) {
						currentPolygonChainId = state.network;
						polygonHandle && clearTimeout(polygonHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Polygon, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						polygonHandle = setTimeout(() => {
							this.configureControllersOnPolygonNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(polygonnetwork.name, 'provider_emit', polygonnetwork.provider);
					}
				});

				arbnetwork.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentArbChainId) {
						currentArbChainId = state.network;
						arbHandle && clearTimeout(arbHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Arbitrum, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						arbHandle = setTimeout(() => {
							this.configureControllersOnArbNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(arbnetwork.name, 'provider_emit', arbnetwork.provider);
					}
				});

				opnetwork.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentOpChainId) {
						currentOpChainId = state.network;
						opHandle && clearTimeout(opHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Optimism, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						opHandle = setTimeout(() => {
							this.configureControllersOnOpNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(opnetwork.name, 'provider_emit', opnetwork.provider);
					}
				});

				tronnetwork.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentTronChainId) {
						currentTronChainId = state.network;
						tronHandle && clearTimeout(tronHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Tron, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						tronHandle = setTimeout(() => {
							this.configureControllersOnTronNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(tronnetwork.name, 'provider_emit', tronnetwork.provider);
					}
				});

				heconetwork.subscribe(state => {
					if (state.network !== 'loading' && state.network !== currentHecoChainId) {
						currentHecoChainId = state.network;
						hecoHandle && clearTimeout(hecoHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Heco, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						hecoHandle = setTimeout(() => {
							this.configureControllersOnHecoNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(heconetwork.name, 'provider_emit', heconetwork.provider);
					}
				});

				avaxnetwork.subscribe(state => {
					if (state.network !== 'loading' && state.provider.chainId !== currentAvaxChainId) {
						currentAvaxChainId = state.provider.chainId;
						avaxHandle && clearTimeout(avaxHandle);
						NativeWorker.Api.dispatchEndNetworkChange(ChainType.Avax, state.provider.type);
						// We should add a state or event emitter saying the provider changed
						avaxHandle = setTimeout(() => {
							this.configureControllersOnAvaxNetworkChange();
						}, 800);
						NativeWorker.Api.patchEmitter(avaxnetwork.name, 'provider_emit', avaxnetwork.provider);
					}
				});
				addresses = Object.keys(preferences.state.identities);
				preferences.subscribe(
					({ identities }) => {
						const newAddresses = Object.keys(identities);
						const oldAddresses = addresses || [];
						let address;
						if (newAddresses.length > oldAddresses.length) {
							address = newAddresses.find(addr => !oldAddresses.includes(addr));
						}
						addresses = newAddresses;
						if (address) {
							setTimeout(() => this.refreshTransactionHistory(address), 100);
						}
					},
					['identities']
				);
				keyring.subscribe(
					async ({ vault }) => {
						vault && (await NativeWorker.Agents.AsyncStorage.setItem(BACKUP_VAULT, vault));
					},
					['vault']
				);
			} catch (e) {
				util.logDebug('leon.w@init engine error: ', e);
			}
			EngineImpl.instance = this;
		}
		return EngineImpl.instance;
	}

	async getScanKey(type) {
		if (type === ChainType.Bsc) {
			do {
				if (bscscanKey) {
					break;
				}
				bscscanKey = await NativeWorker.Agents.AsyncStorage.getItem(BSCSCAN_KEY);
				if (bscscanKey) {
					break;
				}
				try {
					const keysJson = JSON.parse(BSCSCAN_APIKEYS);
					if (Array.isArray(keysJson)) {
						bscscanKey = keysJson[Math.floor(Math.random() * keysJson.length)];
					}
				} catch (e) {
					bscscanKey = BSCSCAN_APIKEYS;
				}
				if (bscscanKey) {
					await NativeWorker.Agents.AsyncStorage.setItem(BSCSCAN_KEY, bscscanKey);
				}
			} while (false);
			if (!bscscanKey) {
				util.logError(`key for bscscan.com not configured. ${BSCSCAN_APIKEYS}`);
			}
			return bscscanKey;
		} else if (type === ChainType.Polygon) {
			do {
				if (polygonscanKey) {
					break;
				}
				polygonscanKey = await NativeWorker.Agents.AsyncStorage.getItem(POLYGONSCAN_KEY);
				if (polygonscanKey) {
					break;
				}
				try {
					const keysJson = JSON.parse(POLYGONSCAN_APIKEYS);
					if (Array.isArray(keysJson)) {
						polygonscanKey = keysJson[Math.floor(Math.random() * keysJson.length)];
					}
				} catch (e) {
					polygonscanKey = POLYGONSCAN_APIKEYS;
				}
				if (polygonscanKey) {
					await NativeWorker.Agents.AsyncStorage.setItem(POLYGONSCAN_KEY, polygonscanKey);
				}
			} while (false);
			if (!polygonscanKey) {
				util.logError(`key for polygonscan.com not configured. ${POLYGONSCAN_APIKEYS}`);
			}
			return polygonscanKey;
		} else if (type === ChainType.Ethereum || type === ChainType.Optimism) {
			do {
				if (etherscanKey) {
					break;
				}
				etherscanKey = await NativeWorker.Agents.AsyncStorage.getItem(ETHERSCAN_KEY);
				if (etherscanKey) {
					break;
				}
				try {
					const keysJson = JSON.parse(ETHERSCAN_APIKEYS);
					if (Array.isArray(keysJson)) {
						etherscanKey = keysJson[Math.floor(Math.random() * keysJson.length)];
					}
				} catch (e) {
					etherscanKey = ETHERSCAN_APIKEYS;
				}
				if (etherscanKey) {
					await NativeWorker.Agents.AsyncStorage.setItem(ETHERSCAN_KEY, etherscanKey);
				}
			} while (false);
			if (!etherscanKey) {
				util.logError(`key for etherscan.com not configured. ${ETHERSCAN_APIKEYS}`);
			}
			return etherscanKey;
		}
		return null;
	}

	configureControllersOnNetworkChange() {
		const {
			AssetsContractController,
			ArbContractController,
			PolygonContractController,
			BscContractController,
			TronContractController,
			HecoContractController,
			AvaxContractController,
			RpcContractController,
			NetworkController,
			TransactionController,
			AssetsController,
			CollectiblesController,
			AssetsDataModel,
			DefiProtocolController
		} = this.datamodel.context;
		const { provider } = NetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = NetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Ethereum, chainId);
		provider.sendAsync = provider.sendAsync.bind(provider);
		// 你没有看错，就是调用onL2NetworkChange，@leon.w
		AssetsContractController.onL2NetworkChange(provider, chainId);
		ArbContractController.onL1NetworkChange(provider, chainId);
		PolygonContractController.onL1NetworkChange(provider, chainId);
		BscContractController.onL1NetworkChange(provider, chainId);
		if (util.TRON_ENABLED) {
			TronContractController.onL1NetworkChange(provider, chainId);
		}
		HecoContractController.onL1NetworkChange(provider, chainId);
		AvaxContractController.onL1NetworkChange(provider, chainId);
		RpcContractController.onL1NetworkChange(provider, chainId);

		TransactionController.hub.emit('networkChange');
		AssetsController.onNetworkChange();
		TransactionController.onNetworkChange();
		setTimeout(() => ArbContractController.poll(), 10000);
		setTimeout(() => PolygonContractController.poll(), 10000);
		setTimeout(() => CollectiblesController.poll(), 10000);
		setTimeout(() => AssetsDataModel.poll(), 100);
		setTimeout(() => DefiProtocolController.poll(), 10000);
	}

	configureControllersOnBscNetworkChange() {
		const {
			BscNetworkController,
			BscContractController,
			AssetsController,
			TransactionController,
			AssetsDataModel
		} = this.datamodel.context;
		const { provider } = BscNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = BscNetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Bsc, chainId);
		BscContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onBscNetworkChange();
		TransactionController.onBscNetworkChange();
		setTimeout(() => AssetsDataModel.poll(), 100);
	}

	configureControllersOnPolygonNetworkChange() {
		const {
			PolygonNetworkController,
			PolygonContractController,
			AssetsController,
			TransactionController,
			AssetsDataModel
		} = this.datamodel.context;
		const { provider } = PolygonNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = PolygonNetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Polygon, chainId);
		PolygonContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onPolygonNetworkChange();
		TransactionController.onPolygonNetworkChange();
		setTimeout(() => PolygonContractController.poll(), 10000);
		setTimeout(() => AssetsDataModel.poll(), 100);
	}

	configureControllersOnArbNetworkChange() {
		const {
			ArbContractController,
			ArbNetworkController,
			AssetsController,
			TransactionController,
			AssetsDataModel
		} = this.datamodel.context;
		const { provider } = ArbNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = ArbNetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Arbitrum, chainId);
		ArbContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onArbNetworkChange();
		TransactionController.onArbNetworkChange();
		setTimeout(() => ArbContractController.poll(), 10000);
		setTimeout(() => AssetsDataModel.poll(), 100);
	}

	configureControllersOnOpNetworkChange() {
		const {
			OpContractController,
			OpNetworkController,
			AssetsController,
			TransactionController,
			AssetsDataModel
		} = this.datamodel.context;
		const { provider } = OpNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = OpNetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Optimism, chainId);
		OpContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onOpNetworkChange();
		TransactionController.onOpNetworkChange();
		setTimeout(() => AssetsDataModel.poll(), 100);
	}

	configureControllersOnTronNetworkChange() {
		const {
			TronNetworkController,
			TronContractController,
			// TransactionController,
			AssetsController
		} = this.datamodel.context;
		const { provider } = TronNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = TronNetworkController;
		TronContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onTronNetworkChange();
	}

	configureControllersOnHecoNetworkChange() {
		const {
			HecoNetworkController,
			HecoContractController,
			AssetsController,
			TransactionController,
			AssetsDataModel
		} = this.datamodel.context;
		const { provider } = HecoNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = HecoNetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Heco, chainId);
		HecoContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onHecoNetworkChange();
		TransactionController.onHecoNetworkChange();
		setTimeout(() => AssetsDataModel.poll(), 100);
	}

	configureControllersOnAvaxNetworkChange() {
		const {
			AvaxNetworkController,
			AvaxContractController,
			AssetsController,
			TransactionController,
			AssetsDataModel
		} = this.datamodel.context;
		const { provider } = AvaxNetworkController;
		const {
			state: {
				provider: { chainId }
			}
		} = AvaxNetworkController;
		NativeWorker.Api.dispatchNetworkChanged(ChainType.Avax, chainId);
		AvaxContractController.onL2NetworkChange(provider, chainId);
		AssetsController.onAvaxNetworkChange();
		TransactionController.onAvaxNetworkChange();
		setTimeout(() => AssetsDataModel.poll(), 100);
	}

	removeTxInfoIfNecessary = async type => {
		const { PreferencesController } = this.datamodel.context;
		const { identities } = PreferencesController.state;
		let infoKey = LAST_INCOMING_TX_BLOCK_INFO;
		if (type === ChainType.Bsc) {
			infoKey = LAST_BSC_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Polygon) {
			infoKey = LAST_POLYGON_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Arbitrum) {
			infoKey = LAST_ARB_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Heco) {
			infoKey = LAST_HECO_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Optimism) {
			infoKey = LAST_OP_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Avax) {
			infoKey = LAST_AVAX_INCOMING_TX_BLOCK_INFO;
		}
		let changed = false;
		const lastIncomingTxBlockInfoStr = await NativeWorker.Agents.AsyncStorage.getItem(infoKey);
		const allLastIncomingTxBlocks = (lastIncomingTxBlockInfoStr && JSON.parse(lastIncomingTxBlockInfoStr)) || {};
		Object.keys(allLastIncomingTxBlocks).forEach(address => {
			if (!identities[address]) {
				changed = true;
				delete allLastIncomingTxBlocks[address];
			}
		});
		if (changed) {
			await NativeWorker.Agents.AsyncStorage.setItem(infoKey, JSON.stringify(allLastIncomingTxBlocks));
		}
	};

	removeTxInfosIfNecessary = async () => {
		if (removeTxInfosIfNecessaryDone) {
			return;
		}
		removeTxInfosIfNecessaryDone = true;
		await this.removeTxInfoIfNecessary(ChainType.Ethereum);
		await this.removeTxInfoIfNecessary(ChainType.Polygon);
		await this.removeTxInfoIfNecessary(ChainType.Bsc);
		await this.removeTxInfoIfNecessary(ChainType.Arbitrum);
		await this.removeTxInfoIfNecessary(ChainType.Heco);
		await this.removeTxInfoIfNecessary(ChainType.Optimism);
		await this.removeTxInfoIfNecessary(ChainType.Avax);
	};

	refreshEthTransactionHistory = async (forceCheck, type, selectedAddress, loadToken, txInternal = false) => {
		const {
			TransactionController,
			PreferencesController,
			NetworkController,
			BscNetworkController,
			PolygonNetworkController,
			ArbNetworkController,
			OpNetworkController,
			HecoNetworkController,
			AvaxNetworkController
		} = this.datamodel.context;
		let chainId = NetworkController.state.provider.chainId;
		let infoKey = LAST_INCOMING_TX_BLOCK_INFO;
		const apiKey = await this.getScanKey(type);
		if (type === ChainType.Bsc) {
			chainId = BscNetworkController.state.provider.chainId;
			infoKey = LAST_BSC_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Polygon) {
			chainId = PolygonNetworkController.state.provider.chainId;
			infoKey = LAST_POLYGON_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Arbitrum) {
			chainId = ArbNetworkController.state.provider.chainId;
			infoKey = LAST_ARB_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Heco) {
			chainId = HecoNetworkController.state.provider.chainId;
			infoKey = LAST_HECO_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Optimism) {
			chainId = OpNetworkController.state.provider.chainId;
			infoKey = LAST_OP_INCOMING_TX_BLOCK_INFO;
		} else if (type === ChainType.Avax) {
			chainId = AvaxNetworkController.state.provider.chainId;
			infoKey = LAST_AVAX_INCOMING_TX_BLOCK_INFO;
		}

		try {
			const lastIncomingTxBlockInfoStr = await NativeWorker.Agents.AsyncStorage.getItem(infoKey);
			const allLastIncomingTxBlocks =
				(lastIncomingTxBlockInfoStr && JSON.parse(lastIncomingTxBlockInfoStr)) || {};
			const incomingKey = txInternal ? `${chainId}txInternal` : `${chainId}${loadToken}`;
			let blockNumber = 0;
			if (allLastIncomingTxBlocks[`${selectedAddress}`]) {
				// eslint-disable-next-line no-empty
				if (!txInternal && !allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`]) {
					//旧的数据升级
					if (allLastIncomingTxBlocks[`${selectedAddress}`][`${chainId}`]) {
						if (!loadToken) {
							allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`] = {
								blockNumber: allLastIncomingTxBlocks[`${selectedAddress}`][`${chainId}`].blockNumber,
								lastCheck: allLastIncomingTxBlocks[`${selectedAddress}`][`${chainId}`].lastCheck
							};
						} else {
							allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`] = {
								blockNumber:
									allLastIncomingTxBlocks[`${selectedAddress}`][`${chainId}`].tokenBlockNumber,
								lastCheck: allLastIncomingTxBlocks[`${selectedAddress}`][`${chainId}`].lastCheck
							};
						}
					}
				}
				if (allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`]) {
					blockNumber = allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`].blockNumber;
					// Let's make sure we're not doing this too often...
					const timeSinceLastCheck =
						allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`].lastCheck;
					const delta = Date.now() - timeSinceLastCheck;
					if (delta < AppConstants.TX_CHECK_MAX_FREQUENCY && !forceCheck) {
						return false;
					}
				}
			} else {
				allLastIncomingTxBlocks[`${selectedAddress}`] = {};
			}
			const requireBlockNumber = blockNumber > 10 ? blockNumber - 10 : 0;
			//Fetch txs and get the new lastIncomingTxBlock number
			const { latestIncomingTxBlockNumber, needUpdate } = await TransactionController.fetchAll(
				selectedAddress,
				type,
				loadToken,
				txInternal,
				{
					fromBlock: requireBlockNumber,
					etherscanApiKey: apiKey,
					chainId
				}
			);
			needUpdate !== TxChangedType.NoChange &&
				!PreferencesController.isObserveAddress(selectedAddress) &&
				NativeWorker.Api.dispatchNotification(type, needUpdate);
			allLastIncomingTxBlocks[`${selectedAddress}`][`${incomingKey}`] = {
				blockNumber: latestIncomingTxBlockNumber || blockNumber,
				lastCheck: Date.now()
			};
			await NativeWorker.Agents.AsyncStorage.setItem(infoKey, JSON.stringify(allLastIncomingTxBlocks));
		} catch (e) {
			util.logError('refreshEthTransactionHistory: Error while fetching all txs', type, e);
		}
	};

	refreshTransactionHistory = async (selectedAddress, forceCheck) => {
		const releaseLock = await mutex.acquire();
		try {
			if (!selectedAddress) {
				selectedAddress = this.datamodel.context.PreferencesController.state.selectedAddress;
			}
			if (!selectedAddress) {
				return;
			}
			await this.removeTxInfosIfNecessary();
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Ethereum, selectedAddress, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Polygon, selectedAddress, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Bsc, selectedAddress, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Avax, selectedAddress, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Arbitrum, selectedAddress, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Optimism, selectedAddress, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Heco, selectedAddress, true);

			await this.refreshEthTransactionHistory(forceCheck, ChainType.Ethereum, selectedAddress, false);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Polygon, selectedAddress, false);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Bsc, selectedAddress, false);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Avax, selectedAddress, false);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Arbitrum, selectedAddress, false);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Optimism, selectedAddress, false);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Heco, selectedAddress, false);

			await this.refreshEthTransactionHistory(forceCheck, ChainType.Ethereum, selectedAddress, false, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Polygon, selectedAddress, false, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Bsc, selectedAddress, false, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Avax, selectedAddress, false, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Arbitrum, selectedAddress, false, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Optimism, selectedAddress, false, true);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Heco, selectedAddress, false, true);
		} catch (e) {
			util.logWarn('refreshTransactionHistory error:', e);
		} finally {
			releaseLock();
		}
	};

	fetchAssetsSafety = async forceCheck => {
		const { SecurityController } = this.datamodel.context;
		await SecurityController.poll(true);
	};

	resetState = async () => {
		// Whenever we are gonna start a new wallet
		// either imported or created, we need to
		// get rid of the old data from state
		const {
			TransactionController,
			AssetsController,
			TokenBalancesController,
			TokenRatesController,
			ArbContractController,
			PolygonContractController,
			BscBridgeController,
			CollectiblesController,
			AssetsDataModel,
			DefiProtocolController
		} = this.datamodel.context;

		//Clear assets info
		AssetsController.update(AssetsController.defaultState);
		TokenBalancesController.update(TokenBalancesController.defaultState);
		TokenRatesController.update(TokenRatesController.defaultState);
		TransactionController.update(TransactionController.defaultState);
		ArbContractController.update(ArbContractController.defaultState);
		PolygonContractController.update(PolygonContractController.defaultState);
		BscBridgeController.update(BscBridgeController.defaultState);
		CollectiblesController.update(CollectiblesController.defaultState);
		AssetsDataModel.update(AssetsDataModel.defaultState);
		DefiProtocolController.update(DefiProtocolController.defaultState);
	};

	getProviderConfig(chainId: string) {
		return {
			static: {
				eth_sendTransaction: async (payload, next, end) => {
					try {
						const { TransactionController } = this.datamodel.context;
						const hash = await (await TransactionController.addTransaction(
							{
								...payload.params[0],
								chainId
							},
							payload.origin || payload.params[0].origin
						)).result;
						end(undefined, hash);
					} catch (error) {
						console.log('PPYang eth_sendTransaction error:', error);
						end(error);
					}
				}
			},
			getAccounts: (end, payload) => {
				const isEnabled = true;
				const { KeyringController } = this.datamodel.context;
				const isUnlocked = KeyringController.isUnlocked();
				const selectedAddress = this.datamodel.context.PreferencesController.state.selectedAddress;
				end(null, isUnlocked && isEnabled && selectedAddress ? [selectedAddress] : []);
			}
		};
	}
}

let instance;

export default {
	get context() {
		return instance && instance.datamodel && instance.datamodel.context;
	},
	resetState() {
		return instance.resetState();
	},
	getScanKey(type) {
		return instance.getScanKey(type);
	},
	refreshTransactionHistory(selectedAddress, forceCheck = false) {
		return instance.refreshTransactionHistory(selectedAddress, forceCheck);
	},
	fetchAssetsSafety(forceCheck = false) {
		return instance.fetchAssetsSafety(forceCheck);
	},
	importAccounts() {
		return importAdditionalAccounts();
	},
	setEtherscanAvailable(etherscanAvailable) {
		util.setEtherscanAvailable(etherscanAvailable);
	},
	setUseTestServer(testServer: boolean) {
		util.setUseTestServer(testServer);
	},
	init(state) {
		instance = new EngineImpl(state, strings);
		Object.freeze(instance);
		return instance;
	}
};
