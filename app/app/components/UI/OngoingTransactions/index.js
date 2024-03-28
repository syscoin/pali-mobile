import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { TransactionStatus, CrossChainType, util, URL, ChainType } from 'paliwallet-core';
import iconNotx from '../../../images/notx.png';
import iconArrow from '../../../images/move_arrow.png';
import TxItem from '../TxItem';
import {
	BNToHex,
	getChainTypeNameByChainId,
	getChainTypeByChainId,
	renderFromTokenMinimalUnit,
	renderFromWei,
	getTickerByType
} from '../../../util/number';
import { toDateFormat } from '../../../util/date';
import { renderFullAddress } from '../../../util/address';
import { showAlert } from '../../../actions/alert';
import GlobalAlert from '../GlobalAlert';
import { getEtherscanBaseUrl, getEtherscanTransactionUrl } from '../../../util/etherscan';
import Engine from '../../../core/Engine';
import PromptView from '../PromptView';
import TransactionTypes from '../../../core/TransactionTypes';
import OperationPromptView from '../OperationPromptView';
import { getIncreasedPrice, getSuggestedGasEstimates } from '../../../util/custom-gas';
import { getOnGoingIcon } from '../../../util/rpcUtil';
import {
	getAllChainId,
	getRpcChainTypeByChainId,
	getRpcProviderExplorerUrl,
	isRpcChainId
} from '../../../util/ControllerUtils';
import { ChainTypeBgOngoing, ChainTypes, getChainTypeName } from '../../../util/ChainTypeImages';

import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	wrapper: {
		height: '80%',
		marginHorizontal: 8,
		marginBottom: 8,
		borderRadius: 20,
		backgroundColor: colors.white,
		padding: 30
	},
	itemWrapper: {
		marginBottom: 30
	},
	titleWrapper: {
		color: colors.$030319,
		fontSize: 28,
		lineHeight: 34,
		...fontStyles.bold,
		alignSelf: 'center'
	},
	txWrapper: {
		marginTop: 26,
		flex: 1
	},
	noTxView: {
		marginTop: '40%',
		alignItems: 'center'
	},
	noTxText: {
		fontSize: 16,
		marginTop: 19,
		color: colors.$404040
	},
	itemBgImage: {
		width: 110,
		height: 116,
		position: 'absolute',
		right: -12,
		top: 30
	},
	time: {
		marginTop: 2
	},
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10
	},
	canceling: {
		flex: 1,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10
	},
	cancelButtonText: {
		fontSize: 14,
		color: colors.brandPink300
	},
	claimText: {
		fontSize: 14,
		color: colors.$FFA000
	},
	migrating: {
		fontSize: 20,
		color: colors.$FFA000,
		lineHeight: 24,
		...fontStyles.medium,
		alignSelf: 'center',
		marginTop: 20
	},
	waitText: {
		fontSize: 14,
		color: colors.$FFA000,
		lineHeight: 16,
		alignSelf: 'center',
		marginTop: 6
	},
	migratedWrapper: {
		marginTop: 10,
		flexDirection: 'row',
		alignItems: 'center'
	},
	networkFromText: {
		color: colors.$030319,
		lineHeight: 16,
		...fontStyles.medium
	},
	networkToText: {
		color: colors.$030319,
		lineHeight: 16,
		...fontStyles.medium,
		marginLeft: 16
	},
	networkImg: {
		marginLeft: 23
	}
});

const ROW_HEIGHT = 194;

class OngoingTransactions extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		transactionMetas: PropTypes.array,
		allChainId: PropTypes.object,
		selectedAddress: PropTypes.string,
		showAlert: PropTypes.func,
		close: PropTypes.func
	};

	state = {
		error: null,
		cancelList: [],
		cancelTransactionMeta: null,
		cancelMessage: '',
		cancelGasEstimates: undefined
	};

	showListId = null;

	componentWillUnmount() {
		this.showListId = null;
	}

	getItemLayout = (data, index) => ({
		length: ROW_HEIGHT,
		offset: ROW_HEIGHT * index,
		index
	});

	keyExtractor = item => item.id;

	renderNoTx = () => {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.noTxView}>
				<Image source={iconNotx} />
				<Text style={[styles.noTxText, isDarkMode && baseStyles.textDark]}>
					{strings('other.no_transaction_history')}
				</Text>
			</View>
		);
	};

	exitChainId = curChainId => {
		const { allChainId } = this.props;
		if (isRpcChainId(curChainId)) {
			return true;
		} else {
			for (const type in allChainId) {
				if (allChainId[type] === curChainId) {
					return true;
				}
			}
		}
		return false;
	};

	getImg = curChainId => {
		const { allChainId } = this.props;
		let chainType;
		if (isRpcChainId(curChainId)) {
			chainType = ChainType.RPCBase;
		} else {
			for (const type in allChainId) {
				if (allChainId[type] === curChainId) {
					chainType = Number(type);
					break;
				}
			}
		}
		return ChainTypeBgOngoing[ChainTypes.indexOf(chainType)];
	};

	getToNetwork(crossChainType) {
		if (crossChainType === CrossChainType.depositArb) {
			return getChainTypeName(ChainType.Arbitrum);
		} else if (crossChainType === CrossChainType.depositPolygon) {
			return getChainTypeName(ChainType.Polygon);
		}
		return getChainTypeName(ChainType.Ethereum);
	}

	renderTxTime = transactionMeta => `${toDateFormat(transactionMeta.time)}`;

	showCopyAlert = () => {
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') },
			flag: 'OngoingTransactions'
		});
	};

	navToBrowser = transactionMeta => {
		const { navigation, close } = this.props;
		const transactionHash = transactionMeta.transactionHash;

		try {
			if (isRpcChainId(transactionMeta.chainId)) {
				const type = getRpcChainTypeByChainId(transactionMeta.chainId);
				if (!type) {
					return;
				}
				const rpcTarget = getRpcProviderExplorerUrl(type);
				if (!rpcTarget) {
					return;
				}
				const url = `${rpcTarget}/tx/${transactionHash}`;
				const title = new URL(rpcTarget).hostname;
				navigation.push('Webview', {
					url,
					title
				});
			} else {
				const url = getEtherscanTransactionUrl(transactionMeta.chainId, transactionHash);
				const etherscan_url = getEtherscanBaseUrl(transactionMeta.chainId).replace('https://', '');
				navigation.push('Webview', {
					url,
					title: etherscan_url
				});
			}
			close && close(false);
		} catch (e) {
			util.logError(e, { message: "can't get a block explorer link for network" });
		}
	};

	startCancel = transactionMeta => {
		if (transactionMeta.status !== TransactionStatus.submitted) {
			return;
		}
		this.state.cancelList.unshift(transactionMeta.id);
		this.setState({ cancelList: [...this.state.cancelList] });
		this.loadCancelGas(transactionMeta);
	};

	loadCancelGas = async transactionMeta => {
		let gasEstimates = await getSuggestedGasEstimates({
			from: transactionMeta.transaction.from,
			to: transactionMeta.transaction.to,
			chainId: transactionMeta.transaction.chainId
		});
		gasEstimates = getIncreasedPrice(gasEstimates, 1.5);
		const ticker = getTickerByType(getChainTypeByChainId(transactionMeta.chainId));
		const message = strings('other.cancel_gas', {
			amount: renderFromWei(gasEstimates.gas.mul(gasEstimates.gasPrice)),
			ticker
		});
		this.setState({
			cancelTransactionMeta: transactionMeta,
			cancelMessage: message,
			cancelGasEstimates: gasEstimates
		});
	};

	onConfirmStopTransaction = async () => {
		const { cancelTransactionMeta, cancelGasEstimates, cancelList } = this.state;
		const gasOption = {
			gasPrice: BNToHex(cancelGasEstimates.gasPrice)
		};
		if (
			cancelGasEstimates.maxFeePerGas &&
			cancelGasEstimates.maxPriorityFeePerGas &&
			cancelGasEstimates.estimatedBaseFee
		) {
			gasOption.maxFeePerGas = BNToHex(cancelGasEstimates.maxFeePerGas);
			gasOption.maxPriorityFeePerGas = BNToHex(cancelGasEstimates.maxPriorityFeePerGas);
			gasOption.estimatedBaseFee = BNToHex(cancelGasEstimates.estimatedBaseFee);
		}
		await this.cancelTransaction(cancelTransactionMeta, gasOption);
		const nowCancelList = cancelList.filter(transactionId => transactionId !== cancelTransactionMeta.id);
		this.setState({ cancelList: [...nowCancelList], cancelTransactionMeta: null });
	};

	onCancelStopTransaction = () => {
		const { cancelTransactionMeta, cancelList } = this.state;
		const nowCancelList = cancelList.filter(transactionId => transactionId !== cancelTransactionMeta.id);
		this.setState({ cancelList: [...nowCancelList], cancelTransactionMeta: null });
	};

	cancelTransaction = async (transactionMeta, gasOption) => {
		try {
			const { TransactionController } = Engine.context;
			await TransactionController.stopTransaction(transactionMeta.id, gasOption);
		} catch (error) {
			setTimeout(() => {
				this.setState({ error: strings('other.cancel_fail') });
			}, 1000);
			util.logWarn('PPYang cancelTransaction error:', error);
		}
	};

	getDecimalValue = transactionMeta => {
		const extraInfo = transactionMeta.extraInfo;
		if (extraInfo && extraInfo.readableAmount) {
			if (extraInfo.nativeCurrency) {
				return renderFromWei(extraInfo.readableAmount);
			}
			return renderFromTokenMinimalUnit(extraInfo.readableAmount, extraInfo.decimals);
		}
		return renderFromWei(transactionMeta.transaction.value);
	};

	renderItem = data => {
		const transactionMeta = data.item;
		const { selectedAddress } = this.props;
		const extraInfo = transactionMeta.extraInfo;
		const decimalValue = this.getDecimalValue(transactionMeta);
		const isMigrated = extraInfo?.crossChainType;
		const isClaim = transactionMeta.origin === TransactionTypes.ORIGIN_CLAIM;
		const renderTo = renderFullAddress(transactionMeta.transaction.to);
		const transactionHash = transactionMeta.transactionHash;
		const isRpc = isRpcChainId(transactionMeta.chainId);
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity style={styles.itemWrapper} activeOpacity={1}>
				{isRpc ? (
					getOnGoingIcon(styles.itemBgImage, getRpcChainTypeByChainId(transactionMeta.chainId))
				) : (
					<Image style={styles.itemBgImage} source={this.getImg(transactionMeta.chainId)} />
				)}

				<TxItem.Header2
					isMigrated={isMigrated}
					isClaim={isClaim}
					symbol={extraInfo?.symbol}
					decimalValue={decimalValue}
					tx={transactionMeta}
					selectedAddress={selectedAddress}
				/>
				<TxItem.Datetime style={[styles.time, isDarkMode && baseStyles.subTextDark]}>
					{this.renderTxTime(transactionMeta)}
				</TxItem.Datetime>
				{isMigrated ? (
					this.renderMigrated(transactionMeta)
				) : (
					<TxItem.To
						originAddr={renderTo}
						toAddr={renderTo?.substring(0, 20) + '...' + renderTo?.substring(29)}
						showAlert={this.showCopyAlert}
						style={isDarkMode && baseStyles.subTextDark}
					/>
				)}
				<TxItem.Hash
					originHash={transactionHash}
					txHash={transactionHash?.substring(0, 18) + '...' + transactionHash?.substring(50)}
					navToBrowser={() => this.navToBrowser(transactionMeta)}
					style={isDarkMode && baseStyles.subTextDark}
				/>
				{this.renderAction(transactionMeta, extraInfo)}
			</TouchableOpacity>
		);
	};

	renderAction = (transactionMeta, extraInfo) => {
		const canceling =
			this.state.cancelList.findIndex(id => id === transactionMeta.id) !== -1 || extraInfo?.tryCancelHash;
		if (transactionMeta.status === TransactionStatus.submitted) {
			return this.renderCancelButton(transactionMeta, canceling);
		}
		if (
			transactionMeta.status === TransactionStatus.confirmed &&
			extraInfo?.crossChainType &&
			!extraInfo?.crossChainDone
		) {
			return this.renderMigrating();
		}
		if (
			transactionMeta.status === TransactionStatus.confirmed &&
			extraInfo?.crossChainDone &&
			(extraInfo?.crossChainType === CrossChainType.withdrawArb ||
				extraInfo?.crossChainType === CrossChainType.withdrawPolygon)
		) {
			return (
				<View style={styles.canceling}>
					<Text style={styles.claimText}>{strings('other.claim_lock')}</Text>
				</View>
			);
		}
	};

	renderMigrated = transactionMeta => {
		const from = getChainTypeNameByChainId(transactionMeta.chainId);
		const to = this.getToNetwork(transactionMeta.extraInfo?.crossChainType);
		return (
			<View style={styles.migratedWrapper}>
				<Text style={styles.networkFromText}>{from}</Text>
				<Image style={styles.networkImg} source={iconArrow} />
				<Text style={styles.networkToText}>{to}</Text>
			</View>
		);
	};

	renderCancelButton = (transactionMeta, canceling) => {
		const { isDarkMode } = this.context;
		return canceling ? (
			<View style={styles.canceling}>
				<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
					{strings('other.cancelling')}
				</Text>
			</View>
		) : (
			<TouchableOpacity
				style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
				onPress={() => {
					this.startCancel(transactionMeta);
				}}
				activeOpacity={0.8}
			>
				<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
					{strings('other.cancel')}
				</Text>
			</TouchableOpacity>
		);
	};

	renderMigrating = () => (
		<>
			<Text style={styles.migrating}>{strings('other.migrating')}</Text>
			<Text style={styles.waitText}>{strings('other.please_wait')}</Text>
		</>
	);

	render() {
		const { transactionMetas } = this.props;
		const { error, cancelTransactionMeta, cancelMessage } = this.state;
		const { isDarkMode } = this.context;
		const submittedTransaction = transactionMetas.filter(
			meta =>
				this.exitChainId(meta.chainId) &&
				((this.showListId && this.showListId.includes(meta.id)) ||
					meta.status === TransactionStatus.submitted ||
					(meta.status === TransactionStatus.confirmed &&
						meta.extraInfo &&
						meta.extraInfo.crossChainType &&
						!meta.extraInfo.crossChainDone))
		);
		this.showListId = submittedTransaction.map(meta => meta.id);
		return (
			<View style={[styles.wrapper, isDarkMode && baseStyles.darkModalBackground]}>
				<Text style={[styles.titleWrapper, isDarkMode && baseStyles.textDark]}>
					{strings('other.ongoing_tx')}
				</Text>
				<FlatList
					getItemLayout={this.getItemLayout}
					data={submittedTransaction}
					keyExtractor={this.keyExtractor}
					renderItem={this.renderItem}
					initialNumToRender={4}
					maxToRenderPerBatch={2}
					onEndReachedThreshold={0.5}
					style={styles.txWrapper}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={this.renderNoTx()}
				/>
				<GlobalAlert currentFlag={'OngoingTransactions'} />
				<PromptView
					isVisible={error != null}
					title={strings('transactions.transaction_error')}
					message={error}
					onRequestClose={() => {
						this.setState({ error: null });
					}}
				/>
				<OperationPromptView
					isVisible={cancelTransactionMeta !== null}
					message={cancelMessage}
					okText={strings('other.cancel_transaction')}
					cancelText={strings('other.go_back')}
					onCancel={this.onCancelStopTransaction.bind(this)}
					onOk={this.onConfirmStopTransaction.bind(this)}
				/>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	transactionMetas: state.engine.backgroundState.TransactionController.transactionMetas,
	allChainId: getAllChainId(state),
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(OngoingTransactions);
