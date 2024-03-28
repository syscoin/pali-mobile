import React, { Component } from 'react';
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../../styles/common';
import NFTImage from '../../../UI/NFTImage';
import PropTypes from 'prop-types';
import NetworkFee from '../../../UI/NetworkFee';
import { ChainType, toChecksumAddress, util } from 'paliwallet-core';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';

import iconEns from '../../../../images/ic_set_ens_avatar.png';
import Engine from '../../../../core/Engine';
import { generateEnsSetAvatarData } from '../../../../util/transactions';
import PromptView from '../../../UI/PromptView';
import { renderError } from '../../../../util/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERIFICATION_DISABLED } from '../../../../constants/storage';
import CheckPassword from '../../../UI/CheckPassword';
import TransactionTypes from '../../../../core/TransactionTypes';
import { BNToHex } from '../../../../util/number';
import Device from '../../../../util/Device';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { ThemeContext } from '../../../../theme/ThemeProvider';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const styles = StyleSheet.create({
	wrapper: {
		maxHeight: '88%',
		backgroundColor: colors.white,
		borderRadius: 20,
		margin: 8
	},
	labelWrapper: {
		alignSelf: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 30
	},
	labelIcon: {
		width: 26,
		height: 26
	},
	labelText: {
		fontSize: 28,
		lineHeight: 34,
		marginLeft: 12,
		color: colors.$030319,
		...fontStyles.bold
	},
	container: {
		marginHorizontal: 30,
		height: 590
	},
	avatar: {
		marginTop: 24,
		height: 140,
		width: 140,
		alignSelf: 'center',
		borderRadius: 10
	},
	name: {
		marginTop: 10,
		fontSize: 20,
		lineHeight: 24,
		color: colors.$030319,
		...fontStyles.semibold,
		alignSelf: 'center'
	},
	feeWrapper: {
		marginTop: 24
	},
	commitText: {
		marginTop: 60,
		color: colors.$030319,
		lineHeight: 22,
		fontSize: 16,
		textAlign: 'center',
		marginHorizontal: 33
	},
	confirmActionWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24
	},
	confirmButton: {
		flex: 1.4,
		height: 44,
		marginLeft: 19,
		borderRadius: 100,
		backgroundColor: colors.$E6E6E6,
		alignItems: 'center',
		justifyContent: 'center'
	},
	confirmButtonEnabled: {
		backgroundColor: colors.brandPink300
	},
	confirmButtonText: {
		fontSize: 14,
		color: colors.$A6A6A6,
		fontWeight: 'bold'
	},
	confirmButtonTextEnable: {
		color: colors.white
	},
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelButtonText: {
		fontSize: 14,
		color: colors.brandPink300
	}
});

class SetEnsAvatar extends Component {
	static contextType = ThemeContext;
	static propTypes = {
		address: PropTypes.string,
		name: PropTypes.string,
		avatarUrl: PropTypes.string,
		avatarText: PropTypes.string,
		onClose: PropTypes.func,
		onLoading: PropTypes.func
	};

	state = {
		transaction: undefined,
		loading: false,
		stepCommit: false,
		checkPassword: false
	};

	gasInputRef = React.createRef();
	gasPriceInputRef = React.createRef();

	componentDidMount() {
		util.logDebug('PPYang SetEnsAvatar address:', this.props.address, this.props.name, this.props.avatarText);
		this.initTransaction();
	}

	shouldComponentUpdate(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean {
		if (!nextProps.avatarUrl || !nextProps.address || !nextProps.name) {
			return false;
		}
		return true;
	}

	async initTransaction() {
		try {
			const { selectedAddress } = Engine.context.PreferencesController.state;
			const node = await Engine.context.EnsController.getNodeByName(this.props.name);
			const data = generateEnsSetAvatarData(node, this.props.avatarText);
			const chainId = await Engine.networks[ChainType.Ethereum].getMainChainId();
			const to = toChecksumAddress('0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41');
			const transaction = {
				data,
				chainId,
				from: selectedAddress,
				to
			};
			this.setState({ transaction });
		} catch (error) {
			this.setState({ error: renderError(error) });
		}
	}

	setLoading(loading) {
		this.props.onLoading(loading);
		this.setState({ loading });
	}

	closeInput = () => {
		this.gasInputRef?.current?.blur();
		this.gasPriceInputRef?.current?.blur();
	};

	onGasChange = (gasPriceBNWei, maxPriorityFeePerGasBN, maxFeePerGasBN, estimatedBaseFeeBN, limitGas) => {
		const { transaction } = this.state;
		transaction.gasPrice = gasPriceBNWei;
		transaction.gas = limitGas;
		transaction.maxPriorityFeePerGas = maxPriorityFeePerGasBN;
		transaction.maxFeePerGas = maxFeePerGasBN;
		transaction.estimatedBaseFee = estimatedBaseFeeBN;
		util.logDebug(
			'PPYang gasPriceBNWei:',
			gasPriceBNWei,
			' gas:',
			limitGas,
			' maxPriorityFeePerGas:',
			maxPriorityFeePerGasBN,
			' maxFeePerGas:',
			maxFeePerGasBN,
			' estimatedBaseFeeBN:',
			estimatedBaseFeeBN
		);
		this.setState({ transaction: { ...transaction } });
	};

	onConfirmClick = () => {
		this.closeInput();
		this.setLoading(true);
		AsyncStorage.getItem(VERIFICATION_DISABLED).then(result => {
			if (result) {
				this.onConfirm().then(() => {
					this.setLoading(false);
				});
			} else {
				this.setState({ checkPassword: true });
			}
		});
	};

	onInputPwdResult = async result => {
		if (result) {
			this.onConfirm().then(() => {
				this.setLoading(false);
				ReactNativeHapticFeedback.trigger('notificationSuccess', options);
			});
		} else {
			this.setLoading(false);
		}
		this.setState({ checkPassword: false });
	};

	prepareTransaction = () => {
		const txTemp = {
			...this.state.transaction,
			gas: BNToHex(this.state.transaction.gas),
			gasPrice: BNToHex(this.state.transaction.gasPrice)
		};
		if (this.state.transaction.maxFeePerGas && this.state.transaction.maxPriorityFeePerGas) {
			txTemp.maxFeePerGas = BNToHex(this.state.transaction.maxFeePerGas);
			txTemp.maxPriorityFeePerGas = BNToHex(this.state.transaction.maxPriorityFeePerGas);
			txTemp.estimatedBaseFee = BNToHex(this.state.transaction.estimatedBaseFee);
		}
		return txTemp;
	};

	onConfirm = async () => {
		const { name, address } = this.props;
		const { TransactionController } = Engine.context;
		let { transaction } = this.state;

		try {
			transaction = this.prepareTransaction();

			util.logDebug('PPYang SetEnsAvatar:', transaction);
			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);

			Engine.context.TransactionController.hub.once(`${transactionMeta.id}:confirmed`, () => {
				setTimeout(() => {
					Engine.context.EnsController.forceUpdateEnsAvatar(name, address);
				}, 5000);
			});

			await TransactionController.approveTransaction(transactionMeta.id);
			await new Promise(resolve => resolve(result));

			if (transactionMeta.error) {
				throw transactionMeta.error;
			}
			this.setState({ stepCommit: true });
		} catch (error) {
			this.setState({ error: renderError(error) });
		}
	};

	render = () =>
		Device.isIos() ? (
			<KeyboardAvoidingView style={styles.wrapper} behavior={'padding'}>
				{this.renderView()}
			</KeyboardAvoidingView>
		) : (
			<View style={styles.wrapper}>{this.renderView()}</View>
		);

	renderView() {
		const { avatarUrl, name, onClose, address, avatarText } = this.props;
		const { transaction, stepCommit, loading, error, checkPassword } = this.state;
		const isReady = transaction?.gas && transaction?.gasPrice && name && address && avatarText;
		const { isDarkMode } = this.context;

		return (
			<>
				<ScrollView
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					onPress={dismissKeyboard}
					style={isDarkMode && baseStyles.darkModalBackground}
				>
					<TouchableOpacity style={styles.container} activeOpacity={1}>
						<View style={styles.labelWrapper}>
							<Image style={styles.labelIcon} source={iconEns} />
							<Text style={[styles.labelText, isDarkMode && baseStyles.textDark]}>
								{stepCommit ? strings('other.tx_submitted') : strings('other.set_ens_avatar')}
							</Text>
						</View>
						<NFTImage style={styles.avatar} imageUrl={avatarUrl} />
						<Text style={[styles.name, isDarkMode && baseStyles.textDark]}>{name}</Text>
						{stepCommit ? (
							<Text style={[styles.commitText, isDarkMode && baseStyles.textDark]}>
								{strings('other.avatar_updated')}
							</Text>
						) : (
							<View style={styles.feeWrapper}>
								{transaction && (
									<NetworkFee
										transaction={transaction}
										onChange={this.onGasChange}
										type={ChainType.Ethereum}
										gasPriceInputRef={this.addressToInputRef}
										gasInputRef={this.gasInputRef}
									/>
								)}
							</View>
						)}

						<View style={baseStyles.flexGrow} />
						<View style={styles.confirmActionWrapper}>
							{stepCommit ? (
								<TouchableOpacity
									style={[
										styles.confirmButton,
										isDarkMode ? baseStyles.darkConfirmButton : styles.confirmButtonEnabled
									]}
									onPress={onClose}
									activeOpacity={activeOpacity}
								>
									<Text
										style={[
											styles.confirmButtonText,
											isDarkMode ? baseStyles.darkConfirmText : styles.confirmButtonTextEnable
										]}
									>
										{strings('other.i_know')}
									</Text>
								</TouchableOpacity>
							) : (
								<>
									<TouchableOpacity
										style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
										onPress={onClose}
										activeOpacity={activeOpacity}
										disabled={loading}
									>
										<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
											{strings('action_view.cancel')}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.confirmButton,
											isDarkMode ? baseStyles.darkConfirmButton : styles.confirmButtonEnabled
										]}
										onPress={this.onConfirmClick}
										activeOpacity={activeOpacity}
										disabled={!isReady || loading}
									>
										{loading ? (
											<ActivityIndicator
												size="small"
												color={isDarkMode ? colors.$4CA1CF : 'white'}
											/>
										) : (
											<Text
												style={[
													styles.confirmButtonText,
													isReady &&
														(isDarkMode
															? baseStyles.darkConfirmText
															: styles.confirmButtonTextEnable)
												]}
											>
												{strings('action_view.confirm')}
											</Text>
										)}
									</TouchableOpacity>
								</>
							)}
						</View>
					</TouchableOpacity>
				</ScrollView>
				<PromptView
					isVisible={error != null}
					title={strings('transactions.transaction_error')}
					message={error}
					onRequestClose={() => {
						this.setState({ error: null });
					}}
				/>
				{checkPassword && <CheckPassword checkResult={this.onInputPwdResult} needDelay={false} />}
			</>
		);
	}
}

export default SetEnsAvatar;
