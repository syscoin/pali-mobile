import React, { PureComponent } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';
import TransactionReview from '../TransactionReview';
import {
	isBN,
	renderFromWei,
	getChainTypeByChainId,
	getNativeCurrencyBalance,
	getTokenBalance,
	hexToBN
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getNormalizedTxState, getTicker } from '../../../util/transactions';
import { setTransactionObject } from '../../../actions/transaction';
import Engine from '../../../core/Engine';
import { safeToChecksumAddress } from '../../../util/address';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import PromptView from '../PromptView';
import { ChainType, isValidAddress, BN, util } from 'paliwallet-core';
import CheckPassword from '../CheckPassword';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERIFICATION_DISABLED } from '../../../constants/storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { ThemeContext } from '../../../theme/ThemeProvider';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	container: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 50,
		borderTopRightRadius: 50
	},
	titleLayout: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.blackAlpha200,
		borderTopLeftRadius: 50,
		borderTopRightRadius: 50
	},
	intro: {
		...fontStyles.semibold,
		color: colors.$030319,
		fontSize: 18,
		marginTop: 20,
		marginBottom: 20,
		textTransform: 'uppercase'
	},

	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		marginTop: 39,
		marginBottom: 30,
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
	}
});

/**
 * PureComponent that supports editing and reviewing a transaction
 */
class TransactionEditor extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this transaction is confirmed
		 */
		onConfirm: PropTypes.func,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		allContractBalances: PropTypes.object,
		/**
		 * String containing the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * Whether was prompted from approval
		 */
		promptedFromApproval: PropTypes.bool
	};

	state = {
		ready: false,
		error: null,
		loading: false,
		checkPassword: false
	};

	/**
	 * Call callback when transaction is cancelled
	 */
	onCancel = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	onConfirm = () => {
		this.setState({ loading: true });
		this.checkConfirm();
	};

	checkConfirm = async () => {
		const error = await this.validate();
		if (error) {
			this.setState({ error, loading: false });
		} else if (await AsyncStorage.getItem(VERIFICATION_DISABLED)) {
			this.doConfirm();
		} else {
			this.setState({ checkPassword: true });
		}
		ReactNativeHapticFeedback.trigger('notificationSuccess', options);
	};

	onInputPwdResult = async result => {
		if (result) {
			this.doConfirm();
		} else {
			this.setState({ loading: false });
		}
		this.setState({ checkPassword: false });
	};

	/**
	 * Call callback when transaction is confirmed, after being validated
	 */
	doConfirm = async () => {
		const { onConfirm } = this.props;
		onConfirm && (await onConfirm());
		this.setState({ loading: false });
	};

	/**
	 * Updates gas and gasPrice in transaction state
	 *
	 * @param {object} gasLimit - BN object containing gasLimit value
	 * @param {object} gasPrice - BN object containing gasPrice value
	 * @param maxPriorityFeePerGasBN
	 * @param maxFeePerGasBN
	 * @param estimatedBaseFeeBN
	 */
	handleGasFeeSelection = (gasLimit, gasPrice, maxPriorityFeePerGasBN, maxFeePerGasBN, estimatedBaseFeeBN) => {
		const transactionObject = {
			gas: gasLimit,
			gasPrice,
			maxPriorityFeePerGas: maxPriorityFeePerGasBN,
			maxFeePerGas: maxFeePerGasBN,
			estimatedBaseFee: estimatedBaseFeeBN
		};
		this.props.setTransactionObject(transactionObject);
	};

	/**
	 * Validates amount, gas and to address
	 *
	 * @returns {string} - Whether the transaction is valid or not, if not it returns error message
	 */
	validate = async () => this.validateGas() || this.validateToAddress() || (await this.validateAmount(false));

	/**
	 * Validates amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateAmount = async (allowEmpty = true) => {
		const {
			transaction: { nativeCurrency }
		} = this.props;
		return nativeCurrency ? this.validateEtherAmount(allowEmpty) : await this.validateTokenAmount(allowEmpty);
	};

	/**
	 * Validates Ether transaction amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateEtherAmount = (allowEmpty = true) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from, chainId },
				allContractBalances
			} = this.props;
			const type = getChainTypeByChainId(chainId);
			const balanceBN = getNativeCurrencyBalance(type, {
				allContractBalances
			});
			const total = value.add(gas.mul(gasPrice));

			if (!value || !gas || !gasPrice || !from) {
				return strings('transaction.invalid_amount');
			}
			if (value && !isBN(value)) {
				return strings('transaction.invalid_amount');
			}
			if (value && balanceBN && isBN(gas) && isBN(gasPrice) && isBN(value) && balanceBN.lt(total)) {
				const amount = renderFromWei(total.sub(value));
				const tokenSymbol = getTicker(undefined, type);
				return strings('transaction.insufficient_amount', { amount, tokenSymbol });
			}
		}
		return error;
	};

	/**
	 * Validates asset (ERC20) transaction amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateTokenAmount = async (allowEmpty = true) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from, selectedAsset, chainId },
				allContractBalances
			} = this.props;
			const checksummedFrom = safeToChecksumAddress(from) || '';
			const type = getChainTypeByChainId(chainId);
			const balanceBN = getNativeCurrencyBalance(type, {
				allContractBalances
			});
			if (!value || !gas || !gasPrice || !from) {
				return strings('transaction.invalid_amount');
			}
			// If user trying to send a token that doesn't own, validate balance querying contract
			// If it fails, skip validation
			let contractBalanceForAddress = getTokenBalance(
				{
					type,
					address: selectedAsset.address
				},
				{
					allContractBalances
				}
			);
			if (!contractBalanceForAddress) {
				contractBalanceForAddress = await this.getBalanceOf(type, selectedAsset.address, checksummedFrom);
			}
			if (value && !isBN(value)) {
				return strings('transaction.invalid_amount');
			}
			const validateAssetAmount = contractBalanceForAddress && contractBalanceForAddress.lt(value);
			const ethTotalAmount = gas.mul(gasPrice);
			if (
				value &&
				balanceBN &&
				isBN(gas) &&
				isBN(gasPrice) &&
				(validateAssetAmount || balanceBN.lt(ethTotalAmount))
			) {
				return strings('transaction.insufficient');
			}
		}
		return error;
	};

	getBalanceOf = async (type, address, selectedAddress) => {
		try {
			let balanceOf;
			if (util.isRpcChainType(type)) {
				balanceOf = await Engine.contracts[ChainType.RPCBase].callContract(
					type,
					'getBalanceOfHex',
					address,
					selectedAddress
				);
			} else {
				balanceOf = await Engine.contracts[type]?.getBalanceOfHex(address, selectedAddress);
			}
			if (balanceOf) {
				return hexToBN(balanceOf);
			}
		} catch (e) {
			// Don't validate balance if error
		}
		return undefined;
	};

	/**
	 * Validates transaction gas
	 *
	 * @returns {string} - String containing error message whether the transaction gas is valid or not
	 */
	validateGas = () => {
		let error;
		const {
			transaction: { gas, gasPrice, chainId },
			allContractBalances
		} = this.props;
		if (!gas) {
			return strings('transaction.invalid_gas');
		}
		if (gas && !isBN(gas)) {
			return strings('transaction.invalid_gas');
		}
		if (!gasPrice) {
			return strings('transaction.invalid_gas_price');
		}
		if (gasPrice && !isBN(gasPrice)) {
			return strings('transaction.invalid_gas_price');
		}

		const balanceBN = getNativeCurrencyBalance(getChainTypeByChainId(chainId), {
			allContractBalances
		});
		if (balanceBN && isBN(gas) && isBN(gasPrice) && balanceBN.lt(gas.mul(gasPrice))) {
			return strings('transaction.insufficient');
		}
		return error;
	};

	/**
	 * Validates transaction to address
	 *
	 * @returns {string} - String containing error message whether the transaction to address is valid or not
	 */
	validateToAddress = () => {
		let error;
		const {
			transaction: { to },
			promptedFromApproval
		} = this.props;
		// If it comes from a dapp it could be a contract deployment
		if (promptedFromApproval && !to) {
			return error;
		}
		!to && (error = strings('transaction.required'));
		to && !isValidAddress(to) && (error = strings('transaction.invalid_address'));
		to && to.length !== 42 && (error = strings('transaction.invalid_address'));
		return error;
	};

	handleSetGasFee = (gasPriceBNWei, maxPriorityFeePerGasBN, maxFeePerGasBN, estimatedBaseFeeBN, limitGas) => {
		this.handleGasFeeSelection(limitGas, gasPriceBNWei, maxPriorityFeePerGasBN, maxFeePerGasBN, estimatedBaseFeeBN);

		this.setState({ ready: true });
	};

	render = () => {
		const { ready, error, loading, checkPassword } = this.state;
		const { isDarkMode } = this.context;
		return (
			<React.Fragment>
				<KeyboardAwareScrollView
					contentContainerStyle={styles.keyboardAwareWrapper}
					keyboardShouldPersistTaps="handled"
				>
					<View style={[styles.container, isDarkMode && baseStyles.darkModalBackground]}>
						<View style={[styles.titleLayout, isDarkMode && baseStyles.darkBackground600]}>
							<Text style={[styles.intro, isDarkMode && baseStyles.textDark]}>
								{strings('transaction.request')}
							</Text>
						</View>
						<TransactionReview onFeesChange={this.handleSetGasFee} />
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
								<TouchableOpacity
									style={[styles.confirm]}
									onPress={this.onConfirm}
									disabled={!ready || loading}
								>
									<Text style={[styles.confirmText]}>{strings('transaction.confirm')}</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
					<PromptView
						isVisible={error != null}
						title={strings('transactions.transaction_error')}
						message={error}
						onRequestClose={() => {
							this.setState({ error: null });
						}}
					/>
					{checkPassword && <CheckPassword checkResult={this.onInputPwdResult} needDelay={false} />}
				</KeyboardAwareScrollView>
			</React.Fragment>
		);
	};
}

const mapStateToProps = state => ({
	allContractBalances:
		state.engine.backgroundState.TokenBalancesController.allContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	transaction: getNormalizedTxState(state)
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionEditor);
