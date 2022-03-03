import React, { PureComponent } from 'react';
import { colors, fontStyles, activeOpacity } from '../../../../styles/common';
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	ActivityIndicator,
	Image
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import TokenImage from '../../../UI/TokenImage';
import {
	fromWei,
	toWei,
	hexToBN,
	revertAmount,
	renderAmount,
	handleWeiNumber,
	fiatNumberToWei,
	renderFromWei,
	renderFromTokenMinimalUnit,
	fiatNumberToTokenMinimalUnit,
	getNativeCurrencyBalance,
	getTokenBalance,
	isNumberStr,
	weiToFiatNumberStr,
	balanceToFiatNumberStr,
	getFromTokenMinimalUnit,
	calcAssetPrices
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import { ChainType, BN, util } from 'gopocket-core';
import { CURRENCIES } from '../../../../util/currencies';
import { getEstimatedTotalGas, validateAmount } from '../../../../util/Amount';

const titleBlack = '#030319';
const amountGray = '#60657D';
const approxiColor = '#333333';
const inputBorderColor = '#8F92A1';
const maxColor = '#09C285';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	scrollWrapper: {
		paddingTop: 30
	},
	title: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	titleText: {
		fontSize: 18,
		lineHeight: 21,
		color: titleBlack,
		...fontStyles.semibold
	},
	amountText: {
		alignSelf: 'center',
		fontSize: 12,
		lineHeight: 14,
		color: amountGray
	},
	valueInput: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha,
		marginTop: 6
	},
	dollarInput: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha
	},
	coinIcon: {
		height: 24,
		width: 24,
		marginRight: 8
	},
	inputAmount: {
		flex: 1,
		fontSize: 14,
		lineHeight: 16,
		height: 40,
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
		borderRadius: 6,
		alignItems: 'center'
	},
	approxi: {
		fontSize: 20,
		lineHeight: 24,
		color: approxiColor,
		marginTop: 10
	},
	maxText: {
		lineHeight: 13,
		fontSize: 11,
		color: maxColor
	},
	currencyText: {
		color: colors.$030319,
		fontSize: 11,
		lineHeight: 13,
		paddingLeft: 8
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class AmountSection extends PureComponent {
	static propTypes = {
		/**
		 * Object containing token balances in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		arbContractExchangeRates: PropTypes.object,
		bscContractExchangeRates: PropTypes.object,
		polygonContractExchangeRates: PropTypes.object,
		hecoContractExchangeRates: PropTypes.object,
		opContractExchangeRates: PropTypes.object,
		avaxContractExchangeRates: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * function to call when the 'Next' button is clicked
		 */
		mainBalance: PropTypes.string,
		asset: PropTypes.object,
		arbContractBalances: PropTypes.object,
		opContractBalances: PropTypes.object,
		bscContractBalances: PropTypes.object,
		polygonContractBalances: PropTypes.object,
		hecoContractBalances: PropTypes.object,
		avaxContractBalances: PropTypes.object,
		rpcContractBalances: PropTypes.object,
		chainId: PropTypes.string,
		arbChainId: PropTypes.string,
		bscChainId: PropTypes.string,
		polygonChainId: PropTypes.string,
		hecoChainId: PropTypes.string,
		opChainId: PropTypes.string,
		avaxChainId: PropTypes.string,
		ethPrice: PropTypes.object,
		bnbPrice: PropTypes.object,
		polygonPrice: PropTypes.object,
		hecoPrice: PropTypes.object,
		avaxPrice: PropTypes.object,
		currencyCode: PropTypes.string,
		currencyCodeRate: PropTypes.number,
		closeInput: PropTypes.func,
		amountInputRef: PropTypes.object,
		dollarInputRef: PropTypes.object,
		onAmountChange: PropTypes.func,
		initAmountValue: PropTypes.string
	};

	state = {
		inputValue: undefined,
		inputValueConversion: undefined,
		renderableInputValueConversion: undefined,
		nextEnabled: false,
		inputTextWidth: undefined,
		estimatedTotalGas: undefined,
		loadEstimatedTotalGasMax: false,
		amountFormat: undefined
	};

	componentDidMount() {
		if (this.props.initAmountValue) {
			this.onCryptoInputChange(this.props.initAmountValue);
		}
	}

	initEstimatedTotalGas = async () => {
		if (this.state.estimatedTotalGas === undefined) {
			this.setState({ loadEstimatedTotalGasMax: true });
			const {
				selectedAddress,
				asset,
				arbChainId,
				chainId,
				bscChainId,
				polygonChainId,
				hecoChainId,
				opChainId,
				avaxChainId
			} = this.props;
			const estimatedTotalGas = await getEstimatedTotalGas({
				selectedAddress,
				asset,
				arbChainId,
				chainId,
				bscChainId,
				polygonChainId,
				hecoChainId,
				opChainId,
				avaxChainId
			});
			this.setState({ estimatedTotalGas, loadEstimatedTotalGasMax: false });
			return estimatedTotalGas;
		}
		return this.state.estimatedTotalGas;
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
		this.props.closeInput && this.props.closeInput();
		const estimatedTotalGas = asset.nativeCurrency ? await this.initEstimatedTotalGas() : 0;

		let input;
		if (asset.nativeCurrency) {
			const balance = getNativeCurrencyBalance(asset.type, {
				contractBalances,
				arbContractBalances,
				opContractBalances,
				bscContractBalances,
				polygonContractBalances,
				hecoContractBalances,
				avaxContractBalances,
				rpcContractBalances
			});
			const weiBalance = hexToBN(balance);
			const realMaxValue = weiBalance.sub(estimatedTotalGas);
			const maxValue = weiBalance.isZero() || realMaxValue.isNeg() ? new BN(0) : realMaxValue;
			input = fromWei(maxValue);
		} else {
			const weiBalance = getTokenBalance(asset, {
				contractBalances,
				arbContractBalances,
				opContractBalances,
				bscContractBalances,
				polygonContractBalances,
				hecoContractBalances,
				avaxContractBalances,
				rpcContractBalances
			});
			input = getFromTokenMinimalUnit(weiBalance, asset.decimals);
		}
		this.onCryptoInputChange(input, undefined, true, false);
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

	onInputChange = (inputValue, selectedAsset, useMax, isDollar) => {
		const {
			asset,
			contractBalances,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances,
			currencyCodeRate
		} = this.props;
		const { estimatedTotalGas } = this.state;

		let inputValueConversion, renderableInputValueConversion, comma;
		const processedInputValue = isNumberStr(inputValue) ? handleWeiNumber(inputValue) : '0';
		selectedAsset = selectedAsset || this.props.asset;
		if (selectedAsset.nativeCurrency) {
			const cRate = this.getRate();
			if (!isDollar) {
				inputValueConversion = `${weiToFiatNumberStr(toWei(processedInputValue), cRate * currencyCodeRate)}`;
				renderableInputValueConversion = `${inputValue} ${selectedAsset.symbol}`;
			} else {
				inputValueConversion = `${renderFromWei(
					fiatNumberToWei(processedInputValue, cRate * currencyCodeRate)
				)}`;
				renderableInputValueConversion = `${inputValueConversion} ${selectedAsset.symbol}`;
			}
		} else {
			const exchangeRate = this.getTokenRate();
			if (!isDollar) {
				inputValueConversion = `${balanceToFiatNumberStr(processedInputValue, currencyCodeRate, exchangeRate)}`;
				renderableInputValueConversion = `${inputValue} ${selectedAsset.symbol}`;
			} else {
				inputValueConversion = `${renderFromTokenMinimalUnit(
					fiatNumberToTokenMinimalUnit(
						processedInputValue,
						currencyCodeRate,
						exchangeRate,
						selectedAsset.decimals
					),
					selectedAsset.decimals
				)}`;
				renderableInputValueConversion = `${inputValueConversion} ${selectedAsset.symbol}`;
			}
		}
		if (comma) inputValue = inputValue && inputValue.replace('.', ',');
		inputValueConversion = inputValueConversion === '0' ? undefined : inputValueConversion;
		if (isDollar) {
			const tempInputValue = inputValue;
			inputValue = inputValueConversion;
			inputValueConversion = tempInputValue;

			this.setState({ amountFormat: renderAmount(inputValue) });
		}
		inputValueConversion = renderAmount(inputValueConversion);

		const nextEnabled = !validateAmount(inputValue, {
			contractBalances,
			asset,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			rpcContractBalances,
			estimatedTotalGas
		});
		this.setState({
			inputValue,
			inputValueConversion,
			renderableInputValueConversion,
			nextEnabled
		});
		this.props.onAmountChange(inputValue, renderableInputValueConversion, nextEnabled);
	};

	onCryptoInputChange = (inputValue, selectedAsset, useMax) => {
		const {
			asset: { decimals }
		} = this.props;
		inputValue = revertAmount(inputValue, decimals);
		const amountFormat = renderAmount(inputValue);
		this.onInputChange(inputValue, selectedAsset, useMax, false);
		this.setState({ amountFormat });
	};

	onDollarInputChange = (inputValue, selectedAsset, useMax) => {
		inputValue = revertAmount(inputValue);
		this.onInputChange(inputValue, selectedAsset, useMax, true);
	};

	onTextInputLayout = event => {
		this.setState({ inputTextWidth: event.nativeEvent.layout.width });
	};

	renderTokenInput = () => {
		const { amountFormat, inputTextWidth, loadEstimatedTotalGasMax } = this.state;
		const { asset } = this.props;

		return (
			<View style={styles.valueInput}>
				<TokenImage asset={asset} containerStyle={styles.inputTokenLogo} iconStyle={styles.inputIconStyle} />
				<TextInput
					style={[styles.inputAmount, inputTextWidth && { width: inputTextWidth }]}
					ref={this.props.amountInputRef}
					value={amountFormat}
					onLayout={this.onTextInputLayout}
					onChangeText={this.onCryptoInputChange}
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
					ref={this.props.dollarInputRef}
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

	render = () => {
		const { mainBalance } = this.props;

		return (
			<View style={styles.wrapper}>
				<KeyboardAvoidingView style={styles.scrollWrapper} behavior={'padding'}>
					<View style={styles.title}>
						<Text style={styles.titleText}>{strings('other.amount')}</Text>
						<Text style={styles.amountText}>
							{strings('other.amount_available', { amount: renderAmount(mainBalance) })}
						</Text>
					</View>
					{this.renderTokenInput()}
					<Text style={styles.approxi}>≈</Text>
					{this.renderDollarInput()}
				</KeyboardAvoidingView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	contractBalances:
		state.engine.backgroundState.TokenBalancesController.contractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	arbContractExchangeRates: state.engine.backgroundState.TokenRatesController.arbContractExchangeRates,
	bscContractExchangeRates: state.engine.backgroundState.TokenRatesController.bscContractExchangeRates,
	polygonContractExchangeRates: state.engine.backgroundState.TokenRatesController.polygonContractExchangeRates,
	hecoContractExchangeRates: state.engine.backgroundState.TokenRatesController.hecoContractExchangeRates,
	opContractExchangeRates: state.engine.backgroundState.TokenRatesController.opContractExchangeRates,
	avaxContractExchangeRates: state.engine.backgroundState.TokenRatesController.avaxContractExchangeRates,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
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
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	arbChainId: state.engine.backgroundState.ArbNetworkController.provider.chainId,
	bscChainId: state.engine.backgroundState.BscNetworkController.provider.chainId,
	polygonChainId: state.engine.backgroundState.PolygonNetworkController.provider.chainId,
	hecoChainId: state.engine.backgroundState.HecoNetworkController.provider.chainId,
	opChainId: state.engine.backgroundState.OpNetworkController.provider.chainId,
	avaxChainId: state.engine.backgroundState.AvaxNetworkController.provider.chainId,
	ethPrice: state.engine.backgroundState.TokenRatesController.ethPrice,
	bnbPrice: state.engine.backgroundState.TokenRatesController.bnbPrice,
	polygonPrice: state.engine.backgroundState.TokenRatesController.polygonPrice,
	hecoPrice: state.engine.backgroundState.TokenRatesController.hecoPrice,
	avaxPrice: state.engine.backgroundState.TokenRatesController.avaxPrice,
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	currencyCodeRate: state.engine.backgroundState.TokenRatesController.currencyCodeRate
});

export default connect(mapStateToProps)(AmountSection);
