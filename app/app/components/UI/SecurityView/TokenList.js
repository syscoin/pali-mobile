import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	View,
	Image,
	Text,
	Dimensions,
	StyleSheet,
	TouchableWithoutFeedback,
	TouchableOpacity,
	ActivityIndicator,
	DeviceEventEmitter
} from 'react-native';
import AntIcon from 'react-native-vector-icons/AntDesign';
import DashSecondLine from '../../Views/DashSecondLine';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { getChainIdByType, renderAmount } from '../../../util/number';
import { CURRENCIES } from '../../../util/currencies';
import { isSecureAddress } from '../../../util/security';

import TokenImage from '../TokenImage';
import LinearGradient from 'react-native-linear-gradient';
import Engine from '../../../core/Engine';
import SearchView from './SearchView';
import SecurityDesc from '../SecurityDesc';
import { toLowerCaseEquals } from '../../../util/general';
import { key2Warn } from '../../../util/security';
import Modal from 'react-native-modal';
import LottieView from 'lottie-react-native';
import { getIcTagByChainType, getIcLogoByChainType } from '../../../util/ChainTypeImages';
import { ChainType, util } from 'paliwallet-core';
import { ThemeContext } from '../../../theme/ThemeProvider';

const { width } = Dimensions.get('screen');

const styles = StyleSheet.create({
	emptyView: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 50,
		backgroundColor: colors.white,
		flex: 1
	},
	lineMargin: {
		height: 1,
		marginHorizontal: 24,
		marginTop: 3,
		flex: 0
	},
	text: {
		fontSize: 16,
		color: colors.$404040,
		marginTop: 20
	},
	flexOne: {
		flex: 1
	},
	listWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollViewContent: {
		paddingTop: 20,
		paddingBottom: 10
	},
	itemWrapper: {
		flex: 1,
		flexDirection: 'row'
	},
	childrenWrapper: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: colors.white,
		paddingBottom: 16,
		marginHorizontal: 20
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
		borderRadius: 10
	},
	titleItem: {
		flexDirection: 'row',
		marginBottom: 5,
		alignItems: 'center'
	},
	textItemName: {
		flex: 1,
		marginRight: 8,
		fontSize: 18,
		...fontStyles.medium,
		color: colors.$030319
	},
	textItemBalance: {
		fontSize: 18,
		...fontStyles.medium,
		color: colors.$030319
	},
	textItemAmount: {
		fontSize: 14,
		color: colors.$8F92A1
	},
	flexDir: {
		flexDirection: 'row'
	},
	iconLayout: {
		marginRight: 10
	},
	tagView: {
		position: 'absolute',
		left: 30,
		width: 16,
		height: 16,
		top: 20
	},
	childView: {
		flex: 1,
		flexDirection: 'row',
		height: 40,
		marginBottom: 8
	},
	lineView: {
		height: 1,
		flex: 1,
		backgroundColor: colors.$F0F0F0,
		marginTop: 15
	},
	dangerTouch: {
		marginTop: 6,
		paddingHorizontal: 12,
		paddingVertical: 3,
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.securityDangerBg,
		borderRadius: 4,
		borderWidth: 0
	},
	dangerLabel: {
		fontSize: 13,
		color: colors.$FF5454,
		marginRight: 6
	},
	warningTouch: {
		marginTop: 6,
		paddingHorizontal: 12,
		paddingVertical: 3,
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.securityWarningBg,
		borderRadius: 4,
		borderWidth: 0
	},
	warningLabel: {
		fontSize: 13,
		color: colors.$E37A00,
		marginRight: 6
	},
	unknownTouch: {
		height: 30,
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 3,
		alignSelf: 'flex-start',
		borderRadius: 6
	},
	unknownLabel: {
		fontSize: 11,
		color: colors.white,
		...fontStyles.medium,
		marginRight: 6
	},
	tagPosition: {
		marginLeft: 10,
		alignSelf: 'flex-start'
	},
	modalNoBorder: {
		justifyContent: 'flex-end'
	},
	detailModal: {
		width: 300,
		maxHeight: '90%',
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 20
	},
	animation: {
		width: 160,
		height: 160
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	touchClose: {
		paddingTop: 10,
		paddingHorizontal: 12,
		alignSelf: 'flex-end'
	},
	modalTitle: {
		color: colors.$030319,
		fontSize: 20,
		...fontStyles.semibold,
		marginBottom: 20
	},
	modalDesc: {
		color: colors.$8F92A1,
		fontSize: 12,
		marginTop: 14,
		marginBottom: 20
	},
	noDectedModal: {
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
	}
});

const SORT_NAME = 'sort_name';
const SORT_NETWORK = 'sort_network';
const STOARGE_SORT_TYPE = 'storage_sorttype';
const SORT_NETWORTH = 'sort_networth';

class TokenList extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		tokens: PropTypes.array,
		onItemPress: PropTypes.func,
		contactEntry: PropTypes.object,
		isLockScreen: PropTypes.bool
	};

	state = {
		tokenList: [],
		searchList: [],
		searchQuery: '',
		searchResult: [],
		searchLoading: false,
		initLoaded: false,
		updateAssets: [],
		showNoDetectedModal: false
	};

	fastCheckCount = 0;

	currentSortType = SORT_NETWORTH;
	async componentDidMount() {
		const sortType = await AsyncStorage.getItem(STOARGE_SORT_TYPE);
		if (sortType) {
			this.currentSortType = sortType;
		}
		this.initTokenList();

		DeviceEventEmitter.addListener('updateSecurity', this.updateSecurity);
	}

	componentWillUnmount() {
		DeviceEventEmitter.removeAllListeners('updateSecurity');
	}

	updateSecurity = asset => {
		const updateAssets = [...this.state.updateAssets];
		updateAssets.push(asset);
		this.setState({ updateAssets });
	};

	fastCheck = async asset => {
		const { SecurityController } = Engine.context;
		const chainId = getChainIdByType(asset.type);
		try {
			const securityData = await SecurityController.fastCheck(chainId, asset.address);
			if (securityData) {
				const { normal, notice, risk } = securityData;
				const normalLength = normal ? normal.length : 0;
				const noticeLength = notice ? notice.length : 0;
				const riskLength = risk ? risk.length : 0;
				if (normalLength !== 0 || noticeLength !== 0 || riskLength !== 0) {
					asset.securityData = { ...securityData, normalLength, noticeLength, riskLength };
					this.setState({ showFastCheck: false });
					return;
				}
			}
			if (this.fastCheckCount === 1) {
				this.fastCheckCount = 0;
				this.setState({ showFastCheck: false });
				setTimeout(() => {
					this.setState({ showNoDetectedModal: true });
				}, 500);
			} else {
				this.fastCheckCount = 1;
				this.timeoutFastCheck(10 * 1000, asset);
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

	timeoutFastCheck = (delayTime, asset) => {
		this.clearTimeout();
		this.handle = setTimeout(() => {
			this.fastCheck(asset);
		}, delayTime);
	};

	initTokenList = () => {
		const { tokens } = this.props;
		let newTokens = tokens;
		newTokens.sort((x, y) => y.totalPrice - x.totalPrice);
		if (this.currentSortType === SORT_NETWORK) {
			const tempTokens = [];
			for (const type in Engine.networks) {
				const chainType = Number(type);
				let filterTokens;
				if (chainType === ChainType.RPCBase) {
					filterTokens = newTokens.filter(token => util.isRpcChainType(token.type));
				} else {
					filterTokens = newTokens.filter(token => token.type === chainType);
				}
				filterTokens && tempTokens.push(...filterTokens);
			}
			newTokens = tempTokens;
		} else if (this.currentSortType === SORT_NAME) {
			newTokens.sort((x, y) => x.symbol.toUpperCase().localeCompare(y.symbol.toUpperCase()));
		}
		const newTokens2 = [];
		const unknownTokens = [];
		newTokens.forEach((asset, index) => {
			if (asset.nativeCurrency) {
				newTokens2.push({ ...asset, securityData: { normalLength: 0, noticeLength: 0, riskLength: 0 } });
			} else if (asset.securityData) {
				const { normal, notice, risk } = asset.securityData;
				const normalLength = normal ? normal.length : 0;
				const noticeLength = notice ? notice.length : 0;
				const riskLength = risk ? risk.length : 0;
				asset.securityData = { ...asset.securityData, normalLength, noticeLength, riskLength };
				if (riskLength !== 0 || noticeLength !== 0 || normalLength !== 0) {
					newTokens2.push(asset);
				} else {
					unknownTokens.push(asset);
				}
			} else {
				unknownTokens.push({ ...asset, securityData: { normalLength: 0, noticeLength: 0, riskLength: 0 } });
			}
		});
		newTokens2.sort((x, y) =>
			x.securityData.riskLength === y.securityData.riskLength
				? x.securityData.noticeLength === y.securityData.noticeLength
					? true
					: x.securityData.noticeLength < y.securityData.noticeLength
				: x.securityData.riskLength < y.securityData.riskLength
		);
		this.setState({ tokenList: [...newTokens2, ...unknownTokens], initLoaded: true });
	};

	renderEmpty = () => {
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.emptyView, isDarkMode && baseStyles.darkBackground]}>
				<Image source={require('../../../images/notx.png')} />
				<Text style={[styles.text, isDarkMode && baseStyles.textDark]}>
					{strings('security.no_detectable_tokens')}
				</Text>
			</View>
		);
	};

	renderList(tokenList, isQuery) {
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.scrollViewContent, isDarkMode && baseStyles.darkBackground]}>
				{tokenList.map((asset, index) => this.renderItem(asset, index, isQuery))}
			</View>
		);
	}

	_onItemClick = asset => {
		const { tokens, onItemPress } = this.props;
		const ret = tokens.find(t => t.type === asset.type && toLowerCaseEquals(t.address, asset.address));
		if (ret) {
			onItemPress({ ...ret, isSecurityCenter: true });
		} else {
			onItemPress({ ...asset, isSecurityCenter: true });
		}
	};

	renderItem = (asset, index, isQuery = false) => {
		const { updateAssets } = this.state;
		if (updateAssets && updateAssets.length > 0) {
			const updateAsset = updateAssets.find(
				upAsset => toLowerCaseEquals(upAsset.address, asset.address) && upAsset.type === asset.type
			);
			if (updateAsset) {
				asset = updateAsset;
			}
		}
		const { price, balanceFiat, balance } = asset;
		const { currencyCode } = Engine.context.TokenRatesController.state;
		const amountSymbol = CURRENCIES[currencyCode].symbol;
		const { isDarkMode } = this.context;
		return (
			<View
				style={[styles.itemWrapper, isDarkMode && baseStyles.darkBackground]}
				key={'element-security-' + index}
			>
				<TouchableWithoutFeedback
					onPress={() => {
						this._onItemClick(asset);
					}}
				>
					<View style={styles.itemWrapper}>
						<View
							style={[styles.childrenWrapper, isDarkMode && baseStyles.darkBackground]}
							activeOpacity={1}
						>
							<View style={[styles.flexOne, isDarkMode && baseStyles.darkBackground]}>
								<View style={[styles.childView, isDarkMode && baseStyles.darkBackground]}>
									<View style={styles.iconLayout}>
										<TokenImage
											asset={asset}
											containerStyle={styles.ethLogo}
											iconStyle={styles.iconStyle}
										/>
										<Image
											style={styles.tagView}
											source={
												isDarkMode
													? getIcLogoByChainType(asset.type)
													: getIcTagByChainType(asset.type)
											}
										/>
									</View>

									<View style={styles.balances} testID={'balance'}>
										<View style={styles.titleItem}>
											<Text
												style={[styles.textItemName, isDarkMode && baseStyles.textDark]}
												numberOfLines={1}
												ellipsizeMode="tail"
											>
												{asset.symbol}
											</Text>
											{!isQuery && (
												<Text
													style={[styles.textItemBalance, isDarkMode && baseStyles.textDark]}
												>
													{balanceFiat}
												</Text>
											)}
										</View>
										{!isQuery && (
											<View style={styles.flexDir}>
												<Text
													style={[styles.textItemAmount, isDarkMode && baseStyles.textDark]}
												>
													{renderAmount(balance)}
												</Text>
												<View style={styles.flexOne} />
												<Text style={styles.textItemAmount}>
													{amountSymbol}
													{renderAmount(price)}
												</Text>
											</View>
										)}
									</View>
									{this.renderSecurityTag(asset)}
								</View>
								{this.renderSecurityItem(asset)}
								<DashSecondLine lineWidth={width - 80} style={styles.lineMargin} />
							</View>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</View>
		);
	};

	onSubmitClick = asset => {
		this.setState({ showFastCheck: true });
		this.fastCheckCount = 0;
		this.timeoutFastCheck(0, asset);
	};

	onHideFastCheck = () => {
		this.clearTimeout();
		this.setState({ showFastCheck: false });
	};

	renderFastCheck = () => {
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={this.state.showFastCheck && !this.props.isLockScreen}
				actionContainerStyle={styles.modalNoBorder}
				backdropOpacity={0.7}
				animationIn="fadeIn"
				animationOut="fadeOut"
				useNativeDriver
			>
				<View style={[styles.detailModal, isDarkMode && baseStyles.darkBackground]}>
					<TouchableOpacity hitSlop={styles.hitSlop} onPress={this.onHideFastCheck} style={styles.touchClose}>
						<AntIcon color={isDarkMode ? colors.white : colors.paliGrey300} size={16} name={'close'} />
					</TouchableOpacity>
					<Text style={[styles.modalTitle, isDarkMode && baseStyles.textDark]}>
						{strings('security.detecting')}
					</Text>
					<LottieView
						style={styles.animation}
						autoPlay
						loop
						source={require('../../../animations/detecting.json')}
					/>
					<Text style={[styles.modalDesc, isDarkMode && baseStyles.textDark]}>
						{strings('security.take_seconds')}
					</Text>
				</View>
			</Modal>
		);
	};

	showDescModal = (item, token) => {
		this.selectSecurityContent = item;
		this.selectedToken = token;
		this.setState({ showSecurityDesc: true });
	};

	renderSecurityItem = asset => {
		if (asset.nativeCurrency) {
			return;
		}
		const { normalLength, notice, noticeLength, risk, riskLength } = asset.securityData;
		const { isDarkMode } = this.context;

		if (isSecureAddress(asset)) {
			return <></>;
		}

		if (normalLength === 0 && noticeLength === 0 && riskLength === 0) {
			return (
				<TouchableWithoutFeedback style={styles.flexOne}>
					<View>
						<TouchableOpacity activeOpacity={0.6} onPress={this.onSubmitClick.bind(this, asset)}>
							<LinearGradient
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								colors={['#ADB8E2', '#8798D9']}
								style={styles.unknownTouch}
							>
								<Text style={styles.unknownLabel}>{strings('security.uncheck_tips')}</Text>
								<Image source={require('../../../images/security_arrow_white.png')} />
							</LinearGradient>
						</TouchableOpacity>
					</View>
				</TouchableWithoutFeedback>
			);
		}

		return (
			<TouchableWithoutFeedback style={styles.flexOne}>
				<View>
					{risk &&
						risk.map((data, index) => (
							<TouchableOpacity
								style={[styles.dangerTouch, isDarkMode && baseStyles.darkCardBackground]}
								key={'element_risk_' + index}
								onPress={() => {
									this.showDescModal(data, asset);
								}}
							>
								<Text style={styles.dangerLabel}>{key2Warn(data.name)}</Text>
								<Image source={require('../../../images/security_arrow_red.png')} />
							</TouchableOpacity>
						))}

					{notice &&
						notice.map((data, index) => (
							<TouchableOpacity
								style={[styles.warningTouch, isDarkMode && baseStyles.darkCardBackground]}
								key={'element_notice_' + index}
								onPress={() => {
									this.showDescModal(data, asset);
								}}
							>
								<Text style={styles.warningLabel}>{key2Warn(data.name)}</Text>
								<Image source={require('../../../images/security_arrow_yellow.png')} />
							</TouchableOpacity>
						))}
				</View>
			</TouchableWithoutFeedback>
		);
	};

	renderSecurityTag = asset => {
		const flagStyle = styles.tagPosition;

		if (asset.nativeCurrency || isSecureAddress(asset)) {
			return <Image source={require('../../../images/tag_safe.png')} style={flagStyle} />;
		}
		const { normalLength, noticeLength, riskLength, isTrust } = asset.securityData;
		if (isTrust) {
			return <Image source={require('../../../images/tag_safe.png')} style={flagStyle} />;
		}
		if (riskLength > 0) {
			return <Image source={require('../../../images/tag_danger.png')} style={flagStyle} />;
		}
		if (noticeLength > 0) {
			return <Image source={require('../../../images/tag_warning.png')} style={flagStyle} />;
		}
		if (normalLength > 0) {
			return <Image source={require('../../../images/tag_safe.png')} style={flagStyle} />;
		}
		return <Image source={require('../../../images/tag_unknown.png')} style={flagStyle} />;
	};

	onSearchLoading = searchQuery => {
		if (!this.state.searchLoading) {
			this.setState({ searchLoading: true, searchQuery });
		}
	};

	onSearchResult = ({ searchQuery, results }) => {
		this.setState({ searchLoading: false, searchQuery, searchResult: results });
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
				<View style={[styles.noDectedModal, isDarkMode && baseStyles.darkBackground]}>
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

	render() {
		const { tokenList, searchResult, searchQuery, searchLoading, showSecurityDesc, initLoaded } = this.state;
		const { contactEntry } = this.props;
		const isQuery = !!searchQuery;
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.listWrapper, isDarkMode && baseStyles.darkBackground]}>
				<SearchView
					contactEntry={contactEntry}
					onLoading={this.onSearchLoading}
					onSearch={this.onSearchResult}
				/>
				{((searchLoading && isQuery) || (!initLoaded && !isQuery)) && (
					<View style={[styles.emptyView, isDarkMode && baseStyles.darkBackground]}>
						<ActivityIndicator size="large" color={colors.brandPink300} />
					</View>
				)}
				{isQuery && !searchLoading && searchResult.length > 0 && this.renderList(searchResult, true)}
				{!isQuery && tokenList.length > 0 && this.renderList(tokenList, false)}
				{((!isQuery && tokenList.length === 0 && initLoaded) ||
					(isQuery && !searchLoading && searchResult.length === 0)) &&
					this.renderEmpty()}

				<SecurityDesc
					isVisible={showSecurityDesc}
					data={this.selectSecurityContent}
					asset={this.selectedToken}
					onDismiss={() => this.setState({ showSecurityDesc: false })}
				/>
				{this.renderFastCheck()}
				{this.renderNoDetectedModal()}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TokenList);
