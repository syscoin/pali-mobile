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
import { ChainType, CrossChainType, TransactionStatus, util, BN } from 'paliwallet-core';

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
	getTickerByType,
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
import { getSuggestedGasEstimatesAndId, getBasicGasEstimates } from '../../../../util/custom-gas';
import { renderError } from '../../../../util/error';
import iconMigrateActive from '../../../../images/ic_migrate_white.png';
import Device from '../../../../util/Device';
import { generateTransferData } from '../../../../util/transactions';
import { CURRENCIES } from '../../../../util/currencies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVAILABLE_ARB, VERIFICATION_DISABLED } from '../../../../constants/storage';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import LottieView from 'lottie-react-native';

import rolluxBridgeImage from '../../../../images/img_rollux_bridge.png';
import cBridgeImage from '../../../../images/img_bridge_cbridge.png';
import lifiBridgeImage from '../../../../images/img_bridge_lifi.png';

import arbBridgeImage from '../../../../images/img_bridge_arb.png';
import arbBridgeCnImage from '../../../../images/img_bridge_arb_cn.png';
import approveImage from '../../../../images/img_approve_bridge.png';
import { addApproveInfo, removeApproveInfo } from '../../../../actions/settings';
import { store } from '../../../../store';
import CheckPassword from '../../../UI/CheckPassword';
import { getSupportMigration, isSupportCBridge } from './Bridge';
import { getEstimatedTotalGas } from '../../../../util/Amount';
import { getChainTypeName } from '../../../../util/ChainTypeImages';
import { ThemeContext } from '../../../../theme/ThemeProvider';

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
	moveWrapper: {
		maxHeight: '88%',
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
		fontSize: 26,
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
		backgroundColor: colors.brandPink300
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
		borderRadius: 100,
		backgroundColor: colors.$E6E6E6,
		alignItems: 'center',
		justifyContent: 'center'
	},
	nextButtonEnabled: {
		backgroundColor: colors.brandPink300
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
		marginTop: 24,
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
	static contextType = ThemeContext;
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		asset: PropTypes.object,
		onClose: PropTypes.func,
		allContractBalances: PropTypes.object,
		allCurrencyPrice: PropTypes.object,
		allContractExchangeRates: PropTypes.object,
		selectedAddress: PropTypes.string,
		mainBalance: PropTypes.string,
		onLoading: PropTypes.func,
		currencyCode: PropTypes.string,
		currencyCodeRate: PropTypes.number,
		supportNativeBridge: PropTypes.bool,
		supportBridge: PropTypes.bool,
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
		supportBridgeType: [],
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
		const { asset, allContractBalances } = this.props;
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
					allContractBalances
				});
				value = getFromTokenMinimalUnit(weiBalance, asset.decimals);
			}
			this.onAmountChange(value);
		}
		this.loadNetworkType(approveSelectType);
		this.loadClaimEthereumGas();
		this.props.onLoading(false);
	}

	loadClaimEthereumGas = async () => {
		const { currencyCodeRate, allCurrencyPrice, currencyCode } = this.props;
		const { gasPrice } = await getBasicGasEstimates({
			from: this.props.selectedAddress,
			to: this.props.selectedAddress,
			chainId: Engine.networks[ChainType.Ethereum].state.provider.chainId
		});
		const balance = renderFromWei(new BN(250000).mul(gasPrice).toString(10));
		const fiatNumber = balanceToFiatNumber(balance, currencyCodeRate, allCurrencyPrice[ChainType.Ethereum].usd);
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

		let supportBridgeType = [];
		if (this.props.supportBridge) {
			supportBridgeType.push(...getSupportMigration(this.props.asset));
		}
		if (this.props.asset.type === ChainType.Ethereum || this.props.asset.type === ChainType.Arbitrum) {
			const type = this.props.asset.type === ChainType.Ethereum ? ChainType.Arbitrum : ChainType.Ethereum;
			if (!supportBridgeType.includes(type)) {
				supportBridgeType.push(type);
			}
		}
		subNetworks = this.combineSupportNetworks(subNetworks, supportBridgeType);
		let moveStep = this.state.moveStep;
		let networkSelectType = subNetworks[0].type;
		if (defaultType) {
			networkSelectType = defaultType;
			moveStep = 2;
		} else if (supportBridgeType.includes(networkSelectType)) {
			moveStep = 1;
		}

		this.setState({
			supportNetworks: subNetworks,
			networkSelectType,
			supportNativeType,
			supportBridgeType,
			moveStep
		});
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
			const { selectedAddress, asset } = this.props;
			const estimatedTotalGas = await getEstimatedTotalGas({ selectedAddress, asset });
			this.setState({ estimatedTotalGas });
			return estimatedTotalGas;
		}
		return this.state.estimatedTotalGas;
	};

	renderLogo = () => {
		const { asset } = this.props;
		return <TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />;
	};

	validateAmount = moveAmount => {
		const { allContractBalances, asset } = this.props;
		const { estimatedTotalGas } = this.state;
		let weiBalance, weiInput, amountError;
		if (isDecimal(moveAmount) && !isZero(moveAmount)) {
			if (asset.nativeCurrency) {
				weiBalance = getNativeCurrencyBalance(asset.type, {
					allContractBalances
				});
				weiInput = toWei(moveAmount);
				if (estimatedTotalGas) {
					weiInput = weiInput.add(estimatedTotalGas);
				}
			} else {
				weiBalance = getTokenBalance(asset, {
					allContractBalances
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
			const approved = await Engine.contracts[ChainType.Arbitrum].approved(asset.address);
			return hexToBN(approved);
		} else if (networkSelectType === ChainType.Polygon) {
			const approved = await Engine.contracts[ChainType.Polygon].approved(asset.address);
			return hexToBN(approved);
		}
		return hexToBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
	};

	approveMaxERC20ForDeposit = async () => {
		const { networkSelectType } = this.state;
		const { asset } = this.props;
		if (networkSelectType === ChainType.Arbitrum) {
			return await Engine.contracts[ChainType.Arbitrum].approve(
				asset.address,
				'0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
				TransactionTypes.ORIGIN_MOVE_TO_L2
			);
		} else if (networkSelectType === ChainType.Polygon) {
			return await Engine.contracts[ChainType.Polygon].approve(
				asset.address,
				'0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
				TransactionTypes.ORIGIN_MOVE_TO_L2
			);
		}
	};

	waitApprove = () => {
		const { TransactionController } = Engine.context;

		this.onApproveFunc = approveId => {
			this.approveMetaId = approveId;
			this.onApproveConfirmedListener = this.onApproveConfirmed.bind(this);

			TransactionController.hub.once(`${approveId}:confirmed`, this.onApproveConfirmedListener);

			// Remove the OnApprove listener since it has been triggered
			if (this.onApproveSubscription) {
				this.onApproveSubscription.remove();
			}
		};

		// Listen for the OnApprove event
		this.onApproveSubscription = DeviceEventEmitter.addListener('OnApprove', this.onApproveFunc);
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
			//TODO: update api url to Pali ones
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
		const { asset } = this.props;
		if (networkSelectType === ChainType.Arbitrum) {
			const arbChainId = Engine.networks[ChainType.Arbitrum].state.provider.chainId;
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
			if (networkSelectType === ChainType.Arbitrum) {
				if (asset.type === ChainType.Ethereum) {
					//l1  to l2
					const ArbContract = Engine.contracts[ChainType.Arbitrum];
					this.startWaitingTransactionMeta();
					if (asset.nativeCurrency) {
						await ArbContract.depositETH(BNToHex(toWei(moveAmount)));
					} else {
						const approveAmount = toTokenMinimalUnit(moveAmount, asset.decimals);
						await ArbContract.deposit(asset.address, BNToHex(approveAmount));
					}
				}
			} else if (networkSelectType === ChainType.Ethereum) {
				if (asset.type === ChainType.Arbitrum) {
					//l2 to l1
					const ArbContract = Engine.contracts[ChainType.Arbitrum];
					this.startWaitingTransactionMeta();
					if (asset.nativeCurrency) {
						await ArbContract.withdrawETH(BNToHex(toWei(moveAmount)), selectedAddress);
					} else {
						const approveAmount = toTokenMinimalUnit(moveAmount, asset.decimals);
						await ArbContract.withdrawERC20(asset.l1Address, BNToHex(approveAmount), selectedAddress);
					}
				} else if (asset.type === ChainType.Polygon) {
					//Polygon to Ethereum
					const PolygonContract = Engine.contracts[ChainType.Polygon];
					this.startWaitingTransactionMeta();
					const result = await PolygonContract.burnERC20(
						asset.address,
						BNToHex(toTokenMinimalUnit(moveAmount, asset.decimals)),
						selectedAddress
					);
					util.logDebug('PPYang burnERC20 result:', result);
				}
			} else if (networkSelectType === ChainType.Polygon) {
				if (asset.type === ChainType.Ethereum) {
					//Ethereum to Polygon
					const PolygonContract = Engine.contracts[ChainType.Polygon];
					this.startWaitingTransactionMeta();
					if (asset.nativeCurrency) {
						const result = await PolygonContract.depositEtherForUser(
							selectedAddress,
							BNToHex(toWei(moveAmount)),
							selectedAddress
						);
						util.logDebug('PPYang depositEtherForUser result:', result);
					} else {
						const result = await PolygonContract.depositERC20ForUser(
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
		this.onMigrateTransactionMeta = meta => {
			this.transactionHandled = false;
			this.setState({ migrateTransactionMeta: meta });
			this.todoNext({
				...meta.transaction,
				onlyApprove: true,
				id: meta.id,
				gas: hexToBN(meta.transaction.gas),
				gasPrice: hexToBN(meta.transaction.gasPrice)
			});

			// Remove the listener since it has been triggered
			if (this.migrateTransactionMetaSubscription) {
				this.migrateTransactionMetaSubscription.remove();
			}
		};

		// Listen for the MigrateTransactionMeta event
		this.migrateTransactionMetaSubscription = DeviceEventEmitter.addListener(
			'MigrateTransactionMeta',
			this.onMigrateTransactionMeta
		);
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
				const PolygonContract = Engine.contracts[ChainType.Polygon];
				const ArbContract = Engine.contracts[ChainType.Arbitrum];
				if (crossChainType === CrossChainType.depositPolygon) {
					await PolygonContract.addDepositTxHash(transactionMeta.transactionHash, transactionMeta.chainId);
				} else if (crossChainType === CrossChainType.withdrawPolygon) {
					await PolygonContract.addWithdrawTxHash(
						transactionMeta.transactionHash,
						asset.address,
						readableAmount,
						transactionMeta.chainId
					);
				} else if (crossChainType === CrossChainType.withdrawArb) {
					await ArbContract.addWithdrawTxHash(
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
		const { TransactionController } = Engine.context;
		try {
			const prepareTransaction = this.prepareTransaction();

			const extraInfo = {
				nativeCurrency: asset.nativeCurrency,
				symbol: asset.symbol,
				contractAddress: asset.address,
				decimals: asset.decimals,
				transferTo: prepareTransaction.to,
				readableAmount: prepareTransaction.readableAmount
			};

			const transaction = { ...prepareTransaction, extraInfo };
			delete transaction.readableAmount;

			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);

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
			this.setState({ errorMessage });
		}
		return errorMessage;
	};

	availableBalance = transaction => {
		const { asset, allContractBalances } = this.props;
		const { value } = transaction;
		const valueBN = hexToBN(value);
		const balanceBN = getNativeCurrencyBalance(asset.type, {
			allContractBalances
		});
		this.setState({ availableBalance: renderFromWei(balanceBN.sub(valueBN)) });
	};

	onNetworkSelect = type => {
		const { moveStep, supportBridgeType } = this.state;
		if (moveStep === 1 || moveStep === 2) {
			let tempMoveStep = moveStep;
			if (supportBridgeType.includes(type)) {
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
		if (type === ChainType.Polygon) {
			return [{ type: ChainType.Ethereum, name: getChainTypeName(ChainType.Ethereum) }];
		} else if (type === ChainType.Ethereum) {
			const supportNetworks = [];
			let supportPolygon;
			if (asset.nativeCurrency) {
				supportPolygon = true;
			} else {
				const lowerAddress = address?.toLowerCase();
				supportPolygon = !!(await Engine.contracts[ChainType.Polygon].toPolygonAddress(lowerAddress));
				if (!supportPolygon) {
					const polygonNetwork = Engine.networks[ChainType.Polygon];
					const { MaticToken } = await polygonNetwork.getNetworkConfig(polygonNetwork.state.provider.chainId);
					supportPolygon = MaticToken?.toLowerCase() === lowerAddress;
				}
			}

			if (supportPolygon) {
				supportNetworks.push({ type: ChainType.Polygon, name: getChainTypeName(ChainType.Polygon) });
			}
			return supportNetworks;
		}
		return [];
	};

	renderNetworks = () => {
		const { supportNetworks, networkSelectType, moveStep } = this.state;
		const { isDarkMode } = this.context;
		if (moveStep > 2) {
			return (
				<View
					style={[styles.networkBg, { backgroundColor: isDarkMode && '#FF999966' }, styles.networkSelectBg]}
				>
					<Text style={[styles.networkLabel, isDarkMode && baseStyles.textDark, styles.networkSelectLabel]}>
						{getChainTypeName(networkSelectType)}
					</Text>
				</View>
			);
		}
		return supportNetworks.map((net, i) => (
			<TouchableOpacity
				style={[
					styles.networkBg,
					{ backgroundColor: isDarkMode && '#FF999966' },
					networkSelectType === net.type && styles.networkSelectBg
				]}
				onPress={() => this.onNetworkSelect(net.type)}
				disabled={networkSelectType === net.type}
				key={`net_${i}`}
			>
				<Text
					style={[
						styles.networkLabel,
						isDarkMode && baseStyles.textDark,
						networkSelectType === net.type && styles.networkSelectLabel
					]}
				>
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
		const amountFormat = inputValue;
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
		if (comma) {
			inputValue = inputValue && inputValue.replace('.', ',');
		}
		inputValueConversion = inputValueConversion === '0' ? undefined : inputValueConversion;
		if (isDollar) {
			const tempInputValue = inputValue;
			inputValue = inputValueConversion;
			inputValueConversion = tempInputValue;

			this.setState({ moveAmountFormat: inputValue });
		}
		inputValueConversion = inputValueConversion;
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
		const { allContractBalances, asset } = this.props;

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
				allContractBalances
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
				allContractBalances
			});
			input = getFromTokenMinimalUnit(weiBalance, asset.decimals);
		}
		this.onAmountChange(input, true);
	};

	renderTokenInput = () => {
		const { asset } = this.props;
		const { moveAmountFormat, inputTextWidth, loadEstimatedTotalGasMax } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View style={styles.valueInput}>
				<TokenImage asset={asset} containerStyle={styles.inputTokenLogo} iconStyle={styles.inputIconStyle} />
				<TextInput
					style={[
						styles.inputAmount,
						isDarkMode && baseStyles.textDark,
						inputTextWidth && { width: inputTextWidth }
					]}
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
			allCurrencyPrice,
			asset: { type }
		} = this.props;

		let price;
		if (util.isRpcChainType(type)) {
			price = 0;
		} else {
			price = allCurrencyPrice[type]?.usd || 0;
		}

		return price;
	};

	getTokenRate = () => {
		const {
			asset,
			allContractBalances,
			allContractExchangeRates,
			allCurrencyPrice,
			currencyCode,
			currencyCodeRate
		} = this.props;
		const { priceUsd: price } = calcAssetPrices(asset, {
			allContractBalances,
			allContractExchangeRates,
			allCurrencyPrice,
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
		const { isDarkMode } = this.context;
		const canInputDollar = exchangeRate !== undefined && exchangeRate !== 0;
		return (
			<View style={styles.dollarInput}>
				<Image style={styles.coinIcon} source={CURRENCIES[currencyCode].icon} />
				<TextInput
					style={[styles.inputAmount, isDarkMode && baseStyles.textDark]}
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
		const showTips = networkSelectType === ChainType.Ethereum && claimEthereumGas;
		const { isDarkMode } = this.context;
		return (
			<>
				<View style={styles.amountWrapper}>
					<View style={styles.amountTitle}>
						<Text style={[styles.amountText, isDarkMode && baseStyles.textDark]}>
							{strings('other.amount')}
						</Text>
						<Text style={[styles.amountAvailable, isDarkMode && baseStyles.subTextDark]}>
							{strings('other.amount_available', { amount: renderAmount(mainBalance) })}
						</Text>
					</View>
					{this.renderTokenInput()}
					<Text style={[styles.approxi, isDarkMode && baseStyles.subTextDark]}>≈</Text>
					{this.renderDollarInput()}
				</View>
				<View style={baseStyles.flexGrow} />
				{showTips && (
					<Text style={styles.migrateEthereumTips}>
						{asset.type === ChainType.Arbitrum
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
						style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
						onPress={onClose && onClose}
						activeOpacity={activeOpacity}
						disabled={loading}
					>
						<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
							{strings('other.cancel')}
						</Text>
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

	todoLifi = () => {
		const { type, address, symbol } = this.props.asset;
		const fromChain = this.getLifiChain(type);
		const toChain = this.getLifiChain(this.state.networkSelectType);

		const newTabUrl = `https://transferto.xyz/swap?fromChain=${fromChain}&fromToken=${address}&toChain=${toChain}&toToken=${symbol}`;
		const chainType = this.props.asset.type;
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl,
			chainType,
			reloadOnce: true
		});
		this.onClose();
	};

	getLifiChain = type => {
		let chain = 'eth';
		if (type === ChainType.Bsc) {
			chain = 'bsc';
		} else if (type === ChainType.Polygon) {
			chain = 'pol';
		} else if (type === ChainType.Arbitrum) {
			chain = 'arb';
		} else if (type === ChainType.Avax) {
			chain = 'ava';
		} else if (type === ChainType.Optimism) {
			chain = 'opt';
		}
		return chain;
	};

	todoRolluxBridge = () => {
		const newTabUrl = 'https://bridge.rollux.com';

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

	todoArbitrumBridge = () => {
		const { asset } = this.props;
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl: 'https://bridge.arbitrum.io',
			chainType: asset.type
		});
		this.onClose();
	};

	renderBridge = () => {
		const { asset } = this.props;
		const { networkSelectType } = this.state;
		const showRolluxBridge = asset.type === ChainType.Syscoin || asset.type === ChainType.Rollux;
		const showArbBrige =
			(asset.type === ChainType.Arbitrum && networkSelectType === ChainType.Ethereum) ||
			(asset.type === ChainType.Ethereum && networkSelectType === ChainType.Arbitrum);
		const isZh = strings('other.accept_language') === 'zh';
		const width = Device.getDeviceWidth() - 76;
		const height = (width * 80) / 299;
		const isCBridge = isSupportCBridge(asset, networkSelectType);

		return (
			<ScrollView showsVerticalScrollIndicator={false}>
				<View style={styles.bridgeWrapper}>
					{showRolluxBridge && (
						<>
							<TouchableOpacity onPress={this.todoRolluxBridge} activeOpacity={activeOpacity}>
								<Image
									style={[styles.bridgeImage, { width, height }]}
									source={rolluxBridgeImage}
									resizeMode={'stretch'}
								/>
							</TouchableOpacity>
						</>
					)}
					{isCBridge && (
						<>
							<TouchableOpacity onPress={this.todoCBridge} activeOpacity={activeOpacity}>
								<Image
									style={[styles.bridgeImage, { width, height }]}
									source={cBridgeImage}
									resizeMode={'stretch'}
								/>
							</TouchableOpacity>
						</>
					)}
					{showArbBrige && (
						<>
							<TouchableOpacity onPress={this.todoArbitrumBridge} activeOpacity={activeOpacity}>
								<Image
									style={[styles.bridgeImage, { width, height }]}
									source={isZh ? arbBridgeCnImage : arbBridgeImage}
									resizeMode={'stretch'}
								/>
							</TouchableOpacity>
							{/*<Text style={styles.bridgeText}>{strings('other.arb_bridge_withdraw_limit')}</Text>*/}
						</>
					)}
					{isCBridge && (
						<>
							<TouchableOpacity onPress={this.todoLifi} activeOpacity={activeOpacity}>
								<Image
									style={[styles.bridgeImage, { width, height, marginBottom: 30 }]}
									source={lifiBridgeImage}
									resizeMode={'stretch'}
								/>
							</TouchableOpacity>
						</>
					)}
					<View style={baseStyles.flexGrow} />
				</View>
			</ScrollView>
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
		const { isDarkMode } = this.context;
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
						<Text style={[styles.approveText, isDarkMode && baseStyles.textDark]}>
							{strings('other.approving_wait', {
								token: asset.symbol,
								network: getChainTypeName(asset.type)
							})}
						</Text>
					</>
				) : (
					<>
						<Image style={styles.approveImage} source={approveImage} />
						<Text style={[styles.approveText2, isDarkMode && baseStyles.textDark]}>
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
						style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
						onPress={loading ? this.onClose : this.onBack}
						activeOpacity={activeOpacity}
					>
						<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
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
		const showTips = networkSelectType === ChainType.Ethereum && claimEthereumGas;
		const { isDarkMode } = this.context;
		return (
			<View style={styles.wrapper}>
				<View style={styles.rowWrapper}>
					<Text style={[styles.amountText, isDarkMode && baseStyles.textDark]}>{strings('other.asset')}</Text>
					<Text style={[styles.rightText, isDarkMode && baseStyles.subTextDark]}>{symbol}</Text>
				</View>

				<View style={styles.rowWrapper}>
					<Text style={[styles.amountText, isDarkMode && baseStyles.textDark]}>
						{strings('other.amount')}
					</Text>
					<Text style={[styles.rightText, isDarkMode && baseStyles.subTextDark]}>{moveAmountFormat}</Text>
				</View>

				<View style={styles.rowWrapper}>
					<Text style={[styles.amountText, isDarkMode && baseStyles.textDark]}>
						{strings('other.to_network')}
					</Text>
					<Text style={[styles.rightText, isDarkMode && baseStyles.subTextDark]}>
						{getChainTypeName(networkSelectType)}
					</Text>
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
						symbol: getTickerByType(type),
						network: getChainTypeName(type),
						amount: availableBalance
					})}
				</Text>
				<View style={baseStyles.flexGrow} />
				{showTips && (
					<Text style={styles.migrateEthereumTips}>
						{type === ChainType.Arbitrum
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
						style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
						disabled={loading}
					>
						<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
							{strings('navigation.back')}
						</Text>
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
		const { isDarkMode } = this.context;
		return (
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={dismissKeyboard}
			>
				<View style={[styles.titleLayout, isDarkMode && baseStyles.darkBackground600]}>
					<Text style={[styles.intro, isDarkMode && baseStyles.textDark]}> {strings('other.migration')}</Text>
				</View>
				<TouchableOpacity activeOpacity={1} style={styles.scrollViewContent} onPress={dismissKeyboard}>
					<Text style={[styles.migrateTip, isDarkMode && baseStyles.subTextDark]}>
						{strings('other.migrate_other_network')}
					</Text>
					{moveStep !== 4 ? (
						<View style={styles.wrapper}>
							<Text style={[styles.headerText, isDarkMode && baseStyles.textDark]}>
								{strings('other.to_network')}
							</Text>
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

	render = () => {
		const { isDarkMode } = this.context;
		return Device.isIos() ? (
			<KeyboardAvoidingView
				style={[styles.moveWrapper, isDarkMode && baseStyles.darkModalBackground]}
				behavior={'padding'}
			>
				{this.renderView()}
			</KeyboardAvoidingView>
		) : (
			<View style={[styles.moveWrapper, isDarkMode && baseStyles.darkModalBackground]}>{this.renderView()}</View>
		);
	};
}

const mapStateToProps = state => ({
	allContractBalances:
		state.engine.backgroundState.TokenBalancesController.allContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	allContractExchangeRates: state.engine.backgroundState.TokenRatesController.allContractExchangeRates,
	allCurrencyPrice: state.engine.backgroundState.TokenRatesController.allCurrencyPrice,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
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
