import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	ActivityIndicator,
	DeviceEventEmitter,
	Image,
	KeyboardAvoidingView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import { setRecipient } from '../../../../actions/transaction';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../../styles/common';
import TokenImage from '../../../UI/TokenImage';
import NetworkFee from '../../../UI/NetworkFee';
import imgShadow from '../../../../images/shadow.png';
import Engine from '../../../../core/Engine';
import TransactionTypes from '../../../../core/TransactionTypes';
import { ChainType, CrossChainType, TransactionStatus, util, BN } from 'gopocket-core';

import {
	addCurrencySymbol,
	balanceToFiatNumber,
	balanceToFiatNumberStr,
	BNToHex,
	calcAssetPrices,
	fiatNumberToTokenMinimalUnit,
	fiatNumberToWei,
	fromWei,
	getChainIdByType,
	getChainTypeName,
	getCurrency,
	getFromTokenMinimalUnit,
	getNativeCurrencyBalance,
	getTokenBalance,
	handleWeiNumber,
	hexToBN,
	isDecimal,
	isZero,
	randomTransactionId,
	renderAmount,
	renderFromTokenMinimalUnit,
	renderFromWei,
	revertAmount,
	toTokenMinimalUnit,
	toWei,
	weiToFiatNumberStr
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import PromptView from '../../../UI/PromptView';
import {
	getSuggestedGasEstimatesAndId,
	estimateTransactionTotalGas,
	getBasicGasEstimates
} from '../../../../util/custom-gas';
import { renderError } from '../../../../util/error';
import iconMigrateActive from '../../../../images/ic_migrate_white.png';
import Device from '../../../../util/Device';
import { generateTransferData } from '../../../../util/transactions';
import { CURRENCIES } from '../../../../util/currencies';
import AsyncStorage from '@react-native-community/async-storage';
import { AVAILABLE_ARB, VERIFICATION_DISABLED } from '../../../../constants/storage';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import { getSupportCBridge } from './cBridge';
import LottieView from 'lottie-react-native';

import cBridgeImage from '../../../../images/img_bridge_cbridge.png';
import arbBridgeImage from '../../../../images/img_bridge_arb.png';
import arbBridgeCnImage from '../../../../images/img_bridge_arb_cn.png';
import approveImage from '../../../../images/img_approve_bridge.png';
import { addApproveInfo, removeApproveInfo } from '../../../../actions/settings';
import { store } from '../../../../store';
import CheckPassword from '../../../UI/CheckPassword';
import { getRpcProviderChainId } from '../../../../util/ControllerUtils';

const arbiBgColor = '#B8B4BF';
const logoBorderColor = '#DCDCDC';
const logoBgColor = '#ECEFF0';
const networkBgColor = '#FE6E9133';
const networkTextColor = '#03031966';
const inputBorderColor = '#8F92A1';
const maxColor = '#09C285';

const styles = StyleSheet.create({
	scrollViewContent: {
		flex: 1,
		height: 590
	},
	wrapper: {
		flex: 1,
		marginHorizontal: 30
	},
	headerText: {
		color: colors.$030319,
		fontSize: 18,
		...fontStyles.semibold
	},
	rowShadow: {
		height: 18,
		alignSelf: 'center'
	},
	rowFee: {
		marginTop: 12
	},
	noteView: {
		height: 32,
		fontSize: 12,
		color: colors.$8F92A1,
		lineHeight: 16,
		marginTop: 10
	},
	btnNextText: {
		borderRadius: 10,
		fontSize: 16,
		textAlign: 'center',
		color: colors.white,
		...fontStyles.normal
	},
	ethLogo: {
		width: 30,
		height: 30,
		borderRadius: 30,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: logoBorderColor,
		backgroundColor: logoBgColor
	},
	iconStyle: {
		width: 30,
		height: 30,
		alignItems: 'center'
	},
	arbiBar: {
		width: 50,
		marginTop: 2,
		borderRadius: 3,
		backgroundColor: arbiBgColor
	},
	arbiText: {
		fontSize: 10,
		lineHeight: 16,
		textAlign: 'center',
		color: colors.white
	},
	moveWrapper: {
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
	networksScroll: {
		maxHeight: 26,
		marginTop: 14,
		marginHorizontal: -30
	},
	networks: {
		height: 26,
		marginLeft: 30,
		paddingRight: 40,
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
		backgroundColor: colors.$FE6E91
	},
	networkSelectLabel: {
		color: colors.white,
		...fontStyles.semibold
	},
	amountWrapper: {
		paddingTop: 30
	},
	amountTitle: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	amountText: {
		fontSize: 18,
		lineHeight: 21,
		color: colors.$030319,
		...fontStyles.semibold
	},
	amountAvailable: {
		alignSelf: 'center',
		fontSize: 12,
		lineHeight: 14,
		color: colors.$60657D
	},
	migrateEthereumTips: {
		fontSize: 12,
		lineHeight: 16,
		color: colors.$8F92A1,
		marginBottom: 20
	},
	valueInput: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha,
		marginTop: 6
	},
	inputTokenLogo: {
		width: 24,
		height: 24,
		borderRadius: 24,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.$DCDCDC,
		backgroundColor: colors.$ECE4FF,
		marginRight: 8
	},
	inputIconStyle: {
		width: 24,
		height: 24,
		alignItems: 'center'
	},
	inputAmount: {
		flex: 1,
		fontSize: 14,
		height: 40,
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
		color: maxColor
	},
	approxi: {
		fontSize: 20,
		lineHeight: 24,
		color: colors.$333333,
		marginTop: 10
	},
	dollarInput: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha
	},
	coinIcon: {
		marginRight: 8
	},
	currencyText: {
		color: colors.$030319,
		fontSize: 11,
		lineHeight: 13,
		paddingLeft: 8
	},
	actionRow: {
		flexDirection: 'row',
		marginBottom: 24
	},
	nextButton: {
		flex: 1.4,
		height: 44,
		marginLeft: 19,
		borderRadius: 10,
		backgroundColor: colors.$E6E6E6,
		alignItems: 'center',
		justifyContent: 'center'
	},
	nextButtonEnabled: {
		backgroundColor: colors.$FE6E91
	},
	nextButtonText: {
		fontSize: 14,
		color: colors.$A6A6A6
	},
	nextButtonTextEnable: {
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
	rightText: {
		fontSize: 15,
		lineHeight: 21,
		color: colors.$60657D,
		...fontStyles.semibold
	},
	rowWrapper: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 30
	},
	migrateTip: {
		fontSize: 12,
		lineHeight: 16,
		color: colors.$8F92A1,
		alignSelf: 'center',
		marginTop: 8,
		marginBottom: 24
	},
	bridgeWrapper: {
		paddingTop: 6
	},
	bridgeImage: {
		marginTop: 30,
		alignSelf: 'center'
	},
	bridgeText: {
		fontSize: 12,
		lineHeight: 14,
		color: colors.$60657D,
		alignSelf: 'center',
		textAlign: 'center',
		marginTop: 10
	},
	approveWrapper: {
		marginTop: 80,
		alignSelf: 'center'
	},
	approveAnimation: {
		width: 60,
		height: 60
	},
	approveText: {
		fontSize: 12,
		lineHeight: 14,
		color: colors.$60657D,
		alignSelf: 'center',
		textAlign: 'center',
		marginTop: 24
	},
	approveText2: {
		fontSize: 12,
		lineHeight: 14,
		color: colors.$60657D,
		alignSelf: 'center',
		textAlign: 'center',
		marginTop: 10
	},
	approveImage: {
		marginTop: 66,
		alignSelf: 'center'
	}
});

class MoveTab extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		asset: PropTypes.object,
		onClose: PropTypes.func,
		arbContractBalances: PropTypes.object,
		opContractBalances: PropTypes.object,
		bscContractBalances: PropTypes.object,
		polygonContractBalances: PropTypes.object,
		hecoContractBalances: PropTypes.object,
		avaxContractBalances: PropTypes.object,
		rpcContractBalances: PropTypes.object,
		selectedAddress: PropTypes.string,
		chainId: PropTypes.string,
		arbChainId: PropTypes.string,
		bscChainId: PropTypes.string,
		polygonChainId: PropTypes.string,
		hecoChainId: PropTypes.string,
		avaxChainId: PropTypes.string,
		contractBalances: PropTypes.object,
		mainBalance: PropTypes.string,
		ethPrice: PropTypes.object,
		bnbPrice: PropTypes.object,
		polygonPrice: PropTypes.object,
		hecoPrice: PropTypes.object,
		avaxPrice: PropTypes.object,
		contractExchangeRates: PropTypes.object,
		arbContractExchangeRates: PropTypes.object,
		bscContractExchangeRates: PropTypes.object,
		polygonContractExchangeRates: PropTypes.object,
		hecoContractExchangeRates: PropTypes.object,
		opContractExchangeRates: PropTypes.object,
		avaxContractExchangeRates: PropTypes.object,
		onLoading: PropTypes.func,
		currencyCode: PropTypes.string,
		currencyCodeRate: PropTypes.number,
		supportNativeBridge: PropTypes.bool,
		supportCBridge: PropTypes.bool,
		addApproveInfo: PropTypes.func,
		removeApproveInfo: PropTypes.func
	};

	state = {
		moveAmount: '',
		moveAmountFormat: '',
		moveStep: 2,
		transaction: {},
		loading: false,
		error: null,
		nextEnabled: false,
		estimatedTotalGas: undefined,
		supportNetworks: [],
		networkSelectType: undefined,
		inputTextWidth: undefined,
		inputValue: undefined,
		inputValueConversion: undefined,
		renderableInputValueConversion: undefined,
		loadEstimatedTotalGasMax: false,
		availableBalance: '',
		migrateTransactionMeta: undefined,
		supportNativeType: [],
		supportCBridgeType: [],
		claimEthereumGas: undefined,
		checkPassword: false
	};

	amountInput = React.createRef();
	dollarInput = React.createRef();

	gasInputRef = React.createRef();
	gasPriceInputRef = React.createRef();

	approveMetaId = undefined;

	isCloseTab = false;
	onApproveConfirmedListener = undefined;

	componentDidMount() {
		const {
			asset,
			arbContractBalances,
			opContractBalances,
			contractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
		} = this.props;
		let approveSelectType;
		if (!asset.nativeCurrency) {
			let value;
			const approveInfo = store
				.getState()
				.settings.approveList?.find(info => info.address === asset.address && info.assetType === asset.type);
			if (approveInfo) {
				value = approveInfo.amount;
				approveSelectType = approveInfo.selectType;
				this.props.removeApproveInfo(approveInfo.metaID);
			} else {
				const weiBalance = getTokenBalance(asset, {
					contractBalances,
					bscContractBalances,
					arbContractBalances,
					opContractBalances,
					polygonContractBalances,
					hecoContractBalances,
					avaxContractBalances,
					rpcContractBalances
				});
				value = getFromTokenMinimalUnit(weiBalance, asset.decimals);
			}
			this.onAmountChange(value);
		}
		this.loadNetworkType(approveSelectType);
		asset.type !== ChainType.Bsc && this.loadClaimEthereumGas();
		this.props.onLoading(false);
	}

	loadClaimEthereumGas = async () => {
		const { currencyCodeRate, ethPrice, currencyCode } = this.props;
		const { gasPrice } = await getBasicGasEstimates({
			from: this.props.selectedAddress,
			to: this.props.selectedAddress,
			chainId: Engine.context.NetworkController.state.provider.chainId
		});
		const balance = renderFromWei(new BN(250000).mul(gasPrice).toString(10));
		const fiatNumber = balanceToFiatNumber(balance, currencyCodeRate, ethPrice.usd);
		this.setState({ claimEthereumGas: addCurrencySymbol(fiatNumber, currencyCode) });
	};

	loadNetworkType = async defaultType => {
		let subNetworks = [];
		const supportNativeType = [];
		if (this.props.supportNativeBridge) {
			subNetworks = await this.getSupportNetworks(this.props.asset);
			subNetworks.forEach(network => {
				supportNativeType.push(network.type);
			});
		}
		let supportCBridgeType = [];
		if (this.props.supportCBridge) {
			supportCBridgeType = getSupportCBridge(this.props.asset);
			subNetworks = this.combineSupportNetworks(subNetworks, supportCBridgeType);
		}
		let moveStep = this.state.moveStep;
		let networkSelectType = subNetworks[0].type;
		if (defaultType) {
			networkSelectType = defaultType;
			moveStep = 2;
		} else if (supportCBridgeType.includes(networkSelectType)) {
			moveStep = 1;
		}

		this.setState(
			{
				supportNetworks: subNetworks,
				networkSelectType,
				supportNativeType,
				supportCBridgeType,
				moveStep
			},
			() => {
				// if (this.props.supportNativeBridge && this.props.asset.type === ChainType.Ethereum) {
				// 	this.loadBscNetworkType();
				// }
			}
		);
	};

	loadBscNetworkType = async () => {
		let supportBsc = true;
		if (!this.props.asset.nativeCurrency) {
			const lowerAddress = this.props.asset.address?.toLowerCase();
			const { BscBridgeController } = Engine.context;
			const tokens = await BscBridgeController.getSupportTokens();
			const token = tokens?.find(token => token?.ethContractAddress?.toLowerCase() === lowerAddress);
			supportBsc = token;
		}
		if (supportBsc) {
			const supportNetworks = this.combineSupportNetworks(this.state.supportNetworks, [ChainType.Bsc]);
			this.setState({ supportNetworks });
		}
	};

	combineSupportNetworks = (networks, types: ChainType[]) => {
		if (!types || types.length < 0) {
			return networks;
		}
		const subTypes = types.filter(type => !networks.find(network => network.type === type));
		if (subTypes.length > 0) {
			const supportNetworks = [...networks];
			subTypes.forEach(type => {
				supportNetworks.push({ type, name: getChainTypeName(type) });
			});
			return supportNetworks;
		}
		return networks;
	};

	componentWillUnmount = () => {
		this.isCloseTab = true;
		if (this.approveMetaId && this.onApproveConfirmedListener) {
			Engine.context.TransactionController.hub.removeListener(
				`${this.approveMetaId}:confirmed`,
				this.onApproveConfirmedListener
			);
		}

		this.cancelTransactionIfNeed();
		if (this.approveMetaId) {
			this.props.addApproveInfo({
				metaID: this.approveMetaId,
				assetType: this.props.asset.type,
				selectType: this.state.networkSelectType,
				address: this.props.asset.address,
				amount: this.state.moveAmount,
				symbol: this.props.asset.symbol
			});
		}
	};

	cancelTransactionIfNeed = () => {
		const { transaction } = this.state;
		if (transaction.onlyApprove && !this.transactionHandled) {
			this.transactionHandled = true;
			Engine.context.TransactionController.cancelTransaction(transaction.id);
		}
	};

	setLoading(loading) {
		this.props.onLoading(loading);
		this.setState({ loading });
	}

	curTransactionId: number = 0;
	transactionHandled = false;

	getEstimatedTotalGas = async () => {
		if (this.state.estimatedTotalGas === undefined) {
			const {
				selectedAddress,
				asset,
				arbChainId,
				chainId,
				bscChainId,
				polygonChainId,
				hecoChainId,
				avaxChainId
			} = this.props;
			let txChainId;
			if (asset.type === ChainType.Bsc) {
				txChainId = bscChainId;
			} else if (asset.type === ChainType.Arbitrum) {
				txChainId = arbChainId;
			} else if (asset.type === ChainType.Polygon) {
				txChainId = polygonChainId;
			} else if (asset.type === ChainType.Heco) {
				txChainId = hecoChainId;
			} else if (asset.type === ChainType.Avax) {
				txChainId = avaxChainId;
			} else if (util.isRpcChainType(asset.type)) {
				txChainId = getRpcProviderChainId(asset.type);
			} else {
				txChainId = chainId;
			}
			let minGas;
			if (asset.type === ChainType.Arbitrum) {
				minGas = 800000;
			}
			const estimatedTotalGas = await estimateTransactionTotalGas(
				selectedAddress,
				selectedAddress,
				txChainId,
				minGas
			);
			this.setState({ estimatedTotalGas });
			return estimatedTotalGas;
		}
		return this.state.estimatedTotalGas;
	};

	renderLogo = () => {
		const { asset } = this.props;
		return <TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />;
	};

	renderArbiBar = () => (
		<View style={styles.arbiBar}>
			<Text style={styles.arbiText}>{strings('other.arbitrum')}</Text>
		</View>
	);

	validateAmount = moveAmount => {
		const {
			contractBalances,
			asset,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
		} = this.props;
		const { estimatedTotalGas } = this.state;
		let weiBalance, weiInput, amountError;
		if (isDecimal(moveAmount) && !isZero(moveAmount)) {
			if (asset.nativeCurrency) {
				weiBalance = getNativeCurrencyBalance(asset.type, {
					contractBalances,
					arbContractBalances,
					opContractBalances,
					polygonContractBalances,
					bscContractBalances,
					hecoContractBalances,
					avaxContractBalances,
					rpcContractBalances
				});
				weiInput = toWei(moveAmount);
				if (estimatedTotalGas) {
					weiInput = weiInput.add(estimatedTotalGas);
				}
			} else {
				weiBalance = getTokenBalance(asset, {
					contractBalances,
					arbContractBalances,
					opContractBalances,
					polygonContractBalances,
					bscContractBalances,
					hecoContractBalances,
					avaxContractBalances,
					rpcContractBalances
				});
				weiInput = toTokenMinimalUnit(moveAmount, asset.decimals);
			}
			amountError = weiBalance && weiBalance.gte(weiInput) ? undefined : strings('transaction.insufficient');
		} else {
			amountError = strings('transaction.invalid_amount');
		}
		return amountError;
	};

	checkApprove = async () => {
		const { moveAmount } = this.state;
		const { asset } = this.props;

		const amount = toTokenMinimalUnit(moveAmount, asset.decimals);
		try {
			const approveAmount = await this.getERC20Allowance();
			util.logDebug('PPYang approveAmount:', approveAmount.toString(10), ' amount:', amount.toString(10));
			if (approveAmount.lt(amount)) {
				this.toApprove();
			} else {
				if (this.isCloseTab) {
					return;
				}
				this.approveMetaId = undefined;
				this.setLoading(true);
				await this.todoTranTransaction();
			}
		} catch (error) {
			util.logWarn('PPYang checkApprove error:', error);
			this.setState({ error: renderError(error) });
			this.setLoading(false);
		}
	};

	getERC20Allowance = async () => {
		const { networkSelectType } = this.state;
		const { asset } = this.props;

		if (networkSelectType === ChainType.Arbitrum) {
			const { ArbContractController } = Engine.context;
			const approved = await ArbContractController.approved(asset.address);
			return hexToBN(approved);
		} else if (networkSelectType === ChainType.Polygon) {
			const { PolygonContractController } = Engine.context;
			const approved = await PolygonContractController.approved(asset.address);
			return hexToBN(approved);
		}
		return hexToBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
	};

	approveMaxERC20ForDeposit = async () => {
		const { networkSelectType } = this.state;
		const { asset } = this.props;
		if (networkSelectType === ChainType.Arbitrum) {
			const { ArbContractController } = Engine.context;
			return await ArbContractController.approve(
				asset.address,
				'0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
				TransactionTypes.ORIGIN_MOVE_TO_L2
			);
		} else if (networkSelectType === ChainType.Polygon) {
			const { PolygonContractController } = Engine.context;
			return await PolygonContractController.approve(
				asset.address,
				'0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
				TransactionTypes.ORIGIN_MOVE_TO_L2
			);
		}
	};

	waitApprove = () => {
		const { TransactionController } = Engine.context;
		DeviceEventEmitter.once('OnApprove', approveId => {
			this.approveMetaId = approveId;
			this.onApproveConfirmedListener = this.onApproveConfirmed.bind(this);
			TransactionController.hub.once(`${approveId}:confirmed`, this.onApproveConfirmedListener);
		});
	};

	onApproveConfirmed = transactionMeta => {
		if (transactionMeta.status === TransactionStatus.confirmed) {
			setTimeout(() => {
				this.checkApprove();
			}, 10000);
		} else {
			this.setLoading(false);
		}
	};

	availableArbMainnet = async () => {
		const availableArb = await AsyncStorage.getItem(AVAILABLE_ARB);
		if (availableArb) {
			return true;
		}
		try {
			const response = await fetch('https://gopocket.finance/1.txt');
			if (response.status === 200) {
				await AsyncStorage.setItem(AVAILABLE_ARB, 'true');
				return true;
			}
		} catch (e) {
			util.logDebug('PPYang availableArbMainnet fetch fail, e', e);
		}
		return false;
	};

	closeInput() {
		this.amountInput?.current?.blur();
		this.dollarInput?.current?.blur();

		this.gasInputRef?.current?.blur();
		this.gasPriceInputRef?.current?.blur();
	}

	onNextClick = () => {
		this.closeInput();
		this.setLoading(true);
		this.onNext();
	};

	onNext = async () => {
		const { moveAmount, networkSelectType } = this.state;
		const { asset, arbChainId } = this.props;
		if (networkSelectType === ChainType.Arbitrum) {
			if (arbChainId === undefined) {
				this.setLoading(false);
				this.setState({ error: 'Current network is not supported' });
				return;
			}
		}

		await this.getEstimatedTotalGas();

		const error = this.validateAmount(moveAmount);
		if (error) {
			this.setLoading(false);
			return;
		}

		if (!asset.nativeCurrency && asset.type === ChainType.Ethereum) {
			await this.checkApprove();
		} else {
			await this.todoTranTransaction();
		}
	};

	todoTranTransaction = async () => {
		const { asset, selectedAddress } = this.props;
		const { networkSelectType, moveAmount } = this.state;
		try {
			if (networkSelectType === ChainType.Bsc) {
				if (asset.type === ChainType.Ethereum) {
					//Ethereum to Bsc
					const { BscBridgeController } = Engine.context;
					const { chainId } = this.props;
					const swapResponse = await BscBridgeController.createDeposit(
						asset.address,
						asset.nativeCurrency ? 'ETH' : asset.symbol,
						Number(moveAmount),
						selectedAddress
					);
					util.logDebug('PPYang todoTranTransaction Ethereum to Bsc, swapResponse:', swapResponse);
					await this.prepareTransactionDate(
						asset.nativeCurrency,
						chainId,
						swapResponse.amount.toString(),
						asset.decimals,
						swapResponse.depositAddress,
						asset.address
					);
				}
			} else if (networkSelectType === ChainType.Arbitrum) {
				if (asset.type === ChainType.Ethereum) {
					const { ArbContractController } = Engine.context;
					//l1  to l2
					this.startWaitingTransactionMeta();
					if (asset.nativeCurrency) {
						await ArbContractController.depositETH(BNToHex(toWei(moveAmount)));
					} else {
						const approveAmount = toTokenMinimalUnit(moveAmount, asset.decimals);
						await ArbContractController.deposit(asset.address, BNToHex(approveAmount));
					}
				}
			} else if (networkSelectType === ChainType.Ethereum) {
				if (asset.type === ChainType.Arbitrum) {
					//l2 to l1
					const { ArbContractController } = Engine.context;
					this.startWaitingTransactionMeta();
					if (asset.nativeCurrency) {
						await ArbContractController.withdrawETH(BNToHex(toWei(moveAmount)), selectedAddress);
					} else {
						const approveAmount = toTokenMinimalUnit(moveAmount, asset.decimals);
						await ArbContractController.withdrawERC20(
							asset.l1Address,
							BNToHex(approveAmount),
							selectedAddress
						);
					}
				} else if (asset.type === ChainType.Bsc) {
					//Bsc to Ethereum
					const { BscBridgeController } = Engine.context;
					const { bscChainId } = this.props;
					const swapResponse = await BscBridgeController.createWithdraw(
						asset.address,
						asset.nativeCurrency ? 'ETH' : asset.symbol,
						Number(moveAmount),
						selectedAddress
					);
					util.logDebug('PPYang todoTranTransaction Bsc to Ethereum, swapResponse:', swapResponse);
					await this.prepareTransactionDate(
						asset.nativeCurrency,
						bscChainId,
						swapResponse.amount.toString(),
						asset.decimals,
						swapResponse.depositAddress,
						asset.address
					);
				} else if (asset.type === ChainType.Polygon) {
					//Polygon to Ethereum
					const { PolygonContractController } = Engine.context;
					this.startWaitingTransactionMeta();
					const result = await PolygonContractController.burnERC20(
						asset.address,
						BNToHex(toTokenMinimalUnit(moveAmount, asset.decimals)),
						selectedAddress
					);
					util.logDebug('PPYang burnERC20 result:', result);
				}
			} else if (networkSelectType === ChainType.Polygon) {
				if (asset.type === ChainType.Ethereum) {
					//Ethereum to Polygon
					const { PolygonContractController } = Engine.context;
					this.startWaitingTransactionMeta();
					if (asset.nativeCurrency) {
						const result = await PolygonContractController.depositEtherForUser(
							selectedAddress,
							BNToHex(toWei(moveAmount)),
							selectedAddress
						);
						util.logDebug('PPYang depositEtherForUser result:', result);
					} else {
						const result = await PolygonContractController.depositERC20ForUser(
							asset.address,
							selectedAddress,
							BNToHex(toTokenMinimalUnit(moveAmount, asset.decimals)),
							selectedAddress
						);
						util.logDebug('PPYang depositERC20ForUser result:', result);
					}
				}
			} else {
				throw new Error('The target network is not supported');
			}
		} catch (error) {
			if (error?.message !== 'User rejected the transaction') {
				if (networkSelectType === ChainType.Arbitrum) {
					this.setState({ error: strings('other.arbitrum_migration_fail', { error: error?.message }) });
				} else {
					this.setState({ error: renderError(error) });
				}
			}
			if (this.state.transaction?.onlyApprove) {
				this.onBack();
				return;
			}
		}
		if (this.state.transaction?.onlyApprove) {
			this.onClose();
		} else {
			this.setLoading(false);
		}
	};

	startWaitingTransactionMeta = () => {
		DeviceEventEmitter.once('MigrateTransactionMeta', meta => {
			this.transactionHandled = false;
			this.setState({ migrateTransactionMeta: meta });
			this.todoNext({
				...meta.transaction,
				onlyApprove: true,
				id: meta.id,
				gas: hexToBN(meta.transaction.gas),
				gasPrice: hexToBN(meta.transaction.gasPrice)
			});
		});
	};

	todoNext = transaction => {
		this.availableBalance(transaction);
		this.setLoading(false);
		this.setState({ transaction, moveStep: 4 });
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
		util.logDebug('PPYang prepareEthereumDate gasEstimation:', gasEstimation, transaction.chainId);
		transaction.gas = gasEstimation.gas;
		transaction.gasPrice = gasEstimation.gasPrice;
		if (gasEstimation.isEIP1559) {
			transaction.maxFeePerGas = gasEstimation.maxFeePerGas;
			transaction.maxPriorityFeePerGas = gasEstimation.maxPriorityFeePerGas;
			transaction.estimatedBaseFee = gasEstimation.estimatedBaseFee;
		}

		this.todoNext(transaction);
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
		const error = this.validateGas();
		if (error) {
			this.setState({ error: renderError(error) });
			this.setLoading(false);
			return;
		}
		AsyncStorage.getItem(VERIFICATION_DISABLED).then(result => {
			if (result) {
				this.onConfirm();
			} else {
				this.setState({ checkPassword: true });
			}
		});
	};

	onInputPwdResult = async result => {
		if (result) {
			this.onConfirm();
		} else {
			this.setLoading(false);
		}
		this.setState({ checkPassword: false });
	};

	onConfirm = async () => {
		const { transaction } = this.state;

		if (transaction.onlyApprove) {
			const result = await this.confirmApprove();
			if (!result) {
				this.setLoading(false);
			}
		} else {
			const result = await this.confirmNormal();
			if (result) {
				this.onClose();
			}
			this.setLoading(false);
		}
	};

	confirmApprove = async () => {
		const { asset } = this.props;
		const { TransactionController } = Engine.context;
		const { moveAmount, migrateTransactionMeta } = this.state;
		const transaction = this.prepareTransaction();
		try {
			const readableAmount = asset.nativeCurrency
				? toWei(moveAmount)
				: toTokenMinimalUnit(moveAmount, asset.decimals);
			const extraInfo = {
				...migrateTransactionMeta.extraInfo,
				nativeCurrency: asset.nativeCurrency,
				symbol: asset.symbol,
				contractAddress: asset.address,
				decimals: asset.decimals,
				transferTo: migrateTransactionMeta.transaction.to,
				readableAmount: BNToHex(readableAmount)
			};
			const updatedTx = { ...migrateTransactionMeta, transaction, extraInfo };

			util.logDebug('PPYang confirmApprove updatedTx:', updatedTx);
			await TransactionController.updateTransaction(updatedTx);

			Engine.context.TransactionController.hub.once(`${transaction.id}:confirmed`, async transactionMeta => {
				if (transactionMeta.status !== TransactionStatus.confirmed) {
					return;
				}
				const crossChainType = transactionMeta.extraInfo?.crossChainType;
				util.logDebug('PPYang confirmApprove crossChainType:', crossChainType);
				const { PolygonContractController, ArbContractController } = Engine.context;
				if (crossChainType === CrossChainType.depositPolygon) {
					await PolygonContractController.addDepositTxHash(
						transactionMeta.transactionHash,
						transactionMeta.chainId
					);
				} else if (crossChainType === CrossChainType.withdrawPolygon) {
					await PolygonContractController.addWithdrawTxHash(
						transactionMeta.transactionHash,
						asset.address,
						readableAmount,
						transactionMeta.chainId
					);
				} else if (crossChainType === CrossChainType.withdrawArb) {
					await ArbContractController.addWithdrawTxHash(
						transactionMeta.transactionHash,
						asset.nativeCurrency ? '0x' : asset.address,
						readableAmount,
						transactionMeta.chainId
					);
				}
			});

			await TransactionController.approveTransaction(transaction.id);
			this.transactionHandled = true;
			return true;
		} catch (error) {
			this.setState({ error: renderError(error) });
		}
		return false;
	};

	confirmNormal = async () => {
		const { asset } = this.props;
		const { networkSelectType } = this.state;
		const { TransactionController } = Engine.context;
		try {
			const prepareTransaction = this.prepareTransaction();

			let crossChainType, crossChainDone;
			if (networkSelectType === ChainType.Bsc && asset.type === ChainType.Ethereum) {
				crossChainType = CrossChainType.depositBsc;
				crossChainDone = false;
			} else if (networkSelectType === ChainType.Ethereum && asset.type === ChainType.Bsc) {
				crossChainType = CrossChainType.withdrawBsc;
				crossChainDone = false;
			}
			const extraInfo = {
				nativeCurrency: asset.nativeCurrency,
				symbol: asset.symbol,
				contractAddress: asset.address,
				decimals: asset.decimals,
				transferTo: prepareTransaction.to,
				readableAmount: prepareTransaction.readableAmount,
				crossChainType,
				crossChainDone
			};

			const transaction = { ...prepareTransaction, extraInfo };
			delete transaction.readableAmount;

			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);

			Engine.context.TransactionController.hub.once(`${transactionMeta.id}:confirmed`, transactionMeta => {
				if (transactionMeta.status !== TransactionStatus.confirmed) {
					return;
				}
				util.logDebug('PPYang confirmNormal crossChainType:', transactionMeta.extraInfo?.crossChainType);
				if (
					transactionMeta.extraInfo?.crossChainType === CrossChainType.withdrawBsc ||
					transactionMeta.extraInfo?.crossChainType === CrossChainType.depositBsc
				) {
					const { BscBridgeController } = Engine.context;
					BscBridgeController.addDepositId(transactionMeta.transactionHash, transactionMeta.transaction.from);
				}
			});

			await TransactionController.approveTransaction(transactionMeta.id);

			await new Promise(resolve => resolve(result));

			if (transactionMeta.error) {
				throw transactionMeta.error;
			}
			return true;
		} catch (error) {
			this.setState({ error: renderError(error) });
		}
		return false;
	};

	clearState = () => {
		this.curTransactionId = 0;
		this.cancelTransactionIfNeed();
		this.transactionHandled = false;
		DeviceEventEmitter.removeAllListeners('OnApprove');
		DeviceEventEmitter.removeAllListeners('MigrateTransactionMeta');
		this.setLoading(false);
	};

	onClose = () => {
		DeviceEventEmitter.removeAllListeners('OnApprove');
		DeviceEventEmitter.removeAllListeners('MigrateTransactionMeta');
		this.setLoading(false);
		this.props.onClose && this.props.onClose();
	};

	onBack = () => {
		this.closeInput();
		this.clearState();
		this.setState({
			transaction: {},
			estimatedTotalGas: undefined,
			moveStep: 2
		});
	};

	onGasChange = (gasPriceBNWei, maxPriorityFeePerGasBN, maxFeePerGasBN, estimatedBaseFeeBN, limitGas) => {
		const { transaction } = this.state;
		transaction.gasPrice = gasPriceBNWei;
		transaction.maxPriorityFeePerGas = maxPriorityFeePerGasBN;
		transaction.maxFeePerGas = maxFeePerGasBN;
		transaction.estimatedBaseFee = estimatedBaseFeeBN;
		transaction.gas = limitGas;
		this.setState({ transaction });
	};

	validateGas = () => {
		const {
			asset,
			bscContractBalances,
			contractBalances,
			arbContractBalances,
			opContractBalances,
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
			this.setState({ errorMessage });
		}
		return errorMessage;
	};

	availableBalance = transaction => {
		const {
			asset,
			contractBalances,
			bscContractBalances,
			arbContractBalances,
			opContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
		} = this.props;
		const { value } = transaction;
		const valueBN = hexToBN(value);
		const balanceBN = getNativeCurrencyBalance(asset.type, {
			contractBalances,
			arbContractBalances,
			opContractBalances,
			polygonContractBalances,
			bscContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
		});
		this.setState({ availableBalance: renderFromWei(balanceBN.sub(valueBN)) });
	};

	onNetworkSelect = type => {
		const { moveStep, supportCBridgeType } = this.state;
		if (moveStep === 1 || moveStep === 2) {
			let tempMoveStep = moveStep;
			if (supportCBridgeType.includes(type)) {
				tempMoveStep = 1;
			} else {
				tempMoveStep = 2;
			}
			this.closeInput();
			this.setState({ networkSelectType: type, moveStep: tempMoveStep });
		}
	};

	getSupportNetworks = async asset => {
		const { type, address } = asset;
		if (type === ChainType.Bsc) {
			return [{ type: ChainType.Ethereum, name: strings('other.ethereum') }];
		} else if (type === ChainType.Arbitrum) {
			return [{ type: ChainType.Ethereum, name: strings('other.ethereum') }];
		} else if (type === ChainType.Polygon) {
			return [{ type: ChainType.Ethereum, name: strings('other.ethereum') }];
		} else if (type === ChainType.Heco) {
			return [{ type: ChainType.Ethereum, name: strings('other.ethereum') }];
		} else if (type === ChainType.Ethereum) {
			const supportNetworks = [{ type: ChainType.Arbitrum, name: strings('other.arbitrum') }];
			let supportPolygon;
			if (asset.nativeCurrency) {
				supportPolygon = true;
			} else {
				const lowerAddress = address?.toLowerCase();
				const { PolygonContractController, PolygonNetworkController } = Engine.context;
				supportPolygon = !!(await PolygonContractController.toPolygonAddress(lowerAddress));
				if (!supportPolygon) {
					const { MaticToken } = await PolygonNetworkController.polygonNetworkConfig(
						PolygonNetworkController.state.provider.chainId
					);
					supportPolygon = MaticToken?.toLowerCase() === lowerAddress;
				}
			}

			if (supportPolygon) {
				supportNetworks.push({ type: ChainType.Polygon, name: strings('other.polygon') });
			}
			return supportNetworks;
		}
		return [];
	};

	renderNetworks = () => {
		const { supportNetworks, networkSelectType, moveStep } = this.state;
		if (moveStep > 2) {
			return (
				<View style={[styles.networkBg, styles.networkSelectBg]}>
					<Text style={[styles.networkLabel, styles.networkSelectLabel]}>
						{getChainTypeName(networkSelectType)}
					</Text>
				</View>
			);
		}
		return supportNetworks.map((net, i) => (
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

	onTextInputLayout = event => {
		this.setState({ inputTextWidth: event.nativeEvent.layout.width });
	};

	onAmountChange = (inputValue, useMax) => {
		const { asset } = this.props;
		inputValue = revertAmount(inputValue, asset.decimals);
		const amountFormat = renderAmount(inputValue);
		this.onInputChange(inputValue, useMax, false);
		this.setState({ moveAmountFormat: amountFormat, moveAmount: inputValue });
	};

	onDollarInputChange = (inputValue, selectedAsset, useMax) => {
		inputValue = revertAmount(inputValue);
		this.onInputChange(inputValue, false, true);
	};

	onInputChange = (inputValue, useMax, isDollar) => {
		const { currencyCodeRate } = this.props;
		const { asset } = this.props;
		let inputValueConversion, renderableInputValueConversion, comma;
		const processedInputValue = isDecimal(inputValue) ? handleWeiNumber(inputValue) : '0';
		if (asset.nativeCurrency) {
			const cRate = this.getRate();
			if (!isDollar) {
				inputValueConversion = `${weiToFiatNumberStr(toWei(processedInputValue), cRate * currencyCodeRate)}`;
				renderableInputValueConversion = `${inputValue} ${asset.symbol}`;
			} else {
				inputValueConversion = `${renderFromWei(
					fiatNumberToWei(processedInputValue, cRate * currencyCodeRate)
				)}`;
				renderableInputValueConversion = `${inputValueConversion} ${asset.symbol}`;
			}
		} else {
			const exchangeRate = this.getTokenRate();
			if (!isDollar) {
				inputValueConversion = `${balanceToFiatNumberStr(processedInputValue, currencyCodeRate, exchangeRate)}`;
				renderableInputValueConversion = `${inputValue} ${asset.symbol}`;
			} else {
				inputValueConversion = `${renderFromTokenMinimalUnit(
					fiatNumberToTokenMinimalUnit(processedInputValue, currencyCodeRate, exchangeRate, asset.decimals),
					asset.decimals
				)}`;
				renderableInputValueConversion = `${inputValueConversion} ${asset.symbol}`;
			}
		}
		if (comma) inputValue = inputValue && inputValue.replace('.', ',');
		inputValueConversion = inputValueConversion === '0' ? undefined : inputValueConversion;
		if (isDollar) {
			const tempInputValue = inputValue;
			inputValue = inputValueConversion;
			inputValueConversion = tempInputValue;

			this.setState({ moveAmountFormat: renderAmount(inputValue) });
		}
		inputValueConversion = renderAmount(inputValueConversion);
		this.setState(
			{
				inputValue,
				inputValueConversion,
				renderableInputValueConversion,
				amountError: undefined
			},
			async () => {
				const nextEnabled = this.validateAmount(inputValue) === undefined;
				this.setState({ nextEnabled });
			}
		);
	};

	useMax = async () => {
		const {
			contractBalances,
			asset,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances
		} = this.props;

		this.closeInput();

		let estimatedTotalGas;
		if (asset.nativeCurrency) {
			this.setState({ loadEstimatedTotalGasMax: true });
			estimatedTotalGas = await this.getEstimatedTotalGas(true);
			this.setState({ loadEstimatedTotalGasMax: false });
		} else {
			estimatedTotalGas = 0;
		}

		let input;
		if (asset.nativeCurrency) {
			const balance = getNativeCurrencyBalance(asset.type, {
				contractBalances,
				bscContractBalances,
				arbContractBalances,
				opContractBalances,
				polygonContractBalances,
				hecoContractBalances,
				avaxContractBalances,
				rpcContractBalances
			});
			let weiBalance = balance;
			if (asset.type === ChainType.Arbitrum) {
				weiBalance = weiBalance.sub(toWei('0.00002'));
			}
			const realMaxValue = weiBalance.sub(estimatedTotalGas);
			const maxValue = weiBalance.isZero() || realMaxValue.isNeg() ? new BN(0) : realMaxValue;
			input = fromWei(maxValue);
		} else {
			const weiBalance = getTokenBalance(asset, {
				contractBalances,
				bscContractBalances,
				arbContractBalances,
				opContractBalances,
				polygonContractBalances,
				hecoContractBalances
			});
			input = getFromTokenMinimalUnit(weiBalance, asset.decimals);
		}
		this.onAmountChange(input, true);
	};

	renderTokenInput = () => {
		const { asset } = this.props;
		const { moveAmountFormat, inputTextWidth, loadEstimatedTotalGasMax } = this.state;

		return (
			<View style={styles.valueInput}>
				<TokenImage asset={asset} containerStyle={styles.inputTokenLogo} iconStyle={styles.inputIconStyle} />
				<TextInput
					style={[styles.inputAmount, inputTextWidth && { width: inputTextWidth }]}
					ref={this.amountInput}
					value={moveAmountFormat}
					onLayout={this.onTextInputLayout}
					onChangeText={this.onAmountChange}
					keyboardType={'numeric'}
					placeholder={'0.0'}
					placeholderTextColor={inputBorderColor}
				/>

				<TouchableOpacity style={styles.btnMax} onPress={this.useMax} activeOpacity={activeOpacity}>
					{loadEstimatedTotalGasMax ? (
						<ActivityIndicator size="small" color={maxColor} />
					) : (
						<Text style={styles.maxText}>{strings('other.max')}</Text>
					)}
				</TouchableOpacity>
			</View>
		);
	};

	getRate = () => {
		const {
			ethPrice,
			bnbPrice,
			polygonPrice,
			hecoPrice,
			avaxPrice,
			asset: { type }
		} = this.props;

		let price;
		if (type === ChainType.Arbitrum) {
			price = ethPrice.usd;
		} else if (type === ChainType.Bsc) {
			price = bnbPrice.usd;
		} else if (type === ChainType.Polygon) {
			price = polygonPrice.usd;
		} else if (type === ChainType.Heco) {
			price = hecoPrice.usd;
		} else if (type === ChainType.Avax) {
			price = avaxPrice.usd;
		} else if (util.isRpcChainType(type)) {
			price = 0;
		} else {
			price = ethPrice.usd;
		}

		return price;
	};

	getTokenRate = () => {
		const {
			asset,
			contractExchangeRates,
			arbContractExchangeRates,
			bscContractExchangeRates,
			polygonContractExchangeRates,
			hecoContractExchangeRates,
			opContractExchangeRates,
			avaxContractExchangeRates,
			contractBalances,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances,
			ethPrice,
			bnbPrice,
			polygonPrice,
			avaxPrice,
			hecoPrice,
			currencyCode,
			currencyCodeRate
		} = this.props;
		const { priceUsd: price } = calcAssetPrices(asset, {
			contractBalances,
			contractExchangeRates,
			arbContractExchangeRates,
			bscContractExchangeRates,
			polygonContractExchangeRates,
			hecoContractExchangeRates,
			opContractExchangeRates,
			avaxContractExchangeRates,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances,
			ethPrice,
			bnbPrice,
			polygonPrice,
			avaxPrice,
			hecoPrice,
			currencyCode,
			currencyCodeRate
		});
		return price;
	};

	renderDollarInput = () => {
		const { inputValueConversion } = this.state;
		const { asset, currencyCode } = this.props;
		let exchangeRate;
		if (asset.nativeCurrency) {
			exchangeRate = this.getRate();
		} else {
			exchangeRate = this.getTokenRate();
		}

		const canInputDollar = exchangeRate !== undefined && exchangeRate !== 0;
		return (
			<View style={styles.dollarInput}>
				<Image style={styles.coinIcon} source={CURRENCIES[currencyCode].icon} />
				<TextInput
					style={styles.inputAmount}
					ref={this.dollarInput}
					value={inputValueConversion}
					onChangeText={this.onDollarInputChange}
					keyboardType={'numeric'}
					placeholder={'0.0'}
					editable={canInputDollar}
					placeholderTextColor={inputBorderColor}
				/>
				<Text style={styles.currencyText}>{currencyCode}</Text>
			</View>
		);
	};

	renderNormalInput = () => {
		const { loading, nextEnabled, networkSelectType, claimEthereumGas } = this.state;
		const { asset, onClose, mainBalance } = this.props;
		const showTips = networkSelectType === ChainType.Ethereum && (asset.type === ChainType.Bsc || claimEthereumGas);
		return (
			<>
				<View style={styles.amountWrapper}>
					<View style={styles.amountTitle}>
						<Text style={styles.amountText}>{strings('other.amount')}</Text>
						<Text style={styles.amountAvailable}>
							{strings('other.amount_available', { amount: renderAmount(mainBalance) })}
						</Text>
					</View>
					{this.renderTokenInput()}
					<Text style={styles.approxi}>≈</Text>
					{this.renderDollarInput()}
				</View>
				<View style={baseStyles.flexGrow} />
				{showTips && (
					<Text style={styles.migrateEthereumTips}>
						{asset.type === ChainType.Bsc
							? strings('other.migrate_bsc_tips')
							: asset.type === ChainType.Arbitrum
							? strings('other.migrate_arbitrum_tips', {
									network: getChainTypeName(asset.type),
									amount: claimEthereumGas
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  })
							: strings('other.migrate_polygon_tips', {
									network: getChainTypeName(asset.type),
									amount: claimEthereumGas
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  })}
					</Text>
				)}
				<View style={styles.actionRow}>
					<TouchableOpacity
						style={styles.cancelButton}
						onPress={onClose && onClose}
						activeOpacity={activeOpacity}
						disabled={loading}
					>
						<Text style={styles.cancelButtonText}>{strings('other.cancel')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.nextButton, nextEnabled && styles.nextButtonEnabled]}
						onPress={this.onNextClick}
						activeOpacity={activeOpacity}
						disabled={loading || !nextEnabled || !networkSelectType}
					>
						{loading ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Text style={[styles.nextButtonText, nextEnabled && styles.nextButtonTextEnable]}>
								{strings('other.next')}
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</>
		);
	};

	todoCBridge = () => {
		const { asset } = this.props;
		const { networkSelectType } = this.state;
		const sourceChainId = getChainIdByType(asset.type);
		const destinationChainId = getChainIdByType(networkSelectType);
		const newTabUrl =
			'https://cbridge.celer.network//#/transfer?sourceChainId=' +
			`${sourceChainId}` +
			'&&destinationChainId=' +
			`${destinationChainId}` +
			'&&tokenSymbol=' +
			`${asset.symbol}`;
		const chainType = this.props.asset.type;
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl,
			chainType,
			reloadOnce: true
		});
		this.onClose();
	};

	todoNatvieBridge = () => {
		this.setState({ moveStep: 2 });
	};

	renderBridge = () => {
		const { asset } = this.props;
		const { networkSelectType } = this.state;
		const showArbBrige = asset.type === ChainType.Arbitrum && networkSelectType === ChainType.Ethereum;
		const isZh = strings('other.accept_language') === 'zh';
		const width = Device.getDeviceWidth() - 76;
		const height = (width * 80) / 299;
		return (
			<View style={styles.bridgeWrapper}>
				<TouchableOpacity onPress={this.todoCBridge} activeOpacity={activeOpacity}>
					<Image
						style={[styles.bridgeImage, { width, height }]}
						source={cBridgeImage}
						resizeMode={'stretch'}
					/>
				</TouchableOpacity>
				<Text style={styles.bridgeText}>
					{strings(showArbBrige ? 'other.cbridge_period_limit' : 'other.no_official_bridge')}
				</Text>
				{showArbBrige && (
					<>
						<TouchableOpacity onPress={this.todoNatvieBridge} activeOpacity={activeOpacity}>
							<Image
								style={[styles.bridgeImage, { width, height }]}
								source={isZh ? arbBridgeCnImage : arbBridgeImage}
								resizeMode={'stretch'}
							/>
						</TouchableOpacity>
						<Text style={styles.bridgeText}>{strings('other.arb_bridge_withdraw_limit')}</Text>
					</>
				)}
				<View style={baseStyles.flexGrow} />
			</View>
		);
	};

	toApprove = () => {
		this.setLoading(false);
		this.setState({ moveStep: 3 });
	};

	doApprove = async () => {
		this.waitApprove();
		const result = await this.approveMaxERC20ForDeposit();
		if (!result) {
			this.setLoading(false);
		}
	};

	onApproveClick = () => {
		this.props.onLoading(false);
		this.setState({ loading: true });
		this.doApprove();
	};

	renderApprove = () => {
		const { asset } = this.props;
		const { loading } = this.state;
		return (
			<>
				{loading ? (
					<>
						<View style={styles.approveWrapper}>
							<LottieView
								style={styles.approveAnimation}
								autoPlay
								loop
								source={require('../../../../animations/tokens_loading.json')}
							/>
						</View>
						<Text style={styles.approveText}>
							{strings('other.approving_wait', {
								token: asset.symbol,
								network: getChainTypeName(asset.type)
							})}
						</Text>
					</>
				) : (
					<>
						<Image style={styles.approveImage} source={approveImage} />
						<Text style={styles.approveText2}>
							{strings('other.approve_token', {
								token: asset.symbol,
								network: getChainTypeName(asset.type)
							})}
						</Text>
					</>
				)}
				<View style={baseStyles.flexGrow} />
				<View style={styles.actionRow}>
					<TouchableOpacity
						style={styles.cancelButton}
						onPress={loading ? this.onClose : this.onBack}
						activeOpacity={activeOpacity}
					>
						<Text style={styles.cancelButtonText}>
							{strings(loading ? 'other.check_later' : 'navigation.back')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.nextButton, !loading && styles.nextButtonEnabled]}
						onPress={this.onApproveClick}
						activeOpacity={activeOpacity}
						disabled={loading}
					>
						<Text style={[styles.nextButtonText, !loading && styles.nextButtonTextEnable]}>
							{strings('spend_limit_edition.approve')}
						</Text>
					</TouchableOpacity>
				</View>
			</>
		);
	};

	renderConfirmView = () => {
		const {
			moveAmountFormat,
			transaction,
			loading,
			networkSelectType,
			availableBalance,
			claimEthereumGas
		} = this.state;
		const {
			asset: { symbol, type }
		} = this.props;
		const showTips = networkSelectType === ChainType.Ethereum && (type === ChainType.Bsc || claimEthereumGas);
		return (
			<View style={styles.wrapper}>
				<View style={styles.rowWrapper}>
					<Text style={styles.amountText}>{strings('other.asset')}</Text>
					<Text style={styles.rightText}>{symbol}</Text>
				</View>

				<View style={styles.rowWrapper}>
					<Text style={styles.amountText}>{strings('other.amount')}</Text>
					<Text style={styles.rightText}>{moveAmountFormat}</Text>
				</View>

				<View style={styles.rowWrapper}>
					<Text style={styles.amountText}>{strings('other.to_network')}</Text>
					<Text style={styles.rightText}>{getChainTypeName(networkSelectType)}</Text>
				</View>

				<Image style={styles.rowShadow} source={imgShadow} />

				<View style={styles.rowFee}>
					<NetworkFee
						ref={this.networkFee}
						transaction={transaction}
						type={type}
						onChange={this.onGasChange}
						gasInputRef={this.gasInputRef}
						gasPriceInputRef={this.gasPriceInputRef}
					/>
				</View>

				<Text style={styles.noteView}>
					{strings('other.gas_paid', {
						symbol: getCurrency(type),
						network: getChainTypeName(type),
						amount: availableBalance
					})}
				</Text>
				<View style={baseStyles.flexGrow} />
				{showTips && (
					<Text style={styles.migrateEthereumTips}>
						{type === ChainType.Bsc
							? strings('other.migrate_bsc_tips')
							: type === ChainType.Arbitrum
							? strings('other.migrate_arbitrum_tips', {
									network: getChainTypeName(type),
									amount: claimEthereumGas
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  })
							: strings('other.migrate_polygon_tips', {
									network: getChainTypeName(type),
									amount: claimEthereumGas
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  })}
					</Text>
				)}
				<View style={styles.actionRow}>
					<TouchableOpacity
						onPress={this.onBack}
						activeOpacity={activeOpacity}
						style={styles.cancelButton}
						disabled={loading}
					>
						<Text style={styles.cancelButtonText}>{strings('navigation.back')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.nextButton, styles.nextButtonEnabled]}
						onPress={this.onConfirmClick}
						activeOpacity={activeOpacity}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Text style={styles.btnNextText}>{strings('action_view.confirm')}</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	renderView = () => {
		const { moveStep, error, checkPassword } = this.state;
		return (
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={dismissKeyboard}
			>
				<TouchableOpacity activeOpacity={1} style={styles.scrollViewContent} onPress={dismissKeyboard}>
					<View style={styles.labelWrapper}>
						<Image style={styles.labelIcon} source={iconMigrateActive} />
						<Text style={styles.labelText}>{strings('other.migration')}</Text>
					</View>
					<Text style={styles.migrateTip}>{strings('other.migrate_other_network')}</Text>
					{moveStep !== 4 ? (
						<View style={styles.wrapper}>
							<Text style={styles.headerText}>{strings('other.to_network')}</Text>
							<ScrollView
								style={styles.networksScroll}
								contentContainerStyle={styles.networks}
								horizontal
								showsHorizontalScrollIndicator={false}
							>
								{this.renderNetworks()}
							</ScrollView>
							{moveStep === 1 && this.renderBridge()}
							{moveStep === 2 && this.renderNormalInput()}
							{moveStep === 3 && this.renderApprove()}
						</View>
					) : (
						this.renderConfirmView()
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

	render = () =>
		Device.isIos() ? (
			<KeyboardAvoidingView style={styles.moveWrapper} behavior={'padding'}>
				{this.renderView()}
			</KeyboardAvoidingView>
		) : (
			<View style={styles.moveWrapper}>{this.renderView()}</View>
		);
}

const mapStateToProps = state => ({
	bscContractBalances:
		state.engine.backgroundState.TokenBalancesController.bscContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	polygonContractBalances:
		state.engine.backgroundState.TokenBalancesController.polygonContractBalances[
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
	contractBalances:
		state.engine.backgroundState.TokenBalancesController.contractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	arbChainId: state.engine.backgroundState.ArbNetworkController.provider.chainId,
	bscChainId: state.engine.backgroundState.BscNetworkController.provider.chainId,
	polygonChainId: state.engine.backgroundState.PolygonNetworkController.provider.chainId,
	hecoChainId: state.engine.backgroundState.HecoNetworkController.provider.chainId,
	avaxChainId: state.engine.backgroundState.AvaxNetworkController.provider.chainId,
	ethPrice: state.engine.backgroundState.TokenRatesController.ethPrice,
	bnbPrice: state.engine.backgroundState.TokenRatesController.bnbPrice,
	polygonPrice: state.engine.backgroundState.TokenRatesController.polygonPrice,
	hecoPrice: state.engine.backgroundState.TokenRatesController.hecoPrice,
	avaxPrice: state.engine.backgroundState.TokenRatesController.avaxPrice,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	arbContractExchangeRates: state.engine.backgroundState.TokenRatesController.arbContractExchangeRates,
	bscContractExchangeRates: state.engine.backgroundState.TokenRatesController.bscContractExchangeRates,
	polygonContractExchangeRates: state.engine.backgroundState.TokenRatesController.polygonContractExchangeRates,
	hecoContractExchangeRates: state.engine.backgroundState.TokenRatesController.hecoContractExchangeRates,
	opContractExchangeRates: state.engine.backgroundState.TokenRatesController.opContractExchangeRates,
	avaxContractExchangeRates: state.engine.backgroundState.TokenRatesController.avaxContractExchangeRates,
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	currencyCodeRate: state.engine.backgroundState.TokenRatesController.currencyCodeRate
});

const mapDispatchToProps = dispatch => ({
	setRecipient: (from, to, ensRecipient, transactionToName, transactionFromName) =>
		dispatch(setRecipient(from, to, ensRecipient, transactionToName, transactionFromName)),
	addApproveInfo: info => dispatch(addApproveInfo(info)),
	removeApproveInfo: metaID => dispatch(removeApproveInfo(metaID))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(MoveTab);
