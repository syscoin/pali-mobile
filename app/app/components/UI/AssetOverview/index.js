import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import TokenImage from '../TokenImage';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { renderAmount, calcAssetPrices } from '../../../util/number';
import Clipboard from '@react-native-community/clipboard';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import iconQuestion from '../../../images/ask.png';
import iconCopy from '../../../images/copy.png';
import { BignumberJs as BigNumber, ChainType, util } from 'gopocket-core';
import increaseIcon from '../../../images/ic_up.png';
import dropIcon from '../../../images/ic_drop.png';
import { CURRENCIES } from '../../../util/currencies';
import txTodo from '../../../images/ic_coin_history_back.png';
import txHistory from '../../../images/ic_coin_history.png';
import { RPC } from '../../../constants/network';
import { getTagColor } from '../../../util/rpcUtil';
import { getRpcNickname } from '../../../util/ControllerUtils';

const activeOpacity = 0.8;
const darkBlack = '#030319';
const lightBlack = '#8F92A1';
const arbBg = '#23A1F0';
const ethBg = '#627EEA';
const polygonBg = '#8247E5';
const bscBg = '#FEBF27';
const hecoBg = '#47A150';
const opBg = '#FF0420';
const avaxBg = '#000000';
const syscoinBg = '#1F5EFF';

const styles = StyleSheet.create({
	wrapper: {
		paddingTop: 30,
		paddingBottom: 20
	},
	assetContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	assetOrigin: {
		flexDirection: 'row',
		flex: 1
	},
	originLogo: {
		marginRight: 10,
		alignItems: 'center'
	},
	netBar: {
		marginTop: 4,
		flexDirection: 'row'
	},
	symbol: {
		flexDirection: 'row'
	},
	symbolText: {
		fontSize: 24,
		lineHeight: 29,
		...fontStyles.bold,
		color: darkBlack
	},
	balance: {
		flex: 1,
		fontSize: 28,
		lineHeight: 34,
		...fontStyles.bold,
		color: darkBlack,
		marginTop: 4,
		textAlign: 'left'
	},
	question: {
		marginTop: 5,
		marginLeft: 7
	},
	assetTrans: {
		justifyContent: 'center',
		alignItems: 'flex-end'
	},
	assetTransTotal: {
		fontSize: 24,
		...fontStyles.bold,
		color: darkBlack,
		maxWidth: Dimensions.get('window').width / 3
	},
	waveWrapper: {
		marginTop: 5,
		flexDirection: 'row',
		alignItems: 'center'
	},
	waveImage: {
		width: 15,
		height: 12
	},
	assetWave: {
		fontSize: 14,
		lineHeight: 16,
		...fontStyles.normal,
		marginLeft: 5
	},
	balanceTitle: {
		fontSize: 14,
		lineHeight: 16,
		color: lightBlack,
		...fontStyles.normal,
		marginTop: 20
	},
	networthTitle: {
		fontSize: 14,
		lineHeight: 16,
		color: lightBlack,
		...fontStyles.normal,
		marginTop: 14
	},
	modalArea: {
		flex: 1
	},
	contractBar: {
		marginTop: 60,
		marginLeft: 70,
		marginRight: 10,
		padding: 10
	},
	contractWrapper: {
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.13,
		shadowRadius: 5,
		paddingTop: 13,
		paddingLeft: 16,
		paddingBottom: 10,
		borderRadius: 6,
		backgroundColor: colors.white,
		elevation: 9
	},
	contractTitle: {
		fontSize: 12,
		color: darkBlack,
		...fontStyles.bold
	},
	contractAddr: {
		flexDirection: 'row',
		alignItems: 'center',
		fontSize: 12,
		marginTop: 3,
		color: lightBlack
	},
	iconContractCopy: {
		marginLeft: 12
	},
	iconStyle: {
		width: 50,
		height: 50,
		alignItems: 'center',
		borderRadius: 10
	},
	networkBar: {
		minWidth: 50,
		borderRadius: 4,
		borderWidth: 1
	},
	networkText: {
		fontSize: 10,
		lineHeight: 12,
		paddingHorizontal: 10,
		textAlign: 'center'
	},
	networkWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	txWrapper: {
		minHeight: 26,
		backgroundColor: colors.$5092FF1F,
		borderTopLeftRadius: 100,
		borderBottomLeftRadius: 100,
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: -22
	},
	txImage: {
		marginLeft: 11
	},
	txText: {
		color: colors.$5092FF,
		fontSize: 13,
		marginLeft: 4,
		lineHeight: 15,
		marginVertical: 6
	},
	txTodo: {
		marginLeft: 4,
		marginRight: 11
	},
	symbolBase: {
		flex: 1,
		flexShrink: 1,
		marginRight: 30
	}
});

/**
 * View that displays the information of a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 */
class AssetOverview extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		/**
		 * Object that represents the asset to be displayed
		 */
		asset: PropTypes.object,
		/**
		 * An object containing token balances for current account and network in the format address => balance
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		selectedAddress: PropTypes.string,
		contractBalances: PropTypes.object,
		arbContractBalances: PropTypes.object,
		opContractBalances: PropTypes.object,
		bscContractBalances: PropTypes.object,
		polygonContractBalances: PropTypes.object,
		hecoContractBalances: PropTypes.object,
		avaxContractBalances: PropTypes.object,
		syscoinContractBalances: PropTypes.object,
		rpcContractBalances: PropTypes.object,
		ethPrice: PropTypes.object,
		bnbPrice: PropTypes.object,
		polygonPrice: PropTypes.object,
		hecoPrice: PropTypes.object,
		avaxPrice: PropTypes.object,
		syscoinPrice: PropTypes.object,
		/**
		 * An object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		arbContractExchangeRates: PropTypes.object,
		bscContractExchangeRates: PropTypes.object,
		polygonContractExchangeRates: PropTypes.object,
		hecoContractExchangeRates: PropTypes.object,
		opContractExchangeRates: PropTypes.object,
		avaxContractExchangeRates: PropTypes.object,
		syscoinContractExchangeRates: PropTypes.object,

		showAlert: PropTypes.func,
		hideAmount: PropTypes.bool,
		currencyCode: PropTypes.string,
		currencyCodeRate: PropTypes.number,
		isLockScreen: PropTypes.bool
	};

	state = {
		contractModalVisible: false
	};

	renderLogo = () => {
		const { asset } = this.props;
		return <TokenImage asset={asset} iconStyle={styles.iconStyle} fadeIn={false} />;
	};

	renderNetworkBar = () => {
		const {
			asset: { type }
		} = this.props;
		let backgroundColor = ethBg;
		let text = strings('other.ethereum');
		if (type === ChainType.Arbitrum) {
			backgroundColor = arbBg;
			text = strings('other.arbitrum');
		} else if (type === ChainType.Bsc) {
			backgroundColor = bscBg;
			text = strings('other.bsc');
		} else if (type === ChainType.Polygon) {
			backgroundColor = polygonBg;
			text = strings('other.polygon');
		} else if (type === ChainType.Heco) {
			backgroundColor = hecoBg;
			text = strings('other.heco');
		} else if (type === ChainType.Optimism) {
			backgroundColor = opBg;
			text = strings('other.optimism');
		} else if (type === ChainType.Avax) {
			backgroundColor = avaxBg;
			text = strings('other.avalanche');
		} else if (type === ChainType.Syscoin) {
			backgroundColor = syscoinBg;
			text = strings('other.syscoin');
		} else if (util.isRpcChainType(type)) {
			backgroundColor = getTagColor(type);
			text = getRpcNickname(type) || RPC;
		}
		return (
			<View style={[styles.networkBar, { borderColor: backgroundColor }]}>
				<Text style={[styles.networkText, { color: backgroundColor }]}>{text}</Text>
			</View>
		);
	};

	showContractModal = () => {
		this.setState({ contractModalVisible: true });
	};

	hideContractModal = () => {
		this.setState({ contractModalVisible: false });
	};

	copyContractAddress = async () => {
		if (this.state.contractModalVisible) {
			this.hideContractModal();
		}
		const {
			asset: { address }
		} = this.props;
		Clipboard.setString(address);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('other.contract_copied_clipboard') }
		});
	};

	showTransactionsModal = () => {
		this.props.navigation.navigate('TransactionsView', { asset: this.props.asset });
	};

	render() {
		const {
			asset,
			asset: { address, symbol },
			contractExchangeRates,
			arbContractExchangeRates,
			bscContractExchangeRates,
			polygonContractExchangeRates,
			hecoContractExchangeRates,
			opContractExchangeRates,
			avaxContractExchangeRates,
			syscoinContractExchangeRates,
			contractBalances,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			syscoinContractBalances,
			rpcContractBalances,
			hideAmount,
			ethPrice,
			bnbPrice,
			polygonPrice,
			avaxPrice,
			syscoinPrice,
			hecoPrice,
			currencyCode,
			currencyCodeRate,
			isLockScreen
		} = this.props;
		const { contractModalVisible } = this.state;
		const { price, balance, balanceFiat, priceChange } = calcAssetPrices(asset, {
			contractBalances,
			contractExchangeRates,
			arbContractExchangeRates,
			bscContractExchangeRates,
			polygonContractExchangeRates,
			hecoContractExchangeRates,
			opContractExchangeRates,
			avaxContractExchangeRates,
			syscoinContractExchangeRates,
			arbContractBalances,
			opContractBalances,
			bscContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			syscoinContractBalances,
			rpcContractBalances,
			ethPrice,
			bnbPrice,
			polygonPrice,
			avaxPrice,
			syscoinPrice,
			hecoPrice,
			currencyCode,
			currencyCodeRate
		});
		const secondaryBalance = `${balanceFiat}`;
		const amountSymbol = CURRENCIES[currencyCode].symbol;

		return (
			<View style={styles.wrapper}>
				<View style={styles.assetContainer}>
					<View style={styles.assetOrigin}>
						<View style={styles.originLogo}>{this.renderLogo()}</View>
						<View style={styles.symbolBase}>
							<View style={styles.symbol}>
								<Text style={styles.symbolText} numberOfLines={1}>
									{symbol}
								</Text>
								{address && (
									<TouchableOpacity
										style={styles.question}
										touchableOpacity={activeOpacity}
										onPress={this.showContractModal}
									>
										<Image source={iconQuestion} />
									</TouchableOpacity>
								)}
							</View>
							<View style={styles.netBar}>{this.renderNetworkBar()}</View>
						</View>
					</View>

					<View style={styles.assetTrans}>
						<Text style={styles.assetTransTotal}>
							{amountSymbol}
							{renderAmount(price && price > 10000 ? new BigNumber(price).toFixed(2) : price)}
						</Text>
						<View style={styles.waveWrapper}>
							<Image
								style={styles.waveImage}
								source={
									!priceChange || priceChange.toFixed(2) === 0
										? undefined
										: priceChange.toFixed(2) > 0
										? increaseIcon
										: dropIcon
								}
							/>
							<Text
								style={[
									styles.assetWave,
									{
										color:
											!priceChange || priceChange.toFixed(2) === 0
												? colors.$B9BDCD
												: priceChange.toFixed(2) > 0
												? colors.$09C285
												: colors.$FC6564
									}
								]}
							>
								{priceChange ? Math.abs(priceChange.toFixed(2)) : 0}%
							</Text>
						</View>
					</View>
				</View>
				<Text style={styles.balanceTitle}>{strings('watch_asset_request.balance')}</Text>
				<Text style={styles.balance}>{hideAmount ? '***' : renderAmount(balance)}</Text>
				<Text style={styles.networthTitle}>{strings('other.networth')}</Text>
				<View style={styles.networkWrapper}>
					<Text style={styles.balance}>{hideAmount ? '***' : renderAmount(secondaryBalance)}</Text>
					{!asset.lockType && (
						<TouchableOpacity
							style={styles.txWrapper}
							onPress={this.showTransactionsModal}
							activeOpacity={activeOpacity}
						>
							<Image style={styles.txImage} source={txHistory} />
							<Text style={styles.txText}>{strings('other.transaction_history')}</Text>
							<Image style={styles.txTodo} source={txTodo} />
						</TouchableOpacity>
					)}
				</View>

				<Modal
					transparent
					visible={contractModalVisible && !isLockScreen}
					onRequestClose={this.hideContractModal}
				>
					<TouchableOpacity style={styles.modalArea} onPress={this.hideContractModal}>
						<View style={styles.contractBar}>
							<View style={styles.contractWrapper}>
								<Text style={styles.contractTitle}>{strings('other.contract_address')}</Text>
								<TouchableOpacity style={styles.contractAddr} onPress={this.copyContractAddress}>
									<Text>
										{address ? address.substring(0, 13) + '...' + address.substring(30) : ''}
									</Text>
									<Image style={styles.iconContractCopy} source={iconCopy} />
								</TouchableOpacity>
							</View>
						</View>
					</TouchableOpacity>
				</Modal>
			</View>
		);
	}
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
	syscoinContractExchangeRates: state.engine.backgroundState.TokenRatesController.syscoinContractExchangeRates,
	ethPrice: state.engine.backgroundState.TokenRatesController.ethPrice,
	bnbPrice: state.engine.backgroundState.TokenRatesController.bnbPrice,
	polygonPrice: state.engine.backgroundState.TokenRatesController.polygonPrice,
	hecoPrice: state.engine.backgroundState.TokenRatesController.hecoPrice,
	avaxPrice: state.engine.backgroundState.TokenRatesController.avaxPrice,
	syscoinPrice: state.engine.backgroundState.TokenRatesController.syscoinPrice,
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
	syscoinContractBalances:
		state.engine.backgroundState.TokenBalancesController.syscoinContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	rpcContractBalances:
		state.engine.backgroundState.TokenBalancesController.rpcContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	currencyCodeRate: state.engine.backgroundState.TokenRatesController.currencyCodeRate,
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AssetOverview);
