import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	TouchableOpacity,
	StyleSheet,
	Text,
	View,
	Image,
	ScrollView,
	StatusBar,
	TouchableWithoutFeedback,
	ImageBackground,
	NativeModules
} from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import Modal from 'react-native-modal';
import Engine from '../../../core/Engine';
import Approve from '../../Views/ApproveView/Approve';
import { store } from '../../../store';
import { toggleApproveModalInModal } from '../../../actions/modals';
import MStatusBar from '../MStatusBar';
import SecurityTop from './SecurityTop';
import TokenList from './TokenList';
import ApprovalTop from './ApprovalTop';
import ApprovalList from './ApprovalList';
import { onEvent } from '../../../util/statistics';
import Device from '../../../util/Device';
import { ThemeContext } from '../../../theme/ThemeProvider';
import BgSecurityTop from '../../../images/bg_security_top.png';
import BgApprovalTop from '../../../images/bg_approval_top.png';
import iconBackWhite from '../../../images/ic_back_white.png';
import iconBackBlack from '../../../images/back.png';
import iconFaqWhite from '../../../images/ic_faq.png';
import iconFaqBlack from '../../../images/ask.png';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	backgroundImage: {
		width: '100%',

		zIndex: -1,
		position: 'absolute',
		top: 0,
		borderBottomRightRadius: 20,
		borderBottomLeftRadius: 20
	},

	headerStyle: {
		position: 'absolute',
		top: 0,
		left: 0,
		height: 56,
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center'
	},
	backButton: {
		paddingLeft: Device.isAndroid() ? 22 : 18,
		paddingRight: Device.isAndroid() ? 22 : 18,
		paddingVertical: 10
	},
	headerLabelStyle: {
		fontSize: 18,
		flex: 1,
		textAlign: 'center',
		color: colors.white,
		...fontStyles.bold
	},
	topLayout: {
		height: 340,
		alignItems: 'center'
	},
	modalNoBorder: {
		justifyContent: 'flex-end'
	},
	modalContainer: {
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		flexDirection: 'row',
		paddingVertical: 27,
		paddingHorizontal: 30,
		width: '80%'
	},
	faqTitle: {
		color: colors.$202020,
		fontSize: 18,
		...fontStyles.bold,
		alignSelf: 'center',
		marginBottom: 12
	},
	faqDesc: {
		color: colors.$202020,
		fontSize: 13,
		alignSelf: 'center',
		lineHeight: 23
	},
	accountLayout: {
		width: 320,
		height: 34,
		marginTop: 26,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 17,
		backgroundColor: colors.white02
	},
	accountName: {
		color: colors.white,
		fontSize: 12,
		marginRight: 11,
		marginLeft: 4,
		maxWidth: 120
	},
	accountAddress: {
		color: colors.white,
		fontSize: 12,
		maxWidth: 180
	},
	tabContainer: {
		height: 40,
		width: 320,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	tabItem: {
		marginRight: 16,
		flexDirection: 'column',
		alignItems: 'center'
	},
	tabItemTextNor: {
		lineHeight: 21,
		fontSize: 15,
		color: colors.white,
		...fontStyles.medium
	},
	tabItemTextFoc: {
		lineHeight: 30,
		fontSize: 22,
		color: colors.white,
		...fontStyles.medium
	},
	tabItemIndicatorFoc: {
		width: 48,
		height: 4,
		marginTop: 4,
		borderRadius: 4,
		backgroundColor: colors.white06
	},
	tabItemIndicatorNor: {
		width: 48,
		height: 4,
		marginTop: 4,
		borderRadius: 4,
		backgroundColor: colors.transparent
	}
});

/**
 * View that renders a list of ERC-20 Tokens
 */
class SecurityView extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		assets: PropTypes.array,
		selectedAddress: PropTypes.string,
		isLockScreen: PropTypes.bool,
		approveModalVisibleInModal: PropTypes.bool
	};

	state = {
		tokens: [],
		unDetectedCount: 0,
		backImg: iconBackWhite,
		titleColor: colors.white,
		iconFaq: iconFaqWhite,
		navBackColorOffset: new Animated.Value(0),
		IOSStatusBarHeight: 0,
		tabIndex: 0,
		buttonRect: null,
		isVisible: false,
		tokenParams: null,
		checkLoading: false,
		faqModalVisible: false,
		descModalVisible: false,
		infiniteDescVisible: false
	};
	changeNavHeight = 60;
	buttonRef = React.createRef();

	componentDidMount = () => {
		onEvent('EnterSecurity');
		const { assets } = this.props;
		const security_assets = assets.filter(asset => !asset.lockType && !asset.isDefi);
		const unDetectedList = assets.filter(v => !v.nativeCurrency && !v.securityData);
		this.setState({ tokens: security_assets, unDetectedCount: unDetectedList.length });
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				statusBarHeight && this.setState({ IOSStatusBarHeight: statusBarHeight.height });
			});
		}
	};

	componentWillUnmount = () => {
		const { selectedAddress } = this.props;
		const { SecurityController } = Engine.context;
		SecurityController.hideNewRiskRedDot(selectedAddress);
	};

	hideFaqModal = () => {
		this.setState({ faqModalVisible: false });
	};

	reanderFAQ = () => {
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={this.state.faqModalVisible && !this.props.isLockScreen}
				actionContainerStyle={styles.modalNoBorder}
				onSwipeComplete={this.hideFaqModal}
				onBackButtonPress={this.hideFaqModal}
				onBackdropPress={this.hideFaqModal}
				backdropOpacity={0.7}
				animationIn={'fadeIn'}
				animationOut={'fadeOut'}
				useNativeDriver
			>
				<TouchableWithoutFeedback onPress={this.hideFaqModal}>
					<View style={[styles.modalContainer, isDarkMode && baseStyles.darkBackground]}>
						{/* eslint-disable-next-line react-native/no-inline-styles */}
						<View>
							<Text style={[styles.faqTitle, isDarkMode && baseStyles.textDark]}>
								{strings('security.faq_title')}
							</Text>
							<Text style={[styles.faqDesc, isDarkMode && baseStyles.textDark]}>
								{strings('security.faq_desc')}
							</Text>
							{this.state.unDetectedCount > 0 && (
								<Text style={[styles.faqDesc, isDarkMode && baseStyles.subTextDark]}>
									{strings('security.faq_desc_undetected', {
										num: this.state.unDetectedCount
									})}
								</Text>
							)}
						</View>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	renderInfiniteDesc = () => {
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={this.state.infiniteDescVisible && !this.props.isLockScreen}
				actionContainerStyle={styles.modalNoBorder}
				onSwipeComplete={this.hideInfiniteDesc}
				onBackButtonPress={this.hideInfiniteDesc}
				onBackdropPress={this.hideInfiniteDesc}
				backdropOpacity={0.7}
				animationIn={'fadeIn'}
				animationOut={'fadeOut'}
				useNativeDriver
			>
				<TouchableWithoutFeedback onPress={this.hideInfiniteDesc}>
					<View style={[styles.modalContainer, isDarkMode && baseStyles.darkBackground]}>
						<View>
							<Text style={[styles.faqTitle, isDarkMode && baseStyles.textDark]}>
								{strings('approval_management.intro_title')}
							</Text>
							<Text style={[styles.faqDesc, isDarkMode && baseStyles.textDark]}>
								{strings('approval_management.intro_text')}
							</Text>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	onItemPress = token => {
		this.props.navigation.navigate('AssetView', { asset: token });
	};

	onTabItemClick = index => {
		if (this.state.tabIndex !== index && index === 1) {
			onEvent('ClickApprovalTab');
		}
		this.setState({ tabIndex: index });
	};

	renderTabs = () => {
		const { tabIndex } = this.state;
		return (
			<View style={styles.tabContainer}>
				{this.renderTabItem(
					strings('approval_management.tab_token'),
					tabIndex === 0,
					this.onTabItemClick.bind(this, 0)
				)}
				{this.renderTabItem(
					strings('approval_management.tab_approval'),
					tabIndex === 1,
					this.onTabItemClick.bind(this, 1)
				)}
			</View>
		);
	};

	renderTabItem = (title, focus, onClick) => (
		<TouchableOpacity style={styles.tabItem} onPress={onClick}>
			<Text style={focus ? styles.tabItemTextFoc : styles.tabItemTextNor}>{title}</Text>
			<View style={focus ? styles.tabItemIndicatorFoc : styles.tabItemIndicatorNor} />
		</TouchableOpacity>
	);

	renderHeaderView = titleHeight => {
		const { tabIndex, tokens } = this.state;
		const { selectedAddress } = this.props;
		const identities = Engine.context.PreferencesController.state.identities;
		const account = identities[selectedAddress];
		return (
			<View
				style={[
					styles.topLayout,
					{
						height: 240 + titleHeight
					}
				]}
			>
				<Image
					source={require('../../../images/pali_background.png')}
					style={[styles.backgroundImage, { height: 240 + titleHeight }]}
				/>
				<View style={{ height: titleHeight }} />
				{this.renderTabs()}
				{tabIndex === 0 && <SecurityTop tokens={tokens} />}
				{tabIndex === 1 && <ApprovalTop />}

				<View style={styles.accountLayout}>
					<Image source={require('../../../images/ic_security_account.png')} />
					<Text style={styles.accountName} numberOfLines={1}>
						{account.name}
					</Text>
					<Text style={styles.accountAddress} numberOfLines={1} ellipsizeMode="middle">
						{selectedAddress}
					</Text>
				</View>
			</View>
		);
	};

	showWebMenu = async () => {
		const { current } = this.buttonRef;
		current.measure((ox, oy, width, height, px, py) => {
			this.setState({ buttonRect: { x: 0, y: py, width, height: height - 15 }, isVisible: true });
		});
	};

	showFaq = () => {
		this.setState({ faqModalVisible: true });
	};

	showInfiniteDesc = () => {
		this.setState({ infiniteDescVisible: true });
	};

	hideInfiniteDesc = () => {
		this.setState({ infiniteDescVisible: false });
	};

	renderApproveModalInModal = () =>
		this.props.approveModalVisibleInModal && (
			<Approve modalVisible toggleApproveModal={() => store.dispatch(toggleApproveModalInModal())} />
		);

	onScroll = event => {
		const { isDarkMode } = this.context;
		const y = event.nativeEvent.contentOffset.y;
		this.setState({ navBackColorOffset: new Animated.Value(y) });
		if (y > this.changeNavHeight / 2 && !isDarkMode) {
			this.setState({
				barStyle: 'dark-content',
				backImg: iconBackBlack,
				titleColor: colors.$202020,
				iconFaq: iconFaqBlack
			});
		} else {
			this.setState({
				barStyle: 'light-content',
				backImg: iconBackWhite,
				titleColor: colors.white,
				iconFaq: iconFaqWhite
			});
		}
	};

	render = () => {
		const {
			tabIndex,
			barStyle,
			backImg,
			titleColor,
			iconFaq,
			navBackColorOffset,
			IOSStatusBarHeight,
			tokens
		} = this.state;
		const { isDarkMode } = this.context;
		let backgroundColor;
		if (isDarkMode) {
			backgroundColor = navBackColorOffset.interpolate({
				inputRange: [0, this.changeNavHeight / 2, this.changeNavHeight],
				outputRange: ['#FFFFFF00', '#FFFFFF30', '#111E33'],
				extrapolate: 'clamp',
				useNativeDriver: true
			});
		} else {
			backgroundColor = navBackColorOffset.interpolate({
				inputRange: [0, this.changeNavHeight / 2, this.changeNavHeight],
				outputRange: ['#FFFFFF00', '#FFFFFF30', '#FFFFFFFF'],
				extrapolate: 'clamp',
				useNativeDriver: true
			});
		}
		let barHeight = 0;
		if (Device.isAndroid()) {
			barHeight = StatusBar.currentHeight;
		} else if (Device.isIos()) {
			barHeight = IOSStatusBarHeight;
		}
		const titleHeight = 56 + barHeight;
		const contactEntry = this.props.navigation.getParam('contactEntry', null);
		return (
			<React.Fragment>
				<MStatusBar
					navigation={this.props.navigation}
					barStyle={barStyle}
					fixPadding={false}
					backgroundColor={colors.transparent}
				/>
				<ScrollView
					style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}
					scrollEventThrottle={1}
					onScroll={this.onScroll.bind(this)}
				>
					{this.renderHeaderView(titleHeight)}
					{tabIndex === 0 && (
						<TokenList tokens={tokens} contactEntry={contactEntry} onItemPress={this.onItemPress} />
					)}
					{tabIndex === 1 && (
						<ApprovalList
							tokens={tokens}
							onItemPress={this.onItemPress}
							showInfiniteDesc={this.showInfiniteDesc}
						/>
					)}
				</ScrollView>
				<Animated.View
					style={[styles.headerStyle, { backgroundColor, height: titleHeight, paddingTop: barHeight }]}
				>
					<TouchableOpacity
						onPress={() => this.props.navigation.pop()}
						style={styles.backButton}
						testID={'edit-contact-back-button'}
					>
						<Image source={backImg} />
					</TouchableOpacity>
					<Text style={[styles.headerLabelStyle, { color: titleColor }]}>
						{strings(`security.security_title`)}
					</Text>
					<TouchableOpacity onPress={this.showFaq} style={styles.backButton}>
						<Image source={iconFaq} />
					</TouchableOpacity>
				</Animated.View>
				{this.reanderFAQ()}
				{this.renderInfiniteDesc()}
				{this.renderApproveModalInModal()}
			</React.Fragment>
		);
	};
}

const mapStateToProps = state => {
	const selectedAddress = state.engine.backgroundState.PreferencesController.selectedAddress;
	return {
		selectedAddress,
		assets: state.engine.backgroundState.AssetsDataModel.assets[selectedAddress] || [],
		isLockScreen: state.settings.isLockScreen,
		approveModalVisibleInModal: state.modals.approveModalVisibleInModal
	};
};

export default connect(mapStateToProps)(SecurityView);
