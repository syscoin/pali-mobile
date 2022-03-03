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
	getChainTypeName
} from '../../../../util/number';
import { chainTypeTochain } from '../../../../util/walletconnect';
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
import { ChainType, util, isValidAddress, BignumberJs as BigNumber, TransactionStatus } from 'gopocket-core';
import Clipboard from '@react-native-community/clipboard';
import { toLowerCaseEquals } from '../../../../util/general';
import Modal from 'react-native-modal';
import QrScanner from '../../QRScanner';
import NFTImage from '../../../UI/NFTImage';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import CheckPassword from '../../../UI/CheckPassword';
import AsyncStorage from '@react-native-community/async-storage';
import { VERIFICATION_DISABLED } from '../../../../constants/storage';
import { getRpcProviderChainId } from '../../../../util/ControllerUtils';

const titleColor = '#030319';
const addrColor = '#60657D';
const labelAmountColor = '#60657D';

const styles = StyleSheet.create({
	wrapper: {
		maxHeight: '88%',
		backgroundColor: colors.white,
		borderRadius: 20,
		margin: 8
	},
	container: {
		marginHorizontal: 30,
		height: 590
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
		marginBottom: 24,
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
		marginBottom: 24
	},
	confirmButton: {
		flex: 1.4,
		height: 44,
		marginLeft: 19,
		borderRadius: 10,
		backgroundColor: colors.$E6E6E6,
		alignItems: 'center',
		justifyContent: 'center'
	},
	confirmButtonEnabled: {
		backgroundColor: colors.$FE6E91
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
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.$FE6E91,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelButtonText: {
		fontSize: 14,
		color: colors.$FE6E91
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
		fontSize: 12,
		lineHeight: 16,
		color: colors.$8F92A1,
		...fontStyles.normal,
		textAlign: 'center',
		marginTop: 8
	},
	amountTitle: {
		marginTop: 30,
		flexDirection: 'row',
		justifyContent: 'space-between'
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
		color: colors.$FE6E91,
		...fontStyles.medium,
		lineHeight: 17
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendNFTTab extends PureComponent {
	static propTypes = {
		selectedAddress: PropTypes.string,
		onClose: PropTypes.func,
		contractBalances: PropTypes.object,
		asset: PropTypes.object,
		chainId: PropTypes.string,
		arbChainId: PropTypes.string,
		bscChainId: PropTypes.string,
		polygonChainId: PropTypes.string,
		hecoChainId: PropTypes.string,
		opChainId: PropTypes.string,
		avaxChainId: PropTypes.string,
		arbContractBalances: PropTypes.object,
		opContractBalances: PropTypes.object,
		bscContractBalances: PropTypes.object,
		polygonContractBalances: PropTypes.object,
		hecoContractBalances: PropTypes.object,
		avaxContractBalances: PropTypes.object,
		rpcContractBalances: PropTypes.object,
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
		const {
			asset,
			selectedAddress,
			arbChainId,
			chainId,
			bscChainId,
			polygonChainId,
			hecoChainId,
			opChainId,
			avaxChainId
		} = this.props;

		this.curTransactionId = randomTransactionId();

		let txChainId;
		if (asset.type === ChainType.Bsc) {
			txChainId = bscChainId;
		} else if (asset.type === ChainType.Arbitrum) {
			txChainId = arbChainId;
		} else if (asset.type === ChainType.Polygon) {
			txChainId = polygonChainId;
		} else if (asset.type === ChainType.Heco) {
			txChainId = hecoChainId;
		} else if (asset.type === ChainType.Optimism) {
			txChainId = opChainId;
		} else if (asset.type === ChainType.Avax) {
			txChainId = avaxChainId;
		} else if (util.isRpcChainType(asset.type)) {
			txChainId = getRpcProviderChainId(asset.type);
		} else {
			txChainId = chainId;
		}
		transaction.chainId = txChainId;
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
				const errorMessage = await this.validateCollectibleOwnership(transaction);
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
		const {
			asset,
			contractBalances,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
		} = this.props;
		const { gas, gasPrice, value } = this.state.transaction;
		let errorMessage;
		const totalGas = gas.mul(gasPrice);
		const valueBN = hexToBN(value);
		const balanceBN = getNativeCurrencyBalance(asset.type, {
			contractBalances,
			bscContractBalances,
			arbContractBalances,
			opContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
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
			if (asset.type === ChainType.Bsc) {
				const { BscContractController } = Engine.context;
				owner = await BscContractController.getOwnerOf(asset.address, asset.token_id);
			} else if (asset.type === ChainType.Polygon) {
				const { PolygonContractController } = Engine.context;
				owner = await PolygonContractController.getOwnerOf(asset.address, asset.token_id);
			} else if (asset.type === ChainType.Arbitrum) {
				const { ArbContractController } = Engine.context;
				owner = await ArbContractController.getOwnerOf(asset.address, asset.token_id);
			} else if (asset.type === ChainType.Heco) {
				const { HecoContractController } = Engine.context;
				owner = await HecoContractController.getOwnerOf(asset.address, asset.token_id);
			} else if (asset.type === ChainType.Optimism) {
				const { OpContractController } = Engine.context;
				owner = await OpContractController.getOwnerOf(asset.address, asset.token_id);
			} else if (asset.type === ChainType.Avax) {
				const { AvaxContractController } = Engine.context;
				owner = await AvaxContractController.getOwnerOf(asset.address, asset.token_id);
			} else if (util.isRpcChainType(asset.type)) {
				const { RpcContractController } = Engine.context;
				owner = await RpcContractController.callContract(
					asset.type,
					'getOwnerOf',
					asset.address,
					asset.token_id
				);
			} else {
				const { AssetsContractController } = Engine.context;
				owner = await AssetsContractController.getOwnerOf(asset.address, asset.token_id);
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
			if (asset.type === ChainType.Bsc) {
				const { BscContractController } = Engine.context;
				balanceOf = await BscContractController.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else if (asset.type === ChainType.Polygon) {
				const { PolygonContractController } = Engine.context;
				balanceOf = await PolygonContractController.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else if (asset.type === ChainType.Arbitrum) {
				const { ArbContractController } = Engine.context;
				balanceOf = await ArbContractController.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else if (asset.type === ChainType.Heco) {
				const { HecoContractController } = Engine.context;
				balanceOf = await HecoContractController.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else if (asset.type === ChainType.Optimism) {
				const { OpContractController } = Engine.context;
				balanceOf = await OpContractController.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else if (asset.type === ChainType.Avax) {
				const { AvaxContractController } = Engine.context;
				balanceOf = await AvaxContractController.getCollectibleBalanceOf(
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else if (util.isRpcChainType(asset.type)) {
				const { RpcContractController } = Engine.context;
				balanceOf = await RpcContractController.callContract(
					asset.type,
					'getCollectibleBalanceOf',
					asset.address,
					selectedAddress,
					asset.token_id
				);
			} else {
				const { AssetsContractController } = Engine.context;
				balanceOf = await AssetsContractController.getCollectibleBalanceOf(
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
		const amountFormat = renderAmount(inputValue);
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
		return (
			<View style={styles.valueInput}>
				<TextInput
					style={[styles.inputAmount, inputTextWidth && { width: inputTextWidth }]}
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
		const isReady = txStep === 1 ? toSelectedAddressReady && amountReady : confirmEnabled;
		return (
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={dismissKeyboard}
			>
				<TouchableOpacity style={styles.container} activeOpacity={1} onPress={dismissKeyboard}>
					<View style={styles.labelWrapper}>
						<Image style={styles.labelIcon} source={iconSendActive} />
						<Text style={styles.labelText}>{strings('other.send_nft')}</Text>
					</View>
					<Text style={styles.nftName}>{asset.name}</Text>
					{txStep === 1 ? (
						<View style={styles.stepOne}>
							<NFTImage style={styles.stepOneImage} imageUrl={asset.image_url} />
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
								<Text style={styles.titleText}>{strings('other.amount')}</Text>
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
									<Text style={styles.labelTitle}>{strings('other.to')}</Text>
									<Text style={styles.labelNetContent}>{getChainTypeName(asset.type)}</Text>
								</View>
								<Text style={styles.toAddress}>{toSelectedAddress}</Text>
								<View style={styles.labelAmount}>
									<Text style={styles.labelTitle}>{strings('other.amount')}</Text>
									<Text style={styles.labelAmountContent}>{revertAmount(amountFormat)}</Text>
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
							style={styles.cancelButton}
							onPress={txStep === 1 ? onClose : this.onCancel}
							activeOpacity={activeOpacity}
							disabled={loading}
						>
							<Text style={styles.cancelButtonText}>{strings('action_view.cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.confirmButton, isReady && styles.confirmButtonEnabled]}
							onPress={txStep === 1 ? this.onNextStep : this.onConfirmClick}
							activeOpacity={activeOpacity}
							disabled={!isReady || loading}
						>
							{loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Text style={[styles.confirmButtonText, isReady && styles.confirmButtonTextEnable]}>
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

	render = () =>
		Device.isIos() ? (
			<KeyboardAvoidingView style={styles.wrapper} behavior={'padding'}>
				{this.renderView()}
			</KeyboardAvoidingView>
		) : (
			<View style={styles.wrapper}>{this.renderView()}</View>
		);
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	arbChainId: state.engine.backgroundState.ArbNetworkController.provider.chainId,
	bscChainId: state.engine.backgroundState.BscNetworkController.provider.chainId,
	polygonChainId: state.engine.backgroundState.PolygonNetworkController.provider.chainId,
	hecoChainId: state.engine.backgroundState.HecoNetworkController.provider.chainId,
	opChainId: state.engine.backgroundState.OpNetworkController.provider.chainId,
	avaxChainId: state.engine.backgroundState.AvaxNetworkController.provider.chainId,
	contractBalances:
		state.engine.backgroundState.TokenBalancesController.contractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	arbContractBalances:
		state.engine.backgroundState.TokenBalancesController.arbContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	opContractBalances:
		state.engine.backgroundState.TokenBalancesController.opContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	bscContractBalances:
		state.engine.backgroundState.TokenBalancesController.bscContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	polygonContractBalances:
		state.engine.backgroundState.TokenBalancesController.polygonContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	hecoContractBalances:
		state.engine.backgroundState.TokenBalancesController.hecoContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	avaxContractBalances:
		state.engine.backgroundState.TokenBalancesController.avaxContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	rpcContractBalances:
		state.engine.backgroundState.TokenBalancesController.rpcContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	isVisibleInModal: state.scanner.isVisibleInModal,
	isLockScreen: state.settings.isLockScreen
});

export default connect(mapStateToProps)(SendNFTTab);
