import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { connect } from 'react-redux';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { ChainType, util } from 'paliwallet-core';
import { TokenImage } from '../TokenImage';
import { getAssetLogo, getChainTypeByChainId } from '../../../util/number';
import ApprovalEvent from '../ApprovalEvent';
import { strings } from '../../../../locales/i18n';
import { toLowerCaseEquals } from '../../../util/general';
import ImageCapInset from '../ImageCapInset';
import Device from '../../../util/Device';
import { getIcLogoByChainType, getIcTagByChainType } from '../../../util/ChainTypeImages';
import { ThemeContext } from '../../../theme/ThemeProvider';

const { width } = Dimensions.get('screen');

const styles = StyleSheet.create({
	content: {
		flex: 1,
		paddingBottom: 20,
		backgroundColor: colors.white
	},
	listTitle: {
		marginTop: 30,
		marginLeft: 20,
		marginBottom: 8,
		fontSize: 18,
		color: colors.$030319,
		...fontStyles.bold,
		alignSelf: 'flex-start'
	},
	hintRow: {
		marginLeft: 20,
		marginBottom: 14,
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'flex-start'
	},
	hintText: {
		marginRight: 16,
		fontSize: 11,
		color: colors.$60657D,
		lineHeight: 18
	},
	listWrapper: {
		alignItems: 'center',
		backgroundColor: colors.white
	},
	tokenItem: {
		width: width - 40,
		marginHorizontal: 22,
		marginBottom: 22,
		marginTop: 22
	},
	cardWrapper: {
		flex: 1,
		marginHorizontal: -2,
		marginTop: -17,
		marginBottom: -8
	},
	tokenInfoLine: {
		paddingVertical: 16,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center'
	},
	coinItem: {
		width: width - 40,
		paddingHorizontal: 16,
		paddingVertical: 16,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		backgroundColor: colors.white,
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		marginHorizontal: 20,
		marginBottom: 14,
		borderColor: colors.borderColor,
		borderWidth: 0,
		elevation: 8
	},
	iconLayout: {
		marginRight: 10
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
		top: 20,
		width: 20,
		height: 20
	},
	symbol: {
		flex: 1,
		fontSize: 16,
		color: colors.$030319,
		...fontStyles.medium
	},
	coinDesc: {
		fontSize: 12,
		color: colors.$8F92A1,
		...fontStyles.medium
	},
	approvalCount: {
		fontSize: 13,
		color: colors.$030319,
		...fontStyles.medium
	},
	divider: {
		width: '100%',
		height: 1,
		backgroundColor: colors.$F0F0F0
	},
	moreBtn: {
		width: '100%',
		height: 52,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	moreBtnText: {
		fontSize: 13,
		color: colors.$60657D,
		...fontStyles.medium
	},
	arrow: {
		width: 20,
		height: 20,
		marginRight: 2
	},
	loading: {
		flex: 1,
		height: 115,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	emptyView: {
		paddingTop: 60,
		paddingBottom: 100,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1
	},
	emptyText: {
		fontSize: 16,
		color: colors.$404040,
		marginTop: 20
	}
});

const recommendList = [
	'1-0xdAC17F958D2ee523a2206206994597C13D831ec7',
	'1-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	'56-0x55d398326f99059fF775485246999027B3197955',
	'56-0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
	'137-0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
	'137-0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
	'1-0xdac17f958d2ee523a2206206994597c13d831ec7',
	'1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
	'56-0x55d398326f99059ff775485246999027b3197955',
	'56-0xe9e7cea3dedca5984780bafc599bd69add087d56',
	'137-0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
	'137-0x2791bca1f2de4661ed88a30c99a7a9449aa84174'
];

class ApprovalList extends Component {
	static contextType = ThemeContext;
	static propTypes = {
		updateTime: PropTypes.number,
		tokens: PropTypes.array,
		allEvents: PropTypes.object,
		selectedAddress: PropTypes.string,
		showInfiniteDesc: PropTypes.func,
		onItemPress: PropTypes.func
	};

	state = {
		openIndex: -1,
		tokenList: [],
		loading: true
	};

	async componentDidMount() {
		this.initData(this.props);
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (this.props.updateTime !== nextProps.updateTime) {
			this.initData(nextProps);
		}
		return true;
	}

	initData = async props => {
		const tokenList = this.getTokenApprovalList(props) || [];
		for (const token of tokenList) {
			token.tokenInfo.logo = await getAssetLogo(token.tokenInfo);
		}
		this.setState({ tokenList, loading: false });
	};

	getTokenInfo(token: string, chainId: string, props): Token | undefined {
		const { tokens } = props;
		const chainType = getChainTypeByChainId(chainId);
		const ret = tokens.find(t => t.type === chainType && toLowerCaseEquals(t.address, token));
		return ret;
	}

	getTokenApprovalList = props => {
		const { allEvents, selectedAddress } = props;
		const myTokens = allEvents[selectedAddress] || {};
		const tokenList = [];
		const chainIds = Object.keys(myTokens);
		for (let i = 0; i < chainIds.length; i++) {
			const chainId = chainIds[i];
			const singleChainTokens = myTokens[chainId] || {};
			const tokens = Object.keys(singleChainTokens);
			for (let j = 0; j < tokens.length; j++) {
				const tokenAddress = tokens[j];
				if (singleChainTokens[tokenAddress]) {
					const tokenGroup = { ...singleChainTokens[tokenAddress] };
					const tokenInfo = this.getTokenInfo(tokenGroup.token, tokenGroup.chainId, props);
					if (!tokenInfo) {
						continue;
					}
					tokenGroup.tokenInfo = tokenInfo;
					const approvalsMap = tokenGroup.approvals;
					tokenGroup.approvals = [];
					const spenders = Object.keys(approvalsMap);
					for (let k = 0; k < spenders.length; k++) {
						const spender = spenders[k];
						const event = approvalsMap[spender];
						if (event.allowance > 0) {
							tokenGroup.approvals.push(approvalsMap[spender]);
						}
					}
					if (tokenGroup.approvals.length === 0) {
						continue;
					}
					tokenGroup.approvals.sort((a, b) => b.timestamp - a.timestamp);
					tokenList.push(tokenGroup);
				}
			}
		}
		tokenList.sort((a, b) => b.approvals[0].timestamp - a.approvals[0].timestamp);
		const topList = [];
		const normalList = [];
		tokenList.forEach(v => {
			const str = v.chainId + '-' + v.token;
			if (recommendList.indexOf(str) >= 0) {
				topList.push(v);
			} else {
				normalList.push(v);
			}
		});
		return [...topList, ...normalList];
	};

	openItem = i => {
		this.setState({ openIndex: i });
	};

	closeItem = () => {
		this.setState({ openIndex: -1 });
	};

	renderChainFlag = (chainId, index) => {
		const { isDarkMode } = this.context;
		const chainType = getChainTypeByChainId(chainId);
		return (
			<Image
				style={styles.tagView}
				source={isDarkMode ? getIcLogoByChainType(chainType) : getIcTagByChainType(chainType)}
			/>
		);
	};

	onItemTokenClick = token => {
		const newToken = { ...token };
		this.props.onItemPress(newToken);
	};

	renderTokens() {
		const { showInfiniteDesc } = this.props;
		const { openIndex, tokenList } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.listWrapper, isDarkMode && baseStyles.darkBackground]}>
				{tokenList.map((v, i, a) => (
					<ImageCapInset
						style={styles.cardWrapper}
						source={
							Device.isAndroid()
								? isDarkMode
									? { uri: 'dark800_card' }
									: { uri: 'default_card' }
								: isDarkMode
								? require('../../../images/dark800_card.png')
								: require('../../../images/default_card.png')
						}
						capInsets={baseStyles.capInsets}
						key={i}
					>
						<View style={styles.tokenItem}>
							<TouchableOpacity
								style={styles.tokenInfoLine}
								onPress={this.onItemTokenClick.bind(this, v.tokenInfo)}
							>
								<View style={styles.iconLayout}>
									<TokenImage
										asset={{ ...v.tokenInfo }}
										containerStyle={styles.ethLogo}
										iconStyle={styles.iconStyle}
									/>
									{this.renderChainFlag(v.chainId, i)}
								</View>
								<Text style={[styles.symbol, isDarkMode && baseStyles.textDark]}>
									{v?.tokenInfo?.symbol}
								</Text>
								<Text style={[styles.approvalCount, isDarkMode && baseStyles.textDark]}>
									{strings('approval_management.spender_count', { count: v?.approvals?.length })}
								</Text>
							</TouchableOpacity>
							<View style={[styles.divider, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
							{openIndex !== i && (
								<ApprovalEvent
									chainId={v.chainId}
									event={v.approvals[0]}
									tokenInfo={v.tokenInfo}
									showInfiniteDesc={showInfiniteDesc}
								/>
							)}
							{openIndex === i &&
								v.approvals.map((event, i) => (
									<ApprovalEvent
										key={i}
										chainId={v.chainId}
										event={event}
										tokenInfo={v.tokenInfo}
										showInfiniteDesc={showInfiniteDesc}
									/>
								))}
							{v.approvals.length > 1 && openIndex !== i && (
								<TouchableOpacity
									style={styles.moreBtn}
									activeOpacity={0.6}
									onPress={this.openItem.bind(this, i)}
								>
									<Image style={styles.arrow} source={require('../../../images/more_open.png')} />
									<Text style={[styles.moreBtnText, isDarkMode & baseStyles.textDark]}>
										{strings('approval_management.view_more')}
									</Text>
								</TouchableOpacity>
							)}
							{v.approvals.length > 1 && openIndex === i && (
								<TouchableOpacity style={styles.moreBtn} activeOpacity={0.6} onPress={this.closeItem}>
									<Image style={styles.arrow} source={require('../../../images/more_close.png')} />
									<Text style={[styles.moreBtnText, isDarkMode & baseStyles.textDark]}>
										{strings('approval_management.hide_more')}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</ImageCapInset>
				))}
			</View>
		);
	}

	renderEmpty = () => {
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.emptyView, isDarkMode && baseStyles.darkBackground]}>
				<Image source={require('../../../images/notx.png')} />
				<Text style={[styles.emptyText, baseStyles.textDark]}>{strings('approval_management.empty')}</Text>
			</View>
		);
	};

	render() {
		const { updateTime } = this.props;
		const { loading, tokenList } = this.state;
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity style={[styles.content, isDarkMode && baseStyles.darkBackground]} activeOpacity={1}>
				<Text style={[styles.listTitle, isDarkMode && baseStyles.textDark]}>
					{strings('approval_management.list_title')}
				</Text>
				<View style={styles.hintRow}>
					<Text style={[styles.hintText, isDarkMode && baseStyles.subTextDark]}>
						{strings('approval_management.hint')}
					</Text>
				</View>
				{(loading || updateTime === 0) && (
					<View style={styles.loading}>
						<ActivityIndicator size="large" color={colors.brandPink300} />
					</View>
				)}

				{this.renderTokens()}
				{!loading && updateTime !== 0 && tokenList.length === 0 && this.renderEmpty()}
			</TouchableOpacity>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	updateTime: state.engine.backgroundState.ApprovalEventsController.updateTime,
	allEvents: state.engine.backgroundState.ApprovalEventsController.allEvents
});

export default connect(mapStateToProps)(ApprovalList);
