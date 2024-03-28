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
	Vibration
} from 'react-native';
import { AddressTo } from './../AddressInputs';
import NetworkFee from '../../../UI/NetworkFee';
import { connect } from 'react-redux';
import {
	renderFromWei,
	isDecimalValue,
	toBN,
	toWei,
	toTokenMinimalUnit,
	BNToHex,
	hexToBN,
	randomTransactionId,
	renderAmount,
	getNativeCurrencyBalance,
	getTokenBalance,
	getTokenName,
	getChainIdByType
} from '../../../../util/number';
import Engine from '../../../../core/Engine';
import TransactionTypes from '../../../../core/TransactionTypes';
import { getSuggestedGasEstimatesAndId } from '../../../../util/custom-gas';
import { decodeTransferData, generateTransferData, isSmartContractAddress } from '../../../../util/transactions';
import { strings } from '../../../../../locales/i18n';
import AmountSection from '../AmountSection';
import { store } from '../../../../../app/store';
import { showScannerInModal } from '../../../../actions/scanner';
import imgShadow from '../../../../images/shadow.png';
import PromptView from '../../../UI/PromptView';
import { renderError } from '../../../../util/error';
import iconSendActive from '../../../../images/send_hl.png';
import Device from '../../../../util/Device';
import { ChainType, util, BN, isValidAddress } from 'paliwallet-core';
import Clipboard from '@react-native-community/clipboard';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import CheckPassword from '../../../UI/CheckPassword';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERIFICATION_DISABLED } from '../../../../constants/storage';
import { getEstimatedTotalGas, validateAmount } from '../../../../util/Amount';
import LottieView from 'lottie-react-native';
import NFTImage from '../../../UI/NFTImage';
import { getRpcNickname } from '../../../../util/ControllerUtils';
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
const networkBgColor = '#FE6E9133';
const networkTextColor = '#03031966';

const styles = StyleSheet.create({
	wrapper: {
		maxHeight: '88%',
		backgroundColor: colors.white,
		borderTopLeftRadius: 50,
		borderTopRightRadius: 50
	},
	container: {
		height: 500,
		marginHorizontal: 30
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
	networkWrapper: {
		paddingTop: 9
	},
	toNetwork: {
		fontSize: 18,
		color: colors.$030319,
		lineHeight: 21,
		...fontStyles.semibold
	},
	networks: {
		marginTop: 14,
		flexDirection: 'row'
	},
	networkBg: {
		height: 26,
		paddingHorizontal: 12,
		borderRadius: 13,
		backgroundColor: networkBgColor,
		marginRight: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	networkLabel: {
		fontSize: 11,
		color: networkTextColor,
		...fontStyles.normal
	},
	networkSelectBg: {
		backgroundColor: colors.brandPink300
	},
	networkSelectLabel: {
		color: colors.white,
		...fontStyles.semibold
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
	ensName: {
		fontSize: 12,
		lineHeight: 14,
		color: addrColor,
		alignSelf: 'center',
		marginLeft: 6
	},
	endAddress: {
		fontSize: 12,
		lineHeight: 14,
		color: addrColor,
		marginTop: 6
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
		flex: 1,
		marginTop: 19
	},
	stepTwo: {
		flex: 1,
		marginTop: 30
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
	saftyPanel: {
		height: 17,
		width: '100%',
		marginTop: 4,
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
		color: colors.$8F92A1,
		...fontStyles.medium,
		lineHeight: 17
	},
	saftyText2: {
		fontSize: 12,
		color: colors.brandPink300,
		...fontStyles.medium,
		lineHeight: 17
	},
	suggestionsText: {
		marginTop: 30,
		fontSize: 18,
		color: colors.$030319,
		lineHeight: 21,
		...fontStyles.semibold
	},
	suggestionsWrapper: {
		marginTop: 10,
		marginBottom: 24
	},
	suggestionItem: {
		flex: 1,
		height: 44,
		flexDirection: 'row',
		alignItems: 'center'
	},
	suggestionIcon: {
		marginLeft: 2
	},
	suggestionTextWrapper: {
		flex: 1,
		marginLeft: 12,
		flexDirection: 'row'
	},
	mentionText: {
		fontSize: 14,
		lineHeight: 16,
		color: colors.brandPink300
	},
	suggestionText: {
		fontSize: 14,
		lineHeight: 16,
		color: colors.$030319
	},
	animLayout: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 80
	},
	animation: {
		width: 60,
		height: 60
	},
	noSuggestionImg: {
		marginTop: 48,
		alignSelf: 'center'
	},
	ensAvatar: {
		width: 20,
		height: 22,
		borderRadius: 5
	},
	noSuggestionText: {
		fontSize: 14,
		color: colors.$404040,
		lineHeight: 16,
		marginTop: 6,
		justifyContent: 'center',
		alignSelf: 'center'
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendTab extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		selectedAddress: PropTypes.string,
		onClose: PropTypes.func,
		mainBalance: PropTypes.string,
		allContractBalances: PropTypes.object,
		asset: PropTypes.object,
		onLoading: PropTypes.func
	};

	addressToInputRef = React.createRef();

	amountInputRef = React.createRef();
	dollarInputRef = React.createRef();

	gasInputRef = React.createRef();
	gasPriceInputRef = React.createRef();

	state = {
		addressError: undefined,
		toAddressSafty: undefined,
		inputAddress: undefined,
		toSelectedAddress: undefined,
		toSelectedAddressReady: false,
		inputWidth: { width: '99%' },
		txStep: 1,
		confirmEnabled: true,
		renderableInputValueConversion: undefined,
		valueEnable: false,
		amountValue: undefined,
		transaction: {},
		error: null,
		loading: false,
		networkSelectType: this.props.asset.type,
		checkPassword: false,
		suggestions: [],
		loadSuggestions: false,
		ensAvatarUrl: undefined
	};

	componentDidMount() {
		this.props.onLoading(false);
	}

	setLoading(loading) {
		this.props.onLoading(loading);
		this.setState({ loading });
	}

	closeInput = () => {
		this.addressToInputRef?.current?.blur();
		this.amountInputRef?.current?.blur();
		this.dollarInputRef?.current?.blur();
		this.gasInputRef?.current?.blur();
		this.gasPriceInputRef?.current?.blur();
	};

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

	onToSelectedAddressChange = async (inputAddress, name = '') => {
		let addressError;
		let toSelectedAddressReady = false;

		if (isValidAddress(inputAddress)) {
			toSelectedAddressReady = true;
		} else if (inputAddress && inputAddress.length >= 42) {
			addressError = strings('transaction.invalid_address');
		}

		const toSelectedAddress = toSelectedAddressReady ? inputAddress : '';
		if (toSelectedAddressReady && name) {
			inputAddress = name;
		}
		this.setState(
			{
				addressError,
				inputAddress,
				toSelectedAddress,
				toSelectedAddressReady,
				toAddressSafty: undefined
			},
			() => {
				if (!this.state.toSelectedAddressReady) {
					this.searchEnsName(this.state.inputAddress);
				}
				if (this.state.toSelectedAddressReady && name) {
					this.loadEnsAvatarUrl(name, this.state.toSelectedAddress);
				}
			}
		);
		if (toSelectedAddressReady) {
			this.checkAddress(toSelectedAddress);
		}
	};

	searchEnsName = async name => {
		this.setState({ suggestions: [] });
		if (!name) {
			return;
		}
		this.setState({ loadSuggestions: true });
		const lowerName = name.toLowerCase();
		const suggestions = await Engine.context.EnsController.searchEnsName(lowerName, 20);
		if (suggestions && suggestions.length > 0 && this.state.inputAddress === name) {
			if (suggestions.length === 1 && suggestions[0].name === lowerName) {
				this.onToSelectedAddressChange(suggestions[0].address, suggestions[0].name);
			} else {
				this.setState({ suggestions });
			}
		}
		if (this.state.inputAddress === name) {
			this.setState({ loadSuggestions: false });
		}
	};

	loadEnsAvatarUrl = async (name, address) => {
		this.setState({ ensAvatarUrl: null });
		const ensAvatarUrl = await Engine.context.EnsController.getAvatarUrlForEnsName(name, address);
		if (this.state.toSelectedAddress === address) {
			this.setState({ ensAvatarUrl });
		}
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
					util.logDebug('sendtab scanner error: ', error);
				}
			})
		);
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

	onNext = async () => {
		const { selectedAddress, asset, allContractBalances } = this.props;
		const { amountValue, networkSelectType } = this.state;
		this.closeInput();
		this.setLoading(true);

		try {
			let estimatedTotalGas;
			if (asset.nativeCurrency) {
				estimatedTotalGas = await getEstimatedTotalGas({
					selectedAddress,
					asset
				});
			}

			const amountError = validateAmount(amountValue, {
				asset,
				allContractBalances,
				estimatedTotalGas
			});
			if (amountError) {
				this.setState({ error: amountError });
				return;
			}

			if (networkSelectType === asset.type) {
				await this.onNormalSend(amountValue);
			} else {
				throw new Error('Not Supported!');
			}
		} catch (e) {
			this.setState({ error: e?.message });
		} finally {
			this.setLoading(false);
		}
	};

	onAmountChange = (value, conversion, valueEnable) => {
		this.setState({ amountValue: value, renderableInputValueConversion: conversion, valueEnable });
	};

	onNormalSend = async value => {
		const { transaction, toSelectedAddress } = this.state;
		const { asset, selectedAddress } = this.props;
		const arbChainId = Engine.networks[ChainType.Arbitrum].state.provider.chainId;
		if (asset.type === ChainType.Arbitrum && arbChainId === undefined) {
			this.setState({ error: 'Current network is not supported' });
			return;
		}

		this.curTransactionId = randomTransactionId();

		transaction.chainId = getChainIdByType(asset.type);
		transaction.from = selectedAddress;

		if (asset.nativeCurrency) {
			transaction.data = undefined;
			transaction.to = toSelectedAddress;
			transaction.value = BNToHex(toWei(value));
			transaction.readableAmount = transaction.value;
		} else {
			const tokenAmount = toTokenMinimalUnit(value, asset.decimals);
			transaction.data = generateTransferData('transfer', {
				toAddress: toSelectedAddress,
				amount: BNToHex(tokenAmount)
			});
			transaction.to = asset.address;
			transaction.value = '0x0';
			transaction.readableAmount = BNToHex(tokenAmount);
		}

		const gasEstimation = await getSuggestedGasEstimatesAndId(transaction, this.curTransactionId);
		if (gasEstimation.curTransactionId !== this.curTransactionId) {
			return;
		}
		util.logDebug('PPYang SendTab gasEstimation:', gasEstimation);
		if (asset.type === ChainType.Arbitrum && asset.nativeCurrency) {
			transaction.gas = gasEstimation.gas.ltn(800000) ? new BN(800000) : gasEstimation.gas;
		} else {
			transaction.gas = gasEstimation.gas;
		}
		transaction.gasPrice = gasEstimation.gasPrice;
		if (gasEstimation.isEIP1559) {
			transaction.maxFeePerGas = gasEstimation.maxFeePerGas;
			transaction.maxPriorityFeePerGas = gasEstimation.maxPriorityFeePerGas;
			transaction.estimatedBaseFee = gasEstimation.estimatedBaseFee;
		}

		this.setState({ txStep: 2, transaction });
	};

	prepareTransactionDate = async (
		nativeCurrency: boolean,
		chainId,
		amount: string,
		decimals: number,
		toAddress: string,
		assetAddress: string
	) => {
		const { transaction } = this.state;
		const { selectedAddress } = this.props;

		transaction.from = selectedAddress;
		transaction.chainId = chainId;

		if (nativeCurrency) {
			transaction.data = undefined;
			transaction.value = BNToHex(toWei(amount));
			transaction.readableAmount = transaction.value;
			transaction.to = toAddress;
		} else {
			const approveAmount = toTokenMinimalUnit(amount, decimals);
			transaction.value = '0x0';
			transaction.readableAmount = BNToHex(approveAmount);
			transaction.data = generateTransferData('transfer', {
				toAddress,
				amount: BNToHex(approveAmount)
			});
			transaction.to = assetAddress;
		}
		this.curTransactionId = randomTransactionId();
		const gasEstimation = await getSuggestedGasEstimatesAndId(transaction, this.curTransactionId);
		if (gasEstimation.curTransactionId !== this.curTransactionId) {
			return;
		}
		util.logDebug('PPYang prepareEthereumDate gasEstimation:', gasEstimation, ' chainId:', transaction.chainId);
		transaction.gas = gasEstimation.gas;
		transaction.gasPrice = gasEstimation.gasPrice;
		if (gasEstimation.isEIP1559) {
			transaction.maxFeePerGas = gasEstimation.maxFeePerGas;
			transaction.maxPriorityFeePerGas = gasEstimation.maxPriorityFeePerGas;
			transaction.estimatedBaseFee = gasEstimation.estimatedBaseFee;
		}

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
		try {
			if (this.validateGas()) {
				return false;
			}
			const { transaction } = this.state;
			if (this.validateAmount(transaction)) {
				return false;
			}
		} catch (error) {
			this.setState({ error });
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

			util.logDebug('PPYang SendTab:', transaction);
			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);
			await TransactionController.approveTransaction(transactionMeta.id);
			await new Promise(resolve => resolve(result));

			if (transactionMeta.error) {
				throw transactionMeta.error;
			}

			this.clearTransaction();
			onClose();
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

	validateAmount = transaction => {
		const { allContractBalances, asset } = this.props;
		const { value, gas, gasPrice } = transaction;
		let weiBalance, weiInput, errorMessage;
		if (isDecimalValue(value)) {
			if (asset.nativeCurrency) {
				if (hexToBN(value).isZero()) {
					errorMessage = strings('transaction.invalid_amount');
				} else {
					const totalGas = gas ? gas.mul(gasPrice) : toBN('0x0');
					weiBalance = getNativeCurrencyBalance(asset.type, {
						allContractBalances
					});
					weiInput = hexToBN(value).add(totalGas);
					if (!weiBalance.gte(weiInput)) {
						this.setState({ over: true });
						const amount = renderFromWei(weiInput.sub(weiBalance));
						const tokenSymbol = asset.symbol;
						errorMessage = strings('transaction.insufficient_amount', { amount, tokenSymbol });
					} else {
						this.setState({ over: false });
					}
				}
			} else {
				const [, , amount] = decodeTransferData('transfer', transaction.data);
				weiBalance = getTokenBalance(asset, {
					allContractBalances
				});
				weiInput = hexToBN(amount);
				if (weiInput.isZero()) {
					errorMessage = strings('transaction.invalid_amount');
				} else {
					errorMessage =
						weiBalance && weiBalance.gte(weiInput)
							? undefined
							: strings('transaction.insufficient_tokens', { token: asset.symbol });
				}
			}
		} else {
			errorMessage = strings('transaction.invalid_amount');
		}
		this.setState({ error: errorMessage });
		return !!errorMessage;
	};

	getFromToken = () => {
		const { asset } = this.props;
		if (asset.nativeCurrency) {
			return asset.symbol;
		}
		const addr = getTokenName(asset.type);
		return asset.symbol + '(' + addr + ')';
	};

	getToToken = () => {
		const { asset } = this.props;
		const { networkSelectType } = this.state;
		if (asset.nativeCurrency) {
			if (asset.type === ChainType.Ethereum) {
				if (networkSelectType === ChainType.Polygon) {
					return 'WETH';
				}
			}
			return asset.symbol;
		}

		const addr = getTokenName(networkSelectType);
		return asset.symbol + '(' + addr + ')';
	};

	onNetworkSelect = type => {
		this.closeInput();
		this.setState({ networkSelectType: type });
	};

	getSupportNetwork = type => {
		return [{ type, name: getChainTypeName(type) }];
	};

	renderNetworks = () => {
		const { asset } = this.props;
		const { networkSelectType } = this.state;
		const supportNetwork = this.getSupportNetwork(asset.type);
		return supportNetwork.map((net, i) => (
			<TouchableOpacity
				style={[styles.networkBg, networkSelectType === net.type && styles.networkSelectBg]}
				onPress={() => this.onNetworkSelect(net.type)}
				disabled={networkSelectType === net.type}
				key={`net_${i}`}
			>
				<Text style={[styles.networkLabel, networkSelectType === net.type && styles.networkSelectLabel]}>
					{net.name}
				</Text>
			</TouchableOpacity>
		));
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

	renderSuggestItem = (item, index, match) => {
		const name = item.name;
		const formattedText = [];
		const { isDarkMode } = this.context;
		if (name.length <= 30) {
			match = match.toLowerCase();
			const mIndex = name.indexOf(match);
			if (mIndex >= 0 && mIndex < name.length) {
				const mention = (
					<Text key={'suggestText' + mIndex} style={styles.mentionText}>
						{match}
					</Text>
				);
				if (match.length === name.length) {
					formattedText.push(mention);
				} else if (mIndex === 0) {
					formattedText.push(mention);
					const other = (
						<Text
							key={'suggestText' + index + 1}
							style={[styles.suggestionText, isDarkMode && baseStyles.textDark]}
						>
							{name.substr(match.length, name.length)}
						</Text>
					);
					formattedText.push(other);
				} else if (mIndex + match.length === name.length) {
					const other = (
						<Text
							key={'suggestText' + index + 1}
							style={[styles.suggestionText, isDarkMode && baseStyles.textDark]}
						>
							{name.substr(0, mIndex)}
						</Text>
					);
					formattedText.push(other);
					formattedText.push(mention);
				} else {
					const other = (
						<Text
							key={'suggestText' + index + 1}
							style={[styles.suggestionText, isDarkMode && baseStyles.textDark]}
						>
							{name.substr(0, mIndex)}
						</Text>
					);
					formattedText.push(other);
					formattedText.push(mention);
					const other2 = (
						<Text
							key={'suggestText' + index + 2}
							style={[styles.suggestionText, isDarkMode && baseStyles.textDark]}
						>
							{name.substr(mIndex + match.length, name.length)}
						</Text>
					);
					formattedText.push(other2);
				}
			}
		}
		return (
			<TouchableOpacity
				style={styles.suggestionItem}
				onPress={() => {
					this.setState({ suggestions: [] });
					this.onToSelectedAddressChange(item.address, item.name);
				}}
				activeOpacity={activeOpacity}
				key={'suggest' + index}
			>
				<Image style={styles.suggestionIcon} source={require('../../../../images/ic_ens.png')} />
				{formattedText.length > 0 ? (
					<View style={[styles.suggestionTextWrapper, isDarkMode && baseStyles.textDark]}>
						{formattedText}
					</View>
				) : (
					<Text
						style={[styles.suggestionText, styles.suggestionTextWrapper, isDarkMode && baseStyles.textDark]}
						numberOfLines={1}
						ellipsizeMode={'middle'}
					>
						{item.name}
					</Text>
				)}
			</TouchableOpacity>
		);
	};

	renderView = () => {
		const {
			toAddressSafty,
			inputAddress,
			toSelectedAddress,
			toSelectedAddressReady,
			inputWidth,
			txStep,
			confirmEnabled,
			renderableInputValueConversion,
			transaction,
			loading,
			error,
			networkSelectType,
			checkPassword,
			valueEnable,
			suggestions,
			loadSuggestions,
			ensAvatarUrl,
			amountValue
		} = this.state;

		const { mainBalance, asset, onClose } = this.props;
		const nextEnable = valueEnable && toSelectedAddressReady;
		const { isDarkMode } = this.context;
		return (
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={dismissKeyboard}
				scrollEnabled={suggestions.length === 0}
			>
				<View style={[styles.titleLayout, isDarkMode && baseStyles.darkBackground600]}>
					<Text style={[styles.intro, isDarkMode && baseStyles.textDark]}>{strings('other.send')}</Text>
				</View>
				<TouchableOpacity style={styles.container} activeOpacity={1} onPress={dismissKeyboard}>
					{txStep === 1 ? (
						<View style={styles.stepOne}>
							<AddressTo
								inputRef={this.addressToInputRef}
								addressToReady={toSelectedAddressReady}
								toSelectedAddress={inputAddress}
								onToSelectedAddressChange={this.onToSelectedAddressChange}
								onScan={this.onScan}
								onClear={this.onToClearAddress}
								inputWidth={inputWidth}
								onPastedAddress={this.onPastedAddress}
								onClearAddress={this.onClearAddress}
								title={strings('other.recipient')}
								ensAvatarUrl={ensAvatarUrl}
								placeholder={strings('other.input_receive_address')}
							/>
							{!toSelectedAddressReady && inputAddress?.length > 0 ? (
								<View style={baseStyles.flexGrow}>
									<Text style={[styles.suggestionsText, isDarkMode && baseStyles.textDark]}>
										{strings('other.suggestions')}
									</Text>
									{loadSuggestions ? (
										<View>
											<View
												style={[
													styles.animLayout,
													isDarkMode && baseStyles.darkModalBackground
												]}
											>
												<LottieView
													style={styles.animation}
													autoPlay
													loop
													source={require('../../../../animations/tokens_loading.json')}
												/>
											</View>
										</View>
									) : suggestions.length > 0 ? (
										<ScrollView
											style={styles.suggestionsWrapper}
											showsVerticalScrollIndicator={false}
											keyboardShouldPersistTaps="handled"
											onScrollBeginDrag={dismissKeyboard}
										>
											{suggestions.map((item, index) =>
												this.renderSuggestItem(item, index, inputAddress)
											)}
										</ScrollView>
									) : (
										<>
											<Image
												style={styles.noSuggestionImg}
												source={require('../../../../images/no_nft_img.png')}
											/>
											<Text style={[styles.noSuggestionText, isDarkMode && baseStyles.textDark]}>
												{strings('other.no_suggestions')}
											</Text>
										</>
									)}
								</View>
							) : (
								<>
									{toAddressSafty && toAddressSafty.type > 1 ? (
										this.renderToAddressSafty()
									) : (
										<View style={styles.saftyPanel} />
									)}
									<View style={styles.networkWrapper}>
										<Text style={[styles.toNetwork, isDarkMode && baseStyles.textDark]}>
											{strings('other.to_network')}
										</Text>
										<View style={styles.networks}>{this.renderNetworks()}</View>
										<Text style={[styles.noteText, isDarkMode && baseStyles.subTextDark]}>
											{strings('other.send_note', {
												fromToken: this.getFromToken(),
												network: getChainTypeName(asset.type),
												toToken: this.getToToken()
											})}
										</Text>
									</View>
									<AmountSection
										mainBalance={mainBalance}
										asset={asset}
										closeInput={this.closeInput}
										onAmountChange={this.onAmountChange}
										initAmountValue={amountValue}
										amountInputRef={this.amountInput}
										dollarInputRef={this.dollarInput}
									/>
								</>
							)}
							<View style={styles.confirmActionWrapper}>
								<TouchableOpacity
									style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
									onPress={onClose}
									activeOpacity={activeOpacity}
									disabled={loading}
								>
									<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
										{strings('other.cancel')}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.confirmButton,
										nextEnable &&
											(isDarkMode ? baseStyles.darkConfirmButton : styles.confirmButtonEnabled)
									]}
									onPress={this.onNext}
									activeOpacity={activeOpacity}
									disabled={loading || !nextEnable}
								>
									{loading ? (
										<ActivityIndicator size="small" color={isDarkMode ? colors.$4CA1CF : 'white'} />
									) : (
										<Text
											style={[
												styles.confirmButtonText,
												nextEnable &&
													(isDarkMode
														? baseStyles.darkConfirmText
														: styles.confirmButtonTextEnable)
											]}
										>
											{strings('other.next')}
										</Text>
									)}
								</TouchableOpacity>
							</View>
						</View>
					) : (
						<View style={styles.stepTwo}>
							<View>
								<View style={styles.labelNet}>
									<Text style={[styles.labelTitle, isDarkMode && baseStyles.textDark]}>
										{strings('other.to')}
									</Text>
									<Text style={[styles.labelNetContent, isDarkMode && baseStyles.subTextDark]}>
										{getChainTypeName(networkSelectType)}
									</Text>
								</View>
								{!isValidAddress(inputAddress) ? (
									<>
										<View style={styles.networks}>
											{ensAvatarUrl ? (
												<NFTImage
													style={styles.ensAvatar}
													imageUrl={ensAvatarUrl}
													defaultImg={require('../../../../images/ic_ens.png')}
												/>
											) : (
												<Image source={require('../../../../images/ic_ens.png')} />
											)}
											<Text style={[styles.ensName, isDarkMode && baseStyles.subTextDark]}>
												{inputAddress}
											</Text>
										</View>
										<Text
											style={[styles.endAddress, isDarkMode && baseStyles.subTextDark]}
											numberOfLines={1}
											ellipsizeMode={'middle'}
										>
											{toSelectedAddress}
										</Text>
									</>
								) : (
									<Text
										style={[styles.toAddress, isDarkMode && baseStyles.subTextDark]}
										numberOfLines={1}
										ellipsizeMode={'middle'}
									>
										{toSelectedAddress}
									</Text>
								)}
								<View style={styles.labelAmount}>
									<Text style={[styles.labelTitle, isDarkMode && baseStyles.textDark]}>
										{strings('other.amount')}
									</Text>
									<Text style={[styles.labelAmountContent, isDarkMode && baseStyles.subTextDark]}>
										{renderAmount(renderableInputValueConversion)}
									</Text>
								</View>
							</View>

							<View style={styles.shadowCover}>
								<Image source={imgShadow} />
							</View>

							<View style={styles.feeWrapper}>
								<NetworkFee
									ref={this.networkFee}
									transaction={transaction}
									onChange={this.onGasChange}
									type={asset.type}
									gasInputRef={this.gasInputRef}
									gasPriceInputRef={this.gasPriceInputRef}
								/>
							</View>
							<View style={baseStyles.flexGrow} />
							<View style={styles.confirmActionWrapper}>
								<TouchableOpacity
									style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
									onPress={this.onCancel}
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
										confirmEnabled &&
											(isDarkMode ? baseStyles.darkConfirmButton : styles.confirmButtonEnabled)
									]}
									onPress={this.onConfirmClick}
									activeOpacity={activeOpacity}
									disabled={!confirmEnabled || loading}
								>
									{loading ? (
										<ActivityIndicator size="small" color={isDarkMode ? colors.$4CA1CF : 'white'} />
									) : (
										<Text
											style={[
												styles.confirmButtonText,
												confirmEnabled &&
													(isDarkMode
														? baseStyles.darkConfirmText
														: styles.confirmButtonTextEnable)
											]}
										>
											{strings('action_view.confirm')}
										</Text>
									)}
								</TouchableOpacity>
							</View>
						</View>
					)}
					<PromptView
						isVisible={error != null}
						title={strings('transactions.transaction_error')}
						message={error}
						onRequestClose={() => {
							this.setState({ error: null });
						}}
					/>
					{checkPassword && <CheckPassword checkResult={this.onInputPwdResult} needDelay={false} />}
				</TouchableOpacity>
			</ScrollView>
		);
	};

	render = () => {
		const { isDarkMode } = this.context;
		return Device.isIos() ? (
			<KeyboardAvoidingView
				style={[styles.wrapper, isDarkMode && baseStyles.darkModalBackground]}
				behavior={'padding'}
			>
				{this.renderView()}
			</KeyboardAvoidingView>
		) : (
			<View style={[styles.wrapper, isDarkMode && baseStyles.darkModalBackground]}>{this.renderView()}</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	allContractBalances:
		state.engine.backgroundState.TokenBalancesController.allContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {}
});

export default connect(mapStateToProps)(SendTab);
