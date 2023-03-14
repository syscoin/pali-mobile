import React, { PureComponent } from 'react';
import {
	RefreshControl,
	ScrollView,
	ActivityIndicator,
	StyleSheet,
	View,
	TouchableOpacity,
	Image,
	Platform,
	UIManager,
	Dimensions,
	Animated,
	SafeAreaView,
	NativeModules,
	Text,
	DeviceEventEmitter
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import Tokens, { closeAllOpenRows, hideRiskPop } from '../../UI/Tokens';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { showTransactionNotification, hideCurrentNotification } from '../../../actions/notification';
import { showScanner } from '../../../actions/scanner';
import CardSwiper from '../../UI/CardSwiper';
import CopyView from '../../UI/CopyView';
import Clipboard from '@react-native-community/clipboard';
import { ChainType, TokenType, util } from 'gopocket-core';
import MStatusBar from '../../UI/MStatusBar';
import Carousel from 'react-native-snap-carousel';
import { CURRENCIES } from '../../../util/currencies';
import Nft from '../../UI/Nft';
import ChainSettingView from '../../UI/ChainSettingView';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-community/async-storage';
import { showWalletConnectList } from '../../../actions/walletconnect';
import SetEnsAvatar from '../SendFlow/SetEnsAvatar';
import EnsSettingView, { HomePage } from '../../UI/EnsSettingView';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: viewportWidth, height: viewportHeight } = Dimensions.get('window');
function wp(percentage) {
	const value = (percentage * viewportWidth) / 100;
	return Math.round(value);
}
const cardScale = 0.9;
const shadowRatio = 20.0 / 375;
const shadowSize = wp(shadowRatio * 100);
const scaleWidth = wp(cardScale * 100);
const scaleShadowSize = scaleWidth * shadowRatio;
const slideWidth = viewportWidth - scaleShadowSize * 2 - shadowSize / 2;
const sliderWidth = viewportWidth;
const itemWidth = slideWidth;

const cardWidth = viewportWidth;
const cardHeight = (cardWidth * 250) / 375;
const chainSettingHeight = viewportHeight;
const scrollToY = cardHeight * 0.56;

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	header: {
		marginTop: 20,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingLeft: 20
	},
	title: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center'
	},
	scannerButton: {
		paddingRight: 20
	},

	walletConnectButton: {
		paddingLeft: 20,
		paddingRight: 14
	},
	buttonImg: {
		width: 24,
		height: 24
	},
	hitSlop: {
		top: 10,
		bottom: 10
	},
	slider: {
		marginTop: 0,
		overflow: 'visible'
	},
	sliderContentContainer: {
		paddingVertical: 0
	},
	sliderItem: {
		flex: 1,
		marginLeft: -(viewportWidth - slideWidth) / 2
	},
	flexOne: {
		flex: 1
	},
	notifyTitle: {
		color: colors.$030319,
		fontSize: 18,
		...fontStyles.bold,
		alignSelf: 'center',
		marginBottom: 12,
		textAlign: 'center'
	},
	notifyDesc: {
		color: colors.$60657D,
		fontSize: 13,
		alignSelf: 'center',
		lineHeight: 20
	},
	modalButtons: {
		marginTop: 20,
		flexDirection: 'row'
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
	cancelText: {
		fontSize: 14,
		color: colors.$FE6E91
	},
	okButton: {
		flex: 1.5,
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.$FE6E91,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 14,
		color: colors.white
	},
	notifyModalContainer: {
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		flexDirection: 'row',
		paddingVertical: 27,
		paddingHorizontal: 26,
		width: '80%'
	},
	marginLeftForBtn: {
		marginLeft: 57
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * Main view for the wallet
 */
class Wallet extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		selectedAddress: PropTypes.string,
		assets: PropTypes.array,
		wealths: PropTypes.object,
		identities: PropTypes.object,
		showScanner: PropTypes.func,
		ensEntries: PropTypes.object,
		showWalletConnectList: PropTypes.func,
		walletConnectIconVisible: PropTypes.bool,
		isLockScreen: PropTypes.bool,
		famousAccounts: PropTypes.array
	};

	state = {
		refreshing: false,
		isAmountHide: false,
		isCopyViewVisible: false,
		copyViewText: '',
		switchNftAddress: [],
		chainEditing: false,
		chainSettingMarginTop: new Animated.Value(chainSettingHeight),
		chainItemDraging: false,
		showNotifypermissionModal: false,
		showEnsSettingModal: false,
		selectEnsEntry: null,
		ensAvatarData: null,
		ensSettingPage: HomePage,
		searchEditing: false
	};

	popupInfos = {};
	currentAddress = '';
	scrollViewRef = React.createRef();
	tokenRef = React.createRef();
	ensSettingRef = React.createRef();
	isKeyboardShowing = false;
	carouselRef = React.createRef();
	firstItem = 0;

	componentDidMount = () => {
		if (Platform.OS === 'android') {
			this.focusListener = this.props.navigation.addListener('didFocus', () => {
				AsyncStorage.getItem('NotifypermissionModalShowed').then(previouslyShowed => {
					if (previouslyShowed !== 'true') {
						NativeModules.RNToolsManager.getIsNotificationEnabled().then(event => {
							if (!event) {
								this.setState({ showNotifypermissionModal: true });
								AsyncStorage.setItem('NotifypermissionModalShowed', 'true');
							}
						});
					}
				});
				this.focusListener && this.focusListener.remove();
			});
		}
	};

	onRefresh = async () => {
		this.closeTokenSwipeRow();
		this.setState({ refreshing: true });
		const {
			TokenRatesController,
			TokenBalancesController,
			AssetsDetectionController,
			CollectiblesController,
			DefiProtocolController
		} = Engine.context;
		const actions = [
			TokenRatesController.poll(),
			TokenBalancesController.poll(),
			AssetsDetectionController.detectTokens(),
			CollectiblesController.poll(),
			DefiProtocolController.poll(),
			Engine.refreshTransactionHistory()
		];
		await util.safelyExecuteWithTimeout(async () => await Promise.all(actions), false, 6000);
		this.setState({ refreshing: false });

		const { identities, selectedAddress } = this.props;
		const nftChecked = identities[selectedAddress]?.currentTokenType === TokenType.NFT;
		if (nftChecked) {
			DeviceEventEmitter.emit('onParentScroll', 100);
		}
	};

	closeTokenSwipeRow = () => {
		closeAllOpenRows();
	};

	onScanSuccess = (data, content) => {
		this.setState({ isCopyViewVisible: true, copyViewText: content });
	};

	openQRScanner = async () => {
		this.closeTokenSwipeRow();
		this.props.showScanner({
			onScanSuccess: this.onScanSuccess
		});
	};
	openSettings = async () => {
		this.closeTokenSwipeRow();
		this.props.navigation.navigate('SettingsView');
	};

	hideAssetAmount = opt => {
		this.setState({ isAmountHide: opt.isAmountHide });
	};

	swipeChange = (address, chainType) => {
		this.closeTokenSwipeRow();
		Engine.context.PreferencesController.updateCurrentChain(address, chainType);
	};

	pushToSecurity = contactEntry => {
		this.closeTokenSwipeRow();
		this.props.navigation.navigate('SecurityView', { contactEntry });
	};

	toggleChainEditing = () => {
		if (this.state.searchEditing) {
			return;
		}
		const chainEditing = !this.state.chainEditing;
		if (chainEditing) {
			this.setState({ chainEditing });
			Animated.spring(
				this.state.chainSettingMarginTop, //改变的动画变量
				{
					toValue: 0,
					duration: 300,
					useNativeDriver: false
				}
			).start();

			setTimeout(() => {
				this.scrollViewRef?.current?.scrollTo({ x: 0, y: scrollToY, animated: true });
			}, 250);
		} else {
			Animated.spring(this.state.chainSettingMarginTop, {
				toValue: chainSettingHeight,
				duration: 300,
				useNativeDriver: false
			}).start();
			setTimeout(() => {
				this.setState({ chainEditing, chainItemDraging: false });
			}, 200);
		}
	};

	toggleSearchEditing = editing => {
		if (editing) {
			setTimeout(() => {
				this.scrollViewRef?.current?.scrollTo({ x: 0, y: scrollToY, animated: true });
				this.setState({ searchEditing: editing });
			}, 10);
		} else {
			setTimeout(() => {
				this.setState({ searchEditing: editing });
			}, 10);
		}
	};

	setSelectedAddress = async address => {
		this.closeTokenSwipeRow();
		this.currentAddress = address;
		this.forceUpdate();
		this.handle && clearTimeout(this.handle);
		this.handle = 0;
		this.handle = setTimeout(async () => {
			const { selectedAddress } = this.props;
			if (address !== selectedAddress) {
				const { PreferencesController } = Engine.context;
				await PreferencesController.setSelectedAddress(address);
			} else {
				this.currentAddress = '';
				this.forceUpdate();
			}
		}, 1000);
	};

	UNSAFE_componentWillReceiveProps = (nextProps: Readonly<P>, nextContext: any) => {
		const { selectedAddress } = this.props;
		if (selectedAddress !== nextProps.selectedAddress && this.currentAddress === nextProps.selectedAddress) {
			this.currentAddress = '';
		}
	};

	renderContent = () => {
		const { identities, selectedAddress, assets, wealths, navigation, ensEntries, famousAccounts } = this.props;
		const { currencyCode } = Engine.context.TokenRatesController.state;
		const { isAmountHide, chainEditing, searchEditing } = this.state;
		let currentIndexAsset = ChainType.All;
		if (identities[selectedAddress]?.currentChain) {
			currentIndexAsset = identities[selectedAddress]?.currentChain;
		}

		const current_assets =
			currentIndexAsset === ChainType.All
				? [...assets]
				: assets.filter(asset => asset.type === currentIndexAsset);
		// const current_assets = assets.filter(asset => asset.isDefi);
		// const security_assets = assets.filter(asset => !asset.lockType);

		const contactEntrys = [];
		const observeContactEntrys = [];
		Object.values(identities).forEach((value, index) => {
			if (value.isObserve) {
				observeContactEntrys.push(value);
			} else {
				contactEntrys.push(value);
			}
		});
		if (observeContactEntrys.length > 0) {
			observeContactEntrys.forEach(item => {
				const famousAccount = famousAccounts.find(
					entry => entry.address?.toLowerCase() === item.address?.toLowerCase()
				);
				if (famousAccount) {
					item = {
						...item,
						famousBg: famousAccount.shadow_bg
					};
				}
				contactEntrys.push(item);
			});
		}

		contactEntrys.forEach((item, index) => {
			if (item.address === (this.currentAddress || selectedAddress)) {
				if (this.firstItem !== index) {
					if (this.carouselRef && this.carouselRef.current && this.firstItem < contactEntrys.length) {
						this.carouselRef.current.snapToItem(index, false);
					} else {
						this.firstItem = index;
					}
				}
			}
		});

		const nftChecked = identities[selectedAddress]?.currentTokenType === TokenType.NFT;
		const amountSymbol = CURRENCIES[currencyCode].symbol;

		let currentContactEntry = contactEntrys[this.firstItem];
		if (!currentContactEntry) {
			this.firstItem = 0;
			currentContactEntry = contactEntrys[0];
		}
		return (
			<View style={styles.wrapper}>
				<View>
					<Carousel
						keyboardShouldPersistTaps={'always'}
						ref={this.carouselRef}
						data={contactEntrys}
						renderItem={({ item, index }) => (
							<View style={styles.sliderItem} key={'slider-element-' + item.address}>
								<CardSwiper
									ensEntry={ensEntries[item.address]}
									wealth={wealths[item.address]}
									hideAssetAmount={this.hideAssetAmount}
									swipeChange={i => {
										this.swipeChange(item.address, i);
									}}
									contactEntry={item}
									amountHide={isAmountHide}
									amountSymbol={amountSymbol}
									toggleChainEditing={this.toggleChainEditing}
									touchAvatar={this.showEnsSettingModal}
								/>
							</View>
						)}
						sliderWidth={sliderWidth}
						itemWidth={itemWidth}
						firstItem={this.firstItem}
						inactiveSlideScale={cardScale}
						inactiveSlideOpacity={1}
						// inactiveSlideShift={20}
						containerCustomStyle={styles.slider}
						contentContainerCustomStyle={styles.sliderContentContainer}
						loop={false}
						loopClonesPerSide={2}
						layout={'default'}
						activeSlideAlignment={'center'}
						onSnapToItem={index => {
							this.firstItem = index;
							this.setSelectedAddress(contactEntrys[index].address);
						}}
						scrollEnabled={!chainEditing && !searchEditing}
					/>
				</View>

				{/* eslint-disable-next-line react-native/no-inline-styles */}
				<View style={{ paddingBottom: 6, zIndex: 1000 }}>
					{!chainEditing && (
						<View>
							{nftChecked ? (
								<Nft
									navigation={navigation}
									currentChainType={currentIndexAsset}
									currentAddress={this.currentAddress}
								/>
							) : (
								<Tokens
									ref={this.tokenRef}
									navigation={navigation}
									tabLabel={strings('wallet.tokens')}
									tokens={current_assets}
									currentAddress={this.currentAddress}
									isAmountHide={isAmountHide}
									isFirstAccount={contactEntrys[0]?.address === selectedAddress}
									pushToSecurity={this.pushToSecurity.bind(this, currentContactEntry)}
									toggleSearchEditing={this.toggleSearchEditing}
									contactEntry={currentContactEntry}
									currentChain={currentContactEntry.currentChain}
									currentChainType={currentIndexAsset}
								/>
							)}
						</View>
					)}
					{chainEditing && (
						<Animated.View style={[styles.flexOne, { marginTop: this.state.chainSettingMarginTop }]}>
							<KeyboardAwareScrollView enableOnAndroid extraHeight={300}>
								<ChainSettingView
									navigation={navigation}
									toggleChainEditing={this.toggleChainEditing}
									onDragStart={() => {
										this.setState({ chainItemDraging: true });
									}}
									onDragRelease={() => {
										this.setState({ chainItemDraging: false });
									}}
								/>
							</KeyboardAwareScrollView>
						</Animated.View>
					)}
				</View>
			</View>
		);
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	onEnsLoading = loading => {
		this.setEnsAvatarLoading = loading;
	};

	hideSetEnsAvatarModal = () => {
		if (!this.setEnsAvatarLoading) {
			this.setState({ ensAvatarData: null });
		}
	};

	renderSetEnsAvatarModal = () => (
		<Modal
			isVisible={!!this.state.ensAvatarData && !this.props.isLockScreen}
			onBackdropPress={this.hideSetEnsAvatarModal}
			onBackButtonPress={this.hideSetEnsAvatarModal}
			onSwipeComplete={this.hideSetEnsAvatarModal}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.bottomModal}
		>
			<SetEnsAvatar
				{...this.state.ensAvatarData}
				onClose={this.hideSetEnsAvatarModal}
				onLoading={this.onEnsLoading}
			/>
		</Modal>
	);

	renderNotifyPermissionModal = () => (
		<Modal isVisible={this.state.showNotifypermissionModal && !this.props.isLockScreen} statusBarTranslucent>
			<View style={styles.notifyModalContainer}>
				<View style={styles.flexOne}>
					<Text style={styles.notifyTitle}>{strings('other.enable_notification')}</Text>
					<Text style={styles.notifyDesc}>{strings('other.enable_notification_message')}</Text>
					<View style={styles.modalButtons}>
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={() => {
								this.setState({ showNotifypermissionModal: false });
							}}
						>
							<Text style={styles.cancelText}>{strings('other.cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.okButton}
							onPress={() => {
								this.setState({ showNotifypermissionModal: false });
								setTimeout(() => {
									NativeModules.RNToolsManager.gotoSetNotification();
								}, 50);
							}}
						>
							<Text style={styles.okText}>{strings('navigation.ok')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);

	_onStartShouldSetResponderCapture = () => hideRiskPop();

	showEnsSettingModal = async ensEntry => {
		if (await Engine.networks[ChainType.Ethereum].ismainnet()) {
			this.setState({ showEnsSettingModal: true, selectEnsEntry: ensEntry, ensSettingPage: HomePage });
		}
	};

	hideEnsSettingModal = () => {
		this.setState({ showEnsSettingModal: false });
	};

	renderEnsSettingModal = () => (
		<Modal
			isVisible={!this.props.isLockScreen && this.state.showEnsSettingModal}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={300}
			animationOutTiming={300}
			onBackdropPress={this.hideEnsSettingModal}
			onSwipeComplete={this.hideEnsSettingModal}
			onBackButtonPress={() => {
				if (!this.isKeyboardShowing) {
					if (this.state.ensSettingPage === HomePage) {
						this.hideEnsSettingModal();
					} else {
						this.setState({ ensSettingPage: HomePage });
					}
				}
			}}
			swipeDirection={'down'}
			propagateSwipe
			statusBarTranslucent
		>
			<View>
				<EnsSettingView
					setKeyboardState={isShowing => {
						this.isKeyboardShowing = isShowing;
					}}
					page={this.state.ensSettingPage}
					setCurrentPage={page => {
						this.setState({ ensSettingPage: page });
					}}
					ensEntry={this.state.selectEnsEntry}
					goOpeanSea={() => {
						this.hideEnsSettingModal();
						this.props.navigation.navigate('BrowserTabHome');
						this.props.navigation.navigate('BrowserView', {
							newTabUrl: 'https://opensea.io'
						});
					}}
					setAvatarData={data => {
						this.hideEnsSettingModal();
						setTimeout(() => {
							this.setState({ ensAvatarData: data });
						}, 1000);
					}}
				/>
			</View>
		</Modal>
	);

	contentViewScroll = e => {
		const offsetY = e.nativeEvent.contentOffset.y; //滑动距离
		const contentSizeHeight = e.nativeEvent.contentSize.height; //scrollView contentSize高度
		const oriageScrollHeight = e.nativeEvent.layoutMeasurement.height; //scrollView高度
		if (offsetY + oriageScrollHeight >= contentSizeHeight - 10) {
			DeviceEventEmitter.emit('onParentScroll', 1);
		} else if (offsetY < 350) {
			DeviceEventEmitter.emit('onParentScroll', 2);
		} else {
			DeviceEventEmitter.emit('onParentScroll', 3);
		}
	};

	render = () => (
		<SafeAreaView
			style={baseStyles.flexGrow}
			testID={'wallet-screen'}
			onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}
		>
			<MStatusBar navigation={this.props.navigation} />
			<View style={styles.header}>
				<TouchableOpacity hitSlop={styles.hitSlop} onPress={this.openSettings}>
					<Image style={styles.buttonImg} source={require('../../../images/3Nor.png')} />
				</TouchableOpacity>
				<View style={[styles.title, this.props.walletConnectIconVisible && styles.marginLeftForBtn]}>
					<Image source={require('../../../images/header_logo.png')} />
				</View>
				{this.props.walletConnectIconVisible && (
					<TouchableOpacity
						style={styles.walletConnectButton}
						hitSlop={styles.hitSlop}
						onPress={() => {
							this.props.showWalletConnectList();
						}}
					>
						<Image style={styles.buttonImg} source={require('../../../images/ic_walletconnect.png')} />
					</TouchableOpacity>
				)}
				<TouchableOpacity style={styles.scannerButton} hitSlop={styles.hitSlop} onPress={this.openQRScanner}>
					<Image style={styles.buttonImg} source={require('../../../images/scan_icon.png')} />
				</TouchableOpacity>
			</View>

			<View style={styles.wrapper}>
				<ScrollView
					style={styles.wrapper}
					refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
					keyboardShouldPersistTaps="handled"
					scrollEnabled={!this.state.chainItemDraging}
					ref={this.scrollViewRef}
					onMomentumScrollEnd={this.contentViewScroll}
				>
					<View style={styles.wrapper}>
						{this.props.selectedAddress ? this.renderContent() : this.renderLoader()}
					</View>
				</ScrollView>
			</View>
			<CopyView
				isVisible={this.state.isCopyViewVisible}
				title={this.state.copyViewText}
				onCancel={async () => this.setState({ isCopyViewVisible: false })}
				onOK={async () => {
					this.setState({ isCopyViewVisible: false });
					Clipboard.setString(this.state.copyViewText);
				}}
			/>
			{this.state.showNotifypermissionModal && this.renderNotifyPermissionModal()}
			{this.renderSetEnsAvatarModal()}
			{this.renderEnsSettingModal()}
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	identities: state.engine.backgroundState.PreferencesController.identities,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	assets:
		state.engine.backgroundState.AssetsDataModel.assets[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || [],
	wealths: state.engine.backgroundState.AssetsDataModel.wealths || {},
	ensEntries: state.engine.backgroundState.EnsController.ensEntries || [],
	walletConnectIconVisible: state.walletconnect.isIconVisible,
	isLockScreen: state.settings.isLockScreen,
	famousAccounts: state.settings.famousAccounts
});

const mapDispatchToProps = dispatch => ({
	showTransactionNotification: args => dispatch(showTransactionNotification(args)),
	hideCurrentNotification: () => dispatch(hideCurrentNotification()),
	showWalletConnectList: () => dispatch(showWalletConnectList()),
	showScanner: (onStartScan, onScanError, onScanSuccess) =>
		dispatch(showScanner(onStartScan, onScanError, onScanSuccess))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Wallet);
