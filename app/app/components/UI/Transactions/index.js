import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
	getAssetLogo,
	getChainIdByType,
	getChainTypeByChainId,
	getClaimContracts,
	getClaimValues,
	getTickerByType,
	hexToBN,
	renderAmount,
	renderFromTokenMinimalUnit,
	renderFromWei
} from '../../../util/number';
import { ThemeContext } from '../../../theme/ThemeProvider';
import { safeToChecksumAddress } from '../../../util/address';
import iconNotx from '../../../images/notx.png';
import { strings } from '../../../../locales/i18n';
import { ChainType, toChecksumAddress, TransactionStatus, util } from 'paliwallet-core';
import Engine from '../../../core/Engine';
import { store } from '../../../store';
import { showAlert } from '../../../actions/alert';
import TransactionItem from '../TransactionItem';
import { connect } from 'react-redux';
import { baseStyles, colors } from '../../../styles/common';
import { APPROVE_FUNCTION_SIGNATURE, getSymbol } from '../../../util/transactions';
import { toDateFormatMonthDayYear } from '../../../util/date';
import { callSqlite } from '../../../util/ControllerUtils';

const noTxColor = '#404040';
const styles = StyleSheet.create({
	noTxView: {
		marginTop: 50,
		alignItems: 'center',
		justifyContent: 'center'
	},
	noTxText: {
		fontSize: 16,
		marginTop: 19,
		color: noTxColor
	},
	loadMore: {
		height: 60,
		paddingTop: 40,
		alignItems: 'center',
		justifyContent: 'center'
	},
	noMoreText: {
		fontSize: 12,
		color: colors.$333333
	}
});

const LOAD_COUNT = 20;

/**
 * View that renders a list of transactions for a specific asset
 */
class Transactions extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		selectedAddress: PropTypes.string,
		onClose: PropTypes.func,
		asset: PropTypes.object,
		selectChainType: PropTypes.number,
		txType: PropTypes.number,
		alertTag: PropTypes.string,
		ensEntries: PropTypes.object
	};

	curTxType = -1;

	isEnsPolling = false;
	isMount = true;
	pollEns = [];

	isEndReached = false;

	allLoadCount = 0;

	loadRpcTxCount = 0;
	loadRpcTokenCount = 0;
	loadTxCount = 0;
	loadTokenCount = 0;

	tempRpcTx = undefined;
	tempRpcTokenTx = undefined;

	ethClaimValues = {};

	state = {
		loadEnd: false,
		transactions: [],
		flatListHeight: 0
	};

	UNSAFE_componentWillReceiveProps = props => {
		this.handNewProps(props.txType);
	};

	componentDidMount = async () => {
		this.isMount = true;
		await this.loadEthClaimValues();
		await this.handNewProps(this.props.txType);
	};

	componentWillUnmount() {
		this.isEnsPolling = false;
		this.isMount = false;
	}

	handNewProps = async txType => {
		if (this.curTxType === txType) {
			return;
		}
		this.curTxType = txType;
		this.allLoadCount = 0;

		this.loadRpcTxCount = 0;
		this.loadRpcTokenCount = 0;
		this.loadTxCount = 0;
		this.loadTokenCount = 0;

		this.tempRpcTx = undefined;
		this.tempRpcTokenTx = undefined;
		this.setState({ transactions: [], loadEnd: false }, () => {
			this.loadData(txType);
		});
	};

	startEnsPoll = () => {
		if (this.isEnsPolling) {
			return;
		}
		this.isEnsPolling = true;
		this.loadEns();
	};

	loadEns = async () => {
		if (!this.isEnsPolling) {
			return;
		}
		if (this.pollEns.length <= 0) {
			this.isEnsPolling = false;
			return;
		}
		const pollEns = this.pollEns.slice(0, 30);
		const { EnsController } = Engine.context;
		await EnsController.searchAllName(pollEns);
		for (let index = 0; index < pollEns.length; index++) {
			this.pollEns.shift();
		}
		if (this.isEnsPolling && this.pollEns.length > 0) {
			setTimeout(() => this.loadEns(), 500);
		} else {
			this.isEnsPolling = false;
		}
	};

	loadEthClaimValues = async () => {
		const { asset, selectedAddress } = this.props;
		const claimContracts = await getClaimContracts();
		let ethClaimTxs;
		if (asset) {
			const type = asset.type ? asset.type : ChainType.Ethereum;
			const chainId = getChainIdByType(type);
			ethClaimTxs = await callSqlite('findMigrationTxs', selectedAddress, chainId, type, claimContracts);
		} else {
			ethClaimTxs = await callSqlite('findAllMigrationTxs', selectedAddress, claimContracts);
		}

		this.ethClaimValues = getClaimValues(ethClaimTxs);
	};

	loadData = async (txType, startIndex = 0, loadCount = LOAD_COUNT) => {
		if (this.state.loadEnd) {
			return;
		}
		if (this.isEndReached) {
			return;
		}
		this.isEndReached = true;
		const { asset, selectedAddress } = this.props;
		let targetTx = [];
		let loadEnd;
		if (asset) {
			const type = asset.type ? asset.type : ChainType.Ethereum;
			const chainId = getChainIdByType(type);
			if (util.isRpcChainType(type)) {
				if (asset.nativeCurrency) {
					targetTx = this.loadRpcTx(txType, [chainId], selectedAddress, startIndex, loadCount);
				} else {
					targetTx = this.loadRpcTokenTx(txType, [chainId], selectedAddress, startIndex, loadCount);
				}
				loadEnd = targetTx.length < loadCount;
				this.allLoadCount += targetTx.length;
			} else if (asset.nativeCurrency) {
				if (txType === 1 || txType === 2) {
					targetTx = await callSqlite(
						'getActionTx',
						selectedAddress,
						type,
						chainId,
						txType === 2 && selectedAddress,
						txType === 1 && selectedAddress,
						startIndex,
						loadCount + 10
					);
				} else if (txType === 3) {
					targetTx = await callSqlite(
						'getGasUsedHistory',
						selectedAddress,
						type,
						chainId,
						startIndex,
						loadCount + 10
					);
				} else {
					targetTx = await callSqlite(
						'getTransactionsHistory',
						selectedAddress,
						type,
						chainId,
						null,
						null,
						startIndex,
						loadCount + 10
					);
				}
				const loadTxs = targetTx;
				targetTx = targetTx.slice(0, loadCount);
				loadEnd = targetTx.length < loadCount;
				this.allLoadCount += targetTx.length;
				const tempTxs = [];
				targetTx.forEach((tx, index) => {
					if (this.state.transactions?.find(aTx => aTx.transactionHash === tx.transactionHash)) {
						return;
					}
					if (tempTxs.find(subTx => tx.transactionHash === subTx.transactionHash)) {
						return;
					}
					tx.tokenTxs = loadTxs
						.slice(index + 1)
						.filter(subTx => tx.transactionHash === subTx.transactionHash);
					tempTxs.push(tx);
				});
				targetTx = tempTxs;
			} else {
				targetTx = await this.loadTokenTx(txType, chainId, type, asset, startIndex, loadCount);
				loadEnd = targetTx.length < loadCount;
				this.allLoadCount += targetTx.length;
			}
		} else {
			let hasLoadCount = 0;
			targetTx = [];
			do {
				const loadTxs = await this.loadAllTx(txType, targetTx, startIndex, loadCount);
				loadEnd = loadTxs.loadEnd;
				hasLoadCount += loadTxs.txs.length;
				targetTx.push(...loadTxs.txs);
			} while (this.isMount && !loadEnd && hasLoadCount < loadCount);
		}
		this.checkEns(targetTx);
		if (asset) {
			if (asset.nativeCurrency) {
				targetTx = this.loadGasTx(targetTx, txType);
			}
		}

		targetTx = await this.loadRenderData(targetTx);
		targetTx = this.loadTime(this.state.transactions, targetTx);
		this.setState({ transactions: targetTx, loadEnd }, () => {
			this.isEndReached = false;
		});
	};

	loadTokenTx = async (txType, chainId, type, asset, startIndex, loadCount) => {
		const { selectedAddress } = this.props;
		let tempTx = [];
		if (txType !== 3) {
			let tokens = await callSqlite(
				'getTokenHistory',
				selectedAddress,
				chainId,
				type,
				asset.address,
				txType === 2 && selectedAddress,
				txType === 1 && selectedAddress,
				this.loadTokenCount,
				loadCount
			);
			if (tokens) {
				tokens = tokens.map(tx => ({ ...tx, loadClass: 1 }));
				tempTx.push(...tokens);
			}
		}
		if (txType === 0 || txType === 3) {
			let approveTx = await callSqlite(
				'getTransactionsByMethodId',
				selectedAddress,
				chainId,
				selectedAddress,
				asset.address,
				APPROVE_FUNCTION_SIGNATURE,
				this.loadTxCount,
				loadCount
			);
			if (approveTx) {
				approveTx = approveTx.map(tx => ({ ...tx, loadClass: 2 }));
				tempTx.push(...approveTx);
			}
		}
		tempTx = tempTx.sort((a, b) => b.time - a.time).slice(0, loadCount);

		const tokenTxs = tempTx.filter(tx => tx.loadClass === 1);
		this.loadTokenCount += tokenTxs.length;
		const approveTx = tempTx.filter(tx => tx.loadClass === 2);
		this.loadTxCount += approveTx.length;

		if (tokenTxs.length) {
			const allHash = tokenTxs.map(tx => tx.transactionHash);
			const txs = await callSqlite('getTransactionsByHash', selectedAddress, chainId, allHash);
			if (txs.length > 0) {
				txs.forEach(tx => {
					const tokens = tokenTxs.find(tokenTx => tokenTx.transactionHash === tx.transactionHash);
					if (tokens) {
						tokens.gasUsed = tx.gasUsed;
						if (tx.transaction.gasPrice) {
							if (!tokens.transaction) {
								tokens.transaction = {};
							}
							tokens.transaction.gasPrice = tx.transaction.gasPrice;
						}
					}
				});
			}
		}

		if (approveTx.length) {
			const allHash = approveTx.map(tx => tx.transactionHash);
			const addressTokenTx = await callSqlite('getTokenByHash', selectedAddress, [chainId], allHash);
			approveTx.forEach(tx => {
				const tokenTxs = addressTokenTx.filter(tokenTx => tokenTx.transactionHash === tx.transactionHash);
				if (tokenTxs?.length) {
					const token = tokenTxs.find(token =>
						util.toLowerCaseEquals(token.transferInformation?.contractAddress, tx.transaction?.to)
					);
					if (token) {
						tx.to = token.to;
						tx.from = token.from;
						tx.amount = token.amount;
						tx.transferInformation = token.transferInformation;
					}
				}
			});
		}

		return [...tokenTxs, ...approveTx].sort((a, b) => b.time - a.time);
	};

	loadAllTx = async (txType, hasLoadTx, startIndex, loadCount) => {
		const { selectedAddress } = this.props;
		const selectChainType = this.props.selectChainType || ChainType.All;
		const chainIds = [];
		const rpcChainIds = [];
		if (selectChainType === ChainType.All) {
			const allType = await Engine.context.PreferencesController.getEnabledChains(selectedAddress);
			if (allType) {
				for (const chainType of allType) {
					const chainId = getChainIdByType(chainType);
					if (util.isRpcChainType(chainType)) {
						rpcChainIds.push(chainId);
					} else {
						chainIds.push(chainId);
					}
				}
			}
		} else {
			const chainId = getChainIdByType(selectChainType);
			if (util.isRpcChainType(selectChainType)) {
				rpcChainIds.push(chainId);
			} else {
				chainIds.push(chainId);
			}
		}

		const tempTx = [];
		let rpcTx =
			rpcChainIds?.length && this.loadRpcTx(txType, rpcChainIds, selectedAddress, this.loadRpcTxCount, loadCount);
		if (rpcTx) {
			rpcTx = rpcTx.map(tx => ({ ...tx, loadClass: 1 }));
			tempTx.push(...rpcTx);
		}
		let rpcTokenTx =
			rpcChainIds?.length &&
			this.loadRpcTokenTx(txType, rpcChainIds, selectedAddress, this.loadRpcTokenCount, loadCount);
		if (rpcTokenTx) {
			rpcTokenTx = rpcTokenTx.map(tx => ({ ...tx, loadClass: 2 }));
			tempTx.push(...rpcTokenTx);
		}

		let txs;
		if (txType === 1) {
			txs = await callSqlite(
				'getReceiveTx',
				selectedAddress,
				chainIds,
				selectedAddress,
				this.loadTxCount,
				loadCount + 10
			);
		} else {
			txs = await callSqlite(
				'getTransactionsByAddress',
				selectedAddress,
				chainIds,
				txType === 2 && selectedAddress,
				txType === 1 && selectedAddress,
				this.loadTxCount,
				loadCount + 10
			);
		}
		if (txs) {
			txs = txs.map(tx => ({ ...tx, loadClass: 3 }));
			tempTx.push(...txs);
		}

		if (txType !== 2) {
			let receiveToken = await callSqlite(
				'getReceiveTokenTx',
				selectedAddress,
				chainIds,
				selectedAddress,
				this.loadTokenCount,
				loadCount
			);
			if (receiveToken) {
				receiveToken = receiveToken.map(tx => ({ ...tx, loadClass: 4 }));
				tempTx.push(...receiveToken);
			}
		}
		const loadTxs = tempTx.sort((a, b) => b.time - a.time).slice(0, loadCount);
		const loadEnd = loadTxs.length < loadCount;

		rpcTx = loadTxs.filter(tx => tx.loadClass === 1);
		this.loadRpcTxCount += rpcTx.length;
		rpcTokenTx = loadTxs.filter(tx => tx.loadClass === 2);
		this.loadRpcTokenCount += rpcTokenTx.length;
		let addressTxs = loadTxs.filter(tx => tx.loadClass === 3);
		this.loadTxCount += addressTxs.length;
		const receiveToken = loadTxs.filter(tx => tx.loadClass === 4);
		this.loadTokenCount += receiveToken.length;

		this.allLoadCount += loadTxs.length;
		if (addressTxs.length) {
			const tempTxs = [];
			const moreTxs = txs?.sort((a, b) => b.time - a.time);
			addressTxs.forEach((tx, index) => {
				if (hasLoadTx?.find(subTx => tx.transactionHash === subTx.transactionHash)) {
					return;
				}
				if (this.state.transactions?.find(aTx => aTx.transactionHash === tx.transactionHash)) {
					return;
				}
				if (tempTxs.find(subTx => tx.transactionHash === subTx.transactionHash)) {
					return;
				}
				tx.tokenTxs = moreTxs?.slice(index + 1)?.filter(subTx => tx.transactionHash === subTx.transactionHash);
				tempTxs.push(tx);
			});

			const allHash = tempTxs.map(tx => tx.transactionHash);
			const addressTokenTx = await callSqlite('getTokenByHash', selectedAddress, chainIds, allHash);

			tempTxs.forEach(tx => {
				const tokenTxs = addressTokenTx.filter(tokenTx => tokenTx.transactionHash === tx.transactionHash);
				if (tokenTxs?.length) {
					let token;
					if (!(tx.gasUsed && tx.transaction && tx.transaction.value !== '0x0')) {
						token = tokenTxs.find(token =>
							util.toLowerCaseEquals(token.transferInformation?.contractAddress, tx.transaction?.to)
						);
					}
					let addTxs = [];
					if (token) {
						tx.to = token.to;
						tx.from = token.from;
						tx.amount = token.amount;
						tx.transferInformation = token.transferInformation;
						addTxs = tokenTxs.filter(
							token =>
								!util.toLowerCaseEquals(token.transferInformation?.contractAddress, tx.transaction?.to)
						);
					} else {
						addTxs = tokenTxs;
					}
					if (!tx.tokenTxs) {
						tx.tokenTxs = [];
					}
					tx.tokenTxs.push(...addTxs);
				}
			});
			addressTxs = tempTxs;
		}

		let tempTxs = [...rpcTx, ...rpcTokenTx, ...addressTxs, ...receiveToken];
		if (txType !== 0) {
			const filterTx = [];
			for (const tx of tempTxs) {
				if (await this.filterType(txType, tx)) {
					filterTx.push(tx);
				}
			}
			tempTxs = filterTx;
		}

		return {
			txs: tempTxs.sort((a, b) => b.time - a.time),
			loadEnd
		};
	};

	filterType = async (txType, tx) => {
		const isETHClaim = this.ethClaimValues[tx.transactionHash];
		const isNativeCurrency =
			(isETHClaim && tx.isGasItem) || (tx.transaction?.value && !hexToBN(tx.transaction?.value).isZero());

		const toAddress = safeToChecksumAddress(tx.to) || safeToChecksumAddress(tx.transaction?.to);
		const type = getChainTypeByChainId(tx.chainId);

		if (!isNativeCurrency && !(tx.transferInformation?.symbol || (await getSymbol(toAddress, type)))) {
			return txType === 3;
		}
		if (tx.tokenTxs?.length) {
			return txType === 3;
		}
		if (tx.transaction?.data?.startsWith(APPROVE_FUNCTION_SIGNATURE)) {
			return txType === 3;
		}
		return txType !== 3;
	};

	loadGasTx = (targetTx, txType) => {
		const { selectedAddress } = this.props;
		const transactions_with_gas = [];
		for (const tx of targetTx) {
			if (!tx.transaction) {
				transactions_with_gas.push({ ...tx });
				continue;
			}
			if (!hexToBN(tx.transaction.value).isZero()) {
				transactions_with_gas.push({ ...tx });
				continue;
			}
			if (tx.tokenTxs?.length) {
				transactions_with_gas.push({ ...tx });
				continue;
			}
			if (txType === 0 || txType === 3) {
				// Receive tx not show gas
				if (
					tx.gasUsed &&
					!(safeToChecksumAddress(tx.transaction.to) === safeToChecksumAddress(selectedAddress))
				) {
					const newId = tx.id + '_gas';
					transactions_with_gas.push({ ...tx, isGasItem: true, id: newId });
				}
				// Cancel tx
				if (
					tx.gasUsed &&
					safeToChecksumAddress(tx.transaction.to) === safeToChecksumAddress(selectedAddress) &&
					safeToChecksumAddress(tx.transaction.from) === safeToChecksumAddress(selectedAddress)
				) {
					const newId = tx.id + '_gas';
					transactions_with_gas.push({ ...tx, isGasItem: true, id: newId });
				}
			}
		}
		return transactions_with_gas;
	};

	loadRpcTx = (txType, chainIds, selectedAddress, start, count) => {
		if (this.tempRpcTx === undefined) {
			this.tempRpcTx = Engine.context.TransactionController.state.transactionMetas.filter(
				tx =>
					tx &&
					tx.transactionHash &&
					tx.status !== 'cancelled' &&
					chainIds.includes(tx.chainId) &&
					tx.transaction?.value &&
					!hexToBN(tx.transaction?.value).isZero() &&
					this.isTxType(txType, tx, selectedAddress)
			);
			this.tempRpcTx = this.tempRpcTx.sort((a, b) => b.time - a.time);
		}
		return this.tempRpcTx.slice(start, start + count);
	};

	isTxType = (txType, tx, selectedAddress) => {
		if (txType === 3) {
			return false;
		}
		if (txType === 1) {
			return (
				tx.status === TransactionStatus.confirmed && util.toLowerCaseEquals(tx.transaction?.to, selectedAddress)
			);
		} else if (txType === 2) {
			return util.toLowerCaseEquals(tx.transaction?.from, selectedAddress);
		}
		return (
			(tx.status === TransactionStatus.confirmed &&
				util.toLowerCaseEquals(tx.transaction?.to, selectedAddress)) ||
			util.toLowerCaseEquals(tx.transaction?.from, selectedAddress)
		);
	};

	loadRpcTokenTx = (txType, chainIds, selectedAddress, start, count) => {
		if (this.tempRpcTokenTx === undefined) {
			const targetTx = Engine.context.TransactionController.state.transactionMetas.filter(
				tx =>
					tx &&
					tx.transactionHash &&
					tx.status !== 'cancelled' &&
					chainIds.includes(tx.chainId) &&
					(!tx.transaction?.value || tx.transaction?.value === '0x0') &&
					this.isTxType(txType, tx, selectedAddress)
			);
			this.tempRpcTokenTx = targetTx.map(tx => ({
				...tx,
				from: tx.transaction?.from,
				to: tx.transaction?.to,
				amount: tx.extraInfo?.readableAmount,
				transferInformation: {
					contractAddress: tx.extraInfo?.contractAddress,
					decimals: tx.extraInfo?.decimals,
					symbol: tx.extraInfo?.symbol
				}
			}));
			this.tempRpcTokenTx = this.tempRpcTokenTx.sort((a, b) => b.time - a.time);
		}
		return this.tempRpcTokenTx.slice(start, start + count);
	};

	checkEns = transactions => {
		if (!transactions?.length) {
			return;
		}
		let addresses = [];
		transactions.forEach(tx => {
			if (tx.transaction?.from) {
				!addresses.includes(tx.transaction.from) && addresses.push(tx.transaction.from);
			}
			if (tx.transaction?.to) {
				!addresses.includes(tx.transaction.to) && addresses.push(tx.transaction.to);
			}
		});
		if (addresses.length <= 0) {
			return;
		}
		addresses = addresses.map(address => toChecksumAddress(address));
		addresses = addresses.filter(addr => !this.props.ensEntries[addr]);
		addresses.forEach(addr => {
			!this.pollEns.includes(addr) && this.pollEns.push(addr);
		});

		if (addresses.length > 0) {
			this.startEnsPoll();
		}
	};

	getEnsName = address => {
		address = toChecksumAddress(address);
		return this.props.ensEntries[address]?.ensName;
	};

	getRenderData = async tx => {
		const { selectedAddress } = this.props;
		let targetDecimalValue = '';
		let isETHClaim = false;
		if (this.ethClaimValues[tx.transactionHash] && renderFromWei(this.ethClaimValues[tx.transactionHash]) !== '0') {
			targetDecimalValue = renderFromWei(this.ethClaimValues[tx.transactionHash]);
			isETHClaim = true;
		} else if (tx.amount) {
			targetDecimalValue = renderFromTokenMinimalUnit(tx.amount, tx.transferInformation.decimals);
		} else if (tx.transaction?.value) {
			targetDecimalValue = renderFromWei(tx.transaction.value);
		}

		const fromAddress = safeToChecksumAddress(tx.from ? tx.from : tx.transaction?.from);

		let gasValue = '0';
		const txFrom = safeToChecksumAddress(tx.transaction?.from ? tx.transaction?.from : tx.from);
		if ((isETHClaim || txFrom === selectedAddress) && tx.gasUsed) {
			gasValue = renderFromWei(hexToBN(tx.transaction.gasPrice).mul(hexToBN(tx.gasUsed)));
		}

		const decimalValue = renderAmount(targetDecimalValue);

		const type = getChainTypeByChainId(tx.chainId);
		const isGasItem = !isETHClaim && tx.isGasItem;
		const isNativeCurrency =
			(isETHClaim && tx.isGasItem) || (tx.transaction?.value && !hexToBN(tx.transaction?.value).isZero());

		const fromEnsName = fromAddress && this.getEnsName(fromAddress);
		const toAddress = safeToChecksumAddress(tx.to) || safeToChecksumAddress(tx.transaction?.to);
		const toEnsName = toAddress && this.getEnsName(toAddress);
		const incoming = isETHClaim || toAddress === selectedAddress;
		const formatAmount = !incoming ? '-' + decimalValue : '+' + decimalValue;

		const toContract = tx.transferInformation?.contractAddress || toAddress;
		const logo = !isGasItem
			? await getAssetLogo({ nativeCurrency: isNativeCurrency, type, address: toContract, l1Address: toContract })
			: null;

		const symbol = isNativeCurrency
			? getTickerByType(type)
			: tx.transferInformation?.symbol || (await getSymbol(toAddress, type));

		const isApproval = tx.transaction?.data?.startsWith(APPROVE_FUNCTION_SIGNATURE);
		const spender = '0x' + (tx.transaction?.data?.substr(34, 40) || '');

		let showAmount = !isApproval && (symbol || decimalValue !== '0');
		if (showAmount && isETHClaim && !symbol) {
			showAmount = false;
		}

		return {
			isETHClaim,
			gasValue,
			type,
			isGasItem,
			isNativeCurrency,
			fromAddress,
			fromEnsName,
			toAddress,
			toEnsName,
			incoming,
			formatAmount,
			toContract,
			logo,
			symbol,
			showAmount,
			isApproval,
			spender
		};
	};

	loadRenderData = async transactions => {
		if (!transactions || transactions.length <= 0) {
			return [];
		}
		const { selectedAddress } = this.props;
		const newTransactions = [];
		for (const tx of transactions) {
			if (tx.tokenTxs?.length) {
				for (const tokenTx of tx.tokenTxs) {
					const tokenTxData = await this.getRenderData(tokenTx);
					for (const item in tokenTxData) {
						tokenTx[item] = tokenTxData[item];
					}
				}
			}
			const txData = await this.getRenderData(tx);
			newTransactions.push({
				...tx,
				selectedAddress,
				...txData
			});
		}
		return newTransactions;
	};

	loadTime = (transactions, newTxs) => {
		const nowTransactions = [];
		if (transactions?.length) {
			nowTransactions.push(...transactions);
		}
		if (!newTxs || newTxs.length <= 0) {
			return nowTransactions;
		}
		let endTime = -1;
		for (let index = nowTransactions.length - 1; index >= 0; index--) {
			if (nowTransactions[index].isTime) {
				endTime = nowTransactions[index].time;
				break;
			}
		}
		newTxs.forEach(tx => {
			const txDate = new Date(tx.time);
			const time = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
			if (endTime === -1 || time < endTime) {
				nowTransactions.push({ isTime: true, time, formatTime: toDateFormatMonthDayYear(time) });
				nowTransactions.push(tx);
				endTime = time;
			} else {
				if (time > endTime) {
					util.logDebug('PPYang txs does not time sort', tx.loadClass);
				}
				nowTransactions.push(tx);
			}
		});
		return nowTransactions;
	};

	renderNoTx = () => {
		const { isDarkMode } = this.context;
		return this.state.flatListHeight && this.state.loadEnd ? (
			<View style={[styles.noTxView, { height: this.state.flatListHeight - 100 }]}>
				<Image source={iconNotx} />
				<Text style={[styles.noTxText, isDarkMode && baseStyles.textDark]}>
					{strings('other.no_transaction_history')}
				</Text>
			</View>
		) : (
			<></>
		);
	};

	keyExtractor = (item, index) => `${item.id}_${index}`;

	renderItem = ({ item }) => {
		const { navigation, onClose } = this.props;

		return (
			<TouchableOpacity activeOpacity={1}>
				<TransactionItem
					navigation={navigation}
					close={onClose}
					showCopyAlert={this.showCopyAlert}
					item={item}
				/>
			</TouchableOpacity>
		);
	};

	showCopyAlert = msg => {
		store.dispatch(
			showAlert({
				isVisible: true,
				autodismiss: 1500,
				content: 'clipboard-alert',
				data: { msg },
				flag: this.props.alertTag
			})
		);
	};

	onEndReached = () => {
		setTimeout(() => {
			this.loadData(this.curTxType, this.allLoadCount, LOAD_COUNT);
		}, 100);
	};

	renderLoadMoreView = () => {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.loadMore}>
				{this.state.loadEnd ? (
					this.state.transactions.length > 0 ? (
						<Text style={[styles.noMoreText, isDarkMode && baseStyles.subTextDark]}>
							{strings('transactions.no_more_transactions')}
						</Text>
					) : (
						<></>
					)
				) : (
					<ActivityIndicator size={'small'} color={colors.brandPink300} />
				)}
			</View>
		);
	};

	render = () => {
		const { transactions } = this.state;
		return (
			<FlatList
				onLayout={e => {
					if (!this.state.flatListHeight) {
						this.setState({ flatListHeight: e.nativeEvent.layout.height });
					}
				}}
				data={transactions}
				keyExtractor={this.keyExtractor}
				renderItem={this.renderItem}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				onEndReachedThreshold={0.5}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={this.renderNoTx()}
				onEndReached={() => this.onEndReached()}
				ListFooterComponent={() => this.renderLoadMoreView()}
			/>
		);
	};
}

const mapStateToProps = state => ({
	ensEntries: state.engine.backgroundState.EnsController.ensEntries
});

export default connect(mapStateToProps)(Transactions);
