import React, { useState, useRef, useEffect } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import CookieManager from '@react-native-cookies/cookies';
import { clearWebViewIOSCache } from 'react-native-webview-ios-cache-clear';
import Modal from 'react-native-modal';
import { WebView } from 'react-native-webview';
import { util } from 'paliwallet-core';
import { useTheme } from '../../../theme/ThemeProvider';

import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { SvgUri } from 'react-native-svg';

import { strings } from '../../../../locales/i18n';

import { URL } from 'paliwallet-core';

import { callSqlite } from '../../../util/ControllerUtils';
import Device from '../../../util/Device';

import AntIcon from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';
import Icon from '../../UI/Icon/index.js';

const styles = StyleSheet.create({
	root: {
		backgroundColor: '#ebebeb',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		minHeight: 200,
		paddingBottom: Device.isIos() && Device.isIphoneX() ? 20 : 0
	},
	titleLayout: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	},
	checkboxWrapper: {
		flexDirection: 'column',
		marginLeft: 30,
		marginRight: 30
	},

	intro: {
		...fontStyles.semibold,
		color: colors.$030319,
		fontSize: 20,
		marginTop: 30,
		marginBottom: 30
	},
	animatedView: {
		width: '45%',
		padding: '3%',
		margin: '2.5%',
		borderRadius: 20,
		overflow: 'hidden'
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	innerRow: {
		flexDirection: 'row',
		flex: 1,
		paddingRight: 10
	},
	faviconContainer: {
		width: 22,
		height: 22,
		marginRight: 10,
		backgroundColor: 'white',
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center'
	},
	faviconImage: {
		width: 18,
		height: 18,
		borderRadius: 50
	},
	text: {
		flexShrink: 1
	},
	touchableOpacity: {
		borderColor: colors.brandPink500,
		borderWidth: 0,
		marginTop: 10
	},
	image: {
		width: '100%',
		height: 180,
		borderRadius: 20,
		backgroundColor: 'white'
	},
	flexOne: {
		flex: 1
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: '3%',
		backgroundColor: 'white',
		position: 'relative',
		zIndex: 999,
		alignItems: 'center'
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: colors.brandPink50,
		padding: 10,
		borderRadius: 50
	},
	addButtonText: {
		color: colors.brandPink300,
		marginLeft: 5
	},
	optionsButton: {
		width: 15,
		height: 30,
		marginRight: 10
	},
	optionsContainer: {
		position: 'absolute',
		right: 20,
		top: '6.5%',
		backgroundColor: '#fff',
		padding: 10,
		borderRadius: 12,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
		zIndex: 9999,
		width: 160,
		height: 75
	},
	closeTabsButton: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	closeTabsButtonWithMargin: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 15
	},
	closeTabsButtonText: {
		marginLeft: 10
	},
	scrollView: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		margin: '0.5%'
	},
	checkboxStyle: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	checkboxLine: {
		backgroundColor: '#ebebeb',
		height: 1,
		maxHeight: 1,
		marginTop: 20
	},
	title: {
		fontSize: 16,
		color: '#1F1D1F'
	},
	subTitle: {
		fontSize: 14,
		color: '#808795',
		marginTop: 8
	},
	pwModalButtons: {
		marginTop: 40,
		flexDirection: 'row',
		margin: 30
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
	cancelText: {
		fontSize: 14,
		color: colors.brandPink300
	},
	disabledButton: {
		opacity: 0.6
	},
	okButton: {
		flex: 1.5,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.brandPink300,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 14,
		...fontStyles.bold,
		color: colors.white
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	moreModalWrapper: {
		minHeight: 406,
		backgroundColor: colors.$F6F6F6
	},
	moreModalContainer: {
		flex: 1,
		marginTop: 20
	}
});

const TabItem = ({ tab, isActive, activeTab, onPress, closeTab, index }) => {
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const [favicon, setFavicon] = useState(null);
	const { isDarkMode } = useTheme();
	const handlePress = () => {
		onPress();
		Animated.timing(scaleAnim, {
			toValue: 1.05,
			duration: 150,
			useNativeDriver: true
		}).start();
	};

	useEffect(() => {
		const getFavicon = async () => {
			if (tab.url === 'paliwallet://homepage') {
				return setFavicon(require('../../../images/ic_dapp_home.png'));
			}

			const hName = new URL(tab.url).hostname;
			//get favicon from browser history
			const history = await callSqlite('getBrowserHistory');
			for (const subHistory of history) {
				const hostName = new URL(subHistory.url).hostname;
				if (hostName === hName) {
					if (subHistory.icon) {
						return setFavicon({ uri: subHistory.icon });
					}
				}
			}

			//use website url to get the favicon.
			return setFavicon({ uri: 'https://' + new URL(tab.url).hostname + '/favicon.ico' });
		};
		if (tab.url) getFavicon();
	}, [tab.url]);

	return (
		<Animated.View
			style={[
				styles.animatedView,
				{
					backgroundColor: isActive
						? isDarkMode
							? colors.$4CA1CF
							: colors.brandPink500
						: isDarkMode
						? colors.brandBlue500
						: colors.grey100
				},
				{ transform: [{ scale: scaleAnim }] }
			]}
		>
			<View style={styles.row}>
				<View style={styles.innerRow}>
					{favicon && (
						<View style={styles.faviconContainer}>
							{favicon.uri && favicon.uri.slice(-4) === '.svg' ? (
								//some favicon come as .svg
								<SvgUri width="18" height="18" uri={favicon.uri} />
							) : (
								<Image style={styles.faviconImage} source={favicon} />
							)}
						</View>
					)}
					<Text
						style={[
							styles.text,
							{ color: index === activeTab ? 'white' : isDarkMode ? colors.white : colors.black }
						]}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{tab.title}
					</Text>
				</View>
				<TouchableOpacity
					onPress={() => {
						closeTab(tab.id);
					}}
				>
					<AntIcon
						color={index === activeTab ? colors.white : isDarkMode ? colors.white : colors.black}
						name="close"
						size={16}
					/>
				</TouchableOpacity>
			</View>
			<TouchableOpacity activeOpacity={1} style={styles.touchableOpacity} onPress={handlePress}>
				<Image source={{ uri: tab.uri }} style={[styles.image, isDarkMode && baseStyles.darkCardBackground]} />
			</TouchableOpacity>
		</Animated.View>
	);
};

const OpenedTabs = ({ tabs, newTab, activeTab, openOpenedTab, closeTab, closeAllTabs, isLockScreen }) => {
	const [showOptions, setShowOptions] = useState(false);
	const [moreModalVisible, setMoreModalVisible] = useState(false);
	const [toggleCheckBoxHistory, setToggleCheckBoxHistory] = useState(false);
	const [toggleCheckBoxCache, setToggleCheckBoxCache] = useState(false);
	const [toggleCheckBoxCookies, setToggleCheckBoxCookies] = useState(false);
	const webviewCacheRef = useRef(null);

	const { isDarkMode } = useTheme();

	const clearBrowserData = async () => {
		const useWebKit = true;

		if (toggleCheckBoxHistory) {
			await callSqlite('clearBrowserHistory');
			setToggleCheckBoxHistory(false);
			util.logDebug('Browser History cleared');
		}
		if (toggleCheckBoxCookies) {
			await CookieManager.clearAll(useWebKit);
			setToggleCheckBoxCookies(false);
			util.logDebug('Browser cookies cleared');
		}

		if (toggleCheckBoxCache) {
			if (Device.isIos()) {
				const result = await clearWebViewIOSCache();
				util.logDebug('Browser cache cleared: ', result);
			} else {
				webviewCacheRef.current.clearCache(true);
				util.logDebug('Browser cache cleared');
			}

			setToggleCheckBoxCache(false);
		}
		hideMoreModal();
	};

	const hideMoreModal = () => {
		setMoreModalVisible(false);
	};

	const renderCleanDataModal = () => {
		const isButtonDisabled = !toggleCheckBoxCache && !toggleCheckBoxHistory && !toggleCheckBoxCookies;
		return (
			<Modal
				isVisible={!isLockScreen}
				onBackdropPress={hideMoreModal}
				onBackButtonPress={hideMoreModal}
				onSwipeComplete={hideMoreModal}
				statusBarTranslucent
				style={styles.bottomModal}
				animationType="fade"
				useNativeDriver
			>
				<View style={[styles.root, isDarkMode && baseStyles.darkModalBackground]}>
					<WebView style={{ width: 0, height: 0 }} ref={webviewCacheRef} />

					<View style={[styles.titleLayout, isDarkMode && baseStyles.darkBackground600]}>
						<Text style={[styles.intro, isDarkMode && baseStyles.textDark]}>
							{strings('browser.clearData')}
						</Text>
					</View>
					<View style={[styles.moreModalWrapper, isDarkMode && baseStyles.darkModalBackground]}>
						<View style={styles.moreModalContainer}>
							<View style={styles.checkboxWrapper}>
								<View style={styles.checkboxStyle}>
									<CheckBox
										disabled={false}
										boxType="square"
										onCheckColor={isDarkMode ? colors.$4CA1CF : colors.brandPink300}
										onTintColor="#aaaaaa"
										value={toggleCheckBoxHistory}
										onValueChange={newValue => setToggleCheckBoxHistory(newValue)}
									/>
									<View style={{ flexDirection: 'column', marginLeft: 12, marginTop: 16 }}>
										<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
											{' '}
											{strings('browser.browserHistory')}
										</Text>
										<Text style={styles.subTitle}>{strings('browser.clearBrowserHistory')}</Text>
									</View>
								</View>
								<View style={styles.checkboxLine} />
								<View style={styles.checkboxStyle}>
									<CheckBox
										disabled={false}
										boxType="square"
										onCheckColor={isDarkMode ? colors.$4CA1CF : colors.brandPink300}
										onTintColor="#aaaaaa"
										value={toggleCheckBoxCookies}
										onValueChange={newValue => setToggleCheckBoxCookies(newValue)}
									/>
									<View style={{ flexDirection: 'column', marginLeft: 12, marginTop: 16 }}>
										<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
											{strings('browser.cookiesHistory')}
										</Text>
										<Text style={styles.subTitle}>{strings('browser.clearCookiesHistory')}</Text>
									</View>
								</View>
								<View style={styles.checkboxLine} />
								<View style={styles.checkboxStyle}>
									<CheckBox
										disabled={false}
										boxType="square"
										onCheckColor={isDarkMode ? colors.$4CA1CF : colors.brandPink300}
										onTintColor="#aaaaaa"
										value={toggleCheckBoxCache}
										onValueChange={newValue => setToggleCheckBoxCache(newValue)}
									/>
									<View style={{ flexDirection: 'column', marginLeft: 12, marginTop: 16 }}>
										<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
											{strings('browser.cacheHistory')}
										</Text>
										<Text style={styles.subTitle}>{strings('browser.clearCacheHistory')}</Text>
									</View>
								</View>
								<View style={styles.checkboxLine} />
							</View>

							<View style={styles.pwModalButtons}>
								<TouchableOpacity
									style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
									onPress={hideMoreModal}
								>
									<Text style={[styles.cancelText, isDarkMode && baseStyles.textDark]}>
										{strings('action_view.cancel')}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.okButton,
										isDarkMode && baseStyles.darkConfirmButton,
										isButtonDisabled ? styles.disabledButton : null
									]}
									disabled={isButtonDisabled}
									onPress={clearBrowserData}
								>
									<Text style={[styles.okText, isDarkMode && baseStyles.darkConfirmText]}>
										{strings('browser.clear')}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		);
	};

	return (
		<View style={styles.flexOne}>
			{moreModalVisible && renderCleanDataModal()}
			{showOptions && (
				<View style={[styles.optionsContainer, isDarkMode && baseStyles.darkCardBackground]}>
					<TouchableOpacity
						style={styles.closeTabsButton}
						onPress={() => {
							setShowOptions(false);
							setMoreModalVisible(true);
						}}
					>
						<Icon name="broom" color={isDarkMode ? colors.white : colors.black} width="18" height="18" />
						<Text style={[styles.closeTabsButtonText, isDarkMode && baseStyles.textDark]}>
							{strings('browser.clearData')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.closeTabsButtonWithMargin}
						onPress={() => {
							closeAllTabs();
							setShowOptions(false);
						}}
					>
						<AntIcon color={isDarkMode ? colors.white : colors.black} name="closecircleo" size={18} />
						<Text style={[styles.closeTabsButtonText, isDarkMode && baseStyles.textDark]}>
							{strings('browser.closeAll')}
						</Text>
					</TouchableOpacity>
				</View>
			)}
			<View style={[styles.header, isDarkMode && baseStyles.darkBackground]}>
				<TouchableOpacity
					style={[styles.addButton, { backgroundColor: isDarkMode && colors.paliBlue100 }]}
					onPress={() => newTab()}
				>
					<Entypo color={isDarkMode ? colors.$4CA1CF : colors.brandPink300} name="plus" size={22} />
					<Text style={[styles.addButtonText, isDarkMode && baseStyles.darkConfirmText]}>
						{strings('browser.addTab')}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.optionsButton} onPress={() => setShowOptions(!showOptions)}>
					<Entypo color={isDarkMode ? colors.white : colors.grey600} name="dots-three-vertical" size={24} />
				</TouchableOpacity>
			</View>
			<ScrollView contentContainerStyle={styles.scrollView}>
				{tabs.map((tab, index) => (
					<TabItem
						key={tab.id}
						tab={tab}
						closeTab={closeTab}
						onPress={() => openOpenedTab(index)}
						index={index}
						activeTab={activeTab}
						isActive={index === activeTab}
					/>
				))}
			</ScrollView>
		</View>
	);
};

export default OpenedTabs;
