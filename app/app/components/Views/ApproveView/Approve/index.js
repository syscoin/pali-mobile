import React, { PureComponent } from 'react';
import {
	StyleSheet,
	AppState,
	View,
	Image,
	TouchableOpacity,
	Text,
	ActivityIndicator,
	DeviceEventEmitter,
	NativeModules
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { safeToChecksumAddress } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import ApproveTransactionReview from '../../../UI/ApproveTransactionReview';
import Modal from 'react-native-modal';
import { strings } from '../../../../../locales/i18n';
import { setTransactionObject } from '../../../../actions/transaction';
import {
	isBN,
	renderFromWei,
	hexToBN,
	BNToHex,
	getNativeCurrencyBalance,
	getChainTypeByChainId
} from '../../../../util/number';
import { getNormalizedTxState, getTicker, generateApproveData, decodeApproveData } from '../../../../util/transactions';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors, baseStyles } from '../../../../styles/common';
import PromptView from '../../../UI/PromptView';
import { renderError } from '../../../../util/error';
import { TransactionStatus, util, BN } from 'paliwallet-core';
import WebView from 'react-native-webview';
import { onEvent } from '../../../../util/statistics';
import CheckPassword from '../../../UI/CheckPassword';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERIFICATION_DISABLED } from '../../../../constants/storage';
import Device from '../../../../util/Device';
import { ThemeContext } from '../../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	container: {
		backgroundColor: colors.white,
		borderTopRightRadius: 10,
		borderTopLeftRadius: 10
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		marginTop: 30,
		marginBottom: 20,
		marginHorizontal: 30
	},
	cancel: {
		flex: 1,
		marginRight: 8,
		height: 42
	},
	cancelText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	confirm: {
		flex: 1,
		marginLeft: 8,
		height: 42
	},
	confirmText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center',
		color: colors.brandPink300
	},
	loadingContainer: {
		marginTop: 39,
		marginBottom: 30,
		marginHorizontal: 30,
		height: 42,
		justifyContent: 'center',
		alignItems: 'center'
	},
	titleBar: {
		width: '100%',
		height: 56,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white
	},
	titleText: {
		fontSize: 18,
		color: colors.$030319,
		alignSelf: 'center'
	},
	gobackBtn: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: 56,
		height: 56,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class Approve extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		allContractBalances: PropTypes.object,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * List of transactions
		 */
		transactionMetas: PropTypes.array,
		/**
		 * Whether the modal is visible
		 */
		modalVisible: PropTypes.bool,
		/**
		/* Token approve modal visible or not
		*/
		toggleApproveModal: PropTypes.func
	};

	state = {
		gasError: undefined,
		ready: false,
		loading: false,
		approveAmount: undefined,
		spenderAddress: undefined,
		showWebView: false,
		originalAmount: -1,
		isScam: undefined,
		checkPassword: false,
		statusBarHeight: 0
	};

	componentDidMount = async () => {
		if (!this.props?.transaction?.id) {
			this.props.toggleApproveModal(false);
			return null;
		}
		AppState.addEventListener('change', this.handleAppStateChange);
		onEvent('ShowApprovalModal');
		const { transaction } = this.props;
		const { encodedAmount } = decodeApproveData(transaction.data);
		if (this.state.isScam === undefined) {
			const isScam = await this.getMaliciousBehavior();

			this.setState({ isScam: isScam });
		}
		this.setState({ originalAmount: parseInt(encodedAmount) });
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(ret => {
				ret && this.setState({ statusBarHeight: ret.height });
			});
		}
	};

	getMaliciousBehavior = async () => {
		const {
			transaction: { data, chainId }
		} = this.props;
		const { spenderAddress } = decodeApproveData(data);

		try {
			const response = await fetch(
				`https://api.gopluslabs.io/api/v1/approval_security/${chainId}?contract_addresses=${spenderAddress}`
			);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}

			const data = await response.json();

			const maliciousBehaviors = data && data.result ? data.result.malicious_behavior : null;

			const isScam = maliciousBehaviors && maliciousBehaviors.length > 0;

			return isScam;
		} catch (error) {
			util.logError(error, 'error while trying get approve security token data from api');
			return false;
		}
	};

	componentWillUnmount = async () => {
		const { transaction } = this.props;
		AppState.removeEventListener('change', this.handleAppStateChange);
		const { TransactionController } = Engine.context;
		const transactionMeta = await TransactionController.findTransactionMetaByID(transaction.id);
		if (transactionMeta && transactionMeta.status === TransactionStatus.unapproved) {
			await TransactionController.cancelTransaction(transaction.id);
		}
	};

	handleAppStateChange = appState => {
		if (appState === 'background') {
			const { transaction } = this.props;
			transaction && transaction.id && Engine.context.TransactionController.cancelTransaction(transaction.id);
			this.props.toggleApproveModal(false);
		}
	};

	handleSetGasFee = (customGasPrice, maxPriorityFeePerGas, maxFeePerGas, estimatedBaseFee, gas) => {
		const { setTransactionObject } = this.props;
		util.logDebug(
			'PPYang Approve customGasPrice:',
			customGasPrice,
			' customGas:',
			gas,
			' maxPriorityFeePerGas:',
			maxPriorityFeePerGas,
			' maxFeePerGas:',
			maxFeePerGas,
			' estimatedBaseFee:',
			estimatedBaseFee
		);
		setTransactionObject({ gasPrice: customGasPrice, maxPriorityFeePerGas, maxFeePerGas, estimatedBaseFee, gas });

		this.setState({ ready: true });
	};

	setApproveAmount = (approveAmount, spenderAddress) => {
		this.setState({ approveAmount, spenderAddress });
	};

	updateApproveAmount = () => {
		const { approveAmount, spenderAddress } = this.state;
		if (approveAmount === undefined || spenderAddress === undefined) {
			return;
		}
		const { transaction, setTransactionObject } = this.props;
		const approvalData = generateApproveData({
			spender: spenderAddress,
			value: approveAmount
		});
		const newApprovalTransaction = { ...transaction, data: approvalData };
		setTransactionObject(newApprovalTransaction);
		return approvalData;
	};

	validateApproveAmount = () => {
		let error;
		const { approveAmount } = this.state;
		if (hexToBN(approveAmount).lte(new BN(0))) {
			error = 'Invalid approve amount';
		}
		this.setState({ gasError: error });
		return error;
	};

	validateGas = () => {
		let error;
		const {
			transaction: { value, gas, gasPrice, chainId },
			allContractBalances
		} = this.props;
		const type = getChainTypeByChainId(chainId);
		const balanceBN = getNativeCurrencyBalance(type, {
			allContractBalances
		});
		const total = value.add(gas.mul(gasPrice));
		if (!gas) error = strings('transaction.invalid_gas');
		else if (!gasPrice) error = strings('transaction.invalid_gas_price');
		else if (balanceBN && isBN(gas) && isBN(gasPrice) && balanceBN.lt(gas.mul(gasPrice))) {
			const amount = renderFromWei(total.sub(value));
			const tokenSymbol = getTicker(undefined, type);
			error = strings('transaction.insufficient_amount', { amount, tokenSymbol });
		}
		this.setState({ gasError: error });
		return error;
	};

	prepareTransaction = transaction => {
		const txTemp = {
			...transaction,
			gas: BNToHex(transaction.gas),
			gasPrice: BNToHex(transaction.gasPrice),
			value: BNToHex(transaction.value),
			to: safeToChecksumAddress(transaction.to),
			from: safeToChecksumAddress(transaction.from)
		};
		if (transaction.maxFeePerGas && transaction.maxPriorityFeePerGas) {
			txTemp.maxFeePerGas = BNToHex(transaction.maxFeePerGas);
			txTemp.maxPriorityFeePerGas = BNToHex(transaction.maxPriorityFeePerGas);
			txTemp.estimatedBaseFee = BNToHex(transaction.estimatedBaseFee);
		}
		return txTemp;
	};

	onConfirm = () => {
		this.setState({ loading: true });
		if (this.validateGas()) {
			this.setState({ loading: false });
			return;
		}
		const { originalAmount } = this.state;
		if (originalAmount !== 0 && this.validateApproveAmount()) {
			this.setState({ loading: false });
			return;
		}
		AsyncStorage.getItem(VERIFICATION_DISABLED).then(result => {
			if (result) {
				this.doConfirm();
			} else {
				this.setState({ checkPassword: true });
			}
		});
	};

	onInputPwdResult = async result => {
		if (result) {
			this.doConfirm();
		} else {
			this.setState({ loading: false });
		}
		this.setState({ checkPassword: false });
	};

	doConfirm = async () => {
		const { TransactionController } = Engine.context;
		const { transactionMetas } = this.props;
		try {
			let transaction = this.prepareTransaction(this.props.transaction);

			const approvalData = this.updateApproveAmount();
			if (approvalData) {
				transaction = { ...transaction, data: approvalData };
			}
			util.logDebug('PPYang onConfirm transaction', transaction);
			DeviceEventEmitter.emit('OnApprove', transaction.id);

			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === TransactionStatus.submitted) {
					this.props.toggleApproveModal();
				} else if (transactionMeta.status === TransactionStatus.failed) {
					throw transactionMeta.error;
				}
			});
			const fullTx = transactionMetas.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
			onEvent('revoke_approval_confirm');
		} catch (error) {
			util.logError(error, 'error while trying to send transaction (Approve)');
			this.setState({ gasError: renderError(error) });
		}
		this.setState({ loading: false });
	};

	onCancel = () => {
		if (this.state.loading) return;
		this.props.toggleApproveModal(false);
	};

	showCommonRisk = () => {
		this.setState({ showWebView: true });
	};

	hideCommonRisk = () => {
		this.setState({ showWebView: false });
	};

	render = () => {
		const { gasError, ready, loading, checkPassword, isScam } = this.state;
		const { transaction } = this.props;
		if (!transaction.id) return null;
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={this.props.modalVisible}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onCancel}
				onBackButtonPress={this.onCancel}
				onSwipeComplete={this.onCancel}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView
					contentContainerStyle={styles.keyboardAwareWrapper}
					keyboardShouldPersistTaps="handled"
				>
					<View style={[styles.container, isDarkMode && baseStyles.darkModalBackground]}>
						<ApproveTransactionReview
							isScam={isScam}
							showCommonRisk={this.showCommonRisk}
							handleGasFeeSelection={this.handleSetGasFee}
							setApproveAmount={this.setApproveAmount}
						/>
						{loading ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="small" color={colors.brandPink300} />
							</View>
						) : (
							<View style={styles.actionContainer}>
								<TouchableOpacity
									style={[styles.cancel, isDarkMode && baseStyles.darkCancelButton]}
									onPress={this.onCancel}
								>
									<Text style={[styles.cancelText, isDarkMode && baseStyles.textDark]}>
										{strings('transaction.reject')}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.confirm]} onPress={this.onConfirm} disabled={!ready}>
									<Text style={[styles.confirmText]}>{strings('transaction.confirm')}</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
					<PromptView
						isVisible={gasError != null}
						title={strings('transactions.transaction_error')}
						message={gasError}
						onRequestClose={() => {
							this.setState({ gasError: null });
						}}
					/>
					{checkPassword && <CheckPassword checkResult={this.onInputPwdResult} needDelay={false} />}
				</KeyboardAwareScrollView>
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	allContractBalances:
		state.engine.backgroundState.TokenBalancesController.allContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	transaction: getNormalizedTxState(state),
	transactionMetas: state.engine.backgroundState.TransactionController.transactionMetas
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approve);
