import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	View,
	Image,
	Text,
	StyleSheet,
	TouchableWithoutFeedback,
	TouchableOpacity,
	ActivityIndicator,
	DeviceEventEmitter
} from 'react-native';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import AsyncStorage from '@react-native-community/async-storage';
import { colors, fontStyles } from '../../../styles/common';
import { ChainType, util } from 'gopocket-core';
import { getChainIdByType, renderAmount } from '../../../util/number';
import { CURRENCIES } from '../../../util/currencies';
import TokenImage from '../TokenImage';
import LinearGradient from 'react-native-linear-gradient';
import Engine from '../../../core/Engine';
import SearchView from './SearchView';
import SecurityDesc from '../SecurityDesc';
import { toLowerCaseEquals } from '../../../util/general';
import { getIcTagResource } from '../../../util/rpcUtil';
import { key2Warn } from '../../../util/security';
import Modal from 'react-native-modal';
import LottieView from 'lottie-react-native';

const styles = StyleSheet.create({
	emptyView: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 50,
		backgroundColor: colors.white,
		flex: 1
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
	}
});

const SORT_NAME = 'sort_name';
const SORT_NETWORK = 'sort_network';
const STOARGE_SORT_TYPE = `storage_sorttype`;
const SORT_NETWORTH = 'sort_networth';

class TokenList extends PureComponent {
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
		updateAssets: []
	};

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
		DeviceEventEmitter.removeListener('updateSecurity', this.updateSecurity);
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
				asset.securityData = { ...securityData, normalLength, noticeLength, riskLength };
				this.setState({ showFastCheck: false });
			} else {
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
			const ethTokens = newTokens.filter(token => token.type === ChainType.Ethereum);
			const bscTokens = newTokens.filter(token => token.type === ChainType.Bsc);
			const polygonTokens = newTokens.filter(token => token.type === ChainType.Polygon);
			const arbTokens = newTokens.filter(token => token.type === ChainType.Arbitrum);
			const hecoTokens = newTokens.filter(token => token.type === ChainType.Heco);
			const opTokens = newTokens.filter(token => token.type === ChainType.Optimism);
			newTokens = [...ethTokens, ...bscTokens, ...polygonTokens, ...arbTokens, ...hecoTokens, ...opTokens];
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

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Image source={require('../../../images/notx.png')} />
			<Text style={styles.text}>{strings('security.no_detectable_tokens')}</Text>
		</View>
	);

	renderList(tokenList, isQuery) {
		return (
			<View style={styles.scrollViewContent}>
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
		return (
			<View style={styles.itemWrapper} key={'element-security-' + index}>
				<TouchableWithoutFeedback
					onPress={() => {
						this._onItemClick(asset);
					}}
				>
					<View style={styles.itemWrapper}>
						<View style={styles.childrenWrapper} activeOpacity={1}>
							<View style={styles.flexOne}>
								<View style={styles.childView}>
									<View style={styles.iconLayout}>
										<TokenImage
											asset={asset}
											containerStyle={styles.ethLogo}
											iconStyle={styles.iconStyle}
										/>
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

									<View style={styles.balances} testID={'balance'}>
										<View style={styles.titleItem}>
											<Text style={styles.textItemName} numberOfLines={1} ellipsizeMode="tail">
												{asset.symbol}
											</Text>
											{!isQuery && <Text style={styles.textItemBalance}>{balanceFiat}</Text>}
										</View>
										{!isQuery && (
											<View style={styles.flexDir}>
												<Text style={styles.textItemAmount}>{renderAmount(balance)}</Text>
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
								<View style={styles.lineView} />
							</View>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</View>
		);
	};

	onSubmitClick = asset => {
		this.setState({ showFastCheck: true });
		this.timeoutFastCheck(0, asset);
	};

	onHideFastCheck = () => {
		this.clearTimeout();
		this.setState({ showFastCheck: false });
	};

	renderFastCheck = () => (
		<Modal
			isVisible={this.state.showFastCheck && !this.props.isLockScreen}
			actionContainerStyle={styles.modalNoBorder}
			backdropOpacity={0.7}
			animationIn="fadeIn"
			animationOut="fadeOut"
			useNativeDriver
		>
			<View style={styles.detailModal}>
				<TouchableOpacity hitSlop={styles.hitSlop} onPress={this.onHideFastCheck} style={styles.touchClose}>
					<Image source={require('../../../images/ic_pop_close.png')} />
				</TouchableOpacity>
				<Text style={styles.modalTitle}>{strings('security.detecting')}</Text>
				<LottieView
					style={styles.animation}
					autoPlay
					loop
					source={require('../../../animations/detecting.json')}
				/>
				<Text style={styles.modalDesc}>{strings('security.take_seconds')}</Text>
			</View>
		</Modal>
	);

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
		//未检测显示申请提交按钮
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
								style={styles.dangerTouch}
								key={'element_risk_' + index}
								onPress={() => {
									this.showDescModal(data, asset);
								}}
							>
								<Text style={styles.dangerLabel}>{data.name}</Text>
								<Image source={require('../../../images/security_arrow_red.png')} />
							</TouchableOpacity>
						))}

					{notice &&
						notice.map((data, index) => (
							<TouchableOpacity
								style={styles.warningTouch}
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
		if (asset.nativeCurrency) {
			return <Image source={require('../../../images/tag_safe.png')} style={flagStyle} />;
		}
		const { normalLength, noticeLength, riskLength } = asset.securityData;
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

	render() {
		const { tokenList, searchResult, searchQuery, searchLoading, showSecurityDesc, initLoaded } = this.state;
		const { contactEntry } = this.props;
		const isQuery = !!searchQuery;
		return (
			<View style={styles.listWrapper}>
				<SearchView
					contactEntry={contactEntry}
					onLoading={this.onSearchLoading}
					onSearch={this.onSearchResult}
				/>
				{((searchLoading && isQuery) || (!initLoaded && !isQuery)) && (
					<View style={styles.emptyView}>
						<ActivityIndicator size="large" color={colors.$FE6E91} />
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
