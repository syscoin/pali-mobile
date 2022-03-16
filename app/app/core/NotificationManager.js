'use strict';

import Engine from './Engine';
import {
	hexToBN,
	renderFromWei,
	renderFromTokenMinimalUnit,
	getChainIdByType,
	getClaimContracts
} from '../util/number';
import AsyncStorage from '@react-native-community/async-storage';
import { LAST_NOTIFICATION_INFO } from '../constants/storage';
import { ChainType, TxChangedType } from 'gopocket-core';
import { getTicker } from '../util/transactions';
import { callSqlite } from '../util/ControllerUtils';

/**
 * Singleton class responsible for managing all the
 * related notifications, which could be in-app or push
 * depending on the state of the app
 */
class NotificationManager {
	/**
	 * Navigation object from react-navigation
	 */
	_navigation;
	/**
	 * Array containing the id of the transaction that should be
	 * displayed while interacting with a notification
	 */
	_transactionToView;
	/**
	 * Object containing watched transaction ids list by transaction nonce
	 */
	_transactionsWatchTable = {};

	_showNotification(data) {
		this._showTransactionNotification({
			autodismiss: data.duration,
			transaction: data.transaction,
			status: data.type
		});
	}

	/**
	 * Creates a NotificationManager instance
	 */
	constructor(_navigation, _showTransactionNotification, _showSimpleNotification) {
		if (!NotificationManager.instance) {
			this._navigation = _navigation;
			this._showTransactionNotification = _showTransactionNotification;
			this._showSimpleNotification = _showSimpleNotification;
			this._transactionToView = [];
			NotificationManager.instance = this;
		}
		return NotificationManager.instance;
	}

	/**
	 * Shows a notification with title and description
	 */
	showSimpleNotification = data => {
		const id = Date.now();
		this._showSimpleNotification({
			id,
			autodismiss: data.duration,
			title: data.title,
			description: data.description,
			status: data.status
		});
		return id;
	};

	normalizeTx = (tx, type) => {
		const nativeCurrency = !tx.transferInformation;
		return {
			nativeCurrency,
			id: tx.id,
			to: nativeCurrency ? tx.transaction?.to : tx.to,
			from: nativeCurrency ? tx.transaction?.from : tx.from,
			networkID: tx.chainId,
			status: tx.status,
			time: tx.time,
			value: nativeCurrency ? tx.transaction?.value : tx.amount,
			decimals: nativeCurrency ? 18 : tx.transferInformation?.decimals,
			symbol: nativeCurrency ? getTicker(undefined, type) : tx.transferInformation?.symbol,
			hash: tx.transactionHash
		};
	};

	/**
	 * Generates a notification for an incoming transaction
	 */
	gotIncomingTransaction = async (type, changedType, isToken) => {
		const { PreferencesController } = Engine.context;
		const { selectedAddress } = PreferencesController.state;
		const chainId = getChainIdByType(type);
		await this.incomingTransaction(selectedAddress, chainId, type, changedType, isToken);
	};

	incomingTransaction = async (selectedAddress, networkId, type, changedType, isToken) => {
		const { oldNotificationTime, allLastNotificationInfo, newId } = await this.getTimeByNetworkId(
			selectedAddress,
			networkId,
			changedType
		);
		const txType = !isToken ? 'tx' : 'tokentx';
		const allTx = await callSqlite(
			'findReceiveTransactions',
			selectedAddress,
			networkId,
			type,
			txType,
			'confirmed',
			oldNotificationTime
		);
		if (type === ChainType.Ethereum) {
			const claimContracts = await getClaimContracts();
			const ethClaimValues = await callSqlite(
				'findReceiveMigrationTxs',
				selectedAddress,
				networkId,
				type,
				'confirmed',
				oldNotificationTime,
				claimContracts
			);
			if (ethClaimValues && ethClaimValues.length > 0) {
				allTx.push(...ethClaimValues);
			}
		}

		let newNotificationTime = 0;
		if (allTx.length) {
			const txs = [];
			allTx.forEach(tx => {
				const targetTx = this.normalizeTx(tx, type);
				if (targetTx) {
					if (newNotificationTime < targetTx.time) {
						newNotificationTime = targetTx.time;
					}
					txs.push(targetTx);
				}
			});
			if (oldNotificationTime >= 0) {
				await this.showNotification(txs);
			}
		}
		if (newNotificationTime > oldNotificationTime) {
			await this.setTimeByNetworkId(allLastNotificationInfo, selectedAddress, newId, newNotificationTime);
		}
	};

	getTimeByNetworkId = async (selectedAddress, networkId, changedType) => {
		const newId = networkId + '-' + changedType;
		const lastNotificationInfoStr = await AsyncStorage.getItem(LAST_NOTIFICATION_INFO);
		const allLastNotificationInfo = (lastNotificationInfoStr && JSON.parse(lastNotificationInfoStr)) || {};
		let oldNotificationTime = -1;
		if (allLastNotificationInfo[`${selectedAddress}`]) {
			if (allLastNotificationInfo[`${selectedAddress}`][`${newId}`]) {
				oldNotificationTime = allLastNotificationInfo[`${selectedAddress}`][`${newId}`].blockTime;
			}
		} else {
			allLastNotificationInfo[`${selectedAddress}`] = {};
		}
		return { oldNotificationTime, allLastNotificationInfo, newId };
	};

	setTimeByNetworkId = async (allLastNotificationInfo, selectedAddress, networkId, newNotificationTime) => {
		allLastNotificationInfo[`${selectedAddress}`][`${networkId}`] = {
			blockTime: newNotificationTime
		};
		await AsyncStorage.setItem(LAST_NOTIFICATION_INFO, JSON.stringify(allLastNotificationInfo));
	};

	showNotification = async txs => {
		if (txs.length <= 0) {
			return;
		}
		const normalTx = txs[0];
		const amount = normalTx.nativeCurrency
			? `${renderFromWei(hexToBN(normalTx.value))}`
			: `${renderFromTokenMinimalUnit(
					hexToBN(normalTx.value),
					normalTx.decimals
					// eslint-disable-next-line no-mixed-spaces-and-tabs
			  )}`;
		const symbol = normalTx.symbol;
		this._showNotification({
			type: 'received',
			transaction: {
				amount,
				id: normalTx.id,
				chainId: normalTx.networkID,
				symbol
			},
			autoHide: true,
			duration: 5000
		});
	};
}

let instance;

export default {
	init({ navigation, showTransactionNotification, showSimpleNotification }) {
		instance = new NotificationManager(navigation, showTransactionNotification, showSimpleNotification);
		return instance;
	},
	gotIncomingTransaction(type: number, changedType: TxChangedType) {
		if (changedType === TxChangedType.NoChange) {
			return;
		}
		if (type === ChainType.Polygon) {
			if ((changedType & TxChangedType.PolygonTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.PolygonTxChanged, false);
			}
			if ((changedType & TxChangedType.PolygonTokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.PolygonTokenTxChanged, true);
			}
		} else if (type === ChainType.Bsc) {
			if ((changedType & TxChangedType.BscTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.BscTxChanged, false);
			}
			if ((changedType & TxChangedType.BscTokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.BscTokenTxChanged, true);
			}
		} else if (type === ChainType.Arbitrum) {
			if ((changedType & TxChangedType.ArbTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.ArbTxChanged, false);
			}
			if ((changedType & TxChangedType.ArbTokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.ArbTokenTxChanged, true);
			}
		} else if (type === ChainType.Heco) {
			if ((changedType & TxChangedType.HecoTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.HecoTxChanged, false);
			}
			if ((changedType & TxChangedType.HecoTokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.HecoTokenTxChanged, true);
			}
		} else if (type === ChainType.Optimism) {
			if ((changedType & TxChangedType.OpTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.OpTxChanged, false);
			}
			if ((changedType & TxChangedType.OpTokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.OpTokenTxChanged, true);
			}
		} else if (type === ChainType.Avax) {
			if ((changedType & TxChangedType.AvaxTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.AvaxTxChanged, false);
			}
			if ((changedType & TxChangedType.AvaxTokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.AvaxTokenTxChanged, true);
			}
		} else {
			if ((changedType & TxChangedType.TxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.TxChanged, false);
			}
			if ((changedType & TxChangedType.TokenTxChanged) !== 0) {
				instance?.gotIncomingTransaction(type, TxChangedType.TokenTxChanged, true);
			}
		}
	},
	showSimpleNotification(data) {
		return instance?.showSimpleNotification(data);
	}
};
