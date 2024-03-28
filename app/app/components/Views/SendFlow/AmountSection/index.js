import React, { PureComponent } from 'react';
import { baseStyles, colors, fontStyles } from '../../../../styles/common';
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
import { BN, util } from 'paliwallet-core';
import { CURRENCIES } from '../../../../util/currencies';
import { getEstimatedTotalGas, validateAmount } from '../../../../util/Amount';
import { ThemeContext } from '../../../../theme/ThemeProvider';

const titleBlack = '#030319';
const amountGray = '#60657D';
const approxiColor = '#333333';
const inputBorderColor = '#8F92A1';

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
		height: 22,
		justifyContent: 'center',
		alignItems: 'center',

		borderRadius: 100,
		paddingTop: 2,
		paddingRight: 8,
		paddingBottom: 2,
		paddingLeft: 8
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
		color: '#09C285'
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
	static contextType = ThemeContext;
	static propTypes = {
		allContractBalances: PropTypes.object,
		allCurrencyPrice: PropTypes.object,
		allContractExchangeRates: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * function to call when the 'Next' button is clicked
		 */
		mainBalance: PropTypes.string,
		asset: PropTypes.object,
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
			const { selectedAddress, asset } = this.props;
			const estimatedTotalGas = await getEstimatedTotalGas({
				selectedAddress,
				asset
			});
			this.setState({ estimatedTotalGas, loadEstimatedTotalGasMax: false });
			return estimatedTotalGas;
		}
		return this.state.estimatedTotalGas;
	};

	useMax = async () => {
		const { allContractBalances, asset } = this.props;
		this.props.closeInput && this.props.closeInput();
		const estimatedTotalGas = asset.nativeCurrency ? await this.initEstimatedTotalGas() : 0;

		let input;
		if (asset.nativeCurrency) {
			const balance = getNativeCurrencyBalance(asset.type, {
				allContractBalances
			});
			const weiBalance = hexToBN(balance);
			const realMaxValue = weiBalance.sub(estimatedTotalGas);
			const maxValue = weiBalance.isZero() || realMaxValue.isNeg() ? new BN(0) : realMaxValue;
			input = fromWei(maxValue);
		} else {
			const weiBalance = getTokenBalance(asset, {
				allContractBalances
			});
			input = getFromTokenMinimalUnit(weiBalance, asset.decimals);
		}
		this.onCryptoInputChange(input, undefined, true, false);
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
			allContractExchangeRates,
			allCurrencyPrice,
			allContractBalances,
			currencyCode,
			currencyCodeRate
		} = this.props;
		const { priceUsd: price } = calcAssetPrices(asset, {
			allContractExchangeRates,
			allCurrencyPrice,
			allContractBalances,
			currencyCode,
			currencyCodeRate
		});
		return price;
	};

	onInputChange = (inputValue, selectedAsset, useMax, isDollar) => {
		const { asset, allContractBalances, currencyCodeRate } = this.props;
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

		if (comma) {
			inputValue = inputValue && inputValue.replace('.', ',');
		}

		inputValueConversion = inputValueConversion === '0' ? undefined : inputValueConversion;

		if (isDollar) {
			const tempInputValue = inputValue;
			inputValue = inputValueConversion;
			inputValueConversion = tempInputValue;

			this.setState({ amountFormat: inputValue });
		}

		inputValueConversion = inputValueConversion;

		const nextEnabled = !validateAmount(inputValue, {
			allContractBalances,
			asset,
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

		const amountFormat = inputValue;

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
					ref={this.props.amountInputRef}
					value={amountFormat}
					onLayout={this.onTextInputLayout}
					onChangeText={this.onCryptoInputChange}
					keyboardType={'numeric'}
					placeholder={'0.0'}
					placeholderTextColor={inputBorderColor}
				/>

				{loadEstimatedTotalGasMax ? (
					<ActivityIndicator size="small" color={colors.brandPink300} />
				) : (
					<TouchableOpacity style={styles.btnMax} onPress={this.useMax}>
						<Text style={styles.maxText}>{strings('other.max')}</Text>
					</TouchableOpacity>
				)}
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
		const { isDarkMode } = this.context;
		const canInputDollar = exchangeRate !== undefined && exchangeRate !== 0;
		return (
			<View style={styles.dollarInput}>
				<Image style={styles.coinIcon} source={CURRENCIES[currencyCode].icon} />
				<TextInput
					style={[styles.inputAmount, isDarkMode && baseStyles.textDark]}
					ref={this.props.dollarInputRef}
					value={inputValueConversion}
					onChangeText={this.onDollarInputChange}
					keyboardType={'numeric'}
					placeholder={'0.0'}
					editable={canInputDollar}
					placeholderTextColor={inputBorderColor}
				/>
				<Text style={[styles.currencyText, isDarkMode && baseStyles.subTextDark]}>{currencyCode}</Text>
			</View>
		);
	};

	render = () => {
		const { mainBalance } = this.props;
		const { isDarkMode } = this.context;

		return (
			<View style={styles.wrapper}>
				<KeyboardAvoidingView style={styles.scrollWrapper} behavior={'padding'}>
					<View style={styles.title}>
						<Text style={[styles.titleText, isDarkMode && baseStyles.textDark]}>
							{strings('other.amount')}
						</Text>
						<Text style={[styles.amountText, isDarkMode && baseStyles.subTextDark]}>
							{strings('other.amount_available', { amount: renderAmount(mainBalance) })}
						</Text>
					</View>
					{this.renderTokenInput()}
					<Text style={[styles.approxi, isDarkMode && baseStyles.subTextDark]}>≈</Text>
					{this.renderDollarInput()}
				</KeyboardAvoidingView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	allContractBalances:
		state.engine.backgroundState.TokenBalancesController.allContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	allContractExchangeRates: state.engine.backgroundState.TokenRatesController.allContractExchangeRates,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	allCurrencyPrice: state.engine.backgroundState.TokenRatesController.allCurrencyPrice,
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	currencyCodeRate: state.engine.backgroundState.TokenRatesController.currencyCodeRate
});

export default connect(mapStateToProps)(AmountSection);
