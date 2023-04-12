import React, { PureComponent } from 'react';
import {
	Image,
	Platform,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	StatusBar,
	Text,
	ImageBackground,
	Dimensions,
	DeviceEventEmitter
} from 'react-native';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import { strings } from '../../../../locales/i18n';
import { URL } from 'gopocket-core';
import AsyncStorage from '@react-native-community/async-storage';
import ImageCapInset from '../../UI/ImageCapInset';
import Favicon from '../../UI/Favicon';
import AppConstants from '../../../core/AppConstants';
import { getActiveTabId } from '../../../util/browser';

const styles = StyleSheet.create({
	topTabbar: {
		justifyContent: 'center',
		flexDirection: 'row',
		height: 58,
		alignItems: 'center'
	},
	textInput: {
		height: 58,
		padding: 0,
		justifyContent: 'center',
		color: colors.$030319,
		fontSize: 14,
		flexShrink: 1
	},
	flexOne: {
		flex: 1
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	noDisplay: {
		width: 0,
		height: 0,
		display: 'none'
	},
	baseLayout: {
		height: 58,
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	catInsertLeft: {
		marginLeft: 14
	},
	inputBaseLayout: {
		height: 58,
		flex: 1,
		justifyContent: 'center'
	},
	operateLayout: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16
	},
	cancelLayout: {
		paddingHorizontal: 12,
		height: 58,
		justifyContent: 'center'
	},
	cancelLabel: {
		fontSize: 14,
		color: colors.$030319
	},
	leftTabBg: {
		justifyContent: 'center',
		alignItems: 'center',
		width: 47,
		height: 58,
		paddingRight: 5
	},
	rightTabBg: {
		justifyContent: 'center',
		alignItems: 'center',
		width: 47,
		height: 58,
		paddingLeft: 5
	},
	flexRow: {
		flexDirection: 'row'
	},
	hide: {
		flex: 0,
		opacity: 0,
		display: 'none',
		width: 0,
		height: 0
	},
	inputRightView: {
		flex: 1,
		marginLeft: 10
	},
	touchSecurity: {
		marginRight: 6
	},
	iconSize: {
		width: 24,
		height: 24,
		borderRadius: 12
	},
	full: {
		flex: 100000
	}
});

const { HOMEPAGE_URL } = AppConstants;
const screenWidth = Dimensions.get('window').width;

export default class AddressBar extends PureComponent {
	static propTypes = {
		onFocusChange: PropTypes.func,
		onTextChange: PropTypes.func,
		toggleSecurityModal: PropTypes.func,
		onSubmit: PropTypes.func,
		toggleTipModal: PropTypes.func,
		goHome: PropTypes.func,
		switchRightTab: PropTypes.func,
		leftTabUrl: PropTypes.string,
		rightTabUrl: PropTypes.string,
		tabId: PropTypes.number,
		closeTab: PropTypes.func,
		title: PropTypes.string,
		url: PropTypes.string,
		tabCount: PropTypes.number
	};

	state = {
		inputValue: '',
		inputEditing: false,
		safeLevel: -1, //安全级别：0：未知，1:安全，2：警告，3：危险, -1未获取
		safeDesc: '',
		safeHostUrl: '',
		hasShownTip: false,
		currentTitle: this.props.title,
		currentUrl: this.props.url,
		backEnabled: false
	};

	inputTextRef = React.createRef();
	securityButtonRef = React.createRef();
	moreButtonRef = React.createRef();

	componentDidMount = () => {
		AsyncStorage.getItem('hasShownMoreTip').then(previouslyShown => {
			if (previouslyShown === 'true') {
				this.setState({ hasShownTip: true });
			}
		});
	};

	showSecurityMenu = async => {
		let safeLevel = this.state.safeLevel;
		const currentHostName = new URL(this.state.currentUrl).hostname;
		if (currentHostName !== this.state.safeHostUrl) {
			safeLevel = -1;
		}
		if (safeLevel !== -1) {
			const { current } = this.securityButtonRef;
			current.measure((ox, oy, width, height, px, py) => {
				const statusBarHeight = StatusBar.currentHeight;
				const dis = Device.isAndroid() ? statusBarHeight : 0;
				this.props.toggleSecurityModal(safeLevel, this.state.safeDesc, {
					x: px - 10,
					y: py - dis,
					width,
					height
				});
			});
		}
	};

	setInputEditing = editing => {
		if (this.state.inputEditing === editing) {
			return;
		}
		this.setState({ inputEditing: editing, inputValue: '' });
		if (!editing) {
			this.props.onFocusChange && this.props.onFocusChange(false);
		}
	};

	clearFocus = () => {
		const { current } = this.inputTextRef;
		current.blur();
	};

	getIsInputEditing = () => this.state.inputEditing;

	backPress = () => {
		const { inputEditing } = this.state;
		const { onFocusChange } = this.props;
		if (inputEditing) {
			this.setState({ inputValue: '', inputEditing: false });
			setTimeout(() => {
				onFocusChange && onFocusChange(false);
			}, 10);
			return true;
		}
		DeviceEventEmitter.emit('AddressbarStateEmitter', { state: 'back' });
		return true;
	};

	setSecurityInfo = (safeLevel, safeHostUrl, safeDesc) => {
		this.setState({ safeLevel, safeHostUrl, safeDesc });
		if (safeLevel === 0 && !this.state.hasShownTip) {
			const { current } = this.moreButtonRef;
			current?.measure((ox, oy, width, height, px, py) => {
				const statusBarHeight = StatusBar.currentHeight;
				const dis = Device.isAndroid() ? statusBarHeight : 0;
				this.props.toggleTipModal &&
					this.props.toggleTipModal(this.props.tabId, { x: px - 10, y: py - dis, width, height });
				this.setState({ hasShownTip: true });
			});
		}
	};

	setTitle = title => {
		this.setState({ currentTitle: title });
	};

	setUrl = url => {
		this.setState({ currentUrl: url });
	};

	setBackEnabled = enable => {
		this.setState({ backEnabled: enable });
	};

	render = () => {
		const { inputValue, inputEditing, safeHostUrl } = this.state;
		const {
			onFocusChange,
			onTextChange,
			onSubmit,
			goHome,
			switchRightTab,
			leftTabUrl,
			rightTabUrl,
			tabId,
			closeTab,
			tabCount
		} = this.props;

		let { currentTitle } = this.state;
		const { currentUrl, backEnabled } = this.state;

		const isHomePage = !currentUrl || currentUrl === '' || currentUrl === HOMEPAGE_URL;

		let safeLevel = this.state.safeLevel;
		const currentHostName = new URL(currentUrl).hostname;
		if (currentHostName !== safeHostUrl) {
			safeLevel = -1;
		}

		if (!currentTitle) {
			if (currentHostName?.startsWith('www.')) {
				currentTitle = currentHostName.slice(4);
			} else if (currentHostName?.startsWith('m.')) {
				currentTitle = currentHostName.slice(2);
			} else {
				currentTitle = currentHostName;
			}
		}

		const onlyOneTab = rightTabUrl === 'add' && leftTabUrl === 'add';

		const webPageState = !isHomePage && !inputEditing;

		return (
			<View
				style={[
					styles.flexRow,
					{
						width: screenWidth,
						backgroundColor: colors.white
					}
				]}
			>
				<TouchableOpacity
					style={inputEditing && styles.hide}
					onPress={() => {
						goHome(tabId);
					}}
				>
					<ImageBackground
						style={styles.leftTabBg}
						source={require('../../../images/img_left_tab_bg.png')}
						resizeMode={'stretch'}
					>
						<Image style={styles.iconSize} source={require('../../../images/ic_search_home.png')} />
					</ImageBackground>
				</TouchableOpacity>
				<View style={styles.baseLayout}>
					<ImageCapInset
						style={[styles.flexOne, inputEditing && styles.catInsertLeft]} //上下9， 左右6
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
						<View style={styles.topTabbar}>
							<TouchableOpacity
								activeOpacity={1}
								onPress={() => {
									if (tabId !== getActiveTabId() && inputEditing) {
										this.setInputEditing(false);
									}
									if (inputEditing) {
										if (Device.isIos()) {
											if (inputValue && inputValue.length > 0) {
												const { current } = this.inputTextRef;
												current.setNativeProps({
													selection: { start: inputValue.length, end: inputValue.length }
												});
											}
										}
										return;
									}
									if (!isHomePage) {
										this.setState({ inputValue: currentUrl + ' ', inputEditing: true });
									} else {
										this.setState({ inputEditing: true });
									}

									setTimeout(() => {
										const { current } = this.inputTextRef;
										current && current.focus();
										if (!isHomePage) {
											this.setState({ inputValue: currentUrl });
										}
									}, 200);
									if (Platform.OS === 'ios') {
										setTimeout(() => {
											const { current } = this.inputTextRef;
											current &&
												current.setNativeProps({
													selection: { start: 0, end: currentUrl.length }
												});
										}, 300);
									}
								}}
								style={styles.inputBaseLayout}
							>
								<View style={styles.operateLayout}>
									{webPageState && backEnabled && (
										<TouchableOpacity onPress={this.backPress} hitSlop={styles.hitSlop}>
											<Image source={require('../../../images/ic_search_back.png')} />
										</TouchableOpacity>
									)}

									{webPageState && <View style={styles.flexOne} />}

									<TouchableOpacity
										style={styles.touchSecurity}
										onPress={this.showSecurityMenu}
										disabled={inputEditing || isHomePage || safeLevel === -1}
										hitSlop={styles.hitSlop}
									>
										<Image
											source={
												isHomePage || inputEditing || !currentTitle || currentTitle === ''
													? require('../../../images/ic_search.png')
													: safeLevel === 3
													? require('../../../images/ic_defi_danger.png')
													: safeLevel === 2
													? require('../../../images/ic_defi_warning.png')
													: safeLevel === 1
													? require('../../../images/ic_defi_safe.png')
													: require('../../../images/ic_defi_unknown.png')
											}
											ref={this.securityButtonRef}
										/>
									</TouchableOpacity>
									<TextInput
										pointerEvents={inputEditing ? 'auto' : 'none'}
										style={[styles.textInput, inputEditing && styles.full]}
										onChangeText={text => {
											this.setState({ inputValue: text });
											onTextChange && onTextChange(text);
										}}
										editable={inputEditing}
										placeholder={isHomePage ? strings('browser.enter_link') : ''}
										placeholderTextColor={colors.$8F92A1}
										value={inputEditing ? inputValue : isHomePage ? '' : currentTitle}
										onSubmitEditing={() => {
											this.setState({ inputEditing: false });
											onSubmit();
										}}
										ref={this.inputTextRef}
										onFocus={() => {
											onFocusChange && onFocusChange(true);
										}}
										selectTextOnFocus
										autoCapitalize="none"
										returnKeyType="go"
									/>
									<View style={styles.inputRightView} />

									<TouchableOpacity
										style={(inputEditing || (onlyOneTab && isHomePage)) && styles.noDisplay}
										onPress={() => {
											if (isHomePage) {
												closeTab && closeTab(tabId);
											} else {
												DeviceEventEmitter.emit('AddressbarStateEmitter', { state: 'more' });
											}
										}}
										hitSlop={styles.hitSlop}
									>
										<Image
											source={
												isHomePage
													? require('../../../images/ic_addressbar_close.png')
													: require('../../../images/ic_defi_more.png')
											}
											ref={this.moreButtonRef}
										/>
									</TouchableOpacity>

									{inputEditing && inputValue !== '' && (
										<TouchableOpacity
											hitSlop={styles.hitSlop}
											onPress={() => {
												this.setState({ inputValue: '' });
												onTextChange && onTextChange('');
											}}
										>
											<Image source={require('../../../images/search_clear.png')} />
										</TouchableOpacity>
									)}
								</View>
							</TouchableOpacity>
						</View>
					</ImageCapInset>
					{inputEditing && (
						<TouchableOpacity style={styles.cancelLayout} onPress={this.backPress}>
							<Text style={styles.cancelLabel}>{strings('browser.cancel')}</Text>
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					style={inputEditing && styles.hide}
					onPress={() => {
						console.log('new tabs', tabCount);
					}}
				>
					<ImageBackground
						style={styles.rightTabBg}
						source={require('../../../images/img_right_tab_bg.png')}
						resizeMode={'stretch'}
					>
						<Text>{tabCount}</Text>
					</ImageBackground>
				</TouchableOpacity>
				<TouchableOpacity
					style={inputEditing && styles.hide}
					onPress={() => {
						switchRightTab(tabId);
					}}
				>
					<ImageBackground
						style={styles.rightTabBg}
						source={require('../../../images/img_right_tab_bg.png')}
						resizeMode={'stretch'}
					>
						<Image style={styles.iconSize} source={require('../../../images/ic_add_tab.png')} />
					</ImageBackground>
				</TouchableOpacity>
			</View>
		);
	};
}
