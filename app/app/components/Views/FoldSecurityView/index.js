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
	TouchableWithoutFeedback
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import TokenImage from '../../UI/TokenImage';
import { ChainType, util } from 'gopocket-core';
import { strings } from '../../../../locales/i18n';
import DashSecondLine from '../DashSecondLine';
import { getChainIdByType } from '../../../util/number';
import ApprovalEvent from '../../UI/ApprovalEvent';
import Modal from 'react-native-modal';
import Engine from '../../../core/Engine';
import { chainTypeTochain } from '../../../util/walletconnect';
import SecurityFastCheck from '../../UI/SecurityFastCheck';
import { onEvent } from 'react-native-mumeng';
import { getIcTagResource } from '../../../util/rpcUtil';

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
		width: 50,
		height: 40,
		alignSelf: 'center'
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
		alignItems: 'center'
	},
	tagView: {
		position: 'absolute',
		left: 30,
		top: 20
	},
	securityItemView: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20
	},
	unkownItemText: {
		fontSize: 18,
		...fontStyles.semibold,
		color: colors.$030319,
		marginLeft: 10
	},
	lineFull: {
		backgroundColor: colors.$F0F0F0,
		height: 1
	},
	lineMargin: {
		height: 1,
		marginHorizontal: 20
	},
	maxSymbolWidth: {
		maxWidth: '50%'
	},
	symbolText: {
		color: colors.$030319,
		fontSize: 24,
		...fontStyles.semibold
	},
	addressText: {
		color: colors.$030319,
		fontSize: 10
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
		backgroundColor: colors.$FE6E91,
		alignItems: 'center',
		justifyContent: 'center',
		margin: 20
	},
	applyCheckText: {
		fontSize: 16,
		color: colors.white
	},
	checkDetailItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 20,
		marginVertical: 5
	},
	checkDetailItemText: {
		marginLeft: 6,
		fontSize: 12,
		...fontStyles.medium,
		color: colors.$030319
	},
	checkDetailTitle: {
		...fontStyles.medium,
		color: colors.$030319,
		fontSize: 12,
		marginHorizontal: 20,
		marginBottom: 3
	},
	applyCheckHint: {
		color: colors.$030319,
		fontSize: 12,
		marginHorizontal: 20,
		marginBottom: 14
	},
	securityLayout: {
		position: 'absolute',
		left: 0,
		right: 0
	},
	tabTop: {
		backgroundColor: colors.transparent,
		paddingHorizontal: 30,
		justifyContent: 'space-between',
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 10
	},
	flexRow: {
		flexDirection: 'row'
	},
	scrollWrap: {
		marginHorizontal: 35,
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
		width: 30,
		height: 30
	},
	checkItemLayout: {
		flexDirection: 'row',
		flex: 1,
		padding: 20
	},
	checkItemContent: {
		marginLeft: 10,
		flex: 1
	},
	checkItemTitle: {
		color: colors.$030319,
		...fontStyles.semibold,
		fontSize: 18,
		lineHeight: 22
	},
	checkItemDesc: {
		color: colors.$60657D,
		fontSize: 13,
		marginTop: 6,
		lineHeight: 17
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
	bottomPadding: {
		height: 18
	},
	flexGrowOne: {
		flexGrow: 1
	},
	wrapContent: {
		flex: 1,
		borderRadius: 10,
		backgroundColor: colors.white
	}
});

class FoldSecurityView extends PureComponent {
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
		closeSecurityView: PropTypes.func
	};

	state = {
		IOSStatusBarHeight: 0,
		tabIndex: 0,
		infiniteDescVisible: false,
		showFastCheck: false
	};

	scrollViewRef = React.createRef();

	// securityViewOpacity = new Animated.Value(0);

	async componentDidMount() {
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				statusBarHeight && this.setState({ IOSStatusBarHeight: statusBarHeight.height });
			});
		}
	}

	renderUnDetected = () => (
		<View style={styles.flexOne}>
			<View style={styles.securityItemView}>
				<Image style={styles.securityIconLargeSize} source={require('../../../images/img_defi_unknown.png')} />
				<Text style={styles.unkownItemText}>{strings('security.item_open_source')}</Text>
			</View>
			<DashSecondLine lineWidth={width - 80} style={styles.lineMargin} />
			<View style={styles.securityItemView}>
				<Image style={styles.securityIconLargeSize} source={require('../../../images/img_defi_unknown.png')} />
				<Text style={styles.unkownItemText}>{strings('security.item_in_dex')}</Text>
			</View>
			<DashSecondLine lineWidth={width - 80} style={styles.lineMargin} />
			<View style={styles.securityItemView}>
				<Image style={styles.securityIconLargeSize} source={require('../../../images/img_defi_unknown.png')} />
				<Text style={styles.unkownItemText}>{strings('security.item_proxy_contract')}</Text>
			</View>
			<DashSecondLine lineWidth={width - 80} style={styles.lineMargin} />
			<View style={styles.securityItemView}>
				<Image style={styles.securityIconLargeSize} source={require('../../../images/img_defi_unknown.png')} />
				<Text style={styles.unkownItemText}>{strings('security.item_trading_slippage')}</Text>
			</View>
		</View>
	);

	renderCheckedItem = (imgSource, title, desc, addLine, key) => (
		<View style={styles.flexOne} key={'security-item-' + key}>
			<View style={styles.checkItemLayout}>
				<Image source={imgSource} style={styles.securityIconLargeSize} />
				<View style={styles.checkItemContent}>
					<Text style={styles.checkItemTitle}>{title}</Text>
					<Text style={styles.checkItemDesc}>{desc}</Text>
				</View>
			</View>
			{addLine && <DashSecondLine lineWidth={width - 80} style={styles.lineMargin} />}
		</View>
	);

	renderChecked = () => {
		const { asset } = this.props;
		const securityData = asset.securityData || {};
		const { notice, risk, normal } = securityData;
		const noticeNum = notice && notice.length ? notice.length : 0;
		const riskNum = risk && risk.length ? risk.length : 0;
		const normalNum = normal && normal.length ? normal.length : 0;

		const allSize = noticeNum + riskNum + normalNum;
		let renderIndex = 0;
		return (
			<View style={styles.flexOne}>
				{risk &&
					risk.map((data, index) => {
						renderIndex++;
						return this.renderCheckedItem(
							require('../../../images/img_defi_danger.png'),
							data.name,
							data.desc,
							allSize > renderIndex,
							renderIndex
						);
					})}
				{notice &&
					notice.map((data, index) => {
						renderIndex++;
						return this.renderCheckedItem(
							require('../../../images/img_defi_warning.png'),
							data.name,
							data.desc,
							allSize > renderIndex,
							renderIndex
						);
					})}
				{normal &&
					normal.map((data, index) => {
						renderIndex++;
						return this.renderCheckedItem(
							require('../../../images/img_defi_safe.png'),
							data.name,
							data.desc,
							allSize > renderIndex,
							renderIndex
						);
					})}
			</View>
		);
	};

	renderSecurityView = () => {
		const { SecurityController } = Engine.context;
		const { showFastCheck } = this.state;
		const { asset } = this.props;
		const { submittedTokens } = SecurityController.state;
		const chain = chainTypeTochain(asset.type);
		const hasSubmitted = submittedTokens[chain] && submittedTokens[chain].includes(asset.address);

		const { risk, notice, normal, isRobotDetected } = asset.securityData || {};
		const noticeNum = notice ? notice.length : 0;
		const riskNum = risk ? risk.length : 0;
		const normalNum = normal ? normal.length : 0;
		const checked = noticeNum > 0 || riskNum > 0 || normalNum > 0;
		let riskText = strings('security.security_risk_unknown');
		let riskImg = require('../../../images/img_defi_unknown.png');
		let riskTextColor = colors.$60657D;
		if (checked && riskNum === 0 && noticeNum === 0) {
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
		const addressLabel = asset.address
			? asset.address.substring(0, 6) + '...' + asset.address.substring(asset.address.length - 6)
			: '';
		return (
			<View style={styles.flexOne}>
				<View style={styles.securityItemView}>
					<View style={styles.iconLayout}>
						<TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />
						<Image
							style={styles.tagView}
							source={
								asset.type === ChainType.Ethereum
									? require('../../../images/ic_eth_tag.png')
									: asset.type === ChainType.Polygon
									? require('../../../images/ic_polygon_tag.png')
									: asset.type === ChainType.Arbitrum
									? require('../../../images/ic_arb_tag.png')
									: asset.type === ChainType.Heco
									? require('../../../images/ic_heco_tag.png')
									: asset.type === ChainType.Optimism
									? require('../../../images/ic_op_tag.png')
									: asset.type === ChainType.Avax
									? require('../../../images/ic_avax_tag.png')
									: util.isRpcChainType(asset.type)
									? getIcTagResource(asset.type)
									: require('../../../images/ic_bsc_tag.png')
							}
						/>
					</View>
					<View style={styles.maxSymbolWidth}>
						<Text style={styles.symbolText} numberOfLines={1}>
							{asset.symbol}
						</Text>
						<Text style={styles.addressText}>{addressLabel}</Text>
					</View>
					<View style={styles.flexOne} />
					<Image style={styles.unknowSmallSize} source={riskImg} />
					<Text style={[styles.undetectedText, { color: riskTextColor }]}>{riskText}</Text>
				</View>
				<View style={styles.lineFull} />
				{!checked && this.renderUnDetected()}
				{checked && this.renderChecked()}

				{(isRobotDetected || !checked) && (
					<View>
						<View style={styles.lineFull} />
						<TouchableOpacity
							activeOpacity={0.6}
							style={[
								styles.applyCheckTouch,
								(hasSubmitted || isRobotDetected) && { backgroundColor: colors.$E6E6E6 }
							]}
							disabled={hasSubmitted || isRobotDetected}
							onPress={() => {
								console.log('====onPress ', showFastCheck);
								this.setState({ showFastCheck: true });
								onEvent('request_detection');
							}}
						>
							<Text
								style={[
									styles.applyCheckText,
									(hasSubmitted || isRobotDetected) && { color: colors.$A6A6A6 }
								]}
							>
								{hasSubmitted || isRobotDetected
									? strings('fold_security.apply_check_already')
									: strings('fold_security.apply_check')}
							</Text>
						</TouchableOpacity>

						<Text style={styles.applyCheckHint}>{strings('security.preliminary_results_hint')}</Text>

						<Text style={styles.checkDetailTitle}>{strings('security.detail_include')}</Text>
						<View style={styles.checkDetailItem}>
							<Image source={require('../../../images/ic_project_security.png')} />
							<Text style={styles.checkDetailItemText}>{strings('security.proj_security')}</Text>
						</View>
						<View style={styles.checkDetailItem}>
							<Image source={require('../../../images/ic_contract_security.png')} />
							<Text style={styles.checkDetailItemText}>{strings('security.contract_security')}</Text>
						</View>
						<View style={styles.checkDetailItem}>
							<Image source={require('../../../images/ic_trade_security.png')} />
							<Text style={styles.checkDetailItemText}>{strings('security.transaction_security')}</Text>
						</View>
					</View>
				)}

				{showFastCheck && (
					<SecurityFastCheck isVisible={showFastCheck} asset={asset} onDismiss={this.onHideFastCheck} />
				)}
			</View>
		);
	};

	onHideFastCheck = () => {
		this.setState({ showFastCheck: false });
	};

	showInfiniteDesc = () => {
		this.setState({ infiniteDescVisible: true });
	};

	hideInfiniteDesc = () => {
		this.setState({ infiniteDescVisible: false });
	};

	renderInfiniteDesc = () => (
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
				<View style={styles.modalContainer}>
					<View>
						<Text style={styles.modalTitle}>{strings('approval_management.intro_title')}</Text>
						<Text style={styles.modalDesc}>{strings('approval_management.intro_text')}</Text>
					</View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);

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
		return (
			<View>
				<Text style={styles.approvalTitle}>{strings('approval_management.token_title')}</Text>
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

	render = () => {
		const { securityViewOpacity, closeSecurityView } = this.props;
		const { IOSStatusBarHeight, tabIndex } = this.state;
		let barHeight = 0;
		if (Device.isAndroid()) {
			barHeight = StatusBar.currentHeight;
		} else if (Device.isIos()) {
			barHeight = IOSStatusBarHeight;
		}
		const headerHeight = 56 + barHeight;
		const moveHeight = height - 200 - headerHeight;

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
							<View style={styles.flexRow}>
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
									<View style={styles.wrapContent}>
										{tabIndex === 0 && this.renderSecurityView()}
										{tabIndex === 1 && this.renderApprovalView()}
									</View>
									<View style={styles.bottomPadding} />
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
