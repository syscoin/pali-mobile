import React, { PureComponent } from 'react';
import { colors, fontStyles, activeOpacity, baseStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import {
	StyleSheet,
	View,
	Text,
	KeyboardAvoidingView,
	Image,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	TextInput,
	LayoutAnimation
} from 'react-native';
import { AddressTo } from '../AddressInputs';
import NetworkFee from '../../../UI/NetworkFee';
import { connect } from 'react-redux';
import {
	BNToHex,
	hexToBN,
	randomTransactionId,
	renderAmount,
	getNativeCurrencyBalance,
	revertAmount,
	toHexadecimal,
	getChainIdByType
} from '../../../../util/number';
import Engine from '../../../../core/Engine';
import TransactionTypes from '../../../../core/TransactionTypes';
import { getSuggestedGasEstimatesAndId } from '../../../../util/custom-gas';
import { generateTransferData, isSmartContractAddress } from '../../../../util/transactions';
import { strings } from '../../../../../locales/i18n';
import { store } from '../../../../store';
import { hideScanner, showScannerInModal } from '../../../../actions/scanner';
import imgShadow from '../../../../images/shadow.png';
import PromptView from '../../../UI/PromptView';
import { renderError } from '../../../../util/error';
import iconSendActive from '../../../../images/send_hl.png';
import Device from '../../../../util/Device';
import { ChainType, util, isValidAddress, BignumberJs as BigNumber, TransactionStatus } from 'paliwallet-core';
import Clipboard from '@react-native-community/clipboard';
import { toLowerCaseEquals } from '../../../../util/general';
import Modal from 'react-native-modal';
import QrScanner from '../../QRScanner';
import NFTImage from '../../../UI/NFTImage';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import CheckPassword from '../../../UI/CheckPassword';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERIFICATION_DISABLED } from '../../../../constants/storage';
import { chainTypeTochain, getChainTypeName } from '../../../../util/ChainTypeImages';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { ThemeContext } from '../../../../theme/ThemeProvider';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const titleColor = '#030319';
const addrColor = '#60657D';
const labelAmountColor = '#60657D';

const styles = StyleSheet.create({
	wrapper: {
		maxHeight: '88%',
		backgroundColor: colors.white,
		borderRadius: 20,
		margin: 8,
		borderTopLeftRadius: 50,
		borderTopRightRadius: 50
	},
	container: {
		marginHorizontal: 30
	},
	noteText: {
		color: colors.$8F92A1,
		fontSize: 12,
		marginTop: 8,
		lineHeight: 16
	},
	labelNet: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	labelTitle: {
		fontSize: 18,
		lineHeight: 21,
		color: titleColor,
		...fontStyles.semibold
	},
	labelNetContent: {
		fontSize: 15,
		lineHeight: 21,
		color: labelAmountColor
	},
	toAddress: {
		fontSize: 12,
		lineHeight: 14,
		color: addrColor,
		marginTop: 14
	},
	labelAmount: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 30
	},
	labelAmountContent: {
		fontSize: 15,
		lineHeight: 21,
		color: labelAmountColor,
		...fontStyles.semibold
	},
	shadowCover: {
		height: 18,
		marginTop: 30,
		alignItems: 'center'
	},
	feeWrapper: {
		marginTop: 12
	},
	stepOne: {
		marginTop: 24
	},
	stepOneImage: {
		width: 140,
		height: 140,
		alignSelf: 'center',

		borderRadius: 5
	},
	stepTwoImage: {
		width: 80,
		height: 80,
		alignSelf: 'center',
		marginBottom: 24,
		borderRadius: 5
	},
	stepTwo: {
		marginTop: 24
	},
	confirmActionWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
		marginTop: 24
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
		color: colors.$A6A6A6
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
	nftName: {
		fontSize: 14,
		lineHeight: 16,
		color: colors.$8F92A1,
		...fontStyles.bold,
		textAlign: 'center',
		marginTop: 12,
		marginBottom: 24
	},
	amountTitle: {
		marginTop: 30,
		flexDirection: 'row',
		justifyContent: 'space-between'
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
	titleText: {
		fontSize: 18,
		lineHeight: 21,
		color: colors.$030319,
		...fontStyles.semibold
	},
	amountText: {
		alignSelf: 'center',
		fontSize: 12,
		lineHeight: 14,
		color: colors.$60657D
	},
	valueInput: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha,
		marginTop: 10,
		paddingBottom: 8
	},
	inputAmount: {
		flex: 1,
		fontSize: 14,
		lineHeight: 16,
		alignSelf: 'center',
		textAlignVertical: 'center',
		color: colors.$030319,
		padding: 0
	},
	btnMax: {
		height: 24,
		paddingLeft: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	maxText: {
		lineHeight: 13,
		fontSize: 11,
		color: colors.$09C285
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	saftyPanel: {
		width: '100%',
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start'
	},
	saftyIcon: {
		width: 14,
		height: 14,
		marginRight: 4
	},
	saftyText: {
		fontSize: 12,
		color: colors.$404040,
		...fontStyles.medium,
		lineHeight: 17
	},
	saftyText2: {
		fontSize: 12,
		color: colors.brandPink300,
		...fontStyles.medium,
		lineHeight: 17
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendNFTTab extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		selectedAddress: PropTypes.string,
		onClose: PropTypes.func,
		allContractBalances: PropTypes.object,
		asset: PropTypes.object,
		onLoading: PropTypes.func,
		isVisibleInModal: PropTypes.bool,
		isLockScreen: PropTypes.bool
	};

	state = {
		addressError: undefined,
		toAddressSafty: undefined,
		toSelectedAddress: undefined,
		toSelectedAddressReady: false,
		amountReady: true,
		inputWidth: { width: '99%' },
		txStep: 1,
		confirmEnabled: true,
		transaction: {},
		error: null,
		loading: false,
		amountFormat: undefined,
		inputValue: undefined,
		inputTextWidth: undefined,
		checkPassword: false
	};

	addressToInputRef = React.createRef();

	amountInputRef = React.createRef();

	gasInputRef = React.createRef();
	gasPriceInputRef = React.createRef();

	endBalanceOf = new BigNumber(0);

	componentDidMount() {
		this.useMax();
	}

	closeInput = () => {
		this.addressToInputRef?.current?.blur();
		this.amountInputRef?.current?.blur();
		this.gasInputRef?.current?.blur();
		this.gasPriceInputRef?.current?.blur();
	};

	setLoading(loading) {
		this.props.onLoading(loading);
		this.setState({ loading });
	}

	onClearAddress = () => {
		this.onToSelectedAddressChange('');
	};

	onPastedAddress = async () => {
		this.closeInput();
		const content = await Clipboard.getString();
		if (content) {
			this.onToSelectedAddressChange(content);
		}
	};

	onToSelectedAddressChange = async toSelectedAddress => {
		let addressError;
		let toSelectedAddressReady = false;

		if (isValidAddress(toSelectedAddress)) {
			toSelectedAddressReady = true;
		} else if (toSelectedAddress && toSelectedAddress.length >= 42) {
			addressError = strings('transaction.invalid_address');
		}

		this.setState({
			addressError,
			toSelectedAddress,
			toSelectedAddressReady,
			toAddressSafty: undefined
		});
		if (toSelectedAddressReady) {
			this.checkAddress(toSelectedAddress);
		}
	};

	checkAddress = async address => {
		const { SecurityController } = Engine.context;
		const { asset } = this.props;
		const chain = chainTypeTochain(asset.type);
		const p1 = await SecurityController.checkAddress(address, chain);
		const p2 = isSmartContractAddress(address, asset.type);
		Promise.all([p1, p2])
			.then(result => {
				const ret = result[0];
				const isContract = result[1];
				if (ret.type > 0) {
					this.setState({ toAddressSafty: ret });
				} else {
					const toAddressSafty = {
						type: isContract ? 3 : 0,
						desc: isContract ? strings('transactions.send_to_contract') : ''
					};
					this.setState({ toAddressSafty });
				}
			})
			.catch(error => {
				util.logError('checkAddress error', error);
			});
	};

	onToClearAddress = () => {
		this.onToSelectedAddressChange();
	};

	onScan = () => {
		store.dispatch(
			showScannerInModal({
				onScanSuccess: meta => {
					if (meta.target_address) {
						this.onToSelectedAddressChange(meta.target_address);
					}
				},
				onScanError: error => {
					util.logDebug('sendnfttab scanner error: ', error);
				}
			})
		);
	};

	onToInputFocus = () => {
		const { toInputHighlighted } = this.state;
		this.setState({ toInputHighlighted: !toInputHighlighted });
	};

	onNextStep = () => {
		this.setLoading(true);
		this.onNormalSend();
	};

	onNormalSend = async () => {
		const { transaction, toSelectedAddress, inputValue } = this.state;
		const { asset, selectedAddress } = this.props;

		this.curTransactionId = randomTransactionId();

		transaction.chainId = getChainIdByType(asset.type);
		transaction.from = selectedAddress;

		util.logInfo('PPYang schema_name:', asset.asset_contract?.schema_name, inputValue);
		if (asset.asset_contract?.schema_name === 'ERC721') {
			transaction.data = generateTransferData('transferFrom', {
				fromAddress: transaction.from,
				toAddress: toSelectedAddress,
				tokenId: toHexadecimal(asset.token_id)
			});
		} else {
			transaction.data = generateTransferData('safeTransferFrom', {
				fromAddress: transaction.from,
				toAddress: toSelectedAddress,
				tokenId: toHexadecimal(asset.token_id),
				value: toHexadecimal(inputValue),
				data: ''
			});
		}

		transaction.to = asset.address;
		transaction.value = '0x0';

		const gasEstimation = await getSuggestedGasEstimatesAndId(transaction, this.curTransactionId);
		if (gasEstimation.curTransactionId !== this.curTransactionId) {
			return;
		}
		util.logDebug('PPYang SendTab gasEstimation:', gasEstimation);
		transaction.gas = gasEstimation.gas;
		transaction.gasPrice = gasEstimation.gasPrice;
		if (gasEstimation.isEIP1559) {
			transaction.maxFeePerGas = gasEstimation.maxFeePerGas;
			transaction.maxPriorityFeePerGas = gasEstimation.maxPriorityFeePerGas;
			transaction.estimatedBaseFee = gasEstimation.estimatedBaseFee;
		}

		this.setLoading(false);
		LayoutAnimation.configureNext(
			LayoutAnimation.create(200, LayoutAnimation.Types.linear, LayoutAnimation.Properties.opacity)
		);
		this.setState({ txStep: 2, transaction });
	};

	onCancel = () => {
		this.props.onClose();
		this.clearTransaction();
	};

	clearTransaction = () => {
		this.onToClearAddress();
		this.curTransactionId = 0;
		this.setLoading(false);
		this.setState({ transaction: {}, txStep: 1, estimatedTotalGas: undefined });
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
		this.setState({ transaction });
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

	onConfirmClick = () => {
		this.closeInput();
		this.setLoading(true);
		this.checkConfirm().then(result => {
			if (!result) {
				this.setLoading(false);
			} else {
				AsyncStorage.getItem(VERIFICATION_DISABLED).then(result => {
					if (result) {
						this.onConfirm().then(() => {
							this.setLoading(false);
						});
					} else {
						this.setState({ checkPassword: true });
					}
				});
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

	checkConfirm = async () => {
		const { asset } = this.props;
		const { transaction, inputValue } = this.state;
		try {
			const error = this.validateGas();
			if (error) {
				return false;
			}
			if (!asset.asset_contract?.schema_name) {
				this.setState({ error: strings('transaction.not_supported_collectible') });
				return false;
			}
			if (asset.asset_contract.schema_name === 'ERC721') {
				const errorMessage = await this.validateCollectibleOwnership();
				if (errorMessage) {
					this.setState({ error: errorMessage });
					return false;
				}
				this.endBalanceOf = new BigNumber(0);
			} else {
				const { balanceOf, errorMessage } = await this.getCollectibleBalanceOf();
				if (errorMessage) {
					this.setState({ error: errorMessage });
					return false;
				}
				const bnInputValue = new BigNumber(inputValue);
				if (!balanceOf.gte(bnInputValue)) {
					this.setState({ error: strings('transaction.not_enough_collectible') });
					return false;
				}
				this.endBalanceOf = balanceOf.minus(bnInputValue);
			}
		} catch (error) {
			this.setState({ error: error.message });
			return false;
		}
		return true;
	};

	onConfirm = async () => {
		const { TransactionController } = Engine.context;
		const { asset, onClose } = this.props;
		const { toSelectedAddress } = this.state;
		let { transaction } = this.state;

		try {
			transaction = this.prepareTransaction();

			const extraInfo = {
				nativeCurrency: asset.nativeCurrency,
				symbol: asset.symbol,
				contractAddress: asset.address,
				decimals: asset.decimals,
				transferTo: toSelectedAddress,
				readableAmount: transaction.readableAmount
			};
			transaction = { ...transaction, extraInfo };
			delete transaction.readableAmount;

			util.logDebug('PPYang SendNFTTab:', transaction);
			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);

			Engine.context.TransactionController.hub.once(`${transactionMeta.id}:confirmed`, transactionMeta => {
				if (transactionMeta.status !== TransactionStatus.confirmed) {
					return;
				}
				setTimeout(() => Engine.context.CollectiblesController.poll(), 4000);
			});

			await TransactionController.approveTransaction(transactionMeta.id);
			await new Promise(resolve => resolve(result));

			if (transactionMeta.error) {
				throw transactionMeta.error;
			}

			this.clearTransaction();
			onClose({ closeAll: this.endBalanceOf.isZero() });
		} catch (error) {
			this.setState({ error: renderError(error) });
		}
	};

	validateGas = () => {
		const { asset, allContractBalances } = this.props;
		const { gas, gasPrice, value } = this.state.transaction;
		let errorMessage;
		const totalGas = gas.mul(gasPrice);
		const valueBN = hexToBN(value);
		const balanceBN = getNativeCurrencyBalance(asset.type, {
			allContractBalances
		});
		if (valueBN.add(totalGas).gt(balanceBN)) {
			errorMessage = strings('transaction.not_enough_gas');
			this.setState({ error: errorMessage });
		}
		return errorMessage;
	};

	validateCollectibleOwnership = async () => {
		const { asset, selectedAddress } = this.props;
		let errorMessage;
		try {
			let owner;
			if (util.isRpcChainType(asset.type)) {
				owner = await Engine.contracts[ChainType.RPCBase].callContract(
					asset.type,
					'getOwnerOf',
					asset.address,
					asset.token_id
				);
			} else {
				owner = await Engine.contracts[asset.type]?.getOwnerOf(asset.address, asset.token_id);
			}
			const isOwner = toLowerCaseEquals(owner, selectedAddress);
			if (!isOwner) {
				errorMessage = strings('transaction.invalid_collectible_ownership');
			}
		} catch (e) {
			errorMessage = e.message;
		}
		return errorMessage;
	};

	getCollectibleBalanceOf = async () => {
		const { asset, selectedAddress } = this.props;
		let errorMessage;
		let balanceOf;
		try {
			if (util.isRpcChainType(asset.type)) {
				balanceOf = await Engine.contracts[ChainType.RPCBase].callContract(
					asset.type,
					'getCollectibleBalanceOf',
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else {
				balanceOf = await Engine.contracts[asset.type]?.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			}
			console.log('PPYang balanceOf:', balanceOf, asset.token_id);
			balanceOf = balanceOf && new BigNumber(balanceOf);
			if (!balanceOf || balanceOf.isZero()) {
				errorMessage = strings('transaction.invalid_collectible_ownership');
			}
		} catch (e) {
			errorMessage = e.message;
		}
		return { balanceOf, errorMessage };
	};

	onTextInputLayout = event => {
		this.setState({ inputTextWidth: event.nativeEvent.layout.width });
	};

	onCryptoInputChange = inputValue => {
		inputValue = revertAmount(inputValue);
		const amountFormat = inputValue;
		const amountReady = this.props.asset.balanceOf.gte(new BigNumber(inputValue, 10));
		this.setState({ amountFormat, amountReady, inputValue });
	};

	useMax = async () => {
		this.closeInput();
		this.onCryptoInputChange(this.props.asset.balanceOf.toString(10));
	};

	renderQRScannerInModal = () =>
		this.props.isVisibleInModal && (
			<Modal
				isVisible={!this.props.isLockScreen}
				onBackdropPress={() => store.dispatch(hideScanner())}
				onBackButtonPress={() => store.dispatch(hideScanner())}
				onSwipeComplete={() => store.dispatch(hideScanner())}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.bottomModal}
			>
				<QrScanner />
			</Modal>
		);

	renderTokenInput = () => {
		const { amountFormat, inputTextWidth } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View style={styles.valueInput}>
				<TextInput
					style={[
						styles.inputAmount,
						inputTextWidth && { width: inputTextWidth },
						isDarkMode && baseStyles.textDark
					]}
					ref={this.amountInputRef}
					value={amountFormat}
					onLayout={this.onTextInputLayout}
					onChangeText={this.onCryptoInputChange}
					keyboardType={'numeric'}
					placeholder={'0.0'}
					placeholderTextColor={colors.$8F92A1}
				/>

				<TouchableOpacity style={styles.btnMax} onPress={this.useMax} activeOpacity={activeOpacity}>
					<Text style={styles.maxText}>{strings('other.max')}</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderToAddressSafty = () => {
		const { toAddressSafty } = this.state;
		const { type, desc } = toAddressSafty;
		//type: 0:未知，1：白名单，2：黑名单，3：合约地址
		return (
			<View style={styles.saftyPanel}>
				<Image
					style={styles.saftyIcon}
					source={
						type === 3
							? require('../../../../images/ic_warning.png')
							: require('../../../../images/attention.png')
					}
				/>
				<Text style={type === 3 ? styles.saftyText : styles.saftyText2}>{desc}</Text>
			</View>
		);
	};

	renderView = () => {
		const {
			toAddressSafty,
			toSelectedAddress,
			toSelectedAddressReady,
			toInputHighlighted,
			inputWidth,
			txStep,
			confirmEnabled,
			amountFormat,
			amountReady,
			checkPassword
		} = this.state;
		const { asset, onClose } = this.props;
		const { transaction, loading, error } = this.state;
		const { isDarkMode } = this.context;
		const isReady = txStep === 1 ? toSelectedAddressReady && amountReady : confirmEnabled;

		return (
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={dismissKeyboard}
				style={[
					{ borderTopEndRadius: 50, borderTopStartRadius: 50 },
					isDarkMode && baseStyles.darkModalBackground
				]}
			>
				<View style={[styles.titleLayout, isDarkMode && baseStyles.darkBackground600]}>
					<Text style={[styles.intro, isDarkMode && baseStyles.textDark]}>{strings('other.send_nft')}</Text>
				</View>
				<TouchableOpacity
					style={[styles.container, isDarkMode && baseStyles.darkModalBackground]}
					activeOpacity={1}
					onPress={dismissKeyboard}
				>
					{txStep === 1 ? (
						<View style={styles.stepOne}>
							<NFTImage style={styles.stepOneImage} imageUrl={asset.image_url} />
							<Text style={styles.nftName}>{asset.name}</Text>
							<AddressTo
								inputRef={this.addressToInputRef}
								highlighted={toInputHighlighted}
								addressToReady={toSelectedAddressReady}
								toSelectedAddress={toSelectedAddress}
								onToSelectedAddressChange={this.onToSelectedAddressChange}
								onScan={this.onScan}
								onClear={this.onToClearAddress}
								onInputFocus={this.onToInputFocus}
								onInputBlur={this.onToInputFocus}
								inputWidth={inputWidth}
								onPastedAddress={this.onPastedAddress}
								onClearAddress={this.onClearAddress}
								title={strings('other.to_address')}
								placeholder={strings('other.input_receive_address_nft')}
							/>
							{toAddressSafty && toAddressSafty.type > 1 && this.renderToAddressSafty()}
							<Text style={styles.noteText}>
								{strings('other.send_nft_note', {
									token: 'NFT',
									network: getChainTypeName(asset.type)
								})}
							</Text>
							<View style={styles.amountTitle}>
								<Text style={[styles.titleText, isDarkMode && baseStyles.textDark]}>
									{strings('other.amount')}
								</Text>
								<Text style={styles.amountText}>
									{strings('other.amount_available', { amount: asset.balanceOf })}
								</Text>
							</View>
							{this.renderTokenInput()}
						</View>
					) : (
						<View style={styles.stepTwo}>
							<NFTImage style={styles.stepTwoImage} imageUrl={asset.image_url} />
							<View>
								<View style={styles.labelNet}>
									<Text style={[styles.labelTitle, isDarkMode && baseStyles.textDark]}>
										{strings('other.to')}
									</Text>
									<Text style={[styles.labelNetContent, isDarkMode && baseStyles.subTextDark]}>
										{getChainTypeName(asset.type)}
									</Text>
								</View>
								<Text style={[styles.toAddress, isDarkMode && baseStyles.subTextDark]}>
									{toSelectedAddress}
								</Text>
								<View style={styles.labelAmount}>
									<Text style={[styles.labelTitle, isDarkMode && baseStyles.textDark]}>
										{strings('other.amount')}
									</Text>
									<Text style={[styles.labelAmountContent, isDarkMode && baseStyles.subTextDark]}>
										{revertAmount(amountFormat)}
									</Text>
								</View>
							</View>

							<View style={styles.shadowCover}>
								<Image source={imgShadow} />
							</View>

							<View style={styles.feeWrapper}>
								<NetworkFee
									transaction={transaction}
									onChange={this.onGasChange}
									type={asset.type}
									gasPriceInputRef={this.gasPriceInputRef}
									gasInputRef={this.gasInputRef}
								/>
							</View>
						</View>
					)}
					<View style={baseStyles.flexGrow} />
					<View style={styles.confirmActionWrapper}>
						<TouchableOpacity
							style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
							onPress={txStep === 1 ? onClose : this.onCancel}
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
								isReady && (isDarkMode ? baseStyles.darkConfirmButton : styles.confirmButtonEnabled)
							]}
							onPress={txStep === 1 ? this.onNextStep : this.onConfirmClick}
							activeOpacity={activeOpacity}
							disabled={!isReady || loading}
						>
							{loading ? (
								<ActivityIndicator size="small" color={isDarkMode ? colors.$4CA1CF : 'white'} />
							) : (
								<Text
									style={[
										styles.confirmButtonText,
										isReady &&
											(isDarkMode ? baseStyles.darkConfirmText : styles.confirmButtonTextEnable)
									]}
								>
									{strings(txStep === 1 ? 'other.next' : 'action_view.confirm')}
								</Text>
							)}
						</TouchableOpacity>
					</View>
					<PromptView
						isVisible={error != null}
						title={strings('transactions.transaction_error')}
						message={error}
						onRequestClose={() => {
							this.setState({ error: null });
						}}
					/>
				</TouchableOpacity>
				{this.renderQRScannerInModal()}
				{checkPassword && <CheckPassword checkResult={this.onInputPwdResult} needDelay={false} />}
			</ScrollView>
		);
	};

	render = () => {
		const { isDarkMode } = this.context;
		return Device.isIos() ? (
			<KeyboardAvoidingView
				style={[styles.wrapper, isDarkMode && baseStyles.darkBackground600]}
				behavior={'padding'}
			>
				{this.renderView()}
			</KeyboardAvoidingView>
		) : (
			<View style={[styles.wrapper, isDarkMode && baseStyles.darkBackground600]}>{this.renderView()}</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	allContractBalances:
		state.engine.backgroundState.TokenBalancesController.allContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	isVisibleInModal: state.scanner.isVisibleInModal,
	isLockScreen: state.settings.isLockScreen
});

export default connect(mapStateToProps)(SendNFTTab);
