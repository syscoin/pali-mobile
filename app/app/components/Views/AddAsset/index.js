import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Dimensions,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View
} from 'react-native';
import { ThemeContext } from '../../../theme/ThemeProvider';
import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import TokenImage from '../../UI/TokenImage';
import { strings } from '../../../../locales/i18n';
import { ChainType, util, Fuse } from 'paliwallet-core';
import LottieView from 'lottie-react-native';
import ElevatedView from 'react-native-elevated-view';
import Modal from 'react-native-modal';
import {
	addCurrencySymbol,
	balanceToFiatNumber,
	getAssetSymbol,
	getTokenDecimals,
	renderAmount
} from '../../../util/number';
import { SwipeRow } from 'react-native-swipe-list-view';
import { CURRENCIES } from '../../../util/currencies';
import AssetElement from '../../UI/AssetElement';
import { fontStyles, colors, baseStyles } from '../../../styles/common';
import { getIsRpc, getIcTagResource } from '../../../util/rpcUtil';
import { getSecurityData } from '../../../util/security';
import { getIcTagByChainType, getIcLogoByChainType } from '../../../util/ChainTypeImages';

const { width, height } = Dimensions.get('window');
const hideItemWidth = 70;

const styles = StyleSheet.create({
	noFoundLayout: {
		flex: 1,
		paddingTop: height * 0.1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	noFoundText: {
		marginTop: 21,
		fontSize: 16,
		color: colors.$404040
	},
	toastLayout: {
		width: 200,
		backgroundColor: colors.darkAlert,
		paddingBottom: 10,
		paddingTop: 10,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 8,
		marginBottom: 30
	},
	toast: {
		textAlign: 'center',
		color: colors.white,
		fontSize: 14,
		...fontStyles.normal
	},
	modal: {
		marginBottom: 20,
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0
	},
	touchChildView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'stretch',
		width: hideItemWidth,
		paddingLeft: 6
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
		borderRadius: 8
	},
	claimText: {
		overflow: 'hidden',
		borderRadius: 3,
		backgroundColor: colors.transparent,
		fontSize: 10,
		color: colors.brandPink300,
		paddingHorizontal: 9,
		paddingVertical: 1,
		borderColor: colors.brandPink300,
		borderWidth: 1
	},
	titleItem: {
		flexDirection: 'row',
		marginBottom: 5,
		alignItems: 'center'
	},
	textItemName: {
		marginRight: 8,
		fontSize: 18,
		...fontStyles.normal,
		color: colors.$030319,
		flexShrink: 1
	},
	textItemBalance: {
		fontSize: 18,
		...fontStyles.normal,
		color: colors.$030319
	},
	strikethrough: {
		textDecorationLine: 'line-through'
	},
	textItemAmount: {
		fontSize: 11,
		color: colors.$8F92A1
	},
	flexOne: {
		flex: 1
	},
	flexDir: {
		flexDirection: 'row'
	},
	priceChageView: {
		fontSize: 11
	},
	iconLayout: {
		marginRight: 10,
		width: 50,
		height: 40,
		alignSelf: 'center'
	},
	tagView: {
		position: 'absolute',
		left: 30,
		top: 20,
		width: 20,
		height: 20
	},
	animationParent: {
		height: '100%',
		width: hideItemWidth,
		justifyContent: 'center',
		paddingLeft: 8
	},
	animation: {
		width: 25,
		height: 25
	},
	tagPosition: {
		position: 'absolute',
		right: -8,
		top: -3,
		zIndex: 1
	},
	defiTagPosition: {
		position: 'absolute',
		right: -8,
		top: 0,
		zIndex: 1
	},
	arrowLayout: {
		marginHorizontal: 4,
		justifyContent: 'center'
	},
	space: {
		width: 7
	},
	moveText: {
		fontSize: 12,
		color: colors.brandPink300,
		marginTop: 5
	},
	moveTextDiabled: {
		fontSize: 12,
		color: colors.$A6A6A6,
		marginTop: 5
	},
	hiddenItemBase: {
		marginLeft: width - hideItemWidth,
		flex: 1,
		width: hideItemWidth
	},
	addTouchChildView: {
		justifyContent: 'center',
		width: hideItemWidth,
		paddingLeft: 6
	},
	flexOneDir: {
		flexDirection: 'row',
		flex: 1
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	defiModalWrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		marginTop: 100,
		minHeight: 300
	},
	defiEthLogo: {
		width: 40,
		height: 40,
		overflow: 'hidden',
		marginRight: 10
	},
	defiIconStyle: {
		width: 40,
		height: 40,
		alignItems: 'center',
		borderRadius: 20
	},
	defiTitleName: {
		marginRight: 15,
		fontSize: 20,
		...fontStyles.semibold,
		color: colors.$5092FF,
		flexShrink: 1
	},
	defiTitleBalance: {
		fontSize: 20,
		...fontStyles.semibold,
		color: colors.$030319
	},
	defiTokenEthLogo: {
		width: 20,
		height: 20,
		overflow: 'hidden',
		marginLeft: -6
	},
	defiTokenIconStyle: {
		width: 20,
		height: 20,
		alignItems: 'center',
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.white
	},
	flexSpace: {
		flex: 10
	},
	flexGrowOne: {
		flexGrow: 1
	},
	defiModalMargin: {
		marginHorizontal: 20
	},
	defiModalTitle: {
		flexDirection: 'row',
		height: 90,
		alignItems: 'center',
		flex: 1
	},
	defiModalLine: {
		height: 1,
		backgroundColor: colors.$F0F0F0
	},
	defiModalTokenContent: {
		flex: 1,
		justifyContent: 'center',
		marginBottom: 20
	},
	defiAppendLogo: {
		flexDirection: 'row',
		marginLeft: 6,
		marginTop: 20
	},
	defiSupply: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 6
	},
	defiSupplySambol: {
		flexShrink: 1,
		marginRight: 15,
		color: colors.$030319,
		fontSize: 14,
		...fontStyles.semibold
	},
	defiSupplyBalance: {
		color: colors.$030319,
		fontSize: 14,
		...fontStyles.semibold
	},
	defiReward: {
		flexDirection: 'row',
		marginTop: 4
	},
	rewardText: {
		fontSize: 14,
		color: colors.$030319,
		marginTop: 4
	},
	rewardMargin: {
		marginLeft: 20,
		flex: 1
	},
	deifRewardItem: {
		flexDirection: 'row',
		marginTop: 4
	},
	rewardItemSambol: {
		flexShrink: 1,
		color: colors.$8F92A1,
		fontSize: 14,
		marginRight: 15
	},
	rewardItemBalance: {
		color: colors.$8F92A1,
		fontSize: 14
	},
	defiTouch: {
		flexDirection: 'row',
		flexShrink: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
});

/**
 * PureComponent that provides ability to add assets.
 */
class AddAsset extends PureComponent {
	listTokens = [];

	state = {
		loadingTokens: [],
		toastShowing: false,
		defiModalVisible: false
	};
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		isLockScreen: PropTypes.bool,
		alreadyTokens: PropTypes.array,
		isAmountHide: PropTypes.bool,
		searchResults: PropTypes.array,
		searchQuery: PropTypes.string
	};

	containLoadingToken = (address, type) => {
		const { loadingTokens } = this.state;
		const newArr =
			loadingTokens.length === 0
				? []
				: loadingTokens.filter(
						item => item?.address?.toLowerCase() === address.toLowerCase() && item.type === type
						// eslint-disable-next-line no-mixed-spaces-and-tabs
				  );
		return newArr && newArr.length > 0;
	};

	updateLoadingToken = (address, type, isAdd) => {
		const array = [...this.state.loadingTokens];
		const index =
			array.length === 0
				? -1
				: array.findIndex(item => item.address?.toLowerCase() === address?.toLowerCase() && item.type === type);
		if (isAdd) {
			if (index === -1) {
				array.push({ address, type });
			}
		} else if (index !== -1) {
			array.splice(index, 1);
		}
		this.setState({ loadingTokens: array });
	};

	handleSelectAsset = async asset => {
		const { AssetsController } = Engine.context;
		const { l1Address, address, symbol, decimals, type } = asset;

		setTimeout(() => {
			this.updateLoadingToken(address, type, true);
		}, 1);

		try {
			await AssetsController.addToken(
				address,
				symbol || (await getAssetSymbol(type, address)),
				decimals || (await getTokenDecimals(type, address)),
				type,
				type === ChainType.Arbitrum ? l1Address : undefined
			);
		} catch (e) {
			this.setState({ toastShowing: true });
			setTimeout(() => {
				this.setState({ toastShowing: false });
			}, 2000);
			util.logDebug('leon.w@ add token failed: ', address, type, e);
		}

		setTimeout(() => {
			this.updateLoadingToken(address, type, false);
		}, 1000);
	};

	handleDeleteAsset = async asset => {
		const { AssetsController } = Engine.context;
		const { address } = asset;
		await AssetsController.removeAndIgnoreToken(address, asset.type);
	};

	onToastClose = () => {
		this.setState({ toastShowing: false });
	};

	renderHide = (asset, indexKey, swipeRowRef) => (
		<TouchableWithoutFeedback
			key={'swipeout-' + indexKey}
			onPress={() => {
				swipeRowRef?.current?.closeRow();
				this.handleDeleteAsset(asset);
			}}
		>
			<View style={styles.touchChildView}>
				<Image source={require('../../../images/ic_asset_item_hide.png')} />
				<View style={styles.space} />
				<Text style={styles.moveText}>{strings('other.hide')}</Text>
			</View>
		</TouchableWithoutFeedback>
	);

	renderHideDisabled = indexKey => (
		<TouchableWithoutFeedback key={'swipeout-' + indexKey}>
			<View style={styles.touchChildView}>
				<Image source={require('../../../images/ic_asset_item_hide_disable.png')} />
				<View style={styles.space} />
				<Text style={styles.moveTextDiabled}>{strings('other.hide')}</Text>
			</View>
		</TouchableWithoutFeedback>
	);

	renderSecurityTag = asset => {
		const securityData = getSecurityData(asset);
		if (!securityData) {
			return;
		}
		if (!securityData.isTrust) {
			if (securityData.risk?.length > 0) {
				return <Image source={require('../../../images/tag_danger.png')} style={styles.tagPosition} />;
			}
			if (securityData.notice?.length > 0) {
				return <Image source={require('../../../images/tag_warning.png')} style={styles.tagPosition} />;
			}
		}
	};

	onItemPress = token => {
		if (token.isDefi) {
			this.showDefiModal(token);
		} else {
			const { isAmountHide } = this.props;
			this.props.navigation.navigate('AssetView', { asset: token, isAmountHide });
		}
	};

	renderSearchItem = (asset, index) => {
		const isLoading = this.containLoadingToken(asset.address, asset.type);
		const addressLabel = asset.address
			? asset.address.substring(0, 6) + '...' + asset.address.substring(asset.address.length - 6)
			: '';
		const isRpc = getIsRpc(asset.type);
		const { isDarkMode } = this.context;
		return (
			<View style={styles.flexOneDir} key={'renderSearchItem' + index}>
				<AssetElement
					onPress={token => {
						this.onItemPress(token);
					}}
					asset={asset}
					indexKey={index}
				>
					<View style={styles.iconLayout}>
						<TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />
						<Image
							style={styles.tagView}
							source={isDarkMode ? getIcLogoByChainType(asset.type) : getIcTagByChainType(asset.type)}
						/>
					</View>
					<View style={styles.balances}>
						<View style={styles.titleItem}>
							<Text style={[styles.textItemName, isDarkMode && baseStyles.textDark]} numberOfLines={1}>
								{asset.symbol}
							</Text>
						</View>
						<View style={styles.flexDir}>
							<Text style={[styles.textItemAmount, isDarkMode && baseStyles.subTextDark]}>
								{addressLabel}
							</Text>
							<View style={styles.flexOne} />
						</View>
					</View>
				</AssetElement>

				{isLoading ? (
					<View style={[styles.animationParent, isDarkMode && baseStyles.darkBackground]}>
						<LottieView
							style={styles.animation}
							autoPlay
							loop
							source={require('../../../animations/security_loading.json')}
						/>
					</View>
				) : (
					<TouchableWithoutFeedback
						onPress={() => {
							this.handleSelectAsset(asset);
						}}
					>
						<View style={styles.addTouchChildView}>
							<Image source={require('../../../images/ic_asset_add.png')} />
							<View style={styles.space} />
							<Text style={styles.moveText}>{strings('token_search.add')}</Text>
						</View>
					</TouchableWithoutFeedback>
				)}
			</View>
		);
	};

	renderItem = (asset, index) => {
		const { isAmountHide } = this.props;
		const { currencyCode } = Engine.context.TokenRatesController.state;
		const { price, priceChange, done, balanceFiat, balance } = asset;
		const securityData = getSecurityData(asset);
		const amountSymbol = CURRENCIES[currencyCode].symbol;
		const isRpc = getIsRpc(asset.type);
		const isDefi = asset.isDefi;
		const isRisk = securityData?.risk?.length > 0 && !securityData?.isTrust;
		const { isDarkMode } = this.context;
		return (
			<AssetElement
				key={'renderItem' + index}
				onPress={token => {
					this.onItemPress(token);
				}}
				asset={asset}
				indexKey={index}
			>
				<View style={styles.iconLayout}>
					<TokenImage asset={asset} containerStyle={styles.ethLogo} iconStyle={styles.iconStyle} />
					<Image
						style={styles.tagView}
						source={isDarkMode ? getIcLogoByChainType(asset.type) : getIcTagByChainType(asset.type)}
					/>
				</View>

				<View style={styles.balances}>
					<View style={styles.titleItem}>
						<Text style={[styles.textItemName, isDarkMode && baseStyles.textDark]} numberOfLines={1}>
							{asset.symbol}
						</Text>
						{done ? (
							<Text style={styles.claimText}>{strings('other.claim')}</Text>
						) : (
							asset.lockType && <Image source={require('../../../images/lock_icon.png')} />
						)}
						<View style={styles.flexOne} />
						<Text
							style={[
								styles.textItemBalance,
								isDarkMode && baseStyles.textDark,
								isRisk && !isAmountHide ? styles.strikethrough : {}
							]}
						>
							{isAmountHide ? '***' : balanceFiat}
						</Text>
					</View>
					{!isDefi &&
						(isRisk ? (
							<View style={styles.flexDir}>
								<Text style={styles.textItemAmount}>
									{isAmountHide ? '***' : renderAmount(balance)}
								</Text>
								<View style={styles.flexOne} />
								<Text style={styles.textItemAmount}>{strings('other.worthless_high_risk_token')}</Text>
							</View>
						) : (
							<View style={styles.flexDir}>
								<Text style={styles.textItemAmount}>
									{isAmountHide ? '***' : renderAmount(balance)}
								</Text>
								<View style={styles.flexOne} />
								<Text
									style={[
										styles.textItemAmount,
										{
											color:
												!priceChange || priceChange === 0
													? colors.$8F92A1
													: priceChange > 0
													? colors.$09C285
													: colors.$FC6564
										}
									]}
								>
									{amountSymbol}
									{renderAmount(price)}
								</Text>
								<View style={styles.arrowLayout}>
									{priceChange !== undefined && priceChange > 0 && (
										<Image source={require('../../../images/ic_aseet_up.png')} />
									)}
									{priceChange !== undefined && priceChange < 0 && (
										<Image source={require('../../../images/ic_aseet_down.png')} />
									)}
								</View>
								<Text
									style={[
										styles.priceChageView,
										{
											color:
												!priceChange || priceChange === 0
													? colors.$8F92A1
													: priceChange > 0
													? colors.$09C285
													: colors.$FC6564
										}
									]}
								>
									{priceChange ? Math.abs(priceChange.toFixed(2)) : '0'}%
								</Text>
							</View>
						))}
				</View>
				{isDefi ? (
					<Image source={require('../../../images/ic_tag_defi.png')} style={styles.defiTagPosition} />
				) : (
					this.renderSecurityTag(asset)
				)}
			</AssetElement>
		);
	};

	hideDefiModal = () => {
		this.setState({ defiModalVisible: false });
	};

	showDefiModal = token => {
		this.setState({ selectedDefiToken: token, defiModalVisible: true });
	};

	renderDefiModal = () => {
		const { selectedDefiToken } = this.state;
		if (!selectedDefiToken) {
			return;
		}
		const portfolios = selectedDefiToken.portfolios;
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={!this.props.isLockScreen}
				onBackdropPress={this.hideDefiModal}
				onBackButtonPress={this.hideDefiModal}
				onSwipeComplete={this.hideDefiModal}
				statusBarTranslucent
				style={styles.bottomModal}
				animationType="fade"
				useNativeDriver
			>
				<TouchableOpacity
					style={[styles.flexOne, isDarkMode && baseStyles.darkModalBackground]}
					activeOpacity={1.0}
					onPress={this.hideDefiModal}
				>
					<View style={styles.flexSpace} />
					<ScrollView
						style={[styles.defiModalWrapper, isDarkMode && baseStyles.darkModalBackground]}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={styles.flexGrowOne}
					>
						<TouchableOpacity style={styles.defiModalMargin} activeOpacity={1}>
							<View style={styles.defiModalTitle}>
								<TouchableOpacity
									activeOpacity={0.8}
									style={styles.defiTouch}
									hitSlop={styles.hitSlop}
									onPress={() => {
										if (selectedDefiToken.siteUrl && selectedDefiToken.type) {
											this.hideDefiModal();
											this.props.navigation.navigate('BrowserTabHome');
											this.props.navigation.navigate('BrowserView', {
												newTabUrl: selectedDefiToken.siteUrl,
												chainType: selectedDefiToken.type
											});
										}
									}}
								>
									<TokenImage
										asset={selectedDefiToken}
										containerStyle={styles.defiEthLogo}
										iconStyle={styles.defiIconStyle}
									/>
									<Text style={styles.defiTitleName} numberOfLines={1} allowFontScaling={false}>
										{selectedDefiToken.symbol}
									</Text>
								</TouchableOpacity>

								<View style={styles.flexOne} />
								<Text
									style={[styles.defiTitleBalance, isDarkMode && baseStyles.textDark]}
									allowFontScaling={false}
								>
									{this.props.isAmountHide ? '***' : selectedDefiToken.balanceFiat}
								</Text>
							</View>
							<View style={styles.defiModalLine} />
							<View style={styles.defiModalTokenContent}>
								{portfolios.map((portfolio, index) => {
									const supplyTokens = portfolio.supplyTokens;
									const rewardTokens = portfolio.rewardTokens;
									const priceUsd = portfolio.priceUsd;
									const {
										currencyCode,
										currencyCodeRate
									} = Engine.context.TokenRatesController.state;
									const balanceFiatNumber = balanceToFiatNumber(1, currencyCodeRate, priceUsd);
									const balanceFiat = addCurrencySymbol(balanceFiatNumber, currencyCode);
									let appendSymbol = '';
									supplyTokens.forEach(token => {
										appendSymbol =
											appendSymbol === '' ? token.symbol : appendSymbol + ' + ' + token.symbol;
									});
									return (
										<View key={'portfolio-' + index}>
											<View style={styles.defiAppendLogo}>
												{supplyTokens.map((token, index) => (
													<TokenImage
														key={'supply-icon-' + index}
														asset={token}
														containerStyle={styles.defiTokenEthLogo}
														iconStyle={styles.defiTokenIconStyle}
													/>
												))}
											</View>

											<View style={styles.defiSupply}>
												<Text
													style={[styles.defiSupplySambol, isDarkMode && baseStyles.textDark]}
													allowFontScaling={false}
												>
													{appendSymbol}
												</Text>
												<View style={styles.flexOne} />
												<Text
													style={[
														styles.defiSupplyBalance,
														isDarkMode && baseStyles.textDark
													]}
													allowFontScaling={false}
												>
													{balanceFiat}
												</Text>
											</View>

											{rewardTokens?.length > 0 && (
												<View style={styles.defiReward}>
													<Text
														style={[styles.rewardText, isDarkMode && baseStyles.textDark]}
														allowFontScaling={false}
													>
														{strings('other.reward')}
													</Text>
													<View style={styles.rewardMargin}>
														{rewardTokens.map((token, index) => {
															const balanceFiatNumber = balanceToFiatNumber(
																token.amount,
																currencyCodeRate,
																token.priceUsd
															);
															const balanceFiat = addCurrencySymbol(
																balanceFiatNumber,
																currencyCode
															);
															return (
																<View
																	style={styles.deifRewardItem}
																	key={'reward-item-' + index}
																>
																	<Text
																		style={[
																			styles.rewardItemSambol,
																			isDarkMode && baseStyles.subTextDark
																		]}
																		numberOfLines={1}
																	>
																		{token.amount?.toFixed(2) + ' ' + token.symbol}
																	</Text>
																	<View style={styles.flexOne} />
																	<Text
																		style={[
																			styles.rewardItemBalance,
																			isDarkMode && baseStyles.subTextDark
																		]}
																	>
																		{balanceFiat}
																	</Text>
																</View>
															);
														})}
													</View>
													<View />
												</View>
											)}
										</View>
									);
								})}
							</View>
						</TouchableOpacity>
					</ScrollView>
				</TouchableOpacity>
			</Modal>
		);
	};

	render = () => {
		const { alreadyTokens, searchResults, searchQuery, isLockScreen } = this.props;
		const { toastShowing } = this.state;
		let newResults = [];
		if (searchQuery.trim() === '') {
			newResults = alreadyTokens;
		} else {
			const fileterSearchResult = searchResults && searchResults.length > 0 ? [...searchResults] : [];
			let newAlreadyTokens = [];
			if (alreadyTokens && alreadyTokens.length > 0) {
				let filterTokens = [];
				if (fileterSearchResult.length === 0 || fileterSearchResult[0].searchByAddress) {
					filterTokens = alreadyTokens.filter(
						token =>
							token.address?.toLowerCase() === searchQuery?.trim().toLowerCase() ||
							(token.type === ChainType.Arbitrum &&
								token.l1Address?.toLowerCase() === searchQuery?.trim().toLowerCase())
					);
				}
				if (filterTokens.length === 0) {
					const fuse = new Fuse(alreadyTokens, {
						shouldSort: true,
						threshold: 0.3,
						location: 0,
						distance: 100,
						maxPatternLength: 32,
						minMatchCharLength: 1,
						keys: [{ name: 'symbol', weight: 1.0 }]
					});
					filterTokens = fuse.search(searchQuery?.trim());
				}

				if (fileterSearchResult.length > 0 && filterTokens && filterTokens.length > 0) {
					filterTokens.forEach(token => {
						const index = fileterSearchResult.findIndex(
							item =>
								item.address?.toLowerCase() === token.address?.toLowerCase() &&
								item.type === token.type &&
								!token.done &&
								!token.lockType
						);
						if (index >= 0) {
							fileterSearchResult.splice(index, 1);
						}
					});
				}
				if (filterTokens && filterTokens.length > 0) {
					newAlreadyTokens = filterTokens;
				}
			}
			newResults = [...newAlreadyTokens, ...fileterSearchResult];
		}
		const { isDarkMode } = this.context;
		return (
			<View style={styles.flexOne}>
				{newResults.length === 0 && (
					<View style={styles.noFoundLayout}>
						<Image source={require('../../../images/search_no_found.png')} />
						<Text style={[styles.noFoundText, isDarkMode && baseStyles.textDark]}>
							{strings('other.no_token_found')}
						</Text>
					</View>
				)}
				{newResults.map((item, index) => {
					const asset = item;
					const swipeRowRef = React.createRef();
					return asset.fromSearch ? (
						this.renderSearchItem(item, index)
					) : (
						<SwipeRow
							ref={swipeRowRef}
							key={'swiperow-index-' + index}
							rightOpenValue={-hideItemWidth}
							disableRightSwipe
							directionalDistanceChangeThreshold={5}
						>
							<View style={styles.hiddenItemBase}>
								{asset.nativeCurrency || asset.done || asset.isDefi
									? this.renderHideDisabled(index)
									: this.renderHide(item, index, swipeRowRef)}
							</View>
							{this.renderItem(item, index)}
						</SwipeRow>
					);
				})}
				<Modal
					style={styles.modal}
					isVisible={toastShowing && !isLockScreen}
					onBackdropPress={this.onToastClose}
					onBackButtonPress={this.onToastClose}
					backdropOpacity={0}
					animationIn={'fadeIn'}
					animationOut={'fadeOut'}
					useNativeDriver
				>
					<ElevatedView style={styles.toastLayout} elevation={0}>
						<Text style={styles.toast}>{strings('other.net_error_and_retry')}</Text>
					</ElevatedView>
				</Modal>

				{this.state.defiModalVisible && this.renderDefiModal()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

export default connect(mapStateToProps)(AddAsset);
