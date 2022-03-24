import React, { PureComponent } from 'react';
import { toggleShowHint } from '../../../actions/hint';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/common';
import { calcAssetPrices } from '../../../util/number';
import Modal from 'react-native-modal';
import SendTab from '../../Views/SendFlow/SendTab';
import MoveTab from '../../Views/SendFlow/MoveTab';
import Approve from '../../Views/ApproveView/Approve';
import { store } from '../../../store';
import { toggleApproveModalInModal } from '../../../actions/modals';
import { hideScanner } from '../../../actions/scanner';
import QrScanner from '../../Views/QRScanner';
import ReceiveTab from '../ReceiveTab';
import { ChainType, util } from 'gopocket-core';
import Engine from '../../../core/Engine';
import { supportCBridge } from '../../Views/SendFlow/MoveTab/cBridge';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/Device';
import { shouldHideSthForAppStoreReviewer } from '../../../util/ApiClient';
import ImageCapInset from '../ImageCapInset';

import img_send_cn from '../../../images/img_send_cn.png';
import img_send_en from '../../../images/img_send_en.png';
import img_swap_cn from '../../../images/img_swap_cn.png';
import img_swap_en from '../../../images/img_swap_en.png';
import img_crosschain_cn from '../../../images/img_crosschain_cn.png';
import img_crosschain_en from '../../../images/img_crosschain_en.png';
import img_receive_cn from '../../../images/img_receive_cn.png';
import img_receive_en from '../../../images/img_receive_en.png';

const activeOpacity = 0.8;

const styles = StyleSheet.create({
	actionScroll: {
		height: 70,
		width: '100%',
		position: 'absolute',
		bottom: 4,
		left: 0
	},
	actionContainer: {
		flexDirection: 'row',
		paddingHorizontal: 15
	},
	actionView: {
		marginHorizontal: -7,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

class AssetActionView extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		asset: PropTypes.object,
		hideOtherModal: PropTypes.func,
		toggleShowHint: PropTypes.func,
		contractBalances: PropTypes.object,
		arbContractBalances: PropTypes.object,
		opContractBalances: PropTypes.object,
		bscContractBalances: PropTypes.object,
		polygonContractBalances: PropTypes.object,
		hecoContractBalances: PropTypes.object,
		avaxContractBalances: PropTypes.object,
		syscoinContractBalances: PropTypes.object,
		rpcContractBalances: PropTypes.object,
		contractExchangeRates: PropTypes.object,
		arbContractExchangeRates: PropTypes.object,
		bscContractExchangeRates: PropTypes.object,
		polygonContractExchangeRates: PropTypes.object,
		hecoContractExchangeRates: PropTypes.object,
		opContractExchangeRates: PropTypes.object,
		avaxContractExchangeRates: PropTypes.object,
		syscoinContractExchangeRates: PropTypes.object,
		ethPrice: PropTypes.object,
		bnbPrice: PropTypes.object,
		polygonPrice: PropTypes.object,
		hecoPrice: PropTypes.object,
		avaxPrice: PropTypes.object,
		syscoinPrice: PropTypes.object,
		isVisibleInModal: PropTypes.bool,
		approveModalVisibleInModal: PropTypes.bool,
		hideAmount: PropTypes.func,
		currencyCode: PropTypes.string,
		currencyCodeRate: PropTypes.number,
		isLockScreen: PropTypes.bool
	};

	state = {
		showSwapButton: !shouldHideSthForAppStoreReviewer(),
		sendModalVisible: false,
		migrateModalVisible: false,
		receiveModalVisible: false,
		supportNativeBridge: false,
		supportCBridge: false,
		migrationLoading: false,
		imageWidths: {}
	};

	showSendModal = () => {
		this.setState({ sendModalVisible: true });
	};

	hideSendOrMigrateModal = () => {
		if (this.moveTabOrSendTabLoading) {
			return;
		}
		this.setState({
			sendModalVisible: false,
			migrateModalVisible: false,
			supportNativeBridge: false,
			supportCBridge: false
		});
	};

	renderSendAndMoveModal = () => {
		const {
			asset,
			asset: { symbol },
			contractBalances,
			bscContractBalances,
			arbContractBalances,
			opContractBalances,
			polygonContractBalances,
			hecoContractBalances,
			avaxContractBalances,
			syscoinContractBalances,
			rpcContractBalances,
			ethPrice,
			bnbPrice,
			polygonPrice,
			hecoPrice,
			avaxPrice,
			syscoinPrice,
			contractExchangeRates,
			arbContractExchangeRates,
			bscContractExchangeRates,
			polygonContractExchangeRates,
			hecoContractExchangeRates,
			opContractExchangeRates,
			avaxContractExchangeRates,
			syscoinContractExchangeRates,
			currencyCode,
			currencyCodeRate
		} = this.props;
		const { balance } = calcAssetPrices(asset, {
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
			hecoPrice,
			avaxPrice,
			syscoinPrice,
			currencyCode,
			currencyCodeRate
		});
		const mainBalance = `${balance} ${symbol}`;
		if (this.state.sendModalVisible) {
			this.showingSendModal = true;
		} else if (this.state.migrateModalVisible) {
			this.showingSendModal = false;
		}
		return (
			<Modal
				isVisible={(this.state.sendModalVisible || this.state.migrateModalVisible) && !this.props.isLockScreen}
				onBackdropPress={this.hideSendOrMigrateModal}
				onBackButtonPress={this.hideSendOrMigrateModal}
				onSwipeComplete={this.hideSendOrMigrateModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.bottomModal}
				useNativeDriver={Device.isAndroid()}
				backdropTransitionOutTiming={0}
			>
				{this.showingSendModal ? (
					<SendTab
						navigation={this.props.navigation}
						asset={this.props.asset}
						mainBalance={mainBalance}
						onClose={this.hideSendOrMigrateModal}
						onLoading={this.onMoveTabOrSendTabLoading}
					/>
				) : (
					<MoveTab
						navigation={this.props.navigation}
						asset={this.props.asset}
						mainBalance={mainBalance}
						onClose={this.hideSendOrMigrateModal}
						onLoading={this.onMoveTabOrSendTabLoading}
						supportNativeBridge={this.state.supportNativeBridge}
						supportCBridge={this.state.supportCBridge}
					/>
				)}
				{this.renderQRScannerInModal()}
				{this.renderApproveModalInModal()}
			</Modal>
		);
	};

	renderApproveModalInModal = () =>
		this.props.approveModalVisibleInModal && (
			<Approve modalVisible toggleApproveModal={() => store.dispatch(toggleApproveModalInModal())} />
		);

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
				useNativeDriver={Device.isAndroid()}
				backdropTransitionOutTiming={0}
			>
				<QrScanner />
			</Modal>
		);

	hideReceiveModal = () => {
		this.props.hideAmount && this.props.hideAmount(false);
		this.setState({ receiveModalVisible: false });
	};

	showReceiveModal = () => {
		this.props.hideAmount && this.props.hideAmount(true);
		this.setState({ receiveModalVisible: true });
	};

	renderReceiveModal = () => (
		<Modal
			isVisible={this.state.receiveModalVisible && !this.props.isLockScreen}
			onBackdropPress={this.hideReceiveModal}
			onBackButtonPress={this.hideReceiveModal}
			onSwipeComplete={this.hideReceiveModal}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.bottomModal}
			useNativeDriver={Device.isAndroid()}
			backdropTransitionOutTiming={0}
		>
			<ReceiveTab navigation={this.props.navigation} onCancel={this.hideReceiveModal} asset={this.props.asset} />
		</Modal>
	);

	onMoveTabOrSendTabLoading = loading => {
		this.moveTabOrSendTabLoading = loading;
	};

	supportMigrate = async () => {
		const { asset } = this.props;
		if (asset.type === ChainType.Polygon) {
			if (asset.nativeCurrency) {
				return false;
			}
			const { PolygonContractController, PolygonNetworkController } = Engine.context;
			const l1Address = await PolygonContractController.toEthereumAddress(asset.address);
			if (!l1Address) {
				const { MaticWETH } = await PolygonNetworkController.polygonNetworkConfig(
					PolygonNetworkController.state.provider.chainId
				);
				if (asset.address.toLowerCase() !== MaticWETH?.toLowerCase()) {
					return false;
				}
			}
		} else if (asset.type === ChainType.Bsc) {
			return false;
			// if (asset.nativeCurrency) {
			// 	return false;
			// }
			// this.setState({ migrationLoading: true });
			// const { BscBridgeController } = Engine.context;
			// const tokens = await BscBridgeController.getSupportTokens();
			// const lowerAddress = asset.address.toLowerCase();
			// const token = tokens?.find(token => token?.bscContractAddress?.toLowerCase() === lowerAddress);
			// if (!token) {
			// 	return false;
			// }
		} else if (asset.type === ChainType.Arbitrum) {
			if (!asset.nativeCurrency && !asset.l1Address) {
				return false;
			}
		} else if (asset.type === ChainType.Heco) {
			return false;
		} else if (asset.type === ChainType.Optimism) {
			return false;
		} else if (asset.type === ChainType.Avax) {
			return false;
		} else if (asset.type === ChainType.Syscoin) {
			return false;
		} else if (util.isRpcChainType(asset.type)) {
			return false;
		}
		return true;
	};

	showMigrateModal = async () => {
		const { asset, toggleShowHint } = this.props;
		this.setState({ migrationLoading: true });
		const supportNativeBridge = await this.supportMigrate();
		const support = supportCBridge(asset);
		this.setState({ migrationLoading: false });
		if (!supportNativeBridge && !support) {
			toggleShowHint(strings('other.not_migration'));
			return;
		}

		this.setState({ migrateModalVisible: true, supportNativeBridge, supportCBridge: support });
	};

	onSwap = () => {
		if (this.props.hideOtherModal) {
			this.props.hideOtherModal();
		}
		const { asset } = this.props;
		let url = '';
		if (asset.type === ChainType.Ethereum) {
			if (asset.nativeCurrency) {
				url = 'https://bafybeidlvfo3j6lbrq56uultqp5urpirthugtwcrjc642jci4ntkko5ra4.ipfs.cf-ipfs.com/#/swap';
			} else {
				url =
					'https://bafybeidlvfo3j6lbrq56uultqp5urpirthugtwcrjc642jci4ntkko5ra4.ipfs.cf-ipfs.com/#/swap?inputCurrency=' +
					asset.address;
			}
		} else if (asset.type === ChainType.Polygon) {
			if (asset.nativeCurrency) {
				url = 'https://quickswap.exchange/#/swap';
			} else {
				url = 'https://quickswap.exchange/#/swap?inputCurrency=' + asset.address;
			}
		} else if (asset.type === ChainType.Optimism) {
			if (asset.nativeCurrency) {
				url = 'https://bafybeicals7ohbyykungbndrzk3qf6pydcbe2w3a3pftwrfbjjirkpxqbq.ipfs.cf-ipfs.com/#/swap';
			} else {
				url =
					'https://bafybeicals7ohbyykungbndrzk3qf6pydcbe2w3a3pftwrfbjjirkpxqbq.ipfs.cf-ipfs.com/#/swap?inputCurrency=' +
					asset.address;
			}
		} else if (asset.type === ChainType.Bsc) {
			if (asset.nativeCurrency) {
				url = 'https://exchange.pancakeswap.finance/#/swap';
			} else {
				url = 'https://exchange.pancakeswap.finance/#/swap?inputCurrency=' + asset.address;
			}
		} else if (asset.type === ChainType.Arbitrum) {
			if (asset.nativeCurrency) {
				url = 'https://sushiswap-interface-teamsushi.vercel.app/swap';
			} else {
				url = 'https://sushiswap-interface-teamsushi.vercel.app/swap/swap?inputCurrency=' + asset.address;
			}
		} else if (asset.type === ChainType.Heco) {
			if (asset.nativeCurrency) {
				url = 'https://ht.mdex.com/#/swap';
			} else {
				url = 'https://ht.mdex.com/#/swap?inputCurrency=' + asset.address;
			}
		} else if (asset.type === ChainType.Avax) {
			if (asset.nativeCurrency) {
				url = 'https://traderjoexyz.com/#/trade';
			} else {
				url = 'https://traderjoexyz.com/#/trade?inputCurrency=' + asset.address;
			}
		} else if (asset.type === ChainType.Syscoin) {
			if (asset.nativeCurrency) {
				url = 'https://app.pegasys.finance/#/swap';
			} else {
				url = 'https://app.pegasys.finance/#/swap?inputCurrency=' + asset.address;
			}
		}
		if (url !== '') {
			this.handleBrowserUrl(url, asset.type);
		}
	};

	handleBrowserUrl = (newTabUrl, chainType) => {
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl,
			chainType
		});
	};

	onImageLayout = (index, parentWidth, e) => {
		const { width } = e.nativeEvent.layout;
		const maxImageWidth = parentWidth - 24 - 20;
		if (width > maxImageWidth) {
			this.setState({ imageWidths: { ...this.state.imageWidths, [index]: maxImageWidth } });
		}
	};

	render() {
		const { migrationLoading, showSwapButton, imageWidths } = this.state;
		const isRpc = util.isRpcChainType(this.props.asset.type);
		const isZh = strings('other.accept_language') === 'zh';
		const isAndroid = Device.isAndroid();
		let buttonWidth = Device.getDeviceWidth() - (showSwapButton ? 15 : 30);
		buttonWidth /= showSwapButton ? 3.5 : 3;
		buttonWidth += 14;
		return (
			<>
				<ScrollView
					style={styles.actionScroll}
					showsHorizontalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					horizontal
					contentContainerStyle={styles.actionContainer}
				>
					<ImageCapInset
						style={[styles.actionView, { width: buttonWidth }]}
						source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
						capInsets={{ top: 0, left: 20, bottom: 0, right: 20 }}
					>
						<TouchableOpacity onPress={this.showSendModal} activeOpacity={activeOpacity}>
							<Image
								style={imageWidths[1] && { width: imageWidths[1] }}
								onLayout={e => this.onImageLayout(1, buttonWidth, e)}
								source={isZh ? img_send_cn : img_send_en}
								resizeMode={'contain'}
							/>
						</TouchableOpacity>
					</ImageCapInset>
					{!isRpc && showSwapButton && (
						<ImageCapInset
							style={[styles.actionView, { width: buttonWidth }]}
							source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
							capInsets={{ top: 0, left: 20, bottom: 0, right: 20 }}
						>
							<TouchableOpacity onPress={this.onSwap} activeOpacity={activeOpacity}>
								<Image
									style={imageWidths[2] && { width: imageWidths[2] }}
									onLayout={e => this.onImageLayout(2, buttonWidth, e)}
									source={isZh ? img_swap_cn : img_swap_en}
									resizeMode={'contain'}
								/>
							</TouchableOpacity>
						</ImageCapInset>
					)}
					<ImageCapInset
						style={[styles.actionView, { width: buttonWidth }]}
						source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
						capInsets={{ top: 0, left: 20, bottom: 0, right: 20 }}
					>
						<TouchableOpacity onPress={this.showMigrateModal} activeOpacity={activeOpacity}>
							{migrationLoading ? (
								<ActivityIndicator style={styles.buttonIcon} color={colors.$FE6E91} />
							) : (
								<Image
									style={imageWidths[3] && { width: imageWidths[3] }}
									onLayout={e => this.onImageLayout(3, buttonWidth, e)}
									source={isZh ? img_crosschain_cn : img_crosschain_en}
									resizeMode={'contain'}
								/>
							)}
						</TouchableOpacity>
					</ImageCapInset>
					<ImageCapInset
						style={[styles.actionView, { width: buttonWidth }]}
						source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
						capInsets={{ top: 0, left: 20, bottom: 0, right: 20 }}
					>
						<TouchableOpacity onPress={this.showReceiveModal} activeOpacity={activeOpacity}>
							<Image
								style={imageWidths[4] && { width: imageWidths[4] }}
								onLayout={e => this.onImageLayout(4, buttonWidth, e)}
								source={isZh ? img_receive_cn : img_receive_en}
								resizeMode={'contain'}
							/>
						</TouchableOpacity>
					</ImageCapInset>
				</ScrollView>

				{this.renderReceiveModal()}
				{this.renderSendAndMoveModal()}
			</>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
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
	syscoinContractBalances:
		state.engine.backgroundState.TokenBalancesController.syscoinContractBalances[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	rpcContractBalances:
		state.engine.backgroundState.TokenBalancesController.rpcContractBalances[
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
	isVisibleInModal: state.scanner.isVisibleInModal,
	approveModalVisibleInModal: state.modals.approveModalVisibleInModal,
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	currencyCodeRate: state.engine.backgroundState.TokenRatesController.currencyCodeRate,
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AssetActionView);
