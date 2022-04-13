import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { TransactionStatus, CrossChainType, util, URL } from 'gopocket-core';
import iconNotx from '../../../images/notx.png';
import imgEth from '../../../images/img_ongoing_eth.png';
import imgBsc from '../../../images/img_ongoing_bsc.png';
import imgPolygon from '../../../images/img_ongoing_polygon.png';
import imgArb from '../../../images/img_ongoing_arb.png';
import imgHeco from '../../../images/img_ongoing_heco.png';
import imgOp from '../../../images/img_ongoing_op.png';
import imgAvax from '../../../images/img_ongoing_avax.png';
import imgSyscoin from '../../../images/img_ongoing_syscoin.png';
import imgRpc from '../../../images/img_ongoing_other.png';
import iconArrow from '../../../images/move_arrow.png';
import TxItem from '../TxItem';
import {
	BNToHex,
	getChainTypeNameByChainId,
	getTypeByChainId,
	renderFromTokenMinimalUnit,
	renderFromWei
} from '../../../util/number';
import { toDateFormat } from '../../../util/date';
import { renderFullAddress } from '../../../util/address';
import { showAlert } from '../../../actions/alert';
import GlobalAlert from '../GlobalAlert';
import { getNetworkTypeByChainId } from '../../../util/networks';
import { getEtherscanBaseUrl, getEtherscanTransactionUrl } from '../../../util/etherscan';
import Engine from '../../../core/Engine';
import PromptView from '../PromptView';
import TransactionTypes from '../../../core/TransactionTypes';
import OperationPromptView from '../OperationPromptView';
import { getTickerByType } from '../../../util/transactions';
import { getIncreasedPrice, getSuggestedGasEstimates } from '../../../util/custom-gas';
import { getOnGoingIcon } from '../../../util/rpcUtil';
import { getRpcChainTypeByChainId, getRpcProviderExplorerUrl, isRpcChainId } from '../../../util/ControllerUtils';

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
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.$FE6E91,
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
		color: colors.$FE6E91
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
	static propTypes = {
		navigation: PropTypes.object,
		transactionMetas: PropTypes.array,
		chainId: PropTypes.string,
		arbChainId: PropTypes.string,
		bscChainId: PropTypes.string,
		polygonChainId: PropTypes.string,
		hecoChainId: PropTypes.string,
		opChainId: PropTypes.string,
		avaxChainId: PropTypes.string,
		syscoinChainId: PropTypes.string,
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

	renderNoTx = () => (
		<View style={styles.noTxView}>
			<Image source={iconNotx} />
			<Text style={styles.noTxText}>{strings('other.no_transaction_history')}</Text>
		</View>
	);

	exitChainId = curChainId => {
		const {
			chainId,
			arbChainId,
			bscChainId,
			polygonChainId,
			hecoChainId,
			opChainId,
			avaxChainId,
			syscoinChainId
		} = this.props;
		return (
			curChainId === chainId ||
			curChainId === arbChainId ||
			curChainId === bscChainId ||
			curChainId === polygonChainId ||
			curChainId === hecoChainId ||
			curChainId === opChainId ||
			curChainId === avaxChainId ||
			curChainId === syscoinChainId ||
			isRpcChainId(curChainId)
		);
	};

	getImg = curChainId => {
		const {
			chainId,
			arbChainId,
			bscChainId,
			polygonChainId,
			hecoChainId,
			opChainId,
			avaxChainId,
			syscoinChainId
		} = this.props;
		if (curChainId === chainId) {
			return imgEth;
		} else if (curChainId === arbChainId) {
			return imgArb;
		} else if (curChainId === bscChainId) {
			return imgBsc;
		} else if (curChainId === polygonChainId) {
			return imgPolygon;
		} else if (curChainId === hecoChainId) {
			return imgHeco;
		} else if (curChainId === opChainId) {
			return imgOp;
		} else if (curChainId === avaxChainId) {
			return imgAvax;
		} else if (curChainId === syscoinChainId) {
			return imgSyscoin;
		} else if (isRpcChainId(curChainId)) {
			return imgRpc;
		}
		return undefined;
	};

	getToNetwork(crossChainType) {
		if (crossChainType === CrossChainType.depositArb) {
			return strings('other.arbitrum');
		} else if (crossChainType === CrossChainType.depositPolygon) {
			return strings('other.polygon');
		}
		return strings('other.ethereum');
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
				const network = getNetworkTypeByChainId(transactionMeta.chainId);
				const url = getEtherscanTransactionUrl(network, transactionHash);
				const etherscan_url = getEtherscanBaseUrl(network).replace('https://', '');
				navigation.push('Webview', {
					url,
					title: etherscan_url
				});
			}
			close && close(false);
		} catch (e) {
			// eslint-disable-next-line no-console
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
		const ticker = getTickerByType(getTypeByChainId(transactionMeta.chainId));
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
				<TxItem.Datetime style={styles.time}>{this.renderTxTime(transactionMeta)}</TxItem.Datetime>
				{isMigrated ? (
					this.renderMigrated(transactionMeta)
				) : (
					<TxItem.To
						originAddr={renderTo}
						toAddr={renderTo?.substring(0, 20) + '...' + renderTo?.substring(29)}
						showAlert={this.showCopyAlert}
					/>
				)}
				<TxItem.Hash
					originHash={transactionHash}
					txHash={transactionHash?.substring(0, 18) + '...' + transactionHash?.substring(50)}
					navToBrowser={() => this.navToBrowser(transactionMeta)}
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

	renderCancelButton = (transactionMeta, canceling) =>
		canceling ? (
			<View style={styles.canceling}>
				<Text style={styles.cancelButtonText}>{strings('other.cancelling')}</Text>
			</View>
		) : (
			<TouchableOpacity
				style={styles.cancelButton}
				onPress={() => {
					this.startCancel(transactionMeta);
				}}
				activeOpacity={0.8}
			>
				<Text style={styles.cancelButtonText}>{strings('other.cancel')}</Text>
			</TouchableOpacity>
		);

	renderMigrating = () => (
		<>
			<Text style={styles.migrating}>{strings('other.migrating')}</Text>
			<Text style={styles.waitText}>{strings('other.please_wait')}</Text>
		</>
	);

	render() {
		const { transactionMetas } = this.props;
		const { error, cancelTransactionMeta, cancelMessage } = this.state;
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
			<View style={styles.wrapper}>
				<Text style={styles.titleWrapper}>{strings('other.ongoing_tx')}</Text>
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
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	arbChainId: state.engine.backgroundState.ArbNetworkController.provider.chainId,
	bscChainId: state.engine.backgroundState.BscNetworkController.provider.chainId,
	polygonChainId: state.engine.backgroundState.PolygonNetworkController.provider.chainId,
	hecoChainId: state.engine.backgroundState.HecoNetworkController.provider.chainId,
	avaxChainId: state.engine.backgroundState.AvaxNetworkController.provider.chainId,
	syscoinChainId: state.engine.backgroundState.SyscoinNetworkController.provider.chainId,
	opChainId: state.engine.backgroundState.OpNetworkController.provider.chainId,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(OngoingTransactions);
