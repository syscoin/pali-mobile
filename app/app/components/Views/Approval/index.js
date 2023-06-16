import React, { PureComponent } from 'react';
import { StyleSheet, AppState, DeviceEventEmitter } from 'react-native';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../../UI/TransactionEditor';
import Modal from 'react-native-modal';
import { BNToHex } from '../../../util/number';
import { resetTransaction } from '../../../actions/transaction';
import { connect } from 'react-redux';
import { getNormalizedTxState } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';
import { safeToChecksumAddress } from '../../../util/address';
import PromptView from '../../UI/PromptView';
import TransactionTypes from '../../../core/TransactionTypes';
import { renderError } from '../../../util/error';
import { TransactionStatus, util } from 'paliwallet-core';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * PureComponent that manages transaction approval from the dapp browser
 */
class Approval extends PureComponent {
	static propTypes = {
		/**
		 * Action that cleans transaction state
		 */
		resetTransaction: PropTypes.func.isRequired,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * List of transactions
		 */
		transactionMetas: PropTypes.array,
		/**
		 * Hides or shows the dApp transaction modal
		 */
		toggleDappTransactionModal: PropTypes.func,
		/**
		 * Tells whether or not dApp transaction modal is visible
		 */
		dappTransactionModalVisible: PropTypes.bool
	};

	state = {
		error: null
	};

	componentWillUnmount = async () => {
		const { transaction } = this.props;
		const { TransactionController } = Engine.context;
		const transactionMeta = await TransactionController.findTransactionMetaByID(transaction.id);
		if (transactionMeta && transactionMeta.status === TransactionStatus.unapproved) {
			await TransactionController.cancelTransaction(transaction.id);
		}
		Engine.context.TransactionController.hub.removeAllListeners(`${transaction.id}:finished`);
		AppState.removeEventListener('change', this.handleAppStateChange);
		this.clear();
	};

	handleAppStateChange = appState => {
		if (appState === 'background') {
			const { transaction } = this.props;
			transaction && transaction.id && Engine.context.TransactionController.cancelTransaction(transaction.id);
			this.props.toggleDappTransactionModal(false);
		}
	};

	componentDidMount = () => {
		AppState.addEventListener('change', this.handleAppStateChange);
	};

	/**
	 * Transaction state is erased, ready to create a new clean transaction
	 */
	clear = () => {
		this.props.resetTransaction();
	};

	onCancel = () => {
		this.props.toggleDappTransactionModal();
	};

	/**
	 * Callback on confirm transaction
	 */
	onConfirm = async () => {
		const { TransactionController } = Engine.context;
		const {
			transactionMetas,
			transaction: { nativeCurrency, selectedAsset, origin, maxFeePerGas, maxPriorityFeePerGas, estimatedBaseFee }
		} = this.props;
		let { transaction } = this.props;
		try {
			if (origin === TransactionTypes.ORIGIN_CLAIM) {
				transaction = this.prepareNormalTransaction(transaction);
			} else if (nativeCurrency) {
				transaction = this.prepareTransaction(transaction);
			} else {
				transaction = this.prepareAssetTransaction(transaction, selectedAsset);
			}
			if (maxFeePerGas && maxPriorityFeePerGas) {
				transaction.maxFeePerGas = BNToHex(maxFeePerGas);
				transaction.maxPriorityFeePerGas = BNToHex(maxPriorityFeePerGas);
				transaction.estimatedBaseFee = BNToHex(estimatedBaseFee);
			}
			util.logDebug('PPYang Approval transaction:', transaction);

			DeviceEventEmitter.emit('OnApprove', transaction.id);
			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === TransactionStatus.submitted) {
					this.props.toggleDappTransactionModal();
				} else if (transactionMeta.status === TransactionStatus.failed) {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactionMetas.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			const extraInfo = {
				...fullTx.extraInfo,
				nativeCurrency,
				symbol: selectedAsset?.symbol,
				contractAddress: selectedAsset?.address,
				decimals: selectedAsset?.decimals,
				transferTo: fullTx.transaction?.to,
				readableAmount: selectedAsset?.amount
			};
			updatedTx.extraInfo = extraInfo;
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
		} catch (error) {
			util.logWarn('PPYang error:', error);
			this.setState({ error: renderError(error) });
		}
	};

	/**
	 * Returns transaction object with gas, gasPrice and value in hex format
	 *
	 * @param {object} transaction - Transaction object
	 */
	prepareTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value),
		to: safeToChecksumAddress(transaction.to)
	});

	/**
	 * Returns transaction object with gas and gasPrice in hex format, value set to 0 in hex format
	 * and to set to selectedAsset address
	 *
	 * @param {object} transaction - Transaction object
	 * @param {object} selectedAsset - Asset object
	 */
	prepareAssetTransaction = (transaction, selectedAsset) => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: '0x0',
		to: selectedAsset.address
	});

	prepareNormalTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value)
	});

	render = () => {
		const { transaction, dappTransactionModalVisible } = this.props;
		const { error } = this.state;
		return (
			<Modal
				isVisible={dappTransactionModalVisible}
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
				<TransactionEditor
					onCancel={this.onCancel}
					onConfirm={this.onConfirm}
					transaction={transaction}
					error={error}
				/>

				<PromptView
					isVisible={error != null}
					title={strings('transactions.transaction_error')}
					message={error}
					onRequestClose={() => {
						this.setState({ error: null });
					}}
				/>
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	transaction: getNormalizedTxState(state),
	transactionMetas: state.engine.backgroundState.TransactionController.transactionMetas
});

const mapDispatchToProps = dispatch => ({
	resetTransaction: () => dispatch(resetTransaction())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approval);
