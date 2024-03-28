import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import {
	View,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Text,
	Image,
	DeviceEventEmitter,
	Dimensions,
	Keyboard
} from 'react-native';
import PropTypes from 'prop-types';
import { ThemeContext } from '../../../theme/ThemeProvider';
import { createNewTab, createNewTabLast, closeAllTabs, closeTab, updateTab, saveTabs } from '../../../actions/browser';
import BrowserTab from '../BrowserTab';
import AppConstants from '../../../core/AppConstants';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import MStatusBar from '../../UI/MStatusBar';
import { onEvent } from '../../../util/statistics';
import { shouldHideSthForAppStoreReviewer } from '../../../util/ApiClient';
import AddressBar from '../AddressBar';
import Modal from 'react-native-modal';
import Popover from '../../UI/Popover';
import { strings } from '../../../../locales/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveTabId, getStorageActiveTabId, setActiveTab } from '../../../util/browser';
import SuggestPage from '../../UI/SuggestPage';
import { AutoCompleteType_DAPP } from '../../../core/AutoCompleteController';
import TabPageView from '../../UI/TabPageView';
import OpenedTabs from '../OpenedTabs';
import SafeArea from 'react-native-safe-area';
import { callSqlite } from '../../../util/ControllerUtils';
import RNFS from 'react-native-fs';

const screenWidth = Dimensions.get('window').width;
const tabSpaceSize = 20;

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white
	},
	flexOne: {
		flex: 1
	},
	margin0: {
		margin: 0,
		marginHorizontal: 10
	},
	tipModalLayout: {
		padding: 14
	},
	tipTile: {
		marginBottom: 10,
		color: colors.$030319,
		fontSize: 13
	},
	tipOk: {
		color: colors.brandPink300,
		fontSize: 13
	},
	flexRow: {
		flexDirection: 'row'
	},
	hitSlop: {
		top: 14,
		bottom: 14,
		left: 14,
		right: 14
	},
	modalContainer: {
		marginHorizontal: 38,
		backgroundColor: colors.white,
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 15,
		borderRadius: 10
	},
	securityBaseLayout: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 30,
		paddingTop: 20,
		paddingBottom: 15,
		backgroundColor: colors.white,
		borderRadius: 10
	},
	securityTitle: {
		...fontStyles.bold,
		color: colors.$1E1E1E,
		fontSize: 18,
		marginTop: 19
	},
	securityDesc: {
		color: colors.$60657D,
		fontSize: 13,
		paddingTop: 14,
		paddingBottom: 30,
		textAlignVertical: 'center'
	},
	touchClosePage: {
		width: 220,
		height: 36,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		justifyContent: 'center',
		alignItems: 'center'
	},
	touchCloseLabel: {
		fontSize: 14,
		color: colors.white
	},
	touchContinue: {
		width: 220,
		height: 36,
		borderRadius: 10,
		marginTop: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	continueLabel: {
		fontSize: 14,
		color: colors.$8F92A1
	},
	bottomLayout: {
		height: 58,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0
	},
	topLayout: {
		flex: 1,
		marginBottom: 58
	},
	browserParent: {
		width: screenWidth + tabSpaceSize,
		paddingRight: 20,
		flex: 1
	}
});

/**
 * PureComponent that wraps all the browser
 * individual tabs and the tabs view
 */
class Browser extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Function to create a new tab
		 */
		createNewTab: PropTypes.func,

		/**
		 * Function to create a new tab at the last position
		 */
		createNewTabLast: PropTypes.func,

		/**
		 * Function to close all the existing tabs
		 */
		closeAllTabs: PropTypes.func,
		/**
		 * Function to close a specific tab
		 */
		closeTab: PropTypes.func,
		/**
		 * Function to set the update the url of a tab
		 */
		updateTab: PropTypes.func,
		/**
		 * Array of tabs
		 */
		tabs: PropTypes.array,
		saveTabs: PropTypes.func,
		isLockScreen: PropTypes.bool,
		favouriteDapps: PropTypes.array
	};

	state = {
		initialPage: -1,
		tipModalVisible: false,
		securityModalVisible: false,
		showSuggestPage: false,
		tabBarHeight: 0,
		showOpenedTabs: false
	};

	pageViewRef = React.createRef();
	suggestPageRef = React.createRef();
	moreIconRect = null;
	securityIconRect = null;
	safeLevel = 0;
	safeDesc = '';
	addressBarRefs = {};
	safeAreaBottom = -1;
	tabCreating = false;
	shouldHideSth = shouldHideSthForAppStoreReviewer();

	pageBarRef = React.createRef();
	pageTabRef = React.createRef();

	keyboardDidHideListener = null;
	keyboardDidShowListener = null;

	componentDidMount = async () => {
		onEvent('openDapp');
		this.removeUnusedImages();
		if (!this.props.tabs.length) {
			this.newTab();
			setTimeout(async () => {
				this.initActiveTab();
			}, 200);
			this.addListener();
			return;
		}
		this.initActiveTab();
		this.addListener();
	};

	addListener = () => {
		if (Device.isIos() && this.safeAreaBottom === -1) {
			SafeArea.getSafeAreaInsetsForRootView().then(area => {
				const bottom = area.safeAreaInsets.bottom;
				this.safeAreaBottom = bottom;
			});
		}
		if (Device.isIos()) {
			this.keyboardDidShowListener = this.keyboardDidShow.bind(this);
			this.keyboardDidHideListener = this.keyboardDidHide.bind(this);
			Keyboard.addListener('keyboardWillShow', this.keyboardDidShowListener);
			Keyboard.addListener('keyboardWillHide', this.keyboardDidHideListener);
		}
		this.props.navigation.addListener('willBlur', () => {
			this.updateInitialPage();
		});
	};

	componentWillUnmount() {
		if (Device.isIos()) {
			this.keyboardDidShowListener && Keyboard.removeListener('keyboardDidShow', this.keyboardDidShowListener);
			this.keyboardDidShowListener && Keyboard.removeListener('keyboardDidHide', this.keyboardDidHideListener);
		}
	}

	keyboardDidShow(frames) {
		const addressbar = this.addressBarRefs[getActiveTabId()];
		if (addressbar && addressbar.current?.getIsInputEditing()) {
			this.setState({
				tabBarHeight: frames.endCoordinates.height - this.safeAreaBottom
			});
		}
		this.updateInitialPage();
	}

	keyboardDidHide(e) {
		if (this.state.tabBarHeight !== 0) {
			this.setState({ tabBarHeight: 0 });
		}
	}

	findTabIndex = tab => this.props.tabs.indexOf(tab);

	initActiveTab = async () => {
		let activeTab;
		const activeTabId = await getStorageActiveTabId();
		if (!activeTabId) {
			activeTab = this.props.tabs[this.props.tabs.length - 1];
		} else {
			activeTab = this.getTabById(Number(activeTabId));
			if (!activeTab) {
				activeTab = this.props.tabs[this.props.tabs.length - 1];
			}
		}
		this.switchToTab(activeTab);
		if (this.props.tabs.length > 10) {
			this.props.saveTabs(10, getActiveTabId());
			setTimeout(() => {
				activeTab = this.getTabById(Number(activeTabId));
				const activeTabIndex = this.findTabIndex(activeTab);
				this.setState({ initialPage: activeTabIndex });
			}, 100);
		} else {
			const activeTabIndex = this.findTabIndex(activeTab);
			this.setState({ initialPage: activeTabIndex });
		}
	};

	getTabById = id => this.props.tabs.find(tab => tab.id === id);

	newTab = (url, addRight) => {
		this.props.createNewTab(url || AppConstants.HOMEPAGE_URL, addRight, this.props.tabs.length);
	};

	closeAllTabs = () => {
		const { tabs } = this.props;
		this.props.closeAllTabs();
		this.newTab(null, false);
		this.setState({ initialPage: 0 });
		this.setState({ showOpenedTabs: false });
	};

	closeTab = tabId => {
		const { tabs } = this.props;
		if (tabId === getActiveTabId()) {
			const tab = this.getTabById(tabId);
			const activeTabIndex = this.findTabIndex(tab);
			if (tabs.length === 1) {
				this.newTab(null, false);
				this.setState({ initialPage: 0 });
				this.setState({ showOpenedTabs: false });
			} else if (activeTabIndex === 0) {
				this.switchToTab(tabs[1]);
			} else {
				this.switchToTab(tabs[activeTabIndex - 1]);
			}
		}
		this.props.closeTab(tabId, getActiveTabId());
		this.delayUpdateInitialPage();
	};

	switchToTab = tab => {
		setActiveTab(tab);
	};

	goHome = tabId => {
		this.setState({ securityModalVisible: false });
		DeviceEventEmitter.emit('AddressbarStateEmitter', { state: 'goHome' });
	};

	switchRightTab = tabId => {
		const tab = this.getTabById(tabId);
		const activeTabIndex = this.findTabIndex(tab);
		if (activeTabIndex === this.props.tabs.length - 1) {
			this.newTab(null, false);
			setTimeout(() => {
				const activeTab = this.getTabById(getActiveTabId());
				const activeTabIndex = this.findTabIndex(activeTab);
				this.gotoPage(activeTabIndex);
			}, 200);
		} else {
			const nextTab = this.props.tabs[activeTabIndex + 1];
			this.switchToTab(nextTab);
			const index = this.findTabIndex(nextTab);
			this.gotoPage(index);
			this.delayUpdateInitialPage();
		}
	};

	hideTipModal = () => {
		this.setState({ tipModalVisible: false });
	};

	showTipModal = () => {
		this.setState({ tipModalVisible: true });
	};

	renderTipModal = () => (
		<Modal style={styles.margin0} transparent visible={!this.props.isLockScreen}>
			{/*<View style={{width: 200, height: 100, backgroundColor: colors.blue}}></View>*/}

			<Popover isVisible fromRect={this.moreIconRect} disX={-20} placement={'top'}>
				<View style={styles.tipModalLayout}>
					<Text style={styles.tipTile}>{strings('browser.more_tip')}</Text>
					{/* eslint-disable-next-line react-native/no-inline-styles */}
					<View style={styles.flexRow}>
						<View style={styles.flexOne} />
						<TouchableOpacity
							hitSlop={styles.hitSlop}
							onPress={() => {
								this.hideTipModal();
							}}
						>
							<Text numberOfLines={1} style={styles.tipOk}>
								{strings('navigation.ok')}
							</Text>
						</TouchableOpacity>
						{/* eslint-disable-next-line react-native/no-inline-styles */}
						<View style={{ width: 30 }} />
						<TouchableOpacity
							hitSlop={styles.hitSlop}
							onPress={() => {
								this.hideTipModal();
								AsyncStorage.setItem('hasShownMoreTip', 'true');
							}}
						>
							<Text numberOfLines={1} style={styles.tipOk}>
								{strings('browser.dont_remind_again')}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Popover>
		</Modal>
	);

	hideSecurityModal = () => {
		if (this.safeLevel !== 2 && this.safeLevel !== 3) {
			this.setState({ securityModalVisible: false });
		}
	};

	renderSecurityModal = () => (
		<Modal
			style={styles.margin0}
			transparent
			onRequestClose={this.hideSecurityModal}
			visible={this.state.securityModalVisible && !this.props.isLockScreen}
			onBackdropPress={this.hideSecurityModal}
			onSwipeComplete={this.hideSecurityModal}
			onBackButtonPress={this.hideSecurityModal}
		>
			{/*<View style={{width: 200, height: 100, backgroundColor: colors.blue}}></View>*/}
			<View style={styles.modalContainer}>
				<View style={styles.securityBaseLayout}>
					<Image
						source={
							this.safeLevel === 3
								? require('../../../images/img_defi_danger.png')
								: this.safeLevel === 2
								? require('../../../images/img_defi_warning.png')
								: this.safeLevel === 1
								? require('../../../images/img_defi_safe.png')
								: require('../../../images/img_defi_unknown.png')
						}
					/>
					<Text style={styles.securityTitle} allowFontScaling={false}>
						{this.safeLevel === 0
							? strings('browser.unkown_website_title')
							: this.safeLevel === 1
							? strings('browser.whitelisted_dapp')
							: strings('browser.security_alert')}
					</Text>
					<Text style={styles.securityDesc} allowFontScaling={false}>
						{this.safeLevel === 0
							? strings('browser.unknown_desc')
							: this.safeLevel === 1
							? strings('browser.safe_desc')
							: this.safeDesc}
					</Text>
					{(this.safeLevel === 2 || this.safeLevel === 3) && (
						<TouchableOpacity
							onPress={() => {
								this.setState({ securityModalVisible: false });
								DeviceEventEmitter.emit('AddressbarStateEmitter', { state: 'goHome' });
							}}
							activeOpacity={activeOpacity}
							style={styles.touchClosePage}
						>
							<Text style={styles.touchCloseLabel} allowFontScaling={false}>
								{strings('browser.close_the_page')}
							</Text>
						</TouchableOpacity>
					)}
					{(this.safeLevel === 2 || this.safeLevel === 3) && (
						<TouchableOpacity
							onPress={() => {
								this.setState({ securityModalVisible: false });
							}}
							style={styles.touchContinue}
						>
							<Text style={styles.continueLabel} allowFontScaling={false}>
								{strings('browser.continue_to_browse')}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Modal>
	);

	openSuggestUrl = async (item: AutoCompleteResult) => {
		if (item.type === AutoCompleteType_DAPP) {
			callSqlite('updateWhitelistDapp', item.url, item.title, item.desc, item.chain, item.img, Date.now());
		}
		this.setState({ showSuggestPage: false });
		DeviceEventEmitter.emit('AddressbarStateEmitter', { state: 'go', url: item.url, title: item.title });
	};

	onFocusChange = focus => {
		if (this.state.showSuggestPage !== focus) {
			this.setState({ showSuggestPage: focus });
			if (focus) {
				this.updateInitialPage();
			}
		}
	};

	delayUpdateInitialPage = () => {
		setTimeout(() => {
			this.updateInitialPage();
		}, 500);
	};

	updateInitialPage = () => {
		const activeTabId = getActiveTabId();
		const activeTab = this.getTabById(Number(activeTabId));
		if (!activeTab) {
			return;
		}
		const activeTabIndex = this.findTabIndex(activeTab);
		if (this.state.initialPage !== activeTabIndex) {
			this.setState({ initialPage: activeTabIndex });
		}
	};

	clearTimeout = () => {
		if (this.handle && this.handle !== 0) {
			this.handle && clearTimeout(this.handle);
			this.handle = 0;
		}
	};

	timeoutUpdatePage = () => {
		this.clearTimeout();
		this.handle = setTimeout(() => {
			this.updateInitialPage();
		}, 2000);
	};

	onTextChange = text => {
		this.suggestPageRef?.current?.onSearchTextChange(text);
	};

	onSubmit = () => {
		this.suggestPageRef?.current?.onSubmit();
	};

	toggleTipModal = (tabId, rect) => {
		if (tabId === getActiveTabId()) {
			this.moreIconRect = rect;
			this.showTipModal();
		}
	};

	toggleSecurityModal = (safeLevel, safeDesc, rect) => {
		this.safeLevel = safeLevel;
		this.safeDesc = safeDesc;
		this.setState({ securityModalVisible: true });
		if (safeLevel === 0) {
			onEvent('ClickShieldInDapp');
		}
	};

	newTabRight = () => {
		let activeTabIndex = this.props.tabs.length;

		this.props.createNewTabLast(AppConstants.HOMEPAGE_URL, true, this.props.tabs.length);
		setTimeout(() => {
			const tab = this.props.tabs[activeTabIndex];
			this.switchToTab(tab);
			this.gotoPage(activeTabIndex);
			this.gotoOpenedPages(false);

			this.delayUpdateInitialPage();
		}, 200);
	};

	openOpenedTab = activeTabIndex => {
		setTimeout(() => {
			const tab = this.props.tabs[activeTabIndex];
			this.switchToTab(tab);
			this.gotoPage(activeTabIndex);
			this.gotoOpenedPages(false);
			this.delayUpdateInitialPage();
		}, 200);
	};

	renderBrowserTabs = addressBarRefs =>
		this.props.tabs.map((tab, index) => (
			// eslint-disable-next-line react-native/no-inline-styles
			<View key={`tab_browser_parent_${tab.id}`} style={styles.browserParent}>
				<BrowserTab
					key={`tab_browser_${tab.id}`}
					tabId={tab.id}
					initialUrl={tab.url}
					newTab={this.newTabRight}
					addressBarRef={addressBarRefs[tab.id]}
					closeTab={this.closeTab}
				/>
			</View>
		));

	renderAddressbarTabs = addressBarRefs =>
		this.props.tabs.map((tab, index) => (
			<AddressBar
				ref={addressBarRefs[tab.id]}
				key={`tab_addressbar_${tab.id}`}
				leftTabUrl={index === 0 ? 'add' : this.props.tabs[index - 1].url}
				rightTabUrl={index === this.props.tabs.length - 1 ? 'add' : this.props.tabs[index + 1]?.url}
				goHome={this.goHome}
				switchRightTab={this.switchRightTab}
				newTab={this.newTabRight}
				tabCount={this.props.tabs.length}
				tabId={tab.id}
				title={tab.title}
				url={tab.url}
				toggleTipModal={this.toggleTipModal}
				toggleSecurityModal={this.toggleSecurityModal}
				closeTab={this.closeTab}
				onFocusChange={this.onFocusChange}
				onTextChange={this.onTextChange}
				navigation={this.props.navigation}
				onSubmit={this.onSubmit}
				tabRef={this.pageTabRef}
				updateTab={this.props.updateTab}
				tabData={tab}
				gotoOpenedPages={this.gotoOpenedPages}
				showOpenedTabs={this.state.showOpenedTabs}
			/>
		));

	removeUnusedImages = () => {
		const usedUris = Object.values(this.props.tabs)
			.map(tab => tab.uri)
			.filter(Boolean);

		// Read the directory
		RNFS.readDir(RNFS.DocumentDirectoryPath)
			.then(files => {
				files.forEach(file => {
					// If the file is an image and it's not currently in use, delete it
					const filePath = Device.isAndroid ? `file://${file.path}` : file.path;
					if (file.name.endsWith('.png') && !usedUris.includes(filePath)) {
						RNFS.unlink(file.path)
							.then(() => console.log(`Image file ${file.path} deleted`))
							.catch(err => console.log(`Failed to delete image file ${file.path}: `, err));
					}
				});
			})
			.catch(err => console.log(`Failed to read directory ${RNFS.DocumentDirectoryPath}: `, err));
	};

	onChangeTab = page => {
		const tab = this.props.tabs[page];
		this.switchToTab(tab);
		if (Device.isAndroid() && !this.tabCreating) {
			this.timeoutUpdatePage();
			this.props.tabs.forEach((tab, index) => {
				if (!this.addressBarRefs[tab.id]) {
					this.addressBarRefs[tab.id].current?.setInputEditing(false);
				}
			});
		}
	};

	gotoPage = page => {
		this.pageTabRef?.current?.goToPage(page, true, false);
		this.pageBarRef?.current?.goToPage(page, true, false);
	};

	gotoOpenedPages = show => {
		this.setState({ showOpenedTabs: show });
	};

	render() {
		if (this.state.initialPage === -1) {
			return <View />;
		}

		this.props.tabs.forEach((tab, index) => {
			if (!this.addressBarRefs[tab.id]) {
				const addressBarRef = React.createRef();
				this.addressBarRefs[tab.id] = addressBarRef;
			}
		});
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}
				{...(Device.isAndroid() ? { collapsable: false } : {})}
			>
				<MStatusBar navigation={this.props.navigation} />
				<View style={styles.flexOne}>
					{this.state.showSuggestPage && (
						<SuggestPage
							ref={this.suggestPageRef}
							openUrl={this.openSuggestUrl}
							favourites={this.props.favouriteDapps}
						/>
					)}

					<View style={styles.flexOne}>
						{/* addressbar放上面，为了先渲染，然后addressbar 的ref 可以供browserTab使用*/}
						<View style={[styles.bottomLayout, { bottom: this.state.tabBarHeight }]}>
							<TabPageView
								locked={this.state.showSuggestPage}
								ref={this.pageBarRef}
								initialPage={this.state.initialPage}
								spaceSize={0}
								disableBottomBarSwitch={this.state.showOpenedTabs}
								onScroll={e => {
									this.pageTabRef?.current?.refScrollto(e);

									// this.clearTimeout();
								}}
								onChangeTab={page => {
									this.onChangeTab(page);
								}}
							>
								{this.renderAddressbarTabs(this.addressBarRefs)}
							</TabPageView>
						</View>
						<View style={styles.topLayout}>
							{this.state.showOpenedTabs ? (
								<OpenedTabs
									tabs={this.props.tabs}
									closeTab={this.closeTab}
									closeAllTabs={this.closeAllTabs}
									openOpenedTab={this.openOpenedTab}
									newTab={this.newTabRight}
									activeTab={this.state.initialPage}
									isLockScreen={this.props.isLockScreen}
								/>
							) : (
								<TabPageView
									ref={this.pageTabRef}
									spaceSize={tabSpaceSize}
									locked
									initialPage={this.state.initialPage}
									isIos
								>
									{this.renderBrowserTabs(this.addressBarRefs)}
								</TabPageView>
							)}
						</View>
					</View>

					{this.state.tipModalVisible && this.renderTipModal()}
					{this.state.securityModalVisible && this.renderSecurityModal()}
				</View>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	tabs: state.browser.tabs,
	isLockScreen: state.settings.isLockScreen,
	favouriteDapps: state.browser.favouriteDapps
});

const mapDispatchToProps = dispatch => ({
	createNewTab: (url, addRight, activeTabId) => dispatch(createNewTab(url, addRight, activeTabId)),
	createNewTabLast: (url, addRight, activeTabId) => dispatch(createNewTabLast(url, addRight, activeTabId)),
	closeAllTabs: () => dispatch(closeAllTabs()),
	closeTab: (id, activeTabId) => dispatch(closeTab(id, activeTabId)),
	updateTab: (id, url) => dispatch(updateTab(id, url)),
	saveTabs: (saveNum, activeTabId) => dispatch(saveTabs(saveNum, activeTabId))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Browser);
