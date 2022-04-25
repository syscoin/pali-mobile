import {
	AssetsContractController,
	ArbContractController,
	PolygonContractController,
	AssetsController,
	AssetsDetectionController,
	ComposableController,
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
	ChainType,
	SecurityController,
	CollectiblesController,
	util,
	TxNoChange,
	ApprovalEventsController,
	AssetsDataModel,
	EnsController,
	Mutex,
	RpcNetworkController,
	InviteController,
	DefiProtocolController,
	StaticTokenController,
	NetworkConfig
} from 'gopocket-core';

import Encryptor from './Encryptor';
import AppConstants from './AppConstants';
import { ETHERSCAN_KEY, BSCSCAN_KEY, POLYGONSCAN_KEY, BACKUP_VAULT, prefix } from '../constants/storage';
import numberUtil from '../util/number';
import NativeWorker from '../../NativeWorker';
import importAdditionalAccounts from '../util/importAdditionalAccounts';
import { strings } from '../../locales/i18n';

import { INFURA_PROJECTID, OPENSEA_APIKEY, ETHERSCAN_APIKEYS, BSCSCAN_APIKEYS, POLYGONSCAN_APIKEYS } from '@env';
import Device from '../util/Device';

const encryptor = new Encryptor();

const currentChainId = {};
const chainHandle = {};
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
			const allNetwork = this.initNetworks();
			const allContract = this.initContracts();

			this.datamodel = new ComposableController(
				[
					new KeyringController({ encryptor }),
					...allContract,
					...allNetwork,
					new AssetsController(),
					new AssetsDetectionController(),
					new PersonalMessageManager(),
					new MessageManager(),
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
					new StaticTokenController({
						isIos: Device.isIos()
					})
				],
				initialState
			);

			try {
				const {
					KeyringController: keyring,
					TransactionController: transaction,
					PreferencesController: preferences
				} = this.datamodel.context;
				for (const type in this.datamodel.networks) {
					const chainType = Number(type);
					if (chainType !== ChainType.RPCBase) {
						this.datamodel.networks[chainType].subscribe(state => {
							if (state.network !== 'loading' && state.network !== currentChainId[chainType]) {
								currentChainId[chainType] = state.network;
								chainHandle[chainType] && clearTimeout(chainHandle[chainType]);
								NativeWorker.Api.dispatchEndNetworkChange(chainType, state.provider.type);
								// We should add a state or event emitter saying the provider changed
								chainHandle[chainType] = setTimeout(() => {
									this.configureControllersOnNetworkChange(
										chainType,
										this.datamodel.networks[chainType]
									);
								}, 800);
								NativeWorker.Api.patchEmitter(
									this.datamodel.networks[chainType].name,
									'provider_emit',
									this.datamodel.networks[chainType].provider
								);
							}
						});
					}
					this.datamodel.networks[chainType].refreshNetwork();
				}
				transaction.configure({ sign: keyring.signTransaction.bind(keyring) });
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

	initNetworks() {
		const allNetwork = [];
		for (const type in NetworkConfig) {
			const chainType = Number(type);
			const config = NetworkConfig[chainType];
			if (config.Disabled) {
				continue;
			}
			const netConfig = {
				infuraProjectId: config.UseInfura ? INFURA_PROJECTID : '',
				getProviderConfig: this.getProviderConfig.bind(this),
				name: (chainType === ChainType.Ethereum ? '' : config.Name) + 'NetworkController',
				chainType
			};
			let network;
			if (chainType === ChainType.Tron) {
				netConfig.getProviderConfig = undefined;
				network = new TronNetworkController(netConfig);
			} else {
				network = new NetworkController(netConfig);
			}
			network.isNetwork = true;
			network.chainType = chainType;
			allNetwork.push(network);
		}
		const rpcNetwork = new RpcNetworkController({
			infuraProjectId: '',
			getProviderConfig: this.getProviderConfig.bind(this),
			chainType: ChainType.RPCBase
		});
		rpcNetwork.isNetwork = true;
		rpcNetwork.chainType = ChainType.RPCBase;
		allNetwork.push(rpcNetwork);
		return allNetwork;
	}

	initContracts() {
		const allContract = [];
		for (const type in NetworkConfig) {
			const chainType = Number(type);
			const config = NetworkConfig[chainType];
			if (config.Disabled) {
				continue;
			}
			let contract;
			if (chainType === ChainType.Arbitrum) {
				contract = new ArbContractController();
			} else if (chainType === ChainType.Polygon) {
				contract = new PolygonContractController();
			} else {
				const name =
					chainType === ChainType.Ethereum ? 'AssetsContractController' : config.Name + 'ContractController';
				contract = new AssetsContractController({
					name
				});
			}
			contract.isContract = true;
			contract.chainType = chainType;
			allContract.push(contract);
		}
		const rpcContract = new RpcContractController();
		rpcContract.isContract = true;
		rpcContract.chainType = ChainType.RPCBase;
		allContract.push(rpcContract);

		return allContract;
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

	configureControllersOnNetworkChange(chainType, network) {
		const {
			TransactionController,
			AssetsController,
			CollectiblesController,
			AssetsDataModel,
			DefiProtocolController
		} = this.datamodel.context;
		const { provider } = network;
		const {
			state: {
				provider: { chainId }
			}
		} = network;
		NativeWorker.Api.dispatchNetworkChanged(chainType, chainId);
		provider.sendAsync = provider.sendAsync.bind(provider);

		AssetsController.onNetworkChange(chainType);
		TransactionController.onNetworkChange(chainType);

		this.datamodel.contracts[chainType]?.onL2NetworkChange(provider, chainId);
		if (chainType === ChainType.Ethereum) {
			for (const type in this.datamodel.contracts) {
				const otherChainType = Number(type);
				if (otherChainType === ChainType.Ethereum) {
					continue;
				}
				this.datamodel.contracts[otherChainType].onL1NetworkChange(provider, chainId);
			}
			TransactionController.hub.emit('networkChange');
			setTimeout(() => DefiProtocolController.poll(), 10000);

			setTimeout(() => this.datamodel.contracts[ChainType.Arbitrum]?.poll(), 10000);
			setTimeout(() => this.datamodel.contracts[ChainType.Polygon]?.poll(), 10000);
		}

		setTimeout(() => this.datamodel.contracts[chainType]?.poll?.(), 10000);
		setTimeout(() => AssetsDataModel.poll(), 100);
		if (CollectiblesController.isSupportChainType(chainType)) {
			setTimeout(() => CollectiblesController.poll(), 10000);
		}
	}

	lastIncomingTxBlockInfo = (type: ChainType) => {
		const name = type === ChainType.Ethereum ? '' : NetworkConfig[type]?.Name || '';
		return `${prefix}last${name}IncomingTxBlockInfo`;
	};

	removeTxInfoIfNecessary = async type => {
		const { PreferencesController } = this.datamodel.context;
		const { identities } = PreferencesController.state;
		const infoKey = this.lastIncomingTxBlockInfo(type);

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
		const { PreferencesController } = this.datamodel.context;
		const { allChains } = PreferencesController.state;
		if (allChains && allChains.length) {
			for (const chain of allChains) {
				await this.removeTxInfoIfNecessary(chain);
			}
		}
	};

	refreshEthTransactionHistory = async (forceCheck, type, selectedAddress, loadToken, txInternal = false) => {
		const { TransactionController, PreferencesController } = this.datamodel.context;
		const chainId = this.datamodel.networks[type].state.provider.chainId;
		const infoKey = this.lastIncomingTxBlockInfo(type);
		const apiKey = await this.getScanKey(type);

		try {
			const lastIncomingTxBlockInfoStr = await NativeWorker.Agents.AsyncStorage.getItem(infoKey);
			const allLastIncomingTxBlocks =
				(lastIncomingTxBlockInfoStr && JSON.parse(lastIncomingTxBlockInfoStr)) || {};
			const incomingKey = txInternal ? `${chainId}txInternal` : `${chainId}${loadToken}`;
			let blockNumber = 0;
			if (allLastIncomingTxBlocks[`${selectedAddress}`]) {
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
			needUpdate !== TxNoChange &&
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
		util.logDebug('PPYang refreshTransactionHistory selectedAddress:', selectedAddress, forceCheck);
		const releaseLock = await mutex.acquire();
		try {
			if (!selectedAddress) {
				selectedAddress = this.datamodel.context.PreferencesController.state.selectedAddress;
			}
			util.logDebug('PPYang refreshTransactionHistory start selectedAddress:', selectedAddress);
			if (!selectedAddress) {
				return;
			}
			await this.removeTxInfosIfNecessary();
			for (const type in this.datamodel.networks) {
				const chainType = Number(type);
				if (chainType === ChainType.RPCBase || chainType === ChainType.Arbitrum) {
					continue;
				}
				util.logDebug('PPYang refreshTransactionHistory refreshEthTransactionHistory chainType:', chainType);
				await this.refreshEthTransactionHistory(forceCheck, chainType, selectedAddress, true);
			}
			util.logDebug(
				'PPYang refreshTransactionHistory refreshEthTransactionHistory chainType:',
				ChainType.Arbitrum
			);
			await this.refreshEthTransactionHistory(forceCheck, ChainType.Arbitrum, selectedAddress, true);

			for (const type in this.datamodel.networks) {
				const chainType = Number(type);
				if (chainType === ChainType.RPCBase) {
					continue;
				}
				util.logDebug(
					'PPYang refreshTransactionHistory refreshEthTransactionHistory main or internal chainType:',
					chainType
				);
				await this.refreshEthTransactionHistory(forceCheck, chainType, selectedAddress, false);
				await this.refreshEthTransactionHistory(forceCheck, chainType, selectedAddress, false, true);
			}
			util.logDebug('PPYang refreshTransactionHistory end selectedAddress:', selectedAddress);
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
	get networks() {
		return instance && instance.datamodel && instance.datamodel.networks;
	},
	get contracts() {
		return instance && instance.datamodel && instance.datamodel.contracts;
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
