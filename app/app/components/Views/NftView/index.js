import React, { PureComponent } from 'react';
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	StatusBar,
	NativeModules,
	Text,
	Animated
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import isSupportLuxy from '../../../util/luxy';
import MStatusBar from '../../UI/MStatusBar';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Engine from '../../../core/Engine';
import { fromWei, getChainTypeByChainId, getChainTypeNameByChainId } from '../../../util/number';
import Clipboard from '@react-native-community/clipboard';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import MediaPlayer from '../MediaPlayer';
import Modal from 'react-native-modal';
import SendNFTTab from '../SendFlow/SendNFTTab';
import FastImage from 'react-native-fast-image';
import iconBackBlack from '../../../images/back.png';
import iconBackWhite from '../../../images/ic_back_white.png';
import iconFavoriteBlack from '../../../images/ic_favorites_black.png';
import iconFavoriteWhite from '../../../images/ic_favorites_n.png';
import NFTImage from '../../UI/NFTImage';
import convertToProxyURL from 'react-native-video-cache';
import { toggleShowHint } from '../../../actions/hint';
import ImageCapInset from '../../UI/ImageCapInset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDefiIcon } from '../../../util/rpcUtil';
import { isSvgFile } from '../../../util/general';
import { getRpcChainTypeByChainId, isRpcChainId } from '../../../util/ControllerUtils';
import { ChainTypeBgDefi, ChainTypes } from '../../../util/ChainTypeImages';
import { ChainType } from 'gopocket-core';

const screenWidth = Device.getDeviceWidth();

const activeOpacity = 0.8;

let reload_once_called = false;

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	},
	draggerWrapper: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		zIndex: 10
	},
	draggerButton: {
		padding: 10,
		paddingHorizontal: 20
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomBg: {
		flex: 0,
		backgroundColor: colors.white
	},
	headWrapper: {
		flex: 1,
		marginHorizontal: 38,
		marginTop: 22,
		marginBottom: 42
	},
	childrenWrapper: {
		flex: 1,
		marginHorizontal: 38,
		marginVertical: 42
	},
	cardWrapper: {
		flex: 1,
		marginHorizontal: -2,
		marginTop: -17,
		marginBottom: -10
	},
	rowFlex: {
		flex: 1,
		flexDirection: 'row'
	},
	centerVerticalFlex: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	textKey1: {
		height: 40,
		fontSize: 28,
		color: colors.$030319,
		...fontStyles.medium
	},
	textValue1: {
		color: colors.$8F92A1,
		fontSize: 16
	},
	textPrice: {
		fontSize: 18,
		color: colors.$030319,
		marginLeft: 3,
		...fontStyles.medium
	},
	layoutKey2: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 40,
		justifyContent: 'center'
	},
	linearGradient: {
		flex: 1,
		borderRadius: 10,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center'
	},
	linearText: {
		...fontStyles.semibold,
		fontSize: 18,
		color: colors.white
	},
	itemTitle: {
		fontSize: 20,
		color: colors.$030319,
		...fontStyles.semibold
	},
	attributesValue: {
		...fontStyles.medium,
		color: colors.$030319,
		fontSize: 18
	},
	attributesType: {
		color: colors.$8F92A1,
		fontSize: 14
	},
	attributesItemRowMargin: {
		flex: 1,
		marginTop: 24,
		flexDirection: 'row'
	},
	technicalItem: {
		flexDirection: 'row',
		flex: 1,
		paddingTop: 15,
		paddingBottom: 10,
		alignItems: 'center'
	},
	blurLayout: {
		position: 'absolute',
		top: 0,
		left: 0
	},
	blurView: {
		position: 'absolute',
		top: 0,
		left: 0
	},
	padding0: {
		paddingTop: 0
	},
	tokenImg: {
		alignSelf: 'center',
		borderRadius: 10
	},
	tokenName: {
		fontSize: 24,
		color: colors.$030319,
		marginTop: 20,
		...fontStyles.bold
	},
	// eslint-disable-next-line react-native/no-color-literals
	tokenDescLayout: {
		padding: 15,
		backgroundColor: '#F9F9F9',
		borderRadius: 10,
		marginTop: 20
	},
	tokenDesc: {
		fontSize: 14,
		color: colors.$60657D
	},
	createdByLayout: {
		marginTop: 20,
		flexDirection: 'row',
		alignItems: 'center'
	},
	createdByIcon: {
		width: 32,
		height: 32,
		borderRadius: 15
	},
	createdByText: {
		fontSize: 12,
		color: colors.$030319,
		marginLeft: 8
	},
	createdByAddr: {
		fontSize: 12,
		color: colors.brandPink300,
		paddingVertical: 8,
		paddingRight: 10
	},
	// eslint-disable-next-line react-native/no-color-literals
	sendGifLayout: {
		backgroundColor: '#FE6E91',
		borderRadius: 10,
		height: 48,
		paddingBottom: 4
	},
	sendGifMargin: {
		marginTop: 30
	},
	tradeMargin: {
		marginTop: 12
	},
	collectionName: {
		fontSize: 14,
		color: colors.brandPink300,
		marginTop: 8,
		marginRight: 70
	},
	collectionImg: {
		width: 48,
		height: 49,
		borderRadius: 24,
		position: 'absolute',
		top: 10,
		right: 14
	},
	collectionDesc: {
		fontSize: 14,
		color: colors.$60657D,
		marginTop: 24
	},
	contractAddr: {
		fontSize: 16,
		color: colors.$030319,
		...fontStyles.semibold,
		flex: 1,
		marginRight: 14
	},
	technicalSub: {
		fontSize: 12,
		color: colors.$8F92A1,
		marginTop: -6
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	scroll_wrapper: {
		position: 'absolute',
		top: 0,
		backgroundColor: colors.white,
		bottom: 0,
		left: 0,
		right: 0
	},
	topLinearGradient: {
		zIndex: 9,
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0
	},
	securityLayout: {
		paddingHorizontal: 10,
		paddingVertical: 13,
		marginTop: 20,
		flexDirection: 'row',
		borderRadius: 10,
		alignItems: 'center'
	},
	securityIcon: {
		width: 30,
		height: 30,
		marginRight: 6
	},
	securityText: {
		flex: 1,
		fontSize: 12,
		color: colors.white,
		...fontStyles.medium
	},
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
	}
});

/**
 * View that displays a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 * and also the transaction list
 */
class NftView extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		favoriteCollectibles: PropTypes.array,
		showAlert: PropTypes.func,
		allCollectibles: PropTypes.object,
		toggleShowHint: PropTypes.func,
		isLockScreen: PropTypes.bool
	};

	state = {
		nftToken: undefined,
		IOSStatusBarHeight: 0,
		sendModalVisible: false,
		navBackColorOffset: new Animated.Value(0),
		barStyle: 'light-content',
		backImg: iconBackWhite,
		favoriteImg: iconFavoriteWhite,
		nftImageHeight: screenWidth - 40
	};
	sendLoading = false;

	changeNavHeight = 60;

	onScroll(event) {
		const y = event.nativeEvent.contentOffset.y;
		this.setState({ navBackColorOffset: new Animated.Value(y) });
		if (y > this.changeNavHeight / 2) {
			this.setState({ barStyle: 'dark-content', backImg: iconBackBlack, favoriteImg: iconFavoriteBlack });
		} else {
			this.setState({ barStyle: 'light-content', backImg: iconBackWhite, favoriteImg: iconFavoriteWhite });
		}
	}

	async componentDidMount() {
		const nftToken = this.props.navigation.getParam('nftToken', undefined);
		// console.log('===nftToken = ', nftToken);
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				statusBarHeight && this.setState({ IOSStatusBarHeight: statusBarHeight.height });
			});
		}
		this.setState({ nftToken });
	}

	async componentDidUpdate(prevProps: Readonly<P>) {
		const { nftToken } = this.state;
		if (prevProps?.allCollectibles !== this.props.allCollectibles && nftToken) {
			const collectibles = this.props.allCollectibles[nftToken.chainId];
			if (collectibles && collectibles.length > 0) {
				const nowToken = collectibles.find(
					collectible =>
						collectible.address === nftToken.address && collectible.token_id === nftToken.token_id
				);
				// eslint-disable-next-line react/no-did-update-set-state
				this.setState({ nftToken: { ...nftToken, ...nowToken } });
			}
		}
	}

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" color={colors.brandPink300} />
		</View>
	);

	goBack = () => {
		this.props.navigation.goBack();
	};

	getTraitValue = type => {
		const { nftToken } = this.state;
		const traits = nftToken.traits;
		const values = traits.filter(data => data.trait_type === type);
		if (values && values.length > 0) {
			return values[0].value;
		}
		return 'NULL';
	};

	copyAddressToClipboard = async address => {
		Clipboard.setString(address);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	renderAttributed = () => {
		const { nftToken } = this.state;
		const traits = nftToken.traits;
		if (!traits || traits.length <= 0) {
			return;
		}
		// const hasExtra = traits % 2 === 1;
		// const rowNum = Math.floor(traits / 2);

		return (
			<ImageCapInset
				style={styles.cardWrapper}
				source={Device.isAndroid() ? { uri: 'default_card' } : require('../../../images/default_card.png')}
				capInsets={baseStyles.capInsets}
			>
				<View style={[styles.childrenWrapper]}>
					<Text style={styles.itemTitle}>{strings('nft.attributes')}</Text>
					{traits.map((item, index) => {
						if (index % 2 === 0) {
							return (
								<View style={styles.attributesItemRowMargin} key={'Attributed-key=' + index}>
									<View style={styles.flexOne}>
										<Text style={styles.attributesValue}>{item.value}</Text>
										<Text style={styles.attributesType}>{item.trait_type}</Text>
									</View>
									{traits.length > index + 1 && (
										<View style={styles.flexOne}>
											<Text style={styles.attributesValue}>{traits[index + 1].value}</Text>
											<Text style={styles.attributesType}>{traits[index + 1].trait_type}</Text>
										</View>
									)}
								</View>
							);
						}
					})}
				</View>
			</ImageCapInset>
		);
	};

	handleBrowserUrl = (newTabUrl, chainType, reloadOnce = false) => {
		if (reload_once_called) {
			reloadOnce = false;
		} else if (reloadOnce) {
			reload_once_called = true;
		}
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl,
			chainType,
			reloadOnce
		});
	};

	renderSendModal = () => (
		<Modal
			isVisible={this.state.sendModalVisible && !this.props.isLockScreen}
			onBackdropPress={this.hideSendModal}
			onBackButtonPress={this.hideSendModal}
			onSwipeComplete={this.hideSendModal}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.bottomModal}
			useNativeDriver={Device.isAndroid()}
			backdropTransitionOutTiming={0}
		>
			<SendNFTTab
				navigation={this.props.navigation}
				asset={this.state.nftToken}
				onClose={this.hideSendModal}
				onLoading={this.onSendLoading}
			/>
		</Modal>
	);

	onSendLoading = loading => {
		this.sendLoading = loading;
	};

	hideSendModal = props => {
		if (this.sendLoading) {
			return;
		}
		this.setState({ sendModalVisible: false });
		if (props?.closeAll) {
			this.props.navigation.goBack();
		}
	};

	showSendModal = () => {
		this.setState({ sendModalVisible: true });
	};

	renderSecurityPanel = securityData => {
		const { address, name } = securityData;
		const hasTeamName = !!name;
		const _address = address.substr(0, 10) + '...' + address.substr(-10);
		return (
			<LinearGradient
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				colors={['#20D074', '#13D199']}
				style={styles.securityLayout}
			>
				<Image style={styles.securityIcon} source={require('../../../images/tag_safe.png')} />
				<Text style={styles.securityText}>
					{hasTeamName
						? strings('security.safe_nft_with_name', { contract: _address, name })
						: strings('security.safe_nft', { contract: _address })}
				</Text>
			</LinearGradient>
		);
	};

	renderActionView = () => {
		const { nftToken } = this.state;
		const isAndroid = Device.isAndroid();
		const isZh = strings('other.accept_language') === 'zh';
		const buttonWidth = 158;
		return (
			<ScrollView
				style={styles.actionScroll}
				showsHorizontalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				horizontal
				contentContainerStyle={styles.actionContainer}
			>
				{(nftToken.type === ChainType.Ethereum || nftToken.type === ChainType.Polygon) && (
					<ImageCapInset
						style={[styles.actionView, { width: buttonWidth }]}
						source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
						capInsets={{ top: 0, left: 40, bottom: 0, right: 40 }}
					>
						<TouchableOpacity
							onPress={() => {
								let hostUrl = 'https://opensea.io/assets/';
								if (nftToken.type === ChainType.Polygon) {
									hostUrl = 'https://opensea.io/assets/matic/';
								}
								const url = hostUrl + nftToken.asset_contract.address + '/' + nftToken.token_id;
								this.handleBrowserUrl(url, nftToken.type, true);
							}}
							activeOpacity={activeOpacity}
						>
							<Image
								style={{ width: buttonWidth }}
								source={require('../../../images/img_opensea.png')}
								resizeMode={'contain'}
							/>
						</TouchableOpacity>
					</ImageCapInset>
				)}
				{nftToken.type === ChainType.Ethereum && (
					<ImageCapInset
						style={[styles.actionView, { width: buttonWidth }]}
						source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
						capInsets={{ top: 0, left: 40, bottom: 0, right: 40 }}
					>
						<TouchableOpacity
							onPress={() => {
								const url =
									'https://looksrare.org/collections/' +
									nftToken.asset_contract.address +
									'/' +
									nftToken.token_id;
								this.handleBrowserUrl(url, nftToken.type, true);
							}}
							activeOpacity={activeOpacity}
						>
							<Image
								style={{ width: buttonWidth }}
								source={require('../../../images/img_looksrare.png')}
								resizeMode={'contain'}
							/>
						</TouchableOpacity>
					</ImageCapInset>
				)}

				<ImageCapInset
					style={[styles.actionView, { width: buttonWidth }]}
					source={isAndroid ? { uri: 'img_btn_bg' } : require('../../../images/img_btn_bg.png')}
					capInsets={{ top: 0, left: 40, bottom: 0, right: 40 }}
				>
					<TouchableOpacity onPress={this.showSendModal} activeOpacity={activeOpacity}>
						<Image
							style={{ width: buttonWidth }}
							source={
								isZh
									? require('../../../images/img_sendgift_cn.png')
									: require('../../../images/img_sendgift_en.png')
							}
							resizeMode={'contain'}
						/>
					</TouchableOpacity>
				</ImageCapInset>
			</ScrollView>
		);
	};

	render = () => {
		const { nftToken, IOSStatusBarHeight, barStyle, navBackColorOffset, backImg, favoriteImg } = this.state;
		const { navigation, favoriteCollectibles } = this.props;
		// console.log('====nftToken = ', nftToken);
		if (!nftToken) {
			return this.renderLoader();
		}
		const backgroundColor = navBackColorOffset.interpolate({
			inputRange: [0, this.changeNavHeight / 2, this.changeNavHeight],
			outputRange: [colors.transparent, '#FFFFFF30', '#FFFFFFFF'],
			extrapolate: 'clamp',
			useNativeDriver: true
		});
		let barHeight = 0;
		if (Device.isAndroid()) {
			barHeight = StatusBar.currentHeight;
		} else if (Device.isIos()) {
			barHeight = IOSStatusBarHeight;
		}

		// console.log('===favoriteCollectibles = ', favoriteCollectibles);
		const headerHeight = 56 + barHeight;
		const filterFavorite =
			favoriteCollectibles &&
			favoriteCollectibles.filter(
				favoriteData =>
					favoriteData.chainId === nftToken.chainId &&
					favoriteData.address === nftToken.asset_contract.address &&
					favoriteData.token_id === nftToken.token_id
			);
		const isFavorite = filterFavorite && filterFavorite.length > 0;
		const securityData = nftToken.securityData;
		return (
			<React.Fragment>
				<View style={styles.flexOne}>
					<MStatusBar
						navigation={navigation}
						barStyle={barStyle}
						fixPadding={false}
						backgroundColor={colors.transparent}
					/>
					<View style={styles.flexOne}>
						<LinearGradient
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
							colors={[colors.black02, colors.transparent]}
							style={[styles.topLinearGradient, { height: headerHeight, paddingTop: barHeight }]}
						/>

						<Animated.View
							style={[
								styles.draggerWrapper,
								{ backgroundColor, height: headerHeight, paddingTop: barHeight }
							]}
						>
							<TouchableOpacity
								style={styles.draggerButton}
								onPress={this.goBack}
								activeOpacity={activeOpacity}
							>
								<Image source={backImg} />
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.draggerButton}
								onPress={async () => {
									if (isFavorite) {
										await Engine.context.CollectiblesController.removeFavoriteCollectible(
											nftToken.asset_contract.address,
											nftToken.token_id,
											nftToken.chainId
										);
									} else {
										await Engine.context.CollectiblesController.addFavoriteCollectible(
											nftToken.asset_contract.address,
											nftToken.token_id,
											nftToken.chainId
										);
										this.props.toggleShowHint(strings('nft.add_favorites_success'));
									}
								}}
								activeOpacity={activeOpacity}
							>
								<Image
									source={isFavorite ? require('../../../images/ic_favorites_y.png') : favoriteImg}
								/>
							</TouchableOpacity>
						</Animated.View>

						<ScrollView
							style={styles.scroll_wrapper}
							keyboardShouldPersistTaps="handled"
							onScroll={this.onScroll.bind(this)}
							scrollEventThrottle={1}
							showsVerticalScrollIndicator={false}
						>
							<View>
								{!isSvgFile(nftToken.image_url) && (
									<View style={styles.blurLayout}>
										<NFTImage
											style={{ width: screenWidth, height: screenWidth }}
											imageUrl={nftToken.image_url}
											isBlurBg
										/>

										<BlurView
											style={[styles.blurView, { width: screenWidth, height: screenWidth }]}
											blurType="light"
											blurAmount={10}
											reducedTransparencyFallbackColor="white"
										/>
									</View>
								)}
								<ImageCapInset
									style={[styles.cardWrapper, { marginTop: headerHeight }]}
									source={
										Device.isAndroid()
											? { uri: 'default_card' }
											: require('../../../images/default_card.png')
									}
									capInsets={baseStyles.capInsets}
								>
									<View style={[styles.headWrapper, styles.padding0]}>
										{nftToken.animation_url ? (
											<MediaPlayer
												uri={convertToProxyURL(nftToken.animation_url)}
												style={[
													styles.tokenImg,
													{
														width: screenWidth - 40,
														height: screenWidth - 40
													}
												]}
												posterUri={nftToken.image_url}
											/>
										) : (
											<NFTImage
												style={[
													styles.tokenImg,
													{
														width: screenWidth - 40,
														height: this.state.nftImageHeight
													}
												]}
												imageUrl={nftToken.image_url}
												resizeMode={'stretch'}
												onLoad={e => {
													const imgWidth = e.nativeEvent.width;
													const imgHeight = e.nativeEvent.height;
													if (imgWidth !== imgHeight) {
														const newHeight =
															(imgHeight * (screenWidth - 40) * 1.0) / imgWidth;
														if (newHeight !== this.state.nftImageHeight) {
															this.setState({ nftImageHeight: newHeight });
														}
													}
												}}
												svgUseWebView
											/>
										)}
										<Text style={styles.tokenName}>{nftToken.name}</Text>
									</View>
								</ImageCapInset>

								<ImageCapInset
									style={styles.cardWrapper}
									source={
										Device.isAndroid()
											? { uri: 'default_card' }
											: require('../../../images/default_card.png')
									}
									capInsets={baseStyles.capInsets}
								>
									<View style={[styles.childrenWrapper]}>
										<View style={styles.rowFlex}>
											<View style={styles.centerVerticalFlex}>
												<Text style={styles.textKey1} allowFontScaling={false}>
													{nftToken.balanceOf.toString()}
												</Text>
												<Text style={styles.textValue1}>{strings('nft.amount')}</Text>
											</View>
											<View style={styles.centerVerticalFlex}>
												<View style={styles.layoutKey2}>
													<Image source={require('../../../images/ic_eth_price.png')} />
													<Text style={styles.textPrice} allowFontScaling={false}>
														{nftToken.last_sale?.total_price
															? fromWei(nftToken.last_sale.total_price || '0')
															: '-'}
													</Text>
												</View>
												<Text style={styles.textValue1}>{strings('nft.unit_price')}</Text>
											</View>
											<View style={styles.centerVerticalFlex}>
												<View style={styles.layoutKey2}>
													{isRpcChainId(nftToken.chainId) ? (
														getDefiIcon(getRpcChainTypeByChainId(nftToken.chainId))
													) : (
														<Image
															source={
																ChainTypeBgDefi[
																	ChainTypes.indexOf(
																		getChainTypeByChainId(nftToken.chainId)
																	)
																]
															}
														/>
													)}
												</View>

												<Text style={styles.textValue1}>{strings('nft.network')}</Text>
											</View>
										</View>
										{securityData && this.renderSecurityPanel(securityData)}
										{nftToken.description && (
											<View style={styles.tokenDescLayout}>
												<Text style={styles.tokenDesc}>{nftToken.description}</Text>
											</View>
										)}
										{nftToken.creator && nftToken.creator.address && (
											<View style={styles.createdByLayout}>
												<FastImage
													source={{ uri: nftToken.creator.profile_img_url }}
													style={styles.createdByIcon}
												/>
												<Text style={styles.createdByText}>{strings('nft.created_by')}</Text>
												<TouchableOpacity
													activeOpacity={0.8}
													onPress={() => {
														let url = 'https://opensea.io/' + nftToken.creator.address;
														if (isSupportLuxy(nftToken.chainId)) {
															url = 'https://luxy.io/user/' + nftToken.creator.address;
														}
														this.handleBrowserUrl(url);
													}}
												>
													<Text style={styles.createdByAddr}>
														{nftToken.creator.address.substr(2, 5).toUpperCase()}
													</Text>
												</TouchableOpacity>
											</View>
										)}
									</View>
								</ImageCapInset>

								{this.renderAttributed()}

								{nftToken.collection && nftToken.collection.name && nftToken.collection.slug && (
									<ImageCapInset
										style={styles.cardWrapper}
										source={
											Device.isAndroid()
												? { uri: 'default_card' }
												: require('../../../images/default_card.png')
										}
										capInsets={baseStyles.capInsets}
									>
										<View style={[styles.childrenWrapper]}>
											<Text style={styles.itemTitle}>{strings('nft.collection_intro')}</Text>
											<TouchableOpacity
												onPress={() => {
													let url =
														'https://opensea.io/collection/' + nftToken.collection.slug;
													if (isSupportLuxy(nftToken.chainId)) {
														url =
															'https://luxy.io/collections/' +
															nftToken.collection.name.toLowerCase().replace(/\s+/g, '-');
													}
													this.handleBrowserUrl(url);
												}}
											>
												<Text style={styles.collectionName}>{nftToken.collection.name}</Text>
											</TouchableOpacity>
											<FastImage
												source={{ uri: nftToken.collection.image_url }}
												style={styles.collectionImg}
											/>
											<Text style={styles.collectionDesc}>{nftToken.collection.description}</Text>
										</View>
									</ImageCapInset>
								)}
								<ImageCapInset
									style={styles.cardWrapper}
									source={
										Device.isAndroid()
											? { uri: 'default_card' }
											: require('../../../images/default_card.png')
									}
									capInsets={baseStyles.capInsets}
								>
									<View style={[styles.childrenWrapper]}>
										<Text style={styles.itemTitle}>{strings('nft.technical_info')}</Text>
										{nftToken.asset_contract && nftToken.asset_contract.address && (
											<View>
												<TouchableOpacity
													activeOpacity={0.5}
													style={styles.technicalItem}
													onPress={() => {
														this.copyAddressToClipboard(nftToken.asset_contract.address);
													}}
												>
													<Text style={styles.contractAddr} numberOfLines={1}>
														{nftToken.asset_contract.address.substring(0, 13) +
															'...' +
															nftToken.asset_contract.address.substring(30)}
													</Text>
													<Image source={require('../../../images/tx_copy.png')} />
												</TouchableOpacity>
												<Text style={styles.technicalSub}>
													{strings('nft.collection_contract')}
												</Text>
											</View>
										)}
										{nftToken.token_id && (
											<View>
												<TouchableOpacity
													activeOpacity={0.5}
													style={styles.technicalItem}
													onPress={() => {
														this.copyAddressToClipboard(nftToken.token_id);
													}}
												>
													<Text
														style={styles.contractAddr}
														numberOfLines={1}
														ellipsizeMode={'tail'}
													>
														{nftToken.token_id}
													</Text>
													<Image source={require('../../../images/tx_copy.png')} />
												</TouchableOpacity>
												<Text style={styles.technicalSub}>{strings('nft.token_id')}</Text>
											</View>
										)}
										{nftToken.chainId && (
											<View>
												<View
													style={styles.technicalItem}
													onPress={() => {
														this.copyAddressToClipboard(nftToken.token_id);
													}}
												>
													<Text
														style={styles.contractAddr}
														numberOfLines={1}
														ellipsizeMode={'tail'}
													>
														{getChainTypeNameByChainId(nftToken.chainId)}
													</Text>
												</View>
												<Text style={styles.technicalSub}>{strings('nft.in_network')}</Text>
											</View>
										)}
									</View>
								</ImageCapInset>
							</View>
						</ScrollView>
					</View>
				</View>
				<SafeAreaView style={styles.bottomBg} />
				{this.renderActionView()}
				{this.renderSendModal()}
			</React.Fragment>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	favoriteCollectibles:
		state.engine.backgroundState.CollectiblesController.favoriteCollectibles[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || [],
	allCollectibles:
		state.engine.backgroundState.CollectiblesController.allCollectibles[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config)),
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(NftView);
