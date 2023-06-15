import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { colors, fontStyles } from '../../../styles/common';
import { renderAmount } from '../../../util/number';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import Icon from '../Icon';
import { BignumberJs as BigNumber, ChainType, defaultEnabledChains, TokenType, util } from 'paiwallet-core';
import Engine from '../../../core/Engine';
import Modal from 'react-native-modal';
import Popover from '../Popover';
import Device from '../../../util/Device';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
	ChainTypeBg,
	ChainTypeIcons,
	ChainTypeMoreIcons,
	ChainTypeNames,
	ChainTypes
} from '../../../util/ChainTypeImages';
import NFTImage from '../NFTImage';
import { getIcCardResource, getIsRpc, getRpcName, getMoreIcon } from '../../../util/rpcUtil';

const { width } = Dimensions.get('window');
const cardWidth = width;
const cardHeight = (cardWidth * 250) / 375;
const topShadow = (19.0 / 250) * cardHeight;
export const bottomShadow = (39.0 / 250) * cardHeight;
const leftShadow = (20.0 / 375) * cardWidth;
const rightShadow = (20.0 / 375) * cardWidth;

const chainAllWidth = cardWidth - leftShadow - rightShadow - 12 * 2;
const chainItemWidth = 40;
const chainColumnNum = Math.floor(chainAllWidth / chainItemWidth);

const ObserveColorStyle = { color: '#3FBDD2' };

const styles = StyleSheet.create({
	absoluteStart: {
		position: 'absolute',
		left: 0,
		top: 0
	},
	flexSpace: {
		flex: 1
	},
	flexRow: {
		flexDirection: 'row'
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginRight: 17
	},
	parentView: {
		width,
		height: cardHeight,
		overflow: 'scroll'
	},
	topIconsView: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 22,
		paddingBottom: 6
	},
	contentLayout: {
		width: cardWidth,
		height: cardHeight,
		paddingLeft: leftShadow,
		paddingTop: topShadow,
		paddingRight: rightShadow,
		paddingBottom: bottomShadow
	},
	titleLayout: {
		flexDirection: 'row',
		paddingLeft: 20,
		paddingRight: 10,
		paddingTop: 22,
		paddingBottom: 6,
		alignItems: 'center'
	},
	title: {
		color: colors.$F7F7F7,
		fontSize: 16,
		marginRight: 14,
		...fontStyles.bold
	},
	amount: {
		color: colors.white,
		fontSize: 36,
		marginLeft: 20,
		...fontStyles.bold,
		textAlign: 'left'
	},
	amountNft: {
		color: colors.$F7F7F7,
		fontSize: 16,
		marginLeft: 6,
		textAlign: 'left',
		alignSelf: 'flex-end',
		marginBottom: 7
	},
	addressLayout: {
		flexDirection: 'row',
		paddingLeft: 20,
		alignItems: 'center'
	},
	address: {
		color: colors.$F7F7F7,
		fontSize: 12,
		marginRight: 14
	},
	touch: {
		paddingTop: 12,
		paddingBottom: 8
	},
	networkType: {
		flexDirection: 'row',
		paddingLeft: 12,
		alignItems: 'center'
	},
	networkTouch: {
		paddingBottom: 12,
		paddingTop: 10,
		width: chainItemWidth + 6,
		alignItems: 'center',
		marginHorizontal: -3
	},
	networkNormal: {
		width: 24,
		height: 24,
		opacity: 0.6
	},
	networkSelected: {
		width: 24,
		height: 24,
		opacity: 1
	},
	chainNameView: {
		borderRadius: 20,
		paddingHorizontal: 4,
		marginTop: 5,
		justifyContent: 'center',
		alignItems: 'center',
		minWidth: 35
	},
	chainName: {
		fontSize: 9,
		color: colors.$F7F7F7,
		alignSelf: 'center',
		marginTop: 3,
		height: 15,
		textAlign: 'center'
	},
	cardSizePosition: {
		marginTop: 20,
		marginLeft: 20,
		width: cardWidth - 40,
		height: cardHeight - 60,
		borderRadius: 15
	},
	tnLayout: {
		width: 90,
		height: 24,
		marginTop: 14,
		flexDirection: 'row',
		padding: 1,
		borderRadius: 5,
		borderColor: colors.white06,
		borderWidth: 1
	},
	tokenTouch: {
		flex: 1,
		justifyContent: 'center',
		height: '100%',
		borderRadius: 3,
		backgroundColor: colors.transparent
	},
	nftTouch: {
		flex: 1,
		justifyContent: 'center',
		height: '100%',
		borderRadius: 3,
		backgroundColor: colors.transparent
	},

	paddingVertical14: {
		paddingVertical: 14
	},
	popItem: {
		height: 40,
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20
	},
	popText: {
		fontSize: 14,
		color: colors.$030319,
		marginLeft: 14,
		maxWidth: 130
	},
	popLine: {
		backgroundColor: colors.$F0F0F0,
		height: 0.5,
		flex: 1,
		marginVertical: 4
	},
	disableText: {
		fontSize: 10,
		color: colors.$8F92A1,
		paddingHorizontal: 20
	},
	margin0: {
		margin: 0,
		marginHorizontal: 0
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	hitSlopTop: {
		top: 20,
		left: 10,
		bottom: 0,
		right: 10
	},
	hitSlopBottom: {
		top: 0,
		left: 10,
		bottom: 20,
		right: 10
	},
	hitSlopLeft: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 5
	},
	hitSlopRight: {
		top: 10,
		left: 5,
		bottom: 10,
		right: 10
	},
	hitSlopAmount: {
		top: -10
	},
	ensIcon: {
		width: 40,
		height: 40,
		borderRadius: 6
	},
	ensInfoLayout: {
		flexDirection: 'row',
		flexShrink: 1,
		paddingLeft: 20,
		paddingRight: 10,
		paddingTop: 22,
		paddingBottom: 6
	},
	ensNameLayout: {
		flexShrink: 1,
		marginHorizontal: 10
	},
	ensNameLabel: {
		color: colors.$F7F7F7,
		...fontStyles.semibold,
		fontSize: 16,
		lineHeight: 20,
		marginBottom: 4
	},
	ensAddress: {
		marginTop: 0,
		color: colors.$F7F7F7,
		fontSize: 12,
		lineHeight: 16
	},
	paddingTopZero: {
		paddingTop: 0
	},
	ensAmount: {
		fontSize: 42
	},
	scrollViewMaxHeight: {
		maxHeight: 300
	}
});

class CardSwiper extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		selectedAddress: PropTypes.string,
		wealth: PropTypes.object,
		hideAssetAmount: PropTypes.func,
		showAlert: PropTypes.func,
		swipeChange: PropTypes.func,
		contactEntry: PropTypes.object,
		amountHide: PropTypes.bool,
		amountSymbol: PropTypes.string,
		toggleChainEditing: PropTypes.func,
		isLockScreen: PropTypes.bool,
		ensEntry: PropTypes.object,
		touchAvatar: PropTypes.func,
		searchEditing: PropTypes.bool,
		allChains: PropTypes.array,
		nftChecked: PropTypes.bool
	};

	state = {
		popMoreChains: [],
		popModalVisible: false,
		iconRect: {},
		currentChainType: ChainType.All
	};

	iconRef = React.createRef();

	componentDidMount = () => {
		const currentChainType = this.props.contactEntry?.currentChain
			? this.props.contactEntry.currentChain
			: ChainType.All;
		this.setState({ currentChainType });
	};

	UNSAFE_componentWillReceiveProps = nextProps => {
		if (this.state.currentChainType !== ChainType.All) {
			let favouriteChains = nextProps.contactEntry?.enabledChains || defaultEnabledChains;
			if (favouriteChains.indexOf(this.state.currentChainType) === -1) {
				this.setState({ currentChainType: ChainType.All });
			}
		}
	};

	copyAccountToClipboard = async () => {
		const { contactEntry } = this.props;
		Clipboard.setString(contactEntry.address);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	copyEnsNameToClipboard = async () => {
		const { ensEntry } = this.props;
		Clipboard.setString(ensEntry.ensName);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('other.ens_copied') }
		});
	};

	hidePopModal = () => {
		this.setState({ popModalVisible: false });
	};

	renderPopModal = () => {
		const { popModalVisible, iconRect, popMoreChains } = this.state;
		const { contactEntry, toggleChainEditing, swipeChange, isLockScreen, allChains } = this.props;
		const enabledChains = contactEntry.enabledChains || defaultEnabledChains;
		const disabledChains = allChains.filter(chainType => !enabledChains.includes(chainType)) || [];
		return (
			<Modal
				style={styles.margin0}
				transparent
				onRequestClose={this.hidePopModal}
				visible={popModalVisible && !isLockScreen}
			>
				{/*<View style={{width: 200, height: 100, backgroundColor: colors.blue}}></View>*/}
				<Popover isVisible={popModalVisible} fromRect={iconRect} onClose={this.hidePopModal} disX={-10}>
					<ScrollView style={styles.scrollViewMaxHeight}>
						<View style={styles.paddingVertical14}>
							{popMoreChains.map((chainType, index) => {
								const isRpc = util.isRpcChainType(chainType);
								const translateIndex = util.isRpcChainType(chainType)
									? ChainTypes.indexOf(ChainType.RPCBase)
									: ChainTypes.indexOf(chainType);
								return (
									<TouchableOpacity
										key={'chain-pop-' + index}
										style={styles.popItem}
										onPress={() => {
											this.setState({ popModalVisible: false, currentChainType: chainType });
											swipeChange(chainType);
										}}
									>
										{isRpc ? (
											getMoreIcon(chainType)
										) : (
											<Image source={ChainTypeMoreIcons[translateIndex]} />
										)}
										<Text style={styles.popText} numberOfLines={1} allowFontScaling={false}>
											{isRpc ? getRpcName(chainType) : ChainTypeNames[translateIndex]}
										</Text>
									</TouchableOpacity>
								);
							})}
							<View style={styles.popLine} />
							<TouchableOpacity
								style={styles.popItem}
								onPress={() => {
									this.setState({ popModalVisible: false });
									toggleChainEditing && toggleChainEditing();
								}}
							>
								<Image source={require('../../../images/ic_more_pop_setting.png')} />
								<Text style={styles.popText} allowFontScaling={false}>
									{strings('chainSetting.preferences')}
								</Text>
							</TouchableOpacity>
							<Text style={styles.disableText}>
								{strings('chainSetting.disable_chain_num', {
									number: disabledChains.length
								})}
							</Text>
						</View>
					</ScrollView>
				</Popover>
			</Modal>
		);
	};

	render = () => {
		const {
			contactEntry,
			wealth,
			amountHide,
			amountSymbol,
			selectedAddress,
			toggleChainEditing,
			ensEntry,
			searchEditing,
			nftChecked
		} = this.props;
		const { currentChainType } = this.state;
		const isObserve = contactEntry.isObserve;
		const famousBg = contactEntry.famousBg;
		const nftNum = wealth?.nftAmount?.[currentChainType] ? wealth.nftAmount[currentChainType] : 0;
		const nftNumStr = nftNum >= 400 ? '400+' : nftNum;
		const amount = wealth?.tokenAmount?.[currentChainType]
			? new BigNumber(wealth.tokenAmount[currentChainType]).toFixed(2)
			: '0.00';
		const currentIndex = ChainTypes.indexOf(currentChainType);
		const isRpc = currentIndex === -1;

		let favouriteChains = contactEntry?.enabledChains || defaultEnabledChains;
		const moreChains = [];
		favouriteChains = [ChainType.All, ...favouriteChains];

		if (favouriteChains.length > chainColumnNum - 1) {
			const tempChains = [...favouriteChains];
			favouriteChains = [];
			tempChains.forEach((chainType, index) => {
				if (index < chainColumnNum - 1) {
					favouriteChains.push(chainType);
				} else {
					moreChains.push(chainType);
				}
			});
		}

		const hasInMore = moreChains.indexOf(currentChainType) !== -1;

		const hasEns = !!ensEntry?.ensName;

		return (
			<View style={styles.parentView} keyboardShouldPersistTaps={'always'}>
				<View style={styles.flexRow}>
					{/* eslint-disable-next-line react-native/no-inline-styles */}
					<View style={styles.absoluteStart}>
						<View>
							{famousBg ? (
								<NFTImage
									style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
									imageUrl={famousBg}
									defaultImg={require('../../../images/img_card_observe.png')}
								/>
							) : (
								<View style={{ position: 'relative' }}>
									<Image
										style={[styles.absoluteStart, styles.cardSizePosition]}
										source={
											isRpc ? require('../../../images/pali-bg.png') : ChainTypeBg[currentIndex]
										}
									/>
								</View>
							)}
							<View style={styles.contentLayout}>
								<View style={styles.topRow}>
									{!hasEns && (
										<TouchableOpacity
											activeOpacity={1.0}
											onPress={() => {
												if (!searchEditing) {
													this.props.hideAssetAmount({ isAmountHide: !amountHide });
												}
											}}
										>
											<View style={styles.titleLayout}>
												<Text style={styles.title} allowFontScaling={false}>
													{contactEntry.name}
												</Text>
											</View>
										</TouchableOpacity>
									)}
									{hasEns && (
										<View style={styles.ensInfoLayout}>
											<TouchableOpacity
												hitSlop={styles.hitSlop}
												onPress={() => {
													if (!searchEditing) {
														this.props.touchAvatar && this.props.touchAvatar(ensEntry);
													}
												}}
											>
												<NFTImage
													style={styles.ensIcon}
													imageUrl={ensEntry.avatarUrl}
													defaultImg={require('../../../images/ic_ens_avatar.png')}
												/>
											</TouchableOpacity>

											<View style={styles.ensNameLayout}>
												<TouchableOpacity
													hitSlop={styles.hitSlopTop}
													onPress={this.copyEnsNameToClipboard}
												>
													<Text
														style={styles.ensNameLabel}
														numberOfLines={1}
														ellipsizeMode={'middle'}
														allowFontScaling={false}
													>
														{ensEntry.ensName}{' '}
														<Image source={require('../../../images/ic_ens_follow.png')} />
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													hitSlop={styles.hitSlopBottom}
													onPress={this.copyAccountToClipboard}
												>
													<Text allowFontScaling={false} style={styles.ensAddress}>
														{contactEntry.address.substring(0, 6) +
															'...' +
															contactEntry.address.substring(
																contactEntry.address.length - 4
															)}
													</Text>
												</TouchableOpacity>
											</View>
										</View>
									)}

									<View style={styles.flexSpace} />
									<View style={[styles.topIconsView, hasEns && styles.paddingTopZero]}>
										<TouchableOpacity
											hitSlop={styles.hitSlopLeft}
											onPress={() => {
												this.props.hideAssetAmount({ isAmountHide: !amountHide });
											}}
											style={{ marginRight: 10 }}
										>
											<Icon
												name={amountHide ? 'visibilityOff' : 'visibility'}
												color={colors.white}
												width="22"
												height="22"
											/>
										</TouchableOpacity>
										<TouchableOpacity
											hitSlop={styles.hitSlopRight}
											onPress={() => {
												this.props.navigation.navigate('WalletManagement');
											}}
										>
											<Icon
												name={'accountSettings'}
												color={colors.white}
												width="19"
												height="19"
											/>
										</TouchableOpacity>
									</View>
								</View>

								<TouchableOpacity
									hitSlop={hasEns ? styles.hitSlopAmount : {}}
									activeOpacity={1.0}
									style={styles.flexRow}
									onPress={() => {
										this.props.hideAssetAmount({ isAmountHide: !amountHide });
										// this.setState({ amountHide: !amountHide });
									}}
								>
									<Text
										style={[styles.amount, hasEns && styles.ensAmount]}
										allowFontScaling={false}
										numberOfLines={1}
									>
										{amountHide
											? '*****'
											: nftChecked
											? nftNumStr
											: amountSymbol + renderAmount(amount)}
									</Text>
									{!amountHide && nftChecked && (
										<Text style={styles.amountNft} allowFontScaling={false} numberOfLines={1}>
											NFTs
										</Text>
									)}
								</TouchableOpacity>

								{!hasEns && (
									<View style={styles.addressLayout}>
										<TouchableOpacity
											style={styles.touch}
											onPress={this.copyAccountToClipboard}
											activeOpacity={1.0}
										>
											<Text style={styles.address} allowFontScaling={false}>
												{contactEntry.address.substring(0, 6) +
													'...' +
													contactEntry.address.substring(contactEntry.address.length - 4)}
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.touch}
											onPress={this.copyAccountToClipboard}
											activeOpacity={0.8}
										>
											<Image source={require('../../../images/card_copy.png')} />
										</TouchableOpacity>
									</View>
								)}

								<View style={styles.flexSpace} />
								<View style={styles.networkType}>
									{favouriteChains.map((chainType, index) => {
										const translateIndex = ChainTypes.indexOf(chainType);
										const isRpc = getIsRpc(chainType);
										const networkName = () =>
											currentChainType !== chainType
												? ''
												: isRpc
												? getRpcName(chainType)
												: ChainTypeNames[translateIndex];
										return (
											<TouchableOpacity
												style={styles.networkTouch}
												onPress={() => {
													if (currentChainType !== chainType) {
														this.setState({ currentChainType: chainType });
														this.props.swipeChange(chainType);
													}
												}}
												activeOpacity={1.0}
												key={'chain-type-' + index}
											>
												<Image
													style={
														currentChainType === chainType
															? styles.networkSelected
															: styles.networkNormal
													}
													source={
														isRpc
															? getIcCardResource(chainType)
															: ChainTypeIcons[translateIndex]
													}
												/>

												<View
													style={[
														styles.chainNameView,
														{
															width:
																networkName().length > 8
																	? 55
																	: networkName().length > 5
																	? 50
																	: 30,
															backgroundColor:
																currentChainType === chainType && colors.blackAlpha300
														}
													]}
													key={currentIndex + translateIndex + 'chain-label-name'}
												>
													<Text
														style={styles.chainName}
														allowFontScaling={false}
														numberOfLines={1}
													>
														{networkName()}
													</Text>
												</View>
											</TouchableOpacity>
										);
									})}
									<TouchableOpacity
										style={styles.networkTouch}
										onPress={() => {
											if (moreChains.length === 0) {
												toggleChainEditing && toggleChainEditing(true);
											} else {
												this.iconRef?.current?.measure((ox, oy, width, height, px, py) => {
													const statusBarHeight = StatusBar.currentHeight;
													const dis = Device.isAndroid() ? statusBarHeight : 0;
													this.setState({
														popMoreChains: moreChains,
														popModalVisible: true,
														iconRect: { x: px, y: py - dis, width, height }
													});
												});
											}
										}}
										activeOpacity={0.5}
										key={'chain-type-more'}
									>
										<Image
											style={
												this.state.popModalVisible || hasInMore
													? styles.networkSelected
													: styles.networkNormal
											}
											source={require('../../../images/ic_card_more.png')}
										/>
										<View
											style={[
												styles.chainNameView,
												{
													backgroundColor: hasInMore && colors.blackAlpha300
												}
											]}
											key={currentIndex + moreChains + 'chain-label-name-more'}
										>
											<Text
												style={styles.chainName}
												allowFontScaling={false}
												ref={this.iconRef}
												numberOfLines={1}
											>
												{hasInMore &&
													(isRpc
														? getRpcName(currentChainType)
														: ChainTypeNames[currentIndex])}
											</Text>
										</View>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</View>
				</View>
				{this.renderPopModal()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	isLockScreen: state.settings.isLockScreen,
	allChains: state.engine.backgroundState.PreferencesController.allChains || []
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(CardSwiper);
