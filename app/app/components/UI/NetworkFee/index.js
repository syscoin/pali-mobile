import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	Image,
	TextInput,
	Animated,
	Easing
} from 'react-native';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
	getFiatGasFee,
	getEthGasFee,
	apiEstimateModifiedToWEI,
	getSuggestedGasEstimates
} from '../../../util/custom-gas';
import {
	decimalsInputValue,
	formatNumberStr,
	getTickerByType,
	isDecimalValue,
	renderAmount,
	renderGwei,
	toGwei
} from '../../../util/number';
import { ChainType, BN, util } from 'paliwallet-core';
import ScrollableTabView from 'react-native-scrollable-tab-view';

import sliderThumb from '../../../images/img_slider.png';
import Slider from '@react-native-community/slider';
import fire from '../../../images/ic_fire.png';
import { ThemeContext } from '../../../theme/ThemeProvider';
import AntIcon from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	root: {
		width: '100%'
	},
	titleWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	title: {
		color: colors.$030319,
		fontSize: 18,
		lineHeight: 21,
		...fontStyles.semibold
	},
	titleRight: {
		flexDirection: 'row'
	},
	customButton: {
		marginLeft: 6,
		justifyContent: 'center'
	},
	customButtonHit: {
		left: 10,
		right: 10,
		top: 10,
		bottom: 10
	},
	customIcon: {
		width: 14,
		height: 14
	},
	loader: {
		height: 115,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	tabView: {
		width: '100%',
		minHeight: 92
	},
	slider: {
		flex: 1,
		marginTop: 14
	},
	recommend: {
		color: colors.$60657D,
		fontSize: 15,
		lineHeight: 18,
		...fontStyles.semibold
	},
	icFire: {
		width: 14,
		height: 14,
		marginLeft: 4,
		marginRight: 4,
		marginTop: 1
	},
	sliderTitle: {
		marginTop: 14,
		flexDirection: 'row'
	},
	amountText: {
		marginTop: 6,
		fontSize: 12,
		lineHeight: 14,
		color: colors.$60657D
	},
	customItem: {
		flexDirection: 'row',
		marginTop: 6
	},
	gasPrice: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomColor: colors.$8F92A13D,
		borderBottomWidth: 1
	},
	gasText: {
		fontSize: 14,
		lineHeight: 16,
		color: colors.$030319,
		...fontStyles.medium
	},
	gasInputText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 16,
		height: 32,
		color: colors.$030319,
		marginLeft: 8,
		padding: 0
	}
});

const MAX_SLIDER = 10;

/**
 * PureComponent that renders a selector to choose either fast, average or slow gas fee
 */
class NetworkFee extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		allCurrencyPrice: PropTypes.object,
		onChange: PropTypes.func,
		transaction: PropTypes.object,
		type: PropTypes.number,
		currencyCode: PropTypes.string,
		currencyCodeRate: PropTypes.number,
		forceNormalFee: PropTypes.bool,
		gasPriceInputRef: PropTypes.object,
		gasInputRef: PropTypes.object
	};

	state = {
		ready: false,
		selectGasPrice: 0,
		gasSpeedSelected: this.props.type === ChainType.Bsc ? 0 : MAX_SLIDER / 2,
		customModalVisible: false,
		customGasPrice: undefined,
		customGasLimit: this.props.transaction.gas?.toString(),
		suggestedGasFees: undefined,
		selectGas: true,
		selectTotalGas: new BN(0),
		oldSelectTotalGas: new BN(0),
		customTotalGas: new BN(0),
		reloadGas: false,
		fadeAnim: new Animated.Value(1.0)
	};

	reloadTimeout = null;
	isUnmount = false;

	componentDidMount = async () => {
		!this.state.ready && (await this.handleFetchBasicEstimates());
	};

	componentWillUnmount() {
		this.isUnmount = true;
		this.stopReloadGas();
	}

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });

		let suggestedGasFees = await getSuggestedGasEstimates(this.props.transaction, this.props.forceNormalFee);
		if (!this.props.transaction.gas) {
			this.props.transaction.gas = suggestedGasFees.gas;
		}
		util.logDebug('PPYang suggestedGasFees:', suggestedGasFees);
		suggestedGasFees = this.fixGas(suggestedGasFees);
		this.setState(
			{
				suggestedGasFees,
				customGasPrice: decimalsInputValue(
					toGwei(
						this.props.type === ChainType.Bsc ? suggestedGasFees.safeLowGwei : suggestedGasFees.averageGwei
					).toString(10),
					5
				),
				customTotalGas: suggestedGasFees.gasPrice,
				customGasLimit: this.props.transaction.gas?.toString(),
				ready: true
			},
			() => {
				this.updateGes();
				this.startReloadGas();
			}
		);
	};

	startAnimation() {
		Animated.timing(this.state.fadeAnim, {
			toValue: 0,
			duration: 600,
			useNativeDriver: true,
			easing: Easing.linear
		}).start(() => {
			Animated.timing(this.state.fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
				easing: Easing.linear
			}).start();
		});
	}

	startReloadGas = () => {
		if (!this.isUnmount && this.state.selectGas) {
			this.reloadTimeout = setTimeout(() => this.reloadBasicEstimates(), 7000);
		}
	};

	stopReloadGas = () => {
		if (this.reloadTimeout) {
			clearTimeout(this.reloadTimeout);
			this.reloadTimeout = null;
		}
	};

	reloadBasicEstimates = async () => {
		this.setState({ reloadGas: true });
		let suggestedGasFees = await getSuggestedGasEstimates(this.props.transaction, this.props.forceNormalFee);
		this.setState({ reloadGas: false });
		if (this.isUnmount || !this.state.selectGas) {
			return;
		}
		if (suggestedGasFees?.isEIP1559 !== this.state.suggestedGasFees?.isEIP1559) {
			util.logDebug('PPYang reloadBasicEstimates:', suggestedGasFees);
			return;
		}

		util.logDebug('PPYang reloadBasicEstimates:', suggestedGasFees);
		suggestedGasFees = this.fixGas(suggestedGasFees);
		if (
			(suggestedGasFees.isEIP1559 &&
				!suggestedGasFees.estimatedBaseFee.eq(this.state.suggestedGasFees.estimatedBaseFee)) ||
			!this.state.suggestedGasFees.safeLowGwei.eq(suggestedGasFees.safeLowGwei) ||
			!this.state.suggestedGasFees.averageGwei.eq(suggestedGasFees.averageGwei) ||
			!this.state.suggestedGasFees.fastGwei.eq(suggestedGasFees.fastGwei)
		) {
			this.startAnimation();
			let gasSpeedSelected = this.props.type === ChainType.Bsc ? 0 : MAX_SLIDER / 2;
			if (this.state.gasSpeedSelected !== gasSpeedSelected && !this.isMissGas(suggestedGasFees)) {
				gasSpeedSelected = this.loadGasSpeedSelected(suggestedGasFees);
			}
			setTimeout(() => {
				this.setState(
					{
						suggestedGasFees,
						gasSpeedSelected,
						customGasPrice: decimalsInputValue(
							toGwei(
								this.props.type === ChainType.Bsc
									? suggestedGasFees.safeLowGwei
									: suggestedGasFees.averageGwei
							).toString(10),
							5
						),
						customTotalGas: suggestedGasFees.gasPrice
					},
					() => {
						this.updateGes(true);
					}
				);
			}, 600);
		}
		this.startReloadGas();
	};

	fixGas = suggestedGasFees => {
		if (suggestedGasFees.fastGwei.lte(suggestedGasFees.averageGwei)) {
			suggestedGasFees.fastGwei = suggestedGasFees.averageGwei.muln(1.5);
		}
		if (this.props.type === ChainType.Bsc) {
			suggestedGasFees.safeLowGwei = suggestedGasFees.averageGwei;
			suggestedGasFees.averageGwei = suggestedGasFees.fastGwei.add(suggestedGasFees.safeLowGwei).divn(2);
		} else if (suggestedGasFees.safeLowGwei.gte(suggestedGasFees.averageGwei)) {
			suggestedGasFees.safeLowGwei = suggestedGasFees.averageGwei.muln(0.5);
		}

		return suggestedGasFees;
	};

	isMissGas = suggestedGasFees => {
		const selectTotalGas = this.state.oldSelectTotalGas;
		let maxGas = suggestedGasFees.fastGwei;
		if (suggestedGasFees.isEIP1559) {
			maxGas = maxGas.add(suggestedGasFees.estimatedBaseFee);
		}
		if (selectTotalGas.gt(maxGas)) {
			return true;
		}
		let minGas = suggestedGasFees.safeLowGwei;
		if (suggestedGasFees.isEIP1559) {
			minGas = minGas.add(suggestedGasFees.estimatedBaseFee);
		}
		if (selectTotalGas.lt(minGas)) {
			return true;
		}
		return false;
	};

	loadGasSpeedSelected = suggestedGasFees => {
		let selectTotalGas = this.state.oldSelectTotalGas;
		if (suggestedGasFees.isEIP1559) {
			selectTotalGas = selectTotalGas.sub(suggestedGasFees.estimatedBaseFee);
		}
		const baseGwei = suggestedGasFees.fastGwei.sub(suggestedGasFees.safeLowGwei).divn(10);
		const gasSpeedSelected = selectTotalGas
			.sub(suggestedGasFees.safeLowGwei)
			.div(baseGwei)
			.toNumber();
		return Math.round(gasSpeedSelected);
	};

	updateGes = (isReload = false) => {
		const gwei = this.calcGas(this.state.gasSpeedSelected);
		this.state.suggestedGasFees?.isEIP1559
			? this.onGasChange(null, gwei, null, isReload)
			: this.onGasChange(gwei, null, null, isReload);
	};

	calcGas = gasSpeedSelected => {
		const gasFees = this.state.suggestedGasFees;
		if (!gasFees) {
			return new BN(0);
		}
		let gwei;
		const average = MAX_SLIDER / 2;
		if (gasSpeedSelected === average) {
			gwei = gasFees.averageGwei;
		} else if (gasSpeedSelected < average) {
			gwei = gasFees.averageGwei
				.sub(gasFees.safeLowGwei)
				.muln(gasSpeedSelected / average)
				.add(gasFees.safeLowGwei);
		} else {
			gwei = gasFees.fastGwei
				.sub(gasFees.averageGwei)
				.muln((gasSpeedSelected - average) / average)
				.add(gasFees.averageGwei);
		}
		return gwei;
	};

	onGasChange = (gasPriceBNWei, maxPriorityFeePerGasBN, gas, isReload = false) => {
		let limitGas = this.props.transaction.gas;
		if (gas) {
			limitGas = gas;
		}
		let maxFeePerGasBN;
		if (maxPriorityFeePerGasBN) {
			maxFeePerGasBN = maxPriorityFeePerGasBN.add(this.state.suggestedGasFees?.estimatedBaseFee);
		}
		if (maxFeePerGasBN) {
			gasPriceBNWei = maxFeePerGasBN;
		}
		if (this.state.selectGas) {
			if (!isReload) {
				this.setState({ oldSelectTotalGas: gasPriceBNWei });
			}
			this.setState({ selectTotalGas: gasPriceBNWei });
		} else {
			this.setState({ customTotalGas: gasPriceBNWei });
		}
		this.props.onChange &&
			this.props.onChange(
				gasPriceBNWei,
				maxPriorityFeePerGasBN,
				maxFeePerGasBN,
				this.state.suggestedGasFees?.estimatedBaseFee,
				limitGas
			);
	};

	onCustomChangeGas = (gasPrice, gasLimit) => {
		if (!gasLimit) {
			gasLimit = '0';
		}

		gasPrice = isDecimalValue(gasPrice) ? formatNumberStr(gasPrice) : '0';

		const gasPriceBN = apiEstimateModifiedToWEI(decimalsInputValue(gasPrice, 9));

		const gasLimitBN = gasLimit && new BN(gasLimit);
		this.state.suggestedGasFees?.isEIP1559
			? this.onGasChange(null, gasPriceBN, gasLimitBN)
			: this.onGasChange(gasPriceBN, null, gasLimitBN);
	};

	onSlidingComplete = value => {
		this.setState({ gasSpeedSelected: value }, () => {
			this.updateGes();
		});
	};

	onSlidingChange = value => {
		let gWei = this.calcGas(value);
		if (this.state.suggestedGasFees?.isEIP1559) {
			gWei = gWei.add(this.state.suggestedGasFees?.estimatedBaseFee);
		}
		this.setState({ gasSpeedSelected: value, selectTotalGas: gWei, oldSelectTotalGas: gWei });
	};

	onCustomChange = () => {
		const selectGas = !this.state.selectGas;
		this.setState({ selectGas }, () => {
			if (selectGas) {
				this.updateGes();
				this.startReloadGas();
			} else {
				this.stopReloadGas();
				this.onCustomChangeGas(this.state.customGasPrice, this.state.customGasLimit);
			}
		});
	};

	onCustomGasPriceChange = value => {
		this.setState({ customGasPrice: value });
		this.onCustomChangeGas(value, this.state.customGasLimit);
	};

	onCustomGasLimitChange = value => {
		if (value && !isDecimalValue(value)) {
			return;
		}
		if (value) {
			value = formatNumberStr(value);
		}
		this.setState({ customGasLimit: value });
		this.onCustomChangeGas(this.state.customGasPrice, value);
	};

	getGweiText() {
		let baseText = 'Gwei';
		if (this.props.type === ChainType.Avax) {
			baseText = 'nAVAX';
		}
		return `${renderGwei(this.state.selectTotalGas)} ${baseText}`;
	}

	render = () => {
		const {
			ready,
			gasSpeedSelected,
			customGasPrice,
			customGasLimit,
			selectGas,
			selectTotalGas,
			customTotalGas,
			suggestedGasFees,
			reloadGas
		} = this.state;
		const {
			allCurrencyPrice,
			transaction,
			type,
			currencyCode,
			currencyCodeRate,
			gasPriceInputRef,
			gasInputRef
		} = this.props;
		const isEIP1559Transaction = suggestedGasFees?.isEIP1559;

		let rate;
		if (util.isRpcChainType(type)) {
			rate = 0;
		} else {
			rate = allCurrencyPrice[type]?.usd || 0;
		}
		rate *= currencyCodeRate;

		const customGasLimitBN = new BN(customGasLimit);

		const middleSpeed = type === ChainType.Bsc ? 0 : MAX_SLIDER / 2;
		const { isDarkMode } = this.context;

		return (
			<View style={styles.root}>
				{ready ? (
					<>
						<View style={styles.titleWrapper}>
							<Text style={[styles.title, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
								{strings('transaction.network_fee')}
							</Text>
							<View style={styles.titleRight}>
								{reloadGas && (
									<ActivityIndicator
										style={styles.customButton}
										size="small"
										color={colors.brandPink300}
									/>
								)}
								<TouchableOpacity
									style={styles.customButton}
									activeOpacity={activeOpacity}
									onPress={this.onCustomChange}
									hitSlop={styles.customButtonHit}
								>
									{selectGas ? (
										<AntIcon
											color={isDarkMode ? colors.paliGrey200 : colors.paliGrey300}
											size={14}
											name={'edit'}
											style={styles.customIcon}
										/>
									) : (
										<FontAwesome
											color={isDarkMode ? colors.paliGrey200 : colors.paliGrey300}
											size={14}
											name={'sliders'}
											style={styles.customIcon}
										/>
									)}
								</TouchableOpacity>
							</View>
						</View>
						<View style={styles.tabView}>
							<ScrollableTabView renderTabBar={() => <></>} page={selectGas ? 0 : 1} locked>
								<Animated.View style={[baseStyles.flexGrow, { opacity: this.state.fadeAnim }]}>
									<View style={styles.sliderTitle}>
										<Text
											style={[styles.recommend, isDarkMode && baseStyles.textDark]}
											allowFontScaling={false}
										>
											{this.getGweiText()}
										</Text>
										<Image style={styles.icFire} source={fire} />
										<Text
											style={[styles.recommend, isDarkMode && baseStyles.textDark]}
											allowFontScaling={false}
										>
											{gasSpeedSelected > middleSpeed
												? strings('transaction.fast')
												: gasSpeedSelected === middleSpeed
												? strings('transaction.recommend')
												: strings('transaction.safe_low')}
										</Text>
									</View>
									<Text
										style={[styles.amountText, isDarkMode && baseStyles.subTextDark]}
										allowFontScaling={false}
									>
										{renderAmount(
											getEthGasFee(selectTotalGas, transaction.gas, suggestedGasFees?.l1Fee)
										) +
											' ' +
											getTickerByType(this.props.type) +
											' ≈ ' +
											getFiatGasFee(
												selectTotalGas,
												rate,
												currencyCode,
												transaction.gas,
												suggestedGasFees?.l1Fee
											)}
									</Text>
									<Slider
										style={styles.slider}
										maximumValue={MAX_SLIDER}
										minimumValue={0}
										step={1}
										value={gasSpeedSelected}
										onSlidingComplete={this.onSlidingComplete}
										onValueChange={this.onSlidingChange}
										thumbImage={sliderThumb}
										maximumTrackTintColor={colors.$8F92A13D}
										minimumTrackTintColor={colors.brandPink300}
									/>
								</Animated.View>
								<View style={baseStyles.flexGrow}>
									<View style={styles.customItem}>
										<View style={styles.gasPrice}>
											<Text
												style={[styles.gasText, isDarkMode && baseStyles.textDark]}
												allowFontScaling={false}
											>
												{isEIP1559Transaction
													? strings('other.tip')
													: strings('custom_gas.gas_price')}
											</Text>
											<TextInput
												style={[styles.gasInputText, isDarkMode && baseStyles.subTextDark]}
												ref={gasPriceInputRef}
												value={customGasPrice}
												onChangeText={this.onCustomGasPriceChange}
												placeholder={'0.00'}
												placeholderTextColor={colors.$8F92A1}
												returnKeyType={'done'}
												autoCapitalize="none"
												keyboardType="numeric"
												selectTextOnFocus
												allowFontScaling={false}
											/>
										</View>
										<View style={[styles.gasPrice, { marginLeft: 28 }]}>
											<Text
												style={[styles.gasText, isDarkMode && baseStyles.textDark]}
												allowFontScaling={false}
											>
												{strings('custom_gas.gas_limit')}
											</Text>
											<TextInput
												style={[styles.gasInputText, isDarkMode && baseStyles.subTextDark]}
												ref={gasInputRef}
												value={customGasLimit}
												onChangeText={this.onCustomGasLimitChange}
												placeholder={'0'}
												placeholderTextColor={colors.$8F92A1}
												returnKeyType={'done'}
												autoCapitalize="none"
												keyboardType="numeric"
												maxLength={16}
												selectTextOnFocus
												allowFontScaling={false}
											/>
										</View>
									</View>
									<Text
										style={[styles.amountText, isDarkMode && baseStyles.subTextDark]}
										allowFontScaling={false}
									>
										{renderAmount(
											getEthGasFee(customTotalGas, customGasLimitBN, suggestedGasFees?.l1Fee)
										) +
											' ' +
											getTickerByType(this.props.type) +
											' ≈ ' +
											getFiatGasFee(
												customTotalGas,
												rate,
												currencyCode,
												customGasLimitBN,
												suggestedGasFees?.l1Fee
											)}
									</Text>
								</View>
							</ScrollableTabView>
						</View>
					</>
				) : (
					<View style={styles.loader}>
						<ActivityIndicator size="large" color={colors.brandPink300} />
					</View>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	allCurrencyPrice: state.engine.backgroundState.TokenRatesController.allCurrencyPrice,
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	currencyCodeRate: state.engine.backgroundState.TokenRatesController.currencyCodeRate
});

export default connect(mapStateToProps)(NetworkFee);
