import React, { PureComponent } from 'react';
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	ActivityIndicator,
	StatusBar,
	Animated,
	NativeModules,
	Text,
	Dimensions,
	Platform,
	Vibration
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import AssetOverview from '../../UI/AssetOverview';
import iconBackWhite from '../../../images/ic_back_white.png';
import iconBackBlack from '../../../images/back.png';
import AssetView from '../../UI/AssetView';
import Device from '../../../util/Device';
import MStatusBar from '../../UI/MStatusBar';
import AssetActionView from '../../UI/AssetActionView';
import { SpringScrollView } from 'react-native-spring-scrollview';
import FoldSecurityView from '../FoldSecurityView';
import { strings } from '../../../../locales/i18n';
import { iosShake } from '../../../util/NativeUtils';
import { onEvent } from '../../../util/statistics';
import { SafeAreaView } from 'react-navigation';
import { getSecurityData } from '../../../util/security';

const activeOpacity = 0.8;
const { height } = Dimensions.get('screen');

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	padding_wrapper: {
		flex: 1
	},
	scroll_wrapper: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0
	},
	draggerWrapper: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		position: 'absolute',
		left: 0,
		top: 0,
		right: 0
	},
	draggerButton: {
		padding: 10,
		paddingHorizontal: 20,
		flexDirection: 'row'
	},
	assetOverviewWrapper: {
		marginHorizontal: 24
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bgWrapper: {
		position: 'absolute',
		top: 0,
		backgroundColor: colors.$FE6E91,
		bottom: 0,
		left: 0,
		right: 0
	},
	bottomBg: {
		flex: 0,
		backgroundColor: colors.white
	},
	bottomSecurityBg: {
		zIndex: 100,
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		height: 70,
		backgroundColor: colors.white
	},
	assetTopBg: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: colors.white
	},
	flexOne: {
		flex: 1
	},
	foldView: {
		position: 'absolute',
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		zIndex: 1000
	},
	widthFull: {
		width: '100%'
	},
	titleUnfoldLayout: {
		backgroundColor: colors.white,
		borderRadius: 38,
		height: 39,
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 17,
		paddingHorizontal: 12
	},
	titleUnfoldInContent: {
		justifyContent: 'center',
		marginLeft: 5,
		marginRight: 6
	},
	titleUnfoldSecurityText: {
		...fontStyles.semibold,
		fontSize: 14,
		color: colors.$030319
	},
	titleUnfoldSecurityDesc: {
		fontSize: 10,
		color: colors.$60657D,
		lineHeight: 13
	},
	securityIcon: {
		width: 22,
		height: 22
	}
});

/**
 * View that displays a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 * and also the transaction list
 */
class Asset extends PureComponent {
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
		params: PropTypes.object,
		hideSecurityModal: PropTypes.func
	};

	state = {
		asset: undefined,
		isGlobalAmountHide: false,
		hideAmount: false,
		navBackColorOffset: new Animated.Value(0),
		barStyle: 'light-content',
		backImg: iconBackWhite,
		IOSStatusBarHeight: 0,
		isSecurityViewShowed: false,
		immediatelyShowed: false
	};

	securityViewOpacity = new Animated.Value(0);
	buttonOpacity = new Animated.Value(1);

	assetViewRef = React.createRef();

	changeNavHeight = 60;

	onScroll(event) {
		const y = event.nativeEvent.contentOffset.y;
		this.setState({ navBackColorOffset: new Animated.Value(y) });
		if (y > this.changeNavHeight / 2) {
			this.setState({ barStyle: 'dark-content', backImg: iconBackBlack });
		} else {
			this.setState({ barStyle: 'light-content', backImg: iconBackWhite });
		}
	}

	async componentDidMount() {
		let asset = this.props.navigation.getParam('asset', undefined);
		if (!asset) {
			asset = this.props.params;
		}
		const isGlobalAmountHide = this.props.navigation.getParam('isAmountHide', false);
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				statusBarHeight && this.setState({ IOSStatusBarHeight: statusBarHeight.height });
			});
		}
		this.setState({ asset, isGlobalAmountHide });
	}

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" color={colors.$FE6E91} />
		</View>
	);

	goBack = () => {
		const hideModal = this.props.navigation.hideModal;
		if (hideModal) {
			hideModal();
		}
		this.props.navigation.goBack();
	};

	hideSecurityModal = () => {
		if (this.props.hideSecurityModal) {
			this.props.hideSecurityModal();
		}
	};

	hideAmount = hide => {
		this.setState({ hideAmount: hide });
	};

	renderUnfold = (unFoldOpacity, moveHeight) => {
		const { asset } = this.state;
		const securityData = getSecurityData(asset);
		const { notice, risk, normal, isTrust } = securityData;
		const riskNum = risk ? risk.length : 0;
		const noticeNum = notice ? notice.length : 0;
		const normalNum = normal ? normal.length : 0;
		const checked = noticeNum > 0 || riskNum > 0 || normalNum > 0;
		let riskText = strings('security.security_risk_unknown');
		let riskImg = require('../../../images/img_defi_unknown.png');
		if (isTrust || (checked && riskNum === 0 && noticeNum === 0)) {
			riskText = strings('security.security_risk_low');
			riskImg = require('../../../images/img_defi_safe.png');
		} else if (checked && riskNum > 0) {
			riskText = strings('security.security_risk_high');
			riskImg = require('../../../images/img_defi_danger.png');
		} else if (checked && noticeNum > 0) {
			riskText = strings('security.security_risk_medium');
			riskImg = require('../../../images/img_defi_warning.png');
		}
		return (
			<TouchableOpacity
				disabled={unFoldOpacity.__getValue() < 0.2}
				activeOpacity={0.6}
				onPress={() => {
					if (!this.state.isSecurityViewShowed) {
						this.openSecurityView(moveHeight);
					}
				}}
			>
				<Animated.View opacity={unFoldOpacity} style={styles.titleUnfoldLayout}>
					<Image source={riskImg} style={styles.securityIcon} />
					<View style={styles.titleUnfoldInContent}>
						<Text style={styles.titleUnfoldSecurityText} allowFontScaling={false}>
							{riskText}
						</Text>
						<Text style={styles.titleUnfoldSecurityDesc} allowFontScaling={false}>
							{strings('fold_security.tap_to_check')}
						</Text>
					</View>
					<Image source={require('../../../images/ic_unfold.png')} />
				</Animated.View>
			</TouchableOpacity>
		);
	};

	renderBg = nativeCurrency => {
		const { asset, isSecurityViewShowed } = this.state;
		let bgColor = '#ACBAC4';
		let bgImg = require('../../../images/img_coin_bg_unknow.png');
		if (nativeCurrency) {
			bgColor = '#91D752';
			bgImg = require('../../../images/img_coin_bg_safe.png');
		} else {
			const securityData = getSecurityData(asset);
			const { notice, risk, normal, isTrust } = securityData;
			const noticeNum = notice && notice.length ? notice.length : 0;
			const riskNum = risk && risk.length ? risk.length : 0;
			const normalNum = normal && normal.length ? normal.length : 0;
			if (isTrust || (risk && notice && riskNum === 0 && noticeNum === 0 && normalNum !== 0)) {
				bgColor = '#91D752';
				bgImg = require('../../../images/img_coin_bg_safe.png');
			} else if (riskNum > 0) {
				bgColor = '#FF6E6E';
				bgImg = require('../../../images/img_coin_bg_danger.png');
			} else if (noticeNum > 0) {
				bgColor = '#FE9A5C';
				bgImg = require('../../../images/img_coin_bg_warning.png');
			}
		}
		return (
			<View style={[styles.bgWrapper, { backgroundColor: bgColor }]}>
				<Image source={bgImg} style={styles.widthFull} />
				{!isSecurityViewShowed && <View style={styles.bottomSecurityBg} />}
			</View>
		);
	};

	render = () => {
		const {
			asset,
			hideAmount,
			isGlobalAmountHide,
			barStyle,
			navBackColorOffset,
			backImg,
			IOSStatusBarHeight,
			isSecurityViewShowed,
			immediatelyShowed
		} = this.state;
		const { navigation, selectedAddress } = this.props;
		if (!asset) return this.renderLoader();
		const isHideAmount = hideAmount || isGlobalAmountHide;
		const backgroundColor = navBackColorOffset.interpolate({
			inputRange: [0, this.changeNavHeight / 2, this.changeNavHeight],
			outputRange: [colors.transparent, '#FFFFFF30', '#FFFFFFFF'],
			extrapolate: 'clamp',
			useNativeDriver: true
		});
		const unFoldOpacity = navBackColorOffset.interpolate({
			inputRange: [0, this.changeNavHeight / 2, this.changeNavHeight],
			outputRange: [1.0, 0.5, 0.0],
			extrapolate: 'clamp',
			useNativeDriver: true
		});
		let barHeight = 0;
		if (Device.isAndroid()) {
			barHeight = StatusBar.currentHeight;
		} else if (Device.isIos()) {
			barHeight = IOSStatusBarHeight;
		}
		const headerHeight = 56 + barHeight;
		const moveHeight = height - 200 - headerHeight;

		const scrollEnabled = !asset.nativeCurrency;

		return (
			<React.Fragment>
				<View style={styles.wrapper}>
					<MStatusBar
						navigation={navigation}
						barStyle={barStyle}
						fixPadding={false}
						backgroundColor={colors.transparent}
					/>

					{this.renderBg(asset.nativeCurrency)}

					<View style={styles.padding_wrapper}>
						<SpringScrollView
							style={styles.scroll_wrapper}
							scrollEventThrottle={1}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							ref={ref => (this._scrollView = ref)}
							onScroll={({
								nativeEvent: {
									contentOffset: { x, y }
								}
							}) => {
								if (!this.clickCloseBtn && y === 0 && isSecurityViewShowed) {
									this.closeSecurityView();
								}
								if (y >= -60) {
									this.setState({ navBackColorOffset: new Animated.Value(y) });
									if (y > this.changeNavHeight / 2) {
										this.setState({ barStyle: 'dark-content', backImg: iconBackBlack });
									} else {
										this.setState({ barStyle: 'light-content', backImg: iconBackWhite });
									}
								}
							}}
							onTouchEnd={() => {
								if (scrollEnabled) {
									if (this._scrollView._contentOffset.y < -80) {
										this._scrollView.scrollTo({
											x: 0,
											y: this._scrollView._contentOffset.y,
											animated: false
										}); //避免回弹
										this.openSecurityView(moveHeight);
									}
								}
							}}
						>
							<View style={styles.flexOne}>
								<View style={[styles.assetTopBg, { top: 140 + headerHeight }]} />
								<AssetView
									ref={this.assetViewRef}
									style={{ paddingTop: headerHeight }}
									navigation={navigation}
									header={
										<View style={styles.assetOverviewWrapper}>
											<AssetOverview
												navigation={navigation}
												selectedAddress={selectedAddress}
												asset={asset}
												hideAmount={isHideAmount}
											/>
										</View>
									}
									asset={asset}
									selectedAddress={selectedAddress}
									hideAmount={this.hideAmount}
									hideSecurityModal={this.hideSecurityModal}
								/>
							</View>
						</SpringScrollView>

						{scrollEnabled && isSecurityViewShowed && (
							<FoldSecurityView
								style={styles.foldView}
								asset={asset}
								isSecurityViewShowed={isSecurityViewShowed}
								securityViewOpacity={this.securityViewOpacity}
								closeSecurityView={this.closeSecurityView}
							/>
						)}

						{!immediatelyShowed && (
							<Animated.View
								opacity={this.buttonOpacity}
								style={[
									styles.draggerWrapper,
									{
										backgroundColor,
										height: headerHeight,
										paddingTop: barHeight
									}
								]}
							>
								<TouchableOpacity
									style={styles.draggerButton}
									onPress={this.goBack}
									activeOpacity={activeOpacity}
								>
									<Image source={backImg} />
								</TouchableOpacity>

								{scrollEnabled && this.renderUnfold(unFoldOpacity, moveHeight)}
							</Animated.View>
						)}
					</View>
				</View>
				<SafeAreaView style={styles.bottomBg} />
				{!asset.lockType && !immediatelyShowed && (
					<AssetActionView navigation={navigation} asset={asset} hideOtherModal={this.hideSecurityModal} />
				)}
			</React.Fragment>
		);
	};

	openSecurityView = moveHeight => {
		this._scrollView &&
			this._scrollView
				.scrollTo({ x: 0, y: -moveHeight })
				.then()
				.catch();
		// this.securityViewOpacity.setValue(0);
		setTimeout(() => {
			this.setState({
				isSecurityViewShowed: true,
				immediatelyShowed: true
			});
			Animated.timing(this.securityViewOpacity, {
				toValue: 1,
				duration: 300,
				useNativeDriver: false
			}).start();
			if (Platform.OS === 'android') {
				Vibration.vibrate(10, false);
			} else {
				iosShake();
			}
		}, 10);

		onEvent('check_coin_security_info');
	};

	clickCloseBtn = false;
	closeSecurityView = () => {
		if (this.clickCloseBtn) {
			return;
		}
		this.clickCloseBtn = true;
		// this.securityViewOpacity.setValue(0.9);
		Animated.timing(this.securityViewOpacity, {
			toValue: 0,
			duration: 200,
			useNativeDriver: false
		}).start();
		this._scrollView &&
			this._scrollView
				.scrollTo({ x: 0, y: 0 })
				.then(() => {
					this.clickCloseBtn = false;
					this.setState({ isSecurityViewShowed: false });
				})
				.catch();
		setTimeout(() => {
			this.setState({
				immediatelyShowed: false
			});
			this.buttonOpacity.setValue(0);
			Animated.timing(this.buttonOpacity, {
				toValue: 1,
				duration: 200,
				useNativeDriver: false
			}).start();
		}, 10);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(Asset);
