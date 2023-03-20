/* eslint-disable react-native/no-inline-styles */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	TouchableOpacity,
	StyleSheet,
	Text,
	View,
	Image,
	TouchableWithoutFeedback,
	Dimensions,
	ImageBackground,
	StatusBar,
	LayoutAnimation,
	Animated,
	Platform,
	BackHandler,
	ActivityIndicator,
	DeviceEventEmitter,
	ScrollView
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TokenImage from '../TokenImage';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { addCurrencySymbol, balanceToFiatNumber, renderAmount } from '../../../util/number';
import AssetElement from '../AssetElement';
import { connect } from 'react-redux';
import Modal from 'react-native-modal';
import AddAsset from '../../Views/AddAsset';
import { BignumberJs as BigNumber, util } from 'gopocket-core';
import Popover from '../Popover';
import AsyncStorage from '@react-native-community/async-storage';
import LottieView from 'lottie-react-native';
import Device from '../../../util/Device';
import { CURRENCIES } from '../../../util/currencies';
import { SwipeListView } from 'react-native-swipe-list-view';
import Engine from '../../../core/Engine';
import { bottomShadow } from '../CardSwiper';
import { OTC_BANNER_HIDE, SORT_NAME, SORT_NETWORK, SORT_NETWORTH, TRUE } from '../../../constants/storage';
import { shouldHideSthForAppStoreReviewer } from '../../../util/ApiClient';
import ImageCapInset from '../ImageCapInset';
import { Easing } from 'react-native-reanimated';
import AssetSearch from '../AssetSearch';
import { getIsRpc } from '../../../util/rpcUtil';
import { setHideRiskTokens, updateSortType } from '../../../actions/settings';
import { getSecurityData } from '../../../util/security';
import { getIcTagByChainType } from '../../../util/ChainTypeImages';

const { width, height } = Dimensions.get('window');
const hideItemWidth = 70;
const popPadding = 10;
const r = width / 375;

const headerMarginHorizontal = 14;
const securityBtnWidth = 115;
const securityBtnHeight = 52;
const riskPopRect = {
	height: securityBtnHeight * r,
	width: securityBtnWidth * r,
	x: width - (securityBtnWidth + headerMarginHorizontal) * r,
	y: (-bottomShadow * r) / 2
};

const riskPopDisplayArea = { x: 0, y: 0, width: width - 14 * r, height };

const searchViewWidth = width - 75;

const LOAD_COUNT = 15;

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		zIndex: 10000,
		overflow: 'visible'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	backgroundImage: {
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center',
		width: 46,
		height: 52
	},
	header: {
		flex: 1,
		justifyContent: 'space-between',
		flexDirection: 'row',
		marginHorizontal: headerMarginHorizontal,
		marginTop: -bottomShadow / 2,
		marginBottom: 3
	},
	header_add: {
		marginLeft: 8
	},
	balances: {
		flex: 1,
		justifyContent: 'center'
	},
	ethLogo: {
		width: 40,
		height: 40,
		overflow: 'hidden',
		marginRight: 12
	},
	iconStyle: {
		width: 40,
		height: 40,
		alignItems: 'center',
		borderRadius: 8
	},
	claimText: {
		overflow: 'hidden',
		borderRadius: 3,
		backgroundColor: colors.transparent,
		fontSize: 10,
		color: colors.$FE6E91,
		paddingHorizontal: 9,
		paddingVertical: 1,
		borderColor: colors.$FE6E91,
		borderWidth: 1
	},
	titleItem: {
		flexDirection: 'row',
		marginBottom: 5,
		alignItems: 'center'
	},
	textItemName: {
		marginRight: 8,
		fontSize: 18,
		...fontStyles.normal,
		color: colors.$030319,
		maxWidth: width / 3
	},
	textItemBalance: {
		fontSize: 18,
		...fontStyles.normal,
		color: colors.$030319,
		flex: 1,
		textAlign: 'right'
	},
	strikethrough: {
		textDecorationLine: 'line-through'
	},
	textItemAmount: {
		fontSize: 11,
		color: colors.$8F92A1
	},
	flexOne: {
		flex: 1
	},
	flexDir: {
		flexDirection: 'row'
	},
	priceChageView: {
		fontSize: 11
	},
	iconLayout: {
		marginRight: 10,
		width: 50,
		height: 40,
		alignSelf: 'center'
	},
	tagView: {
		position: 'absolute',
		left: 30,
		top: 20
	},
	popLayout: {
		paddingLeft: 20,
		paddingRight: 20,
		paddingVertical: 6,
		paddingBottom: 20
	},
	popItem: {
		height: 40,
		color: colors.$666666,
		fontSize: 14,
		textAlignVertical: 'center',
		...Platform.select({
			ios: { lineHeight: 40 }
		})
	},
	animation: {
		width: 60,
		height: 60
	},
	animLayout: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 80
	},
	tagPosition: {
		position: 'absolute',
		right: -8,
		top: -3,
		zIndex: 1
	},
	defiTagPosition: {
		position: 'absolute',
		right: -8,
		top: 0,
		zIndex: 1
	},
	number: {
		fontSize: 11,
		color: colors.white,
		textAlign: 'center',
		textAlignVertical: 'center',
		marginHorizontal: 4
	},
	numberWrapper: {
		backgroundColor: colors.$F66564,
		minWidth: 16,
		height: 16,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'absolute',
		top: 4,
		right: 2
	},
	arrowLayout: {
		marginHorizontal: 4,
		justifyContent: 'center'
	},
	touchChildView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'stretch',
		width: hideItemWidth,
		paddingLeft: 6
	},
	space: {
		width: 7
	},
	moveText: {
		fontSize: 12,
		color: colors.$FE6E91,
		marginTop: 5
	},
	moveTextDiabled: {
		fontSize: 12,
		color: colors.$A6A6A6,
		marginTop: 5
	},
	hiddenItemBase: {
		marginLeft: width - hideItemWidth,
		flex: 1,
		width: hideItemWidth
	},
	margin0: {
		margin: 0,
		marginHorizontal: popPadding
	},
	securityPopLayout: {
		maxWidth: 210,
		paddingHorizontal: 20,
		paddingVertical: 10
	},
	popTitle: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.$030319,
		...fontStyles.bold
	},
	otcModal: {
		justifyContent: 'center',
		margin: 0,
		marginHorizontal: 22
	},
	otcModalRoot: {
		borderRadius: 8,
		backgroundColor: colors.white
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	buyBtn: {
		width: '100%',
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.$FE6E91,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 30
	},
	otcCloseBtn: {
		alignSelf: 'flex-end',
		paddingTop: 10,
		paddingRight: 12
	},
	otcInterLayout: {
		alignItems: 'center',
		marginHorizontal: 26,
		marginBottom: 30
	},
	otcContent1: {
		marginTop: 24,
		color: colors.$60657D,
		fontSize: 13,
		lineHeight: 17
	},
	otcContent2: {
		marginTop: 10,
		color: colors.$60657D,
		fontSize: 13,
		lineHeight: 17
	},
	otcClickHereLabel: {
		color: colors.$5092FF
	},
	otcClickBtn: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 40,
		width: 100
	},
	otcBuyLabel: {
		color: colors.white,
		fontSize: 14
	},
	otcBannerImg: {
		alignSelf: 'center',
		resizeMode: 'stretch',
		marginVertical: 10
	},
	otcBannerImgClose: {
		position: 'absolute',
		right: 10,
		top: 0
	},
	headerSearch: {
		flexDirection: 'row',
		flex: 1
	},
	headerRight: {
		flexDirection: 'row',
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0
	},
	animCover: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		width,
		zIndex: 2,
		backgroundColor: colors.white
	},
	loadMorePadding: {
		paddingTop: 5
	},
	defiModalWrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		marginTop: 100,
		minHeight: 300
	},
	defiEthLogo: {
		width: 40,
		height: 40,
		overflow: 'hidden',
		marginRight: 10
	},
	defiIconStyle: {
		width: 40,
		height: 40,
		alignItems: 'center',
		borderRadius: 20
	},
	defiTitleName: {
		marginRight: 15,
		fontSize: 20,
		...fontStyles.semibold,
		color: colors.$5092FF,
		flexShrink: 1
	},
	defiTitleBalance: {
		fontSize: 20,
		...fontStyles.semibold,
		color: colors.$030319
	},
	defiTokenEthLogo: {
		width: 20,
		height: 20,
		overflow: 'hidden',
		marginLeft: -6
	},
	defiTokenIconStyle: {
		width: 20,
		height: 20,
		alignItems: 'center',
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.white
	},
	flexSpace: {
		flex: 10
	},
	flexGrowOne: {
		flexGrow: 1
	},
	defiModalMargin: {
		marginHorizontal: 20
	},
	defiModalTitle: {
		flexDirection: 'row',
		height: 90,
		alignItems: 'center',
		flex: 1
	},
	defiModalLine: {
		height: 1,
		backgroundColor: colors.$F0F0F0
	},
	defiModalTokenContent: {
		flex: 1,
		justifyContent: 'center',
		marginBottom: 20
	},
	defiAppendLogo: {
		flexDirection: 'row',
		marginLeft: 6,
		marginTop: 20
	},
	defiSupply: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 6
	},
	defiSupplySambol: {
		flexShrink: 1,
		marginRight: 15,
		color: colors.$030319,
		fontSize: 14,
		...fontStyles.semibold
	},
	defiSupplyBalance: {
		color: colors.$030319,
		fontSize: 14,
		...fontStyles.semibold
	},
	defiReward: {
		flexDirection: 'row',
		marginTop: 4
	},
	rewardText: {
		fontSize: 14,
		color: colors.$030319,
		marginTop: 4
	},
	rewardMargin: {
		marginLeft: 20,
		flex: 1
	},
	deifRewardItem: {
		flexDirection: 'row',
		marginTop: 4
	},
	rewardItemSambol: {
		flexShrink: 1,
		color: colors.$8F92A1,
		fontSize: 14,
		marginRight: 15
	},
	rewardItemBalance: {
		color: colors.$8F92A1,
		fontSize: 14
	},
	defiTouch: {
		flexDirection: 'row',
		flexShrink: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	popButtonNormal: {
		backgroundColor: colors.$F6F6F6,
		borderRadius: 10,
		width: 78,
		height: 70,
		justifyContent: 'center',
		alignItems: 'center'
	},
	popButtonSelected: {
		backgroundColor: colors.$FE6E91
	},
	popButtonTextNoraml: {
		fontSize: 11,
		color: colors.$666666,
		marginTop: 4,
		textAlign: 'center'
	},
	popButtonTextSelected: {
		color: colors.white
	},
	marginLeft10: {
		marginLeft: 10
	},
	popLine: {
		height: 1,
		backgroundColor: colors.$F0F0F0,
		marginTop: 10,
		marginBottom: 20
	},
	itemPrice: {
		fontSize: 11,
		color: colors.$8F92A1,
		textAlign: 'right',
		flex: 1,
		marginLeft: 5
	}
});

const swipeListRef = React.createRef();
export const closeAllOpenRows = () => {
	swipeListRef?.current?.closeAllOpenRows();
};

let tokensInstance = null;
export const hideRiskPop = () => {
	if (tokensInstance) {
		return tokensInstance.hideNewRiskPop();
	}
	return false;
};

/**
 * View that renders a list of ERC-20 Tokens
 */
class Tokens extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		tokens: PropTypes.array,
		isAmountHide: PropTypes.bool,
		selectedAddress: PropTypes.string,
		currentAddress: PropTypes.string,
		pushToSecurity: PropTypes.func,
		redDotData: PropTypes.object,
		isLockScreen: PropTypes.bool,
		isFirstAccount: PropTypes.bool,
		toggleSearchEditing: PropTypes.func,
		contactEntry: PropTypes.object,
		currentChain: PropTypes.number,
		currentSortType: PropTypes.string,
		hideRiskTokens: PropTypes.bool,
		updateSortType: PropTypes.func,
		setHideRiskTokens: PropTypes.func,
		currentChainType: PropTypes.number,
		hideNormalTokens: PropTypes.bool,
		hideDefiPortfolio: PropTypes.bool
	};

	state = {
		newRiskPopVisible: false,
		addAssetModalVisible: false,
		buttonRect: null,
		isVisible: false,
		otcModalVisible: false,
		otcBannerHide: TRUE,
		isEtherscanAvailable: false,
		searchEditing: false,
		searchViewAnimed: false,
		searchQuery: '',
		searchResults: [],
		tokenData: [],
		allToken: [],
		allTokenLength: 0,
		loadEnd: false,
		isLoading: true,
		defiModalVisible: false,
		selectedDefiToken: null
	};

	buttonRef = React.createRef();
	securityBtnRef = React.createRef();

	animWidth = new Animated.Value(0);
	isEndReached = false;
	isScrollTop = true;

	componentDidMount = async () => {
		// eslint-disable-next-line consistent-this
		tokensInstance = this;
		const otcBannerHide = await AsyncStorage.getItem(OTC_BANNER_HIDE);
		if (!otcBannerHide || otcBannerHide !== TRUE) {
			this.setState({ otcBannerHide: 'false' });
		}

		const isEtherscanAvailable = await util.isEtherscanAvailableAsync();
		if (isEtherscanAvailable) {
			this.setState({ isEtherscanAvailable });
		}

		if (Platform.OS === 'android') {
			BackHandler.addEventListener('hardwareBackPress', this.onBackAndroid);
		}
		DeviceEventEmitter.addListener('onParentScroll', this.onParentScroll);

		this.loadData();
	};

	componentWillUnmount = () => {
		tokensInstance = undefined;
		if (Platform.OS === 'android') {
			BackHandler.removeEventListener('hardwareBackPress', this.onBackAndroid);
		}
		DeviceEventEmitter.removeListener('onParentScroll', this.onParentScroll);
	};

	onBackAndroid = () => {
		if (this.state.searchEditing && this.props.navigation.isFocused()) {
			this.disableSearch();
			return true;
		}
		return false;
	};

	onParentScroll = type => {
		if (type === 2) {
			this.isScrollTop = true;
			return;
		}
		this.isScrollTop = false;
		if (type === 3) {
			return;
		}
		if (this.isEndReached || this.state.loadEnd) {
			return;
		}
		this.isEndReached = true;
		setTimeout(() => {
			this.isEndReached = false;
			this.loadData(this.state.tokenData.length);
		}, 100);
	};

	componentDidUpdate(preProps, preState) {
		if (
			preProps.currentSortType !== this.props.currentSortType ||
			preProps.hideRiskTokens !== this.props.hideRiskTokens ||
			preProps.selectedAddress !== this.props.selectedAddress ||
			preProps.currentChainType !== this.props.currentChainType
		) {
			this.loadData(0);
		} else if (preProps.tokens !== this.props.tokens) {
			const startIndex = this.state.tokenData.length >= LOAD_COUNT ? this.state.tokenData.length - LOAD_COUNT : 0;
			this.loadData(startIndex, true);
		}
	}

	hideNewRiskPop = () => {
		if (this.state.newRiskPopVisible) {
			this.setState({ newRiskPopVisible: false });
			return true;
		}
		return false;
	};

	hideAddAssetModal = () => {
		this.setState({ addAssetModalVisible: false });
	};

	renderLoading = () => (
		<View>
			{this.renderHeader()}
			<View style={styles.animLayout}>
				<LottieView
					style={styles.animation}
					autoPlay
					loop
					source={require('../../../animations/tokens_loading.json')}
				/>
			</View>
		</View>
	);

	onItemPress = token => {
		if (token.isDefi) {
			this.showDefiModal(token);
		} else {
			const { isAmountHide } = this.props;
			this.props.navigation.navigate('AssetView', { asset: token, isAmountHide });
		}
	};

	goToAddToken = () => {
		this.setState({ addAssetModalVisible: true });
		closeAllOpenRows();
	};

	onSecurityClick = async () => {
		const { selectedAddress } = this.props;
		const { SecurityController } = Engine.context;
		await SecurityController.hideNewRiskRedDot(selectedAddress);
		this.props.pushToSecurity();
	};

	toggleSwipeAsset = asset => {
		this.setState({ swipeAsset: asset });
	};

	toggleAnim = () => {
		LayoutAnimation.configureNext(
			LayoutAnimation.create(200, LayoutAnimation.Types.linear, LayoutAnimation.Properties.opacity)
		);
	};

	disableSearch = () => {
		const { toggleSearchEditing } = this.props;
		this.setState({ searchEditing: false, searchQuery: '', searchViewAnimed: false });
		toggleSearchEditing && toggleSearchEditing(false);
		this.toggleAnim();
	};

	renderHeader = () => {
		const { selectedAddress, redDotData, toggleSearchEditing } = this.props;
		const newRiskCount = redDotData?.newRiskList?.length;
		const { isEtherscanAvailable, searchEditing, searchViewAnimed } = this.state;
		return (
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => {
						if (searchViewAnimed) {
							this.disableSearch();
						} else if (!searchEditing) {
							this.showSortMenu();
						}
					}}
				>
					<Image
						source={
							searchEditing
								? require('../../../images/ic_asset_back.png')
								: require('../../../images/ic_asset_sorting.png')
						}
						ref={this.buttonRef}
					/>
				</TouchableOpacity>
				<View style={styles.headerSearch}>
					{!searchEditing && (
						<View style={styles.headerRight}>
							<TouchableOpacity
								style={styles.header_add}
								onPress={() => {
									this.setState({ searchEditing: true });
									// this.toggleAnim();
									this.animWidth.setValue(0);
									toggleSearchEditing && toggleSearchEditing(true);
									Animated.timing(this.animWidth, {
										toValue: searchViewWidth,
										duration: 200,
										easing: Easing.linear,
										useNativeDriver: true
									}).start(({ finished }) => {
										this.setState({ searchViewAnimed: true });
									});
								}}
							>
								<Image source={require('../../../images/ic_asset_search.png')} />
							</TouchableOpacity>
							{isEtherscanAvailable && !shouldHideSthForAppStoreReviewer() && (
								<TouchableOpacity style={styles.header_add} onPress={this.showOtcModal}>
									<Image source={require('../../../images/ic_asset_buy.png')} />
								</TouchableOpacity>
							)}

							<TouchableOpacity style={styles.header_add} onPress={this.showTxView}>
								<Image source={require('../../../images/ic_asset_history.png')} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.header_add} onPress={this.onSecurityClick}>
								<ImageBackground
									source={require('../../../images/ic_asset_security.png')}
									style={styles.backgroundImage}
								>
									<MaterialIcons color={'#8F92A1'} size={22} name="security" />
								</ImageBackground>
							</TouchableOpacity>

							<View style={styles.flexOne} />
						</View>
					)}
					{(searchEditing || searchViewAnimed) && (
						<View style={styles.flexOne}>
							<View style={styles.flexOne}>
								<ImageCapInset
									style={{ flex: 1, marginLeft: 8 }} //上下9， 左右6
									source={
										Device.isAndroid()
											? { uri: 'token_search_bg' }
											: require('../../../images/token_search_bg.png')
									}
									capInsets={{
										top: 15,
										left: 12,
										bottom: 0,
										right: 15
									}}
								>
									<AssetSearch
										onSearch={opts => {
											// this.listTokens = [];
											this.setState({
												searchResults: opts.results,
												searchQuery: opts.searchQuery
											});
										}}
										contactEntry={this.props.contactEntry}
										currentChain={this.props.currentChain}
									/>
								</ImageCapInset>
							</View>

							<Animated.View
								style={[
									styles.animCover,
									{
										transform: [
											{
												translateX: this.animWidth
											}
										]
									}
								]}
							/>
						</View>
					)}
				</View>
			</View>
		);
	};

	renderSecurityTag = asset => {
		const securityData = getSecurityData(asset);
		if (!securityData) {
			return;
		}
		if (!securityData.isTrust) {
			if (securityData.risk?.length > 0) {
				return <Image source={require('../../../images/tag_danger.png')} style={styles.tagPosition} />;
			}
			if (securityData.notice?.length > 0) {
				return <Image source={require('../../../images/tag_warning.png')} style={styles.tagPosition} />;
			}
		}
	};

	renderItem = (rowData, rowMap, allLength) => {
		const asset = rowData.item;
		const index = rowData.index;
		const { isAmountHide } = this.props;
		const { currencyCode } = Engine.context.TokenRatesController.state;
		const { price, priceChange, done, balanceFiat, balance } = asset;
		const securityData = getSecurityData(asset);
		const amountSymbol = CURRENCIES[currencyCode].symbol;
		const isEnd = index + 1 === allLength;
		const isRpc = getIsRpc(asset.type);
		const isDefi = asset.isDefi;
		const isRisk = securityData?.risk?.length > 0 && !securityData?.isTrust;
		return (
			<AssetElement
				key={index}
				onPress={token => {
					if (rowMap[this.getSwipeKey(index)].isOpen) {
						rowMap[this.getSwipeKey(index)]?.closeRow();
					}
					this.onItemPress(token);
				}}
				asset={asset}
				indexKey={index}
				isEnd={isEnd}
			>
				<View style={styles.iconLayout}>
					<TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />
					<Image style={styles.tagView} source={getIcTagByChainType(asset.type)} />
				</View>

				<View style={styles.balances}>
					<View style={styles.titleItem}>
						<Text style={styles.textItemName} numberOfLines={1}>
							{asset.symbol}
						</Text>
						{done ? (
							<Text style={styles.claimText}>{strings('other.claim')}</Text>
						) : (
							asset.lockType && <Image source={require('../../../images/lock_icon.png')} />
						)}
						<Text
							style={[styles.textItemBalance, isRisk && !isAmountHide ? styles.strikethrough : {}]}
							numberOfLines={1}
						>
							{isAmountHide ? '***' : balanceFiat}
						</Text>
					</View>
					{!isDefi &&
						(isRisk ? (
							<View style={styles.flexDir}>
								<Text style={styles.textItemAmount}>
									{isAmountHide ? '***' : renderAmount(balance)}
								</Text>
								<View style={styles.flexOne} />
								<Text style={styles.textItemAmount}>{strings('other.worthless_high_risk_token')}</Text>
							</View>
						) : (
							<View style={styles.flexDir}>
								<Text style={styles.textItemAmount}>
									{isAmountHide ? '***' : renderAmount(balance)}
								</Text>
								<Text
									numberOfLines={1}
									style={[
										styles.itemPrice,

										{
											color:
												!priceChange || priceChange === 0
													? colors.$8F92A1
													: priceChange > 0
													? colors.$09C285
													: colors.$FC6564
										}
									]}
								>
									{amountSymbol}
									{renderAmount(price && price > 10000 ? new BigNumber(price).toFixed(2) : price)}
								</Text>
								<View style={styles.arrowLayout}>
									{priceChange !== undefined && priceChange > 0 && (
										<Image source={require('../../../images/ic_aseet_up.png')} />
									)}
									{priceChange !== undefined && priceChange < 0 && (
										<Image source={require('../../../images/ic_aseet_down.png')} />
									)}
								</View>
								<Text
									style={[
										styles.priceChageView,
										{
											color:
												!priceChange || priceChange === 0
													? colors.$8F92A1
													: priceChange > 0
													? colors.$09C285
													: colors.$FC6564
										}
									]}
								>
									{priceChange ? Math.abs(priceChange.toFixed(2)) : '0'}%
								</Text>
							</View>
						))}
				</View>
				{isDefi ? (
					<Image source={require('../../../images/ic_tag_defi.png')} style={styles.defiTagPosition} />
				) : (
					this.renderSecurityTag(asset)
				)}
			</AssetElement>
		);
	};

	handleDeleteAsset = async asset => {
		const { AssetsController } = Engine.context;
		const { address, type } = asset;
		await AssetsController.removeAndIgnoreToken(address, type);
	};

	getSwipeKey = index => 'swipe-key-' + index;

	renderHide = (rowData, rowMap) => {
		const asset = rowData.item;
		const indexKey = rowData.index;
		return (
			<TouchableWithoutFeedback
				key={'swipeout-' + indexKey}
				onPress={() => {
					rowMap[this.getSwipeKey(indexKey)]?.closeRow();
					setTimeout(() => {
						this.handleDeleteAsset(asset);
					}, 1);
				}}
			>
				<View style={styles.touchChildView}>
					<Image source={require('../../../images/ic_asset_item_hide.png')} />
					<View style={styles.space} />
					<Text style={styles.moveText}>{strings('other.hide')}</Text>
				</View>
			</TouchableWithoutFeedback>
		);
	};

	renderHideDisabled = indexKey => (
		<TouchableWithoutFeedback key={'swipeout-' + indexKey}>
			<View style={styles.touchChildView}>
				<Image source={require('../../../images/ic_asset_item_hide_disable.png')} />
				<View style={styles.space} />
				<Text style={styles.moveTextDiabled}>{strings('other.hide')}</Text>
			</View>
		</TouchableWithoutFeedback>
	);

	loadData = (startIndex = 0, focusUpdate = false) => {
		if (this.isEndReached) {
			return;
		}
		if (this.state.loadEnd && startIndex !== 0 && !focusUpdate) {
			return;
		}
		this.isEndReached = true;

		let newTokens = this.state.allToken;
		if (startIndex === 0 || focusUpdate) {
			const { tokens, currentSortType, hideRiskTokens } = this.props;
			newTokens = hideRiskTokens
				? tokens.filter(token => !(token.securityData?.risk?.length > 0) || token.securityData?.isTrust)
				: tokens;
			if (currentSortType === SORT_NETWORK) {
				newTokens.sort((x, y) => x.type - y.type);
			} else if (currentSortType === SORT_NAME) {
				newTokens.sort((x, y) => x.symbol.toUpperCase().localeCompare(y.symbol.toUpperCase()));
			} else {
				newTokens.sort((x, y) => y.balanceFiatNumber - x.balanceFiatNumber);
			}
		}

		const allTokenLength = newTokens.length;
		const tokenData = [...newTokens];
		let loadEnd = true;
		const nextCount = startIndex + LOAD_COUNT;
		if (allTokenLength > 0) {
			if (nextCount < allTokenLength) {
				tokenData.length = nextCount;
				loadEnd = false;
			}
		}
		if (startIndex === 0 || focusUpdate) {
			this.setState({ tokenData, allToken: newTokens, loadEnd }, () => {
				this.isEndReached = false;
			});
		} else {
			this.setState({ tokenData, loadEnd }, () => {
				this.isEndReached = false;
			});
		}
	};

	renderLoadMoreView() {
		return (
			<View style={styles.loadMorePadding}>
				{!this.state.loadEnd && <ActivityIndicator size={'small'} color={colors.$FE6E91} />}
			</View>
		);
	}

	renderList = () => {
		const { isEtherscanAvailable, searchViewAnimed, tokenData, allToken } = this.state;
		const { tokens } = this.props;
		return (
			<View>
				{this.renderHeader()}
				{this.props.isFirstAccount &&
					this.state.otcBannerHide !== TRUE &&
					isEtherscanAvailable &&
					!shouldHideSthForAppStoreReviewer() &&
					this.renderOtcBanner()}
				{!searchViewAnimed ? (
					<SwipeListView
						useFlatList
						ref={swipeListRef}
						keyExtractor={(item, index) => this.getSwipeKey(index)}
						data={tokenData}
						renderItem={(rowData, rowMap) => this.renderItem(rowData, rowMap, allToken.length)}
						renderHiddenItem={(rowData, rowMap) => {
							const asset = rowData.item;
							const index = rowData.index;
							return (
								<View style={styles.hiddenItemBase}>
									{asset.nativeCurrency || asset.done || asset.isDefi
										? this.renderHideDisabled(index)
										: this.renderHide(rowData, rowMap)}
								</View>
							);
						}}
						rightOpenValue={-hideItemWidth}
						disableRightSwipe
						directionalDistanceChangeThreshold={5}
						ListFooterComponent={() => this.renderLoadMoreView()}
					/>
				) : (
					<AddAsset
						navigation={this.props.navigation}
						alreadyTokens={tokens || []}
						isAmountHide={this.props.isAmountHide}
						searchResults={this.state.searchResults}
						searchQuery={this.state.searchQuery}
					/>
				)}
			</View>
		);
	};

	renderAddAssetModal = () => (
		<Modal
			isVisible={this.state.addAssetModalVisible && !this.props.isLockScreen}
			onBackdropPress={this.hideAddAssetModal}
			onBackButtonPress={this.hideAddAssetModal}
			onSwipeComplete={this.hideAddAssetModal}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.bottomModal}
		>
			<AddAsset navigation={{ ...this.props.navigation, hideModal: this.hideAddAssetModal }} />
		</Modal>
	);

	showSortMenu = async () => {
		closeAllOpenRows();
		const { current } = this.buttonRef;
		current.measure((ox, oy, width, height, px, py) => {
			const statusBarHeight = StatusBar.currentHeight;
			const dis = Device.isAndroid() ? statusBarHeight : 0;
			this.setState({ buttonRect: { x: px - popPadding, y: py - dis, width, height }, isVisible: true });
		});
	};

	closePop = () => {
		this.setState({ isVisible: false });
	};

	renderSortMenu = () => {
		const { isVisible, buttonRect } = this.state;
		const { isLockScreen, currentSortType, hideRiskTokens, hideNormalTokens, hideDefiPortfolio } = this.props;
		return (
			<Modal
				style={styles.margin0}
				transparent
				visible={isVisible && !isLockScreen}
				onRequestClose={this.closePop}
			>
				<Popover isVisible={isVisible} fromRect={buttonRect} onClose={this.closePop}>
					<View style={styles.popLayout}>
						<TouchableOpacity
							onPress={() => {
								this.props.updateSortType(SORT_NETWORTH);
								this.closePop();
							}}
						>
							<Text
								style={[
									styles.popItem,
									{
										color: currentSortType === SORT_NETWORTH ? colors.$FE6E91 : colors.$666666
									}
								]}
							>
								{strings('other.sort_by_net_worth')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => {
								this.props.updateSortType(SORT_NAME);
								this.closePop();
							}}
						>
							<Text
								style={[
									styles.popItem,
									{ color: currentSortType === SORT_NAME ? colors.$FE6E91 : colors.$666666 }
								]}
							>
								{strings('other.sort_by_name')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => {
								this.props.updateSortType(SORT_NETWORK);
								this.closePop();
							}}
						>
							<Text
								style={[
									styles.popItem,
									{
										color: currentSortType === SORT_NETWORK ? colors.$FE6E91 : colors.$666666
									}
								]}
							>
								{strings('other.sort_by_network')}
							</Text>
						</TouchableOpacity>
						<View style={styles.popLine} />
						<View style={styles.flexDir}>
							<TouchableOpacity
								onPress={() => {
									Engine.context.PreferencesController.setHideNormalTokens(!hideNormalTokens);
									setTimeout(() => this.setState({ isVisible: false }), 200);
								}}
								activeOpacity={0.8}
								style={[styles.popButtonNormal, !hideNormalTokens && styles.popButtonSelected]}
							>
								<Image
									source={
										hideNormalTokens
											? require('../../../images/ic_sorting_normal.png')
											: require('../../../images/ic_sorting_normal_select.png')
									}
								/>
								<Text
									style={[
										styles.popButtonTextNoraml,
										!hideNormalTokens && styles.popButtonTextSelected
									]}
									allowFontScaling={false}
								>
									{strings('other.normal_tokens_selected')}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									Engine.context.PreferencesController.setHideDefiPortfolio(!hideDefiPortfolio);
									setTimeout(() => this.setState({ isVisible: false }), 200);
								}}
								activeOpacity={0.8}
								style={[
									styles.popButtonNormal,
									styles.marginLeft10,
									!hideDefiPortfolio && styles.popButtonSelected
								]}
							>
								<Image
									source={
										hideDefiPortfolio
											? require('../../../images/ic_sorting_defi.png')
											: require('../../../images/ic_sorting_defi_select.png')
									}
								/>
								<Text
									style={[
										styles.popButtonTextNoraml,
										!hideDefiPortfolio && styles.popButtonTextSelected
									]}
									allowFontScaling={false}
								>
									{strings('other.defi_portfolio_selected')}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								activeOpacity={0.8}
								style={[
									styles.popButtonNormal,
									styles.marginLeft10,
									!hideRiskTokens && styles.popButtonSelected
								]}
								onPress={() => {
									this.props.setHideRiskTokens(!hideRiskTokens);
									setTimeout(() => this.setState({ isVisible: false }), 200);
								}}
							>
								<Image
									source={
										hideRiskTokens
											? require('../../../images/ic_sorting_hrisk.png')
											: require('../../../images/ic_sorting_hrisk_select.png')
									}
								/>
								<Text
									style={[
										styles.popButtonTextNoraml,
										!hideRiskTokens && styles.popButtonTextSelected
									]}
									allowFontScaling={false}
								>
									{strings('other.high_risk_selected')}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Popover>
			</Modal>
		);
	};

	renderSecurityPop = () => {
		const { redDotData } = this.props;
		const newRiskCount = redDotData?.newRiskList?.length;
		const { newRiskPopVisible } = this.state;
		return (
			<Popover
				isVisible={newRiskPopVisible}
				displayArea={riskPopDisplayArea}
				fromRect={riskPopRect}
				onClose={this.hideNewRiskPop}
			>
				<View style={styles.securityPopLayout}>
					<Text style={styles.popTitle}>{strings('security.new_risks', { num: newRiskCount })}</Text>
				</View>
			</Popover>
		);
	};

	goWeb = url => {
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl: url
		});
	};

	renderOtcBanner = () => {
		// 1005 x 216
		const imgSource =
			strings('other.accept_language') === 'zh'
				? require('../../../images/img_otc_banner_cn.png')
				: require('../../../images/img_otc_banner_en.png');
		const imgWidth = width - 40;
		const imgHeight = (216 * imgWidth * 1.0) / 1005;
		return (
			<TouchableOpacity
				activeOpacity={0.8}
				onPress={() => {
					this.showOtcModal();
				}}
			>
				<Image
					style={[
						styles.otcBannerImg,
						{
							width: imgWidth,
							height: imgHeight
						}
					]}
					source={imgSource}
				/>
				<TouchableOpacity
					activeOpacity={0.8}
					style={styles.otcBannerImgClose}
					hitSlop={styles.hitSlop}
					onPress={() => {
						this.setState({ otcBannerHide: TRUE });
						AsyncStorage.setItem(OTC_BANNER_HIDE, TRUE);
					}}
				>
					<Image source={require('../../../images/ic_account_delete.png')} />
				</TouchableOpacity>
			</TouchableOpacity>
		);
	};

	showOtcModal = () => {
		this.setState({ otcModalVisible: true });
	};

	hideOtcModal = () => {
		this.setState({ otcModalVisible: false });
	};

	showTxView = () => {
		this.props.navigation.navigate('TransactionsView', { chainType: this.props.currentChainType });
	};

	renderOtcModal = () => (
		<Modal
			isVisible
			onBackdropPress={this.hideOtcModal}
			onBackButtonPress={this.hideOtcModal}
			onSwipeComplete={this.hideOtcModal}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.otcModal}
			statusBarTranslucent
		>
			<View style={styles.otcModalRoot}>
				<TouchableOpacity onPress={this.hideOtcModal} style={styles.otcCloseBtn} hitSlop={styles.hitSlop}>
					<Image source={require('../../../images/ic_pop_close.png')} />
				</TouchableOpacity>

				<View style={styles.otcInterLayout}>
					<Image source={require('../../../images/ic_transak.png')} />

					<View>
						<Text style={styles.otcContent1}>{strings('otc.content1')}</Text>

						<Text style={styles.otcContent2}>{strings('otc.content2')}</Text>
						<Text style={styles.otcContent2}>{strings('otc.content3')}</Text>
						<View>
							<Text style={styles.otcContent2}>
								<Text style={styles.otcClickHereLabel}>{strings('otc.content4')}</Text>
								{strings('otc.content5')}
							</Text>
							<TouchableOpacity
								style={styles.otcClickBtn}
								onPress={() => {
									this.hideOtcModal();
									this.goWeb(
										'https://www.notion.so/Coverage-Payment-Methods-Fees-Limits-30c0954fbdf04beca68622d9734c59f9'
									);
								}}
							/>
						</View>
					</View>

					<TouchableOpacity
						activeOpacity={0.6}
						style={styles.buyBtn}
						onPress={() => {
							this.hideOtcModal();
							this.goWeb('https://global.transak.com/?apiKey=2bd8015d-d8e6-4972-bcca-22770dcbe595');
						}}
					>
						<Text style={styles.otcBuyLabel}>{strings('otc.buy_now')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);

	hideDefiModal = () => {
		this.setState({ defiModalVisible: false });
	};

	showDefiModal = token => {
		this.setState({ selectedDefiToken: token, defiModalVisible: true });
	};

	renderDefiModal = () => {
		const { selectedDefiToken } = this.state;
		if (!selectedDefiToken) {
			return;
		}
		const portfolios = selectedDefiToken.portfolios;
		return (
			<Modal
				isVisible={!this.props.isLockScreen}
				onBackdropPress={this.hideDefiModal}
				onBackButtonPress={this.hideDefiModal}
				onSwipeComplete={this.hideDefiModal}
				statusBarTranslucent
				style={styles.bottomModal}
				animationType="fade"
				useNativeDriver
			>
				<TouchableOpacity style={styles.flexOne} activeOpacity={1.0} onPress={this.hideDefiModal}>
					<View style={styles.flexSpace} />
					<ScrollView
						style={styles.defiModalWrapper}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={styles.flexGrowOne}
					>
						<TouchableOpacity style={styles.defiModalMargin} activeOpacity={1}>
							<View style={styles.defiModalTitle}>
								<TouchableOpacity
									activeOpacity={0.8}
									style={styles.defiTouch}
									hitSlop={styles.hitSlop}
									onPress={() => {
										if (selectedDefiToken.siteUrl && selectedDefiToken.type) {
											this.hideDefiModal();
											this.props.navigation.navigate('BrowserTabHome');
											this.props.navigation.navigate('BrowserView', {
												newTabUrl: selectedDefiToken.siteUrl,
												chainType: selectedDefiToken.type
											});
										}
									}}
								>
									<TokenImage
										asset={selectedDefiToken}
										containerStyle={styles.defiEthLogo}
										iconStyle={styles.defiIconStyle}
									/>
									<Text style={styles.defiTitleName} numberOfLines={1} allowFontScaling={false}>
										{selectedDefiToken.symbol}
									</Text>
								</TouchableOpacity>

								<View style={styles.flexOne} />
								<Text style={[styles.defiTitleBalance]} allowFontScaling={false}>
									{this.props.isAmountHide ? '***' : selectedDefiToken.balanceFiat}
								</Text>
							</View>
							<View style={styles.defiModalLine} />
							<View style={styles.defiModalTokenContent}>
								{portfolios.map((portfolio, index) => {
									const supplyTokens = portfolio.supplyTokens;
									const rewardTokens = portfolio.rewardTokens;
									const priceUsd = portfolio.priceUsd;
									const {
										currencyCode,
										currencyCodeRate
									} = Engine.context.TokenRatesController.state;
									const balanceFiatNumber = balanceToFiatNumber(1, currencyCodeRate, priceUsd);
									const balanceFiat = addCurrencySymbol(balanceFiatNumber, currencyCode);
									let appendSymbol = '';
									supplyTokens.forEach(token => {
										appendSymbol =
											appendSymbol === '' ? token.symbol : appendSymbol + ' + ' + token.symbol;
									});
									return (
										<View key={'portfolio-' + index}>
											<View style={styles.defiAppendLogo}>
												{supplyTokens.map((token, index) => (
													<TokenImage
														key={'supply-icon-' + index}
														asset={token}
														containerStyle={styles.defiTokenEthLogo}
														iconStyle={styles.defiTokenIconStyle}
													/>
												))}
											</View>

											<View style={styles.defiSupply}>
												<Text style={styles.defiSupplySambol} allowFontScaling={false}>
													{appendSymbol}
												</Text>
												<View style={styles.flexOne} />
												<Text style={styles.defiSupplyBalance} allowFontScaling={false}>
													{balanceFiat}
												</Text>
											</View>

											{rewardTokens?.length > 0 && (
												<View style={styles.defiReward}>
													<Text style={styles.rewardText} allowFontScaling={false}>
														{strings('other.reward')}
													</Text>
													<View style={styles.rewardMargin}>
														{rewardTokens.map((token, index) => {
															const balanceFiatNumber = balanceToFiatNumber(
																token.amount,
																currencyCodeRate,
																token.priceUsd
															);
															const balanceFiat = addCurrencySymbol(
																balanceFiatNumber,
																currencyCode
															);
															return (
																<View
																	style={styles.deifRewardItem}
																	key={'reward-item-' + index}
																>
																	<Text
																		style={styles.rewardItemSambol}
																		numberOfLines={1}
																	>
																		{token.amount?.toFixed(2) + ' ' + token.symbol}
																	</Text>
																	<View style={styles.flexOne} />
																	<Text style={styles.rewardItemBalance}>
																		{balanceFiat}
																	</Text>
																</View>
															);
														})}
													</View>
													<View />
												</View>
											)}
										</View>
									);
								})}
							</View>
						</TouchableOpacity>
					</ScrollView>
				</TouchableOpacity>
			</Modal>
		);
	};

	render = () => {
		const { currentAddress } = this.props;
		const { tokenData } = this.state;
		const loading = !tokenData || tokenData.length === 0 || currentAddress;
		return (
			<View style={styles.wrapper}>
				{loading ? this.renderLoading() : this.renderList()}
				{this.renderAddAssetModal()}
				{this.renderSortMenu()}
				{this.renderSecurityPop()}
				{this.state.otcModalVisible && this.renderOtcModal()}
				{this.state.defiModalVisible && this.renderDefiModal()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	redDotData:
		state.engine.backgroundState.SecurityController.redDotDataMaps[
			state.engine.backgroundState.PreferencesController.selectedAddress
		],
	isLockScreen: state.settings.isLockScreen,
	currentSortType: state.settings.currentSortType,
	hideRiskTokens: state.settings.hideRiskTokens,
	hideDefiPortfolio: state.engine.backgroundState.PreferencesController.hideDefiPortfolio,
	hideNormalTokens: state.engine.backgroundState.PreferencesController.hideNormalTokens
});

const mapDispatchToProps = dispatch => ({
	updateSortType: sortType => dispatch(updateSortType(sortType)),
	setHideRiskTokens: hideRiskTokens => dispatch(setHideRiskTokens(hideRiskTokens))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	null,
	{ forwardRef: true }
)(Tokens);
