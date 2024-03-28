import React, { PureComponent } from 'react';
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	ScrollView,
	StatusBar,
	Animated,
	NativeModules,
	Text,
	Dimensions,
	PanResponder,
	TouchableWithoutFeedback,
	DeviceEventEmitter,
	Platform,
	Share
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import TokenImage from '../../UI/TokenImage';
import { util } from 'paliwallet-core';
import { strings } from '../../../../locales/i18n';
import DashSecondLine from '../DashSecondLine';
import { getChainIdByType, renderCoinValue } from '../../../util/number';
import ApprovalEvent from '../../UI/ApprovalEvent';
import Modal from 'react-native-modal';
import Engine from '../../../core/Engine';
import { onEvent } from '../../../util/statistics';
import PercentageCircle from '../../UI/PercentageCircle';
import LottieView from 'lottie-react-native';
import { getSecurityData } from '../../../util/security';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { ThemeContext } from '../../../theme/ThemeProvider';
import { isDate } from 'lodash';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const { width, height } = Dimensions.get('screen');

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	padding_wrapper: {
		flex: 1
	},
	iconLayout: {
		marginRight: 10,
		width: 40,
		height: 40,
		alignSelf: 'center'
	},
	ethLogo: {
		width: 40,
		height: 40,
		overflow: 'hidden',
		marginRight: 10
	},
	iconStyle: {
		width: 40,
		height: 40,
		alignItems: 'center',
		borderRadius: 10
	},
	securityItemView: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
		paddingHorizontal: 24
	},
	unkownItemText: {
		fontSize: 18,
		...fontStyles.semibold,
		color: colors.$030319,
		marginLeft: 10,
		flex: 1
	},
	lineFull: {
		backgroundColor: colors.$F0F0F0,
		height: 1
	},
	lineMargin: {
		height: 1,
		marginHorizontal: 24,
		flex: 0
	},
	maxSymbolWidth: {
		maxWidth: '50%',
		marginRight: 6
	},
	symbolText: {
		color: colors.$030319,
		fontSize: 16,
		...fontStyles.semibold,
		lineHeight: 20
	},
	flexOne: {
		flex: 1
	},
	unknowSmallSize: {
		width: 22,
		height: 22
	},
	undetectedText: {
		fontSize: 14,
		color: colors.$60657D,
		marginLeft: 5
	},
	applyCheckTouch: {
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center',
		margin: 20,
		flexDirection: 'row'
	},
	applyCheckText: {
		fontSize: 16,
		color: colors.white,
		marginLeft: 9
	},
	securityLayout: {
		position: 'absolute',
		left: 0,
		right: 0
	},
	tabTop: {
		backgroundColor: colors.transparent,
		paddingLeft: 20,
		paddingRight: 30,
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 10
	},
	tabTabSwitch: {
		flexDirection: 'row',
		flex: 1,
		justifyContent: 'flex-start'
	},
	scrollWrap: {
		marginHorizontal: 30,
		marginTop: 20,
		flex: 1
	},
	gestureView: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0
	},
	gestureInView: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	tabItem: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10
	},
	tabItemText: {
		...fontStyles.semibold,
		color: colors.white,
		fontSize: 15
	},
	tabItemLine: {
		width: 60,
		height: 4,
		backgroundColor: colors.$FFFFFFB5,
		marginTop: 3,
		borderRadius: 4
	},
	fontSize22: {
		fontSize: 22
	},
	securityIconLargeSize: {
		width: 20,
		height: 20
	},
	approvalTitle: {
		marginLeft: 20,
		marginTop: 20,
		color: colors.$030319,
		...fontStyles.bold,
		fontSize: 20,
		marginVertical: 10
	},
	approvalHint: {
		margin: 20,
		marginTop: 4,
		fontSize: 11,
		color: colors.$60657D,
		lineHeight: 18,
		...fontStyles.normal
	},
	approvalEmpty: {
		marginHorizontal: 24,
		paddingTop: 24,
		paddingBottom: 28,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	approvalEmptyIcon: {
		position: 'relative',
		width: 56,
		height: 47,
		marginRight: 10
	},
	approvalEmptyText: {
		flex: 1,
		fontSize: 12,
		color: colors.$404040
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
	modalTitle: {
		color: colors.$202020,
		fontSize: 18,
		...fontStyles.bold,
		alignSelf: 'center',
		marginBottom: 12
	},
	modalDesc: {
		color: colors.$202020,
		fontSize: 13,
		alignSelf: 'center',
		lineHeight: 23
	},
	spaceHeight: {
		height: 18
	},
	flexGrowOne: {
		flexGrow: 1
	},
	wrapContent: {
		flex: 1,
		borderRadius: 10,
		backgroundColor: colors.$F9F9F9
	},
	securityTitle: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
		backgroundColor: colors.$F9F9F9,
		borderRadius: 10
	},
	securityItemTitle: {
		fontSize: 24,
		color: colors.$030319,
		...fontStyles.semibold,
		height: 32
	},
	securityItemDesc: {
		color: colors.$8F92A1,
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 16
	},
	securityItemIcon: {
		marginTop: 3,
		width: 22,
		height: 22,
		marginBottom: 7
	},
	securityItem: {
		flex: 1,
		alignItems: 'center'
	},
	securityItemWrap: {
		backgroundColor: colors.$F9F9F9,
		borderRadius: 10,
		flexDirection: 'row',
		marginTop: 18,
		paddingVertical: 20,
		paddingHorizontal: 14
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	infoModalWrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		padding: 30,
		alignItems: 'center',
		justifyContent: 'center'
	},
	infoTitle: {
		color: colors.$030319,
		fontSize: 20,
		...fontStyles.semibold
	},
	infoDesc: {
		color: colors.$60657D,
		marginTop: 14,
		textAlign: 'left',
		fontSize: 14
	},
	animation: {
		width: 160,
		height: 160
	},
	unDetectedWrap: {
		backgroundColor: colors.$F9F9F9,
		borderRadius: 10,
		flex: 1
	},
	fastCheckWrap: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 40,
		paddingTop: 20
	},
	fastCheckTitle: {
		color: colors.$030319,
		fontSize: 20,
		...fontStyles.semibold,
		marginBottom: 30
	},
	fastCheckDesc: {
		color: colors.$8F92A1,
		fontSize: 12,
		marginTop: 14
	},
	fullLine: {
		height: 1,
		backgroundColor: colors.$F0F0F0
	},
	checkItemWrap: {
		backgroundColor: colors.$F9F9F9,
		borderRadius: 10,
		paddingHorizontal: 24
	},
	checkItemContent: {
		flexDirection: 'row',
		flex: 1,
		height: 62,
		alignItems: 'center'
	},
	checkItemTitle: {
		color: colors.$030319,
		fontSize: 16,
		...fontStyles.semibold,
		flex: 1
	},
	heightOne: {
		height: 1
	},
	holderItemWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 14
	},
	holderItemContent: {
		width: 28,
		height: 28,
		borderRadius: 6,
		backgroundColor: colors.$F6F6F6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	holderNum: {
		color: colors.$8F92A1,
		fontSize: 14
	},
	marginLeft14: {
		marginLeft: 14
	},
	holderPercent: {
		color: colors.$030319,
		fontSize: 14,
		...fontStyles.semibold
	},
	holderAddr: {
		color: colors.$8F92A1,
		fontSize: 12
	},
	holderBase: {
		backgroundColor: colors.$F9F9F9,
		borderRadius: 10,
		marginTop: 18,
		paddingVertical: 20,
		paddingHorizontal: 24
	},
	holderTitle: {
		fontSize: 18,
		color: colors.$030319,
		...fontStyles.semibold,
		marginBottom: 20
	},
	contentCenter: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	circleContent: {
		color: colors.brandPink300,
		fontSize: 18,
		...fontStyles.semibold
	},
	circleDesc: {
		color: colors.brandPink300,
		fontSize: 10,
		marginTop: 2
	},
	holderList: {
		flexDirection: 'row',
		marginTop: 6
	},
	holderRight: {
		flex: 1,
		marginLeft: 10
	},
	detailModal: {
		width: 300,
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center'
	},
	noDetectedTitle: {
		marginHorizontal: 26,
		marginVertical: 30,
		fontSize: 16,
		color: colors.$030319
	},
	noDetectedLine: {
		height: 1,
		backgroundColor: colors.$F0F0F0,
		alignSelf: 'stretch'
	},
	noDetectedTouch: {
		alignSelf: 'stretch',
		justifyContent: 'center',
		alignItems: 'center'
	},
	tryLaterText: {
		marginVertical: 15,
		fontSize: 16,
		color: colors.$030319
	},
	ownerItemContent: {
		height: 76,
		justifyContent: 'center'
	},
	ownerItemTitle: {
		color: colors.$030319,
		fontSize: 16,
		...fontStyles.semibold
	},
	ownerItemAddr: {
		fontSize: 12,
		color: colors.$8F92A1,
		marginTop: 6
	},
	coinShareTouch: {
		marginRight: 12
	},
	shareItemWrap: {
		backgroundColor: colors.$F9F9F9,
		borderRadius: 10,
		flexDirection: 'row',
		marginTop: 18,
		paddingVertical: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	shareText: {
		fontSize: 16,
		color: colors.brandPink300,
		marginLeft: 10
	}
});

class FoldSecurityView extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		 */
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		allEvents: PropTypes.object,
		isLockScreen: PropTypes.bool,
		asset: PropTypes.object,
		securityViewOpacity: PropTypes.any,
		closeSecurityView: PropTypes.func,
		onFastCheck: PropTypes.func
	};

	state = {
		IOSStatusBarHeight: 0,
		tabIndex: 0,
		infiniteDescVisible: false,
		showFastCheck: false,
		infoModalVisible: false,
		infoModalTitle: '',
		infoModalDesc: '',
		securityData: {},
		showNoDetectedModal: false
	};

	scrollViewRef = React.createRef();
	fastCheckCount = 0;

	// securityViewOpacity = new Animated.Value(0);

	UNSAFE_componentWillMount() {
		const { asset } = this.props;
		const securityData = getSecurityData(asset);
		this.setState({ securityData });
	}

	async componentDidMount() {
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				statusBarHeight && this.setState({ IOSStatusBarHeight: statusBarHeight.height });
			});
		}
	}

	componentWillUnmount() {
		this.clearTimeout();
	}

	fastCheck = async () => {
		const { SecurityController } = Engine.context;
		const { asset } = this.props;
		const chainId = getChainIdByType(asset.type);
		try {
			const securityData = await SecurityController.fastCheck(chainId, asset.address);
			if (securityData) {
				const { normal, notice, risk } = securityData;
				const normalLength = normal ? normal.length : 0;
				const noticeLength = notice ? notice.length : 0;
				const riskLength = risk ? risk.length : 0;
				if (normalLength !== 0 || noticeLength !== 0 || riskLength !== 0) {
					this.props.asset.securityData = { ...securityData, normalLength, noticeLength, riskLength };
					this.setState({
						securityData: { ...securityData, normalLength, noticeLength, riskLength },
						showFastCheck: false
					});
					if (asset.isSecurityCenter) {
						DeviceEventEmitter.emit('updateSecurity', this.props.asset);
					}
					return;
				}
			}
			if (this.fastCheckCount === 1) {
				this.fastCheckCount = 0;
				this.setState({ showFastCheck: false, showNoDetectedModal: true });
			} else {
				this.fastCheckCount = 1;
				this.timeoutFastCheck(10 * 1000);
			}
		} catch (e) {
			console.error('cyh@fastCheck error: ', e);
		}
	};

	clearTimeout = () => {
		if (this.handle && this.handle !== 0) {
			this.handle && clearTimeout(this.handle);
			this.handle = 0;
		}
	};

	timeoutFastCheck = delayTime => {
		this.clearTimeout();
		this.handle = setTimeout(() => {
			this.fastCheck();
		}, delayTime);
	};

	renderUnDetected = () => {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.unDetectedWrap}>
				{this.state.showFastCheck ? (
					<View style={[styles.fastCheckWrap, isDarkMode && baseStyles.darkBackground]}>
						<Text style={[styles.fastCheckTitle, isDarkMode && baseStyles.textDark]}>
							{strings('security.detecting')}
						</Text>
						<LottieView
							style={styles.animation}
							autoPlay
							loop
							source={require('../../../animations/detecting.json')}
						/>
						<Text style={[styles.fastCheckDesc, isDarkMode && baseStyles.textDark]}>
							{strings('security.take_seconds')}
						</Text>
					</View>
				) : (
					<View style={[styles.flexOne, isDarkMode && baseStyles.darkInputBackground]}>
						<View style={styles.securityItemView}>
							<Text style={[styles.unkownItemText, isDarkMode && baseStyles.textDark]}>
								{strings('security.detect_contract_security')}
							</Text>
							<Image
								style={styles.securityIconLargeSize}
								source={require('../../../images/img_defi_unknown.png')}
							/>
						</View>
						<DashSecondLine lineWidth={width - 88} style={styles.lineMargin} />
						<View style={styles.securityItemView}>
							<Text style={[styles.unkownItemText, isDarkMode && baseStyles.textDark]}>
								{strings('security.detect_holders_status')}
							</Text>
							<Image
								style={styles.securityIconLargeSize}
								source={require('../../../images/img_defi_unknown.png')}
							/>
						</View>
						<DashSecondLine lineWidth={width - 88} style={styles.lineMargin} />
						<View style={styles.securityItemView}>
							<Text style={[styles.unkownItemText, isDarkMode && baseStyles.textDark]}>
								{strings('security.detect_liqudity_providers')}
							</Text>
							<Image
								style={styles.securityIconLargeSize}
								source={require('../../../images/img_defi_unknown.png')}
							/>
						</View>
						<DashSecondLine lineWidth={width - 88} style={styles.lineMargin} />
						<View style={styles.securityItemView}>
							<Text style={[styles.unkownItemText, isDarkMode && baseStyles.textDark]}>
								{strings('security.detect_trading_tax')}
							</Text>
							<Image
								style={styles.securityIconLargeSize}
								source={require('../../../images/img_defi_unknown.png')}
							/>
						</View>
						<View style={[styles.fullLine, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
						<View style={styles.flexGrowOne} />

						<TouchableOpacity
							activeOpacity={0.6}
							style={styles.applyCheckTouch}
							onPress={() => {
								ReactNativeHapticFeedback.trigger('impactMedium', options);
								this.setState({ showFastCheck: true });
								onEvent('request_detection');
								this.fastCheckCount = 0;
								this.timeoutFastCheck(0);
							}}
						>
							<Image source={require('../../../images/ic_gplus_white.png')} />
							<Text style={[styles.applyCheckText]}>{strings('fold_security.apply_check')}</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		);
	};

	renderCheckedItem = (title, desc, checked, addLine) => {
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				style={styles.flexOne}
				activeOpacity={1.0}
				onPress={() => {
					this.showInfoModal(title, desc);
				}}
			>
				<View style={styles.checkItemContent}>
					<Text style={[styles.checkItemTitle, baseStyles.textDark]} allowFontScaling={false}>
						{title}
					</Text>
					<Image
						source={
							checked
								? require('../../../images/ic_security_checked.png')
								: require('../../../images/ic_security_unchecked.png')
						}
					/>
				</View>
				{addLine && <DashSecondLine lineWidth={width - 108} style={styles.heightOne} />}
			</TouchableOpacity>
		);
	};

	renderHorderItem = (holder, index) => {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.holderItemWrap} key={'holder-index-' + index}>
				<View
					style={[
						styles.holderItemContent,
						{
							backgroundColor:
								index === 1
									? colors.$FFB00030
									: index === 2
									? colors.$DADFE3A8
									: index === 3
									? colors.$F1D3C29E
									: colors.$F6F6F6
						}
					]}
				>
					<Text
						allowFontScaling={false}
						style={[
							styles.holderNum,
							{
								color:
									index === 1
										? colors.$FFB000
										: index === 2
										? colors.$60657D
										: index === 3
										? colors.$D38D69
										: colors.$8F92A1
							},
							index === 1 || index === 2 || (index === 3 && { ...fontStyles.semibold })
						]}
					>
						{index}
					</Text>
				</View>
				<View style={styles.marginLeft14}>
					<Text allowFontScaling={false} style={[styles.holderPercent, isDarkMode && baseStyles.textDark]}>
						{(holder.percent * 100).toFixed(2)}%
					</Text>
					<Text style={styles.holderAddr} allowFontScaling={false}>
						{holder.address?.substring(0, 4) +
							'...' +
							holder.address?.substring(holder.address?.length - 4)}
					</Text>
				</View>
			</View>
		);
	};

	renderChecked = () => {
		const securityData = this.state.securityData;
		const {
			is_open_source,
			is_honeypot,
			is_proxy,
			is_blacklisted,
			is_whitelisted,
			can_take_back_ownership,
			transfer_pausable,
			is_true_token,
			is_airdrop_scam,
			is_anti_whale,
			holder_count,
			lp_holder_count,
			total_supply,
			is_mintable,
			slippage_modifiable,
			buy_tax,
			sell_tax,
			dex,
			holders,
			owner_address,
			risk,
			notice,
			normal
		} = securityData;
		const noticeNum = notice ? notice.length : 0;
		const riskNum = risk ? risk.length : 0;
		const normalNum = normal ? normal.length : 0;
		const checked = noticeNum > 0 || riskNum > 0 || normalNum > 0;

		let allPercent = 0;
		if (holders) {
			holders.forEach(holder => {
				allPercent += parseFloat(holder.percent);
			});
			if (allPercent > 1) {
				allPercent = 1;
			}
		}

		let noLineKey;
		if (owner_address) {
			noLineKey = 'owner_address';
		} else if (is_anti_whale) {
			noLineKey = 'is_anti_whale';
		} else if (is_airdrop_scam) {
			noLineKey = 'is_airdrop_scam';
		} else if (is_true_token) {
			noLineKey = 'is_true_token';
		} else if (transfer_pausable) {
			noLineKey = 'transfer_pausable';
		} else if (can_take_back_ownership) {
			noLineKey = 'can_take_back_ownership';
		} else if (is_whitelisted) {
			noLineKey = 'is_whitelisted';
		} else if (is_blacklisted) {
			noLineKey = 'is_blacklisted';
		} else if (is_proxy) {
			noLineKey = 'is_proxy';
		} else if (is_honeypot) {
			noLineKey = 'is_honeypot';
		} else if (is_open_source) {
			noLineKey = 'is_open_source';
		}
		const { isDarkMode } = this.context;
		return (
			<View style={styles.flexOne}>
				{!!noLineKey && (
					<View style={[styles.checkItemWrap, isDarkMode && baseStyles.darkInputBackground]}>
						{is_open_source &&
							this.renderCheckedItem(
								strings('security.open_source'),
								strings('security.open_source_desc'),
								is_open_source === '1',
								noLineKey !== 'is_open_source'
							)}
						{is_honeypot &&
							this.renderCheckedItem(
								strings('security.able_to_sell'),
								strings('security.able_to_sell_desc'),
								is_honeypot === '0',
								noLineKey !== 'is_honeypot'
							)}
						{is_proxy &&
							this.renderCheckedItem(
								strings('security.no_proxy_contract'),
								strings('security.no_proxy_contract_desc'),
								is_proxy === '0',
								noLineKey !== 'is_proxy'
							)}
						{is_blacklisted &&
							this.renderCheckedItem(
								strings('security.no_blacklist'),
								strings('security.no_blacklist_desc'),
								is_blacklisted === '0',
								noLineKey !== 'is_blacklisted'
							)}
						{is_whitelisted &&
							this.renderCheckedItem(
								strings('security.no_whitelist'),
								strings('security.no_whitelist_desc'),
								is_whitelisted === '0',
								noLineKey !== 'is_whitelisted'
							)}
						{can_take_back_ownership &&
							this.renderCheckedItem(
								strings('security.no_ownership_takeback'),
								strings('security.no_ownership_takeback_desc'),
								can_take_back_ownership === '0',
								noLineKey !== 'can_take_back_ownership'
							)}
						{transfer_pausable &&
							this.renderCheckedItem(
								strings('security.unpausable_trading'),
								strings('security.unpausable_trading_desc'),
								transfer_pausable === '0',
								noLineKey !== 'transfer_pausable'
							)}
						{is_true_token &&
							this.renderCheckedItem(
								strings('security.genuine_token'),
								strings('security.genuine_token_desc'),
								is_true_token === '1',
								noLineKey !== 'is_true_token'
							)}
						{is_airdrop_scam &&
							this.renderCheckedItem(
								strings('security.not_airdrop_scam'),
								strings('security.not_airdrop_scam_desc'),
								is_airdrop_scam === '0',
								noLineKey !== 'is_airdrop_scam'
							)}
						{is_anti_whale &&
							this.renderCheckedItem(
								strings('security.anti_whale'),
								strings('security.anti_whale_desc'),
								is_anti_whale === '0',
								noLineKey !== 'is_anti_whale'
							)}
						{!!owner_address && (
							<TouchableOpacity
								style={styles.flexOne}
								activeOpacity={1.0}
								onPress={() => {
									this.showInfoModal(
										strings('security.owner_address'),
										strings('security.owner_address_desc')
									);
								}}
							>
								<View style={styles.ownerItemContent}>
									<Text
										style={[styles.ownerItemTitle, isDarkMode && baseStyles.textDark]}
										allowFontScaling={false}
									>
										{strings('security.owner_address')}
									</Text>
									<Text
										style={styles.ownerItemAddr}
										allowFontScaling={false}
										numberOfLines={1}
										ellipsizeMode={'middle'}
									>
										{owner_address}
									</Text>
								</View>
							</TouchableOpacity>
						)}
					</View>
				)}

				<TouchableOpacity
					style={[styles.securityItemWrap, isDarkMode && baseStyles.darkInputBackground]}
					activeOpacity={1.0}
					onPress={() => {
						this.showInfoModal(strings('security.on_chain_info'), strings('security.on_chain_info_desc'));
					}}
				>
					<View style={styles.securityItem}>
						<Text
							style={[styles.securityItemTitle, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{holder_count ? (holder_count < 10000 ? holder_count : renderCoinValue(holder_count)) : '-'}
						</Text>
						<Text style={styles.securityItemDesc}>{strings('security.holders')}</Text>
					</View>
					<View style={styles.securityItem}>
						<Text
							style={[styles.securityItemTitle, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{lp_holder_count
								? lp_holder_count < 10000
									? lp_holder_count === '0' && dex?.length === 1
										? '?'
										: lp_holder_count
									: renderCoinValue(lp_holder_count)
								: '-'}
						</Text>
						<Text style={styles.securityItemDesc}>{strings('security.lp')}</Text>
					</View>
					<View style={styles.securityItem}>
						<Text
							style={[styles.securityItemTitle, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{dex?.length || '-'}
						</Text>
						<Text style={styles.securityItemDesc}>{strings('security.dexs')}</Text>
					</View>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.securityItemWrap, isDarkMode && baseStyles.darkInputBackground]}
					activeOpacity={1.0}
					onPress={() => {
						this.showInfoModal(strings('security.trading_tax'), strings('security.trading_tax_desc'));
					}}
				>
					<View style={styles.securityItem}>
						<Text
							style={[styles.securityItemTitle, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{sell_tax
								? sell_tax === '0' || sell_tax === '1'
									? sell_tax * 100 + '%'
									: (sell_tax * 100).toFixed(2) + '%'
								: '-'}
						</Text>
						<Text allowFontScaling={false} style={styles.securityItemDesc}>
							{strings('security.sell_tax')}
						</Text>
					</View>
					<View style={[styles.securityItem, isDarkMode && baseStyles.darkInputBackground]}>
						<Text
							style={[styles.securityItemTitle, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{buy_tax
								? buy_tax === '0' || buy_tax === '1'
									? buy_tax * 100 + '%'
									: (buy_tax * 100).toFixed(2) + '%'
								: '-'}
						</Text>
						<Text allowFontScaling={false} style={styles.securityItemDesc}>
							{strings('security.buy_tax')}
						</Text>
					</View>
					{slippage_modifiable ? (
						<View style={[styles.securityItem, isDarkMode && baseStyles.darkInputBackground]}>
							<Image
								style={styles.securityItemIcon}
								source={
									slippage_modifiable === '1'
										? require('../../../images/ic_security_unchecked.png')
										: require('../../../images/ic_security_checked.png')
								}
							/>
							<Text style={styles.securityItemDesc} allowFontScaling={false}>
								{strings('security.immutable_tax')}
							</Text>
						</View>
					) : (
						<View style={styles.securityItem} />
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.securityItemWrap, isDarkMode && baseStyles.darkInputBackground]}
					activeOpacity={1.0}
					onPress={() => {
						this.showInfoModal(strings('security.total_supply'), strings('security.total_supply_desc'));
					}}
				>
					<View style={styles.securityItem}>
						<Text
							style={[styles.securityItemTitle, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{renderCoinValue(total_supply)}
						</Text>
						<Text style={styles.securityItemDesc} allowFontScaling={false}>
							{strings('security.total_supply_on')}
						</Text>
					</View>
					{is_mintable ? (
						<View style={styles.securityItem}>
							<Image
								style={styles.securityItemIcon}
								source={
									is_mintable === '1'
										? require('../../../images/ic_security_unchecked.png')
										: require('../../../images/ic_security_checked.png')
								}
							/>
							<Text style={styles.securityItemDesc} allowFontScaling={false}>
								{strings('security.unmintable')}
							</Text>
						</View>
					) : (
						<View style={styles.securityItem} />
					)}
					<View style={styles.securityItem} />
				</TouchableOpacity>

				{holders && holders.length > 0 && (
					<View style={[styles.holderBase, isDarkMode && baseStyles.darkInputBackground]}>
						<Text style={[styles.holderTitle, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
							{strings('security.top_ten_holders')}
						</Text>
						<View style={styles.contentCenter}>
							<PercentageCircle
								percent={allPercent * 100}
								radius={75}
								borderWidth={25}
								innerColor={colors.$F9F9F9}
								bgcolor={colors.$E9ECF1}
								color={colors.brandPink300}
							>
								<View style={styles.contentCenter}>
									<Text style={styles.circleContent} allowFontScaling={false}>
										{(allPercent * 100).toFixed(2)}%
									</Text>
									<Text style={styles.circleDesc} allowFontScaling={false}>
										{strings('security.top_num')}
									</Text>
								</View>
							</PercentageCircle>
						</View>
						<View style={styles.holderList}>
							<View style={styles.flexOne}>
								{holders.map((holder, index) => {
									if (index < 5) {
										return this.renderHorderItem(holder, index + 1);
									}
									return undefined;
								})}
							</View>
							<View style={styles.holderRight}>
								{holders.map((holder, index) => {
									if (index >= 5) {
										return this.renderHorderItem(holder, index + 1);
									}
									return undefined;
								})}
							</View>
						</View>
					</View>
				)}

				{checked && (
					<TouchableOpacity
						style={[styles.shareItemWrap, isDarkMode && baseStyles.darkInputBackground]}
						activeOpacity={1.0}
						onPress={() => {
							this.shareSecurityLink();
						}}
					>
						<Image source={require('../../../images/ic_share_pink.png')} />
						<Text style={styles.shareText}>{strings('security.share_security_report')}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

	renderSecurityView = () => {
		const { asset } = this.props;
		const { isDarkMode } = this.context;
		const { risk, notice, normal, isTrust } = this.state.securityData;
		const noticeNum = notice ? notice.length : 0;
		const riskNum = risk ? risk.length : 0;
		const normalNum = normal ? normal.length : 0;
		const checked = noticeNum > 0 || riskNum > 0 || normalNum > 0;
		let riskText = strings('security.security_risk_unknown');
		let riskImg = require('../../../images/img_defi_unknown.png');
		let riskTextColor = isDarkMode ? colors.paliGrey200 : colors.$60657D;

		if (isTrust || (checked && riskNum === 0 && noticeNum === 0)) {
			riskText = strings('security.security_risk_low');
			riskImg = require('../../../images/img_defi_safe.png');
			riskTextColor = colors.$09C285;
		} else if (checked && riskNum > 0) {
			riskText = strings('security.security_risk_high');
			riskImg = require('../../../images/img_defi_danger.png');
			riskTextColor = colors.$FC6564;
		} else if (checked && noticeNum > 0) {
			riskText = strings('security.security_risk_medium');
			riskImg = require('../../../images/img_defi_warning.png');
			riskTextColor = colors.$FFB000;
		}

		return (
			<View style={styles.flexOne}>
				<View style={[styles.securityTitle, isDarkMode && baseStyles.darkInputBackground]}>
					<View style={styles.iconLayout}>
						<TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />
					</View>
					<View style={styles.maxSymbolWidth}>
						<Text
							style={[styles.symbolText, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							ellipsizeMode={'middle'}
						>
							{asset.symbol}
						</Text>
						<Text style={[styles.symbolText, isDarkMode && baseStyles.textDark]} numberOfLines={1}>
							{asset.address?.toLowerCase().substring(0, 6) +
								'...' +
								asset.address?.toLowerCase().substring(asset.address.length - 4)}
						</Text>
					</View>
					<View style={styles.flexOne} />
					<Image style={styles.unknowSmallSize} source={riskImg} />
					<Text style={[styles.undetectedText, { color: riskTextColor }]}>{riskText}</Text>
				</View>
				<View style={styles.spaceHeight} />
				{!checked && this.renderUnDetected()}
				{checked && this.renderChecked()}
			</View>
		);
	};

	showInfiniteDesc = () => {
		this.setState({ infiniteDescVisible: true });
	};

	hideInfiniteDesc = () => {
		this.setState({ infiniteDescVisible: false });
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
							<Text style={[styles.modalTitle, isDarkMode && baseStyles.textDark]}>
								{strings('approval_management.intro_title')}
							</Text>
							<Text style={[styles.modalDesc, isDarkMode && baseStyles.textDark]}>
								{strings('approval_management.intro_text')}
							</Text>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	renderNoDetectedModal = () => {
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={this.state.showNoDetectedModal && !this.props.isLockScreen}
				actionContainerStyle={styles.modalNoBorder}
				backdropOpacity={0.7}
				animationIn="fadeIn"
				animationOut="fadeOut"
				useNativeDriver
			>
				<View style={[styles.detailModal, isDarkMode && baseStyles.darkBackground]}>
					<Text style={[styles.noDetectedTitle, isDarkMode && baseStyles.textDark]}>
						{strings('security.detect_no_security')}
					</Text>
					<View style={styles.noDetectedLine} />
					<TouchableOpacity
						style={styles.noDetectedTouch}
						onPress={() => {
							this.setState({ showNoDetectedModal: false });
						}}
					>
						<Text style={[styles.tryLaterText, isDarkMode && baseStyles.textDark]}>
							{strings('security.try_it_later')}
						</Text>
					</TouchableOpacity>
				</View>
			</Modal>
		);
	};

	renderApprovalView = () => {
		const { selectedAddress, allEvents, asset } = this.props;
		if (asset.nativeCurrency) {
			return;
		}
		const chainId = getChainIdByType(asset.type);
		const singleChainTokens = allEvents?.[selectedAddress]?.[chainId] || {};
		const eventGroup = singleChainTokens?.[asset.address] || singleChainTokens?.[asset.address.toLowerCase()] || {};
		const approvals = eventGroup.approvals || {};
		const spenders = Object.keys(approvals);
		const eventList = [];
		for (let i = 0; i < spenders.length; i++) {
			const spender = spenders[i];
			const event = approvals[spender];
			if (event.allowance > 0) {
				eventList.push(event);
			}
		}
		eventList.sort((a, b) => b.timestamp - a.timestamp);
		const isRpc = util.isRpcChainType(asset.type);
		const { isDarkMode } = this.context;
		return (
			<View>
				<Text style={[styles.approvalTitle, isDarkMode && baseStyles.textDark]}>
					{strings('approval_management.token_title')}
				</Text>
				<Text style={styles.approvalHint}>{strings('approval_management.hint')}</Text>
				<View style={styles.lineFull} />
				{eventList.map((event, i) => (
					<ApprovalEvent
						key={i}
						chainId={chainId}
						event={event}
						tokenInfo={asset}
						showInfiniteDesc={this.showInfiniteDesc}
						hideDivider={i === eventList.length - 1}
					/>
				))}
				{eventList.length === 0 && (
					<View style={styles.approvalEmpty}>
						<Image style={styles.approvalEmptyIcon} source={require('../../../images/notx.png')} />
						<Text style={styles.approvalEmptyText}>
							{strings(isRpc ? 'approval_management.empty_rpc' : 'approval_management.empty')}
						</Text>
					</View>
				)}
			</View>
		);
	};

	showInfoModal = (title, desc) => {
		this.setState({ infoModalVisible: true, infoModalTitle: title.replace('\n', ''), infoModalDesc: desc });
	};

	hideInfoModal = () => {
		this.setState({ infoModalVisible: false });
	};

	renderInfoModal = () => {
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={this.state.infoModalVisible && !this.props.isLockScreen}
				onBackdropPress={this.hideInfoModal}
				onBackButtonPress={this.hideInfoModal}
				onSwipeComplete={this.hideInfoModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.bottomModal}
			>
				<View>
					<View style={[styles.infoModalWrapper, isDarkMode && baseStyles.darkModalBackground]}>
						<Text style={[styles.infoTitle, isDarkMode && baseStyles.textDark]}>
							{this.state.infoModalTitle}
						</Text>
						<Text style={[styles.infoDesc, isDarkMode && baseStyles.subTextDark]}>
							{this.state.infoModalDesc}
						</Text>
					</View>
				</View>
			</Modal>
		);
	};

	shareSecurityLink = () => {
		const chainId = getChainIdByType(this.props.asset.type);
		const title = strings('security.token_security', { symbol: this.props.asset.symbol });
		const url = 'https://gopluslabs.io/token-security/' + chainId + '/' + this.props.asset.address?.toLowerCase();
		if (Platform.OS === 'ios') {
			Share.share({ message: title, url });
		} else {
			Share.share({ message: url, title });
		}
	};

	render = () => {
		const { securityViewOpacity, closeSecurityView } = this.props;
		const { IOSStatusBarHeight, tabIndex, securityData } = this.state;
		const { risk, notice, normal } = securityData;
		const noticeNum = notice ? notice.length : 0;
		const riskNum = risk ? risk.length : 0;
		const normalNum = normal ? normal.length : 0;
		const checked = noticeNum > 0 || riskNum > 0 || normalNum > 0;

		let barHeight = 0;
		if (Device.isAndroid()) {
			barHeight = StatusBar.currentHeight;
		} else if (Device.isIos()) {
			barHeight = IOSStatusBarHeight;
		}
		const headerHeight = 56 + barHeight;
		const moveHeight = height - 200 - headerHeight;
		const { isDarkMode } = this.context;
		return (
			<View style={styles.wrapper}>
				<View style={styles.padding_wrapper}>
					<Animated.View
						opacity={securityViewOpacity}
						style={[
							styles.securityLayout,
							{
								top: barHeight,
								height: moveHeight + headerHeight - barHeight + 17
							}
						]}
					>
						<View style={styles.tabTop}>
							<View style={styles.tabTabSwitch}>
								<TouchableOpacity
									style={styles.tabItem}
									onPress={() => {
										if (tabIndex !== 0) {
											this.scrollViewRef?.current?.scrollTo({
												x: 0,
												y: 0,
												animated: false
											});
											this.setState({ tabIndex: 0 });
										}
									}}
								>
									<Text
										style={[styles.tabItemText, tabIndex === 0 && styles.fontSize22]}
										allowFontScaling={false}
									>
										{strings('approval_management.tab_token')}
									</Text>
									{tabIndex === 0 && <View style={styles.tabItemLine} />}
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.tabItem}
									onPress={() => {
										if (tabIndex !== 1) {
											this.scrollViewRef?.current?.scrollTo({
												x: 0,
												y: 0,
												animated: false
											});
											this.setState({ tabIndex: 1 });
										}
									}}
								>
									<Text
										style={[styles.tabItemText, tabIndex === 1 && styles.fontSize22]}
										allowFontScaling={false}
									>
										{strings('approval_management.tab_approval')}
									</Text>
									{tabIndex === 1 && <View style={styles.tabItemLine} />}
								</TouchableOpacity>
							</View>
							{checked && (
								<TouchableOpacity
									style={styles.coinShareTouch}
									onPress={() => {
										this.shareSecurityLink();
									}}
								>
									<Image source={require('../../../images/ic_coin_share.png')} />
								</TouchableOpacity>
							)}
							<TouchableOpacity
								onPress={() => {
									closeSecurityView && closeSecurityView();
								}}
							>
								<Image source={require('../../../images/ic_coin_fold.png')} />
							</TouchableOpacity>
						</View>
						<View style={styles.scrollWrap}>
							<ScrollView
								ref={this.scrollViewRef}
								showsVerticalScrollIndicator={false}
								style={styles.flexOne}
								contentContainerStyle={styles.flexGrowOne}
							>
								<View style={styles.flexOne}>
									{tabIndex === 0 && this.renderSecurityView()}
									{tabIndex === 1 && (
										<View
											style={[styles.wrapContent, isDarkMode && baseStyles.darkInputBackground]}
										>
											{this.renderApprovalView()}
										</View>
									)}
									<View style={styles.spaceHeight} />
								</View>
							</ScrollView>
						</View>
					</Animated.View>
					<View
						style={[
							styles.gestureView,
							{
								top: moveHeight + headerHeight
							}
						]}
					>
						<View {...this.panResponder.panHandlers} style={styles.gestureInView} />
					</View>
				</View>
				{this.renderInfiniteDesc()}
				{this.renderInfoModal()}
				{this.renderNoDetectedModal()}
			</View>
		);
	};

	panResponder = PanResponder.create({
		onStartShouldSetPanResponder: (evt, gestureState) => true,
		onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
		onMoveShouldSetPanResponder: (evt, gestureState) => false,
		onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,
		onPanResponderTerminationRequest: (evt, gestureState) => false,
		onShouldBlockNativeResponder: (evt, gestureState) => false,
		onPanResponderRelease: (evt, gestureState) => {
			this.props.closeSecurityView && this.props.closeSecurityView();
		}
	});
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	allEvents: state.engine.backgroundState.ApprovalEventsController.allEvents,
	isLockScreen: state.settings.isLockScreen
});

export default connect(mapStateToProps)(FoldSecurityView);
