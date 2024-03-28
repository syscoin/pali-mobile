import { ChainType, util } from 'paliwallet-core';
import LottieView from 'lottie-react-native';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
	FlatList,
	Image,
	Keyboard,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View
} from 'react-native';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import FastImage from 'react-native-fast-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import { getChainIdByType, getEip155Url } from '../../../util/number';
import NFTImage from '../NFTImage';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	backIcon: {
		color: colors.black
	},
	borderRadius10: {
		borderRadius: 10,
		overlayColor: colors.white
	},
	detailName: {
		fontSize: 14,
		color: colors.$60657D,
		textAlignVertical: 'bottom',
		textAlign: 'left'
	},
	justifyContentEnd: {
		justifyContent: 'flex-end'
	},
	titleLayout: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 54,
		width: '100%',
		justifyContent: 'space-between'
	},
	titleText: {
		alignSelf: 'center',
		color: colors.$202020,
		fontSize: 18,
		...fontStyles.semibold
	},
	itemBaseLayout: {
		marginTop: 15,
		flex: 1
	},
	contentLayout: {
		marginTop: 15,
		flex: 1
	},
	textInput: {
		height: 40,
		fontSize: 14,
		color: colors.$030319,
		paddingVertical: 0,
		marginTop: 40,
		marginHorizontal: 20
	},
	underline: {
		borderBottomWidth: 1,
		borderBottomColor: colors.$F0F0F0,
		marginHorizontal: 20
	},
	urlDoneTouch: {
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.$E6E6E6,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 40,
		marginHorizontal: 20
	},
	urlDoneText: {
		color: colors.$A6A6A6,
		fontSize: 16
	},
	openSeaTouch: {
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginHorizontal: 20
	},
	rootView: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		height: 650
	},
	alignItemCenter: {
		alignItems: 'center'
	},
	homeTop: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 30,
		justifyContent: 'center'
	},
	homeTitle: {
		color: colors.$030319,
		fontSize: 28,
		...fontStyles.bold,
		marginLeft: 12,
		marginRight: 4
	},
	homeDesc: {
		color: colors.$8F92A1,
		fontSize: 12,
		marginTop: 8
	},
	homeIcon: {
		width: 170,
		height: 170,
		marginTop: 30,
		borderRadius: 10
	},
	homeEnsName: {
		marginTop: 10,
		color: colors.$030319,
		fontSize: 18,
		...fontStyles.semibold,
		marginHorizontal: 30
	},
	homeNoAvatarLayout: {
		flexDirection: 'row',
		paddingHorizontal: 50,
		marginTop: 40,
		marginBottom: 20
	},
	homeNoAvatarContent: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 10,
		flexShrink: 1
	},
	homeNoAvatarTip: {
		backgroundColor: colors.$FFE1CE,
		paddingVertical: 9,
		paddingHorizontal: 13,
		borderRadius: 10,
		flexShrink: 1
	},
	homeTipTitle: {
		color: colors.$60657D,
		fontSize: 12,
		...fontStyles.semibold
	},
	homeTipDesc: {
		color: colors.$60657D,
		fontSize: 12,
		lineHeight: 14,
		marginTop: 4
	},
	homeSetNftLayout: {
		marginTop: 16,
		marginHorizontal: 6,
		justifyContent: 'center'
	},
	homeSetNftBg: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0
	},
	homeSetNftTitle: {
		color: colors.white,
		fontSize: 24,
		...fontStyles.semibold,
		marginLeft: 44
	},
	homeSetNftTitleSmall: {
		fontSize: 20
	},
	homeSetNftDesc: {
		color: colors.white,
		fontSize: 16,
		marginTop: 10,
		marginLeft: 44
	},
	homeSetUrlLayout: {
		marginHorizontal: 6,
		justifyContent: 'center'
	},
	width44: {
		width: 44
	},
	backPaddingLeft: {
		paddingLeft: 20
	},
	flatListPadding: {
		paddingHorizontal: 20
	},
	listHeaderText: {
		fontSize: 16,
		color: colors.$030319
	},
	noNftLayout: {
		justifyContent: 'center',
		paddingBottom: 50,
		flex: 1
	},
	alignSelfCenter: {
		alignSelf: 'center'
	},
	noAnyNftText: {
		marginTop: 20,
		color: colors.$030319,
		fontSize: 16,
		alignSelf: 'center'
	},
	canBuyOnText: {
		fontSize: 14,
		color: colors.$030319,
		marginTop: 60,
		alignSelf: 'center',
		marginBottom: 14
	},
	openSeaText: {
		color: colors.white,
		fontSize: 14,
		marginLeft: 10
	},
	setUrlIcon: {
		alignSelf: 'center',
		width: 110,
		height: 110,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	setUrlName: {
		marginTop: 10,
		alignSelf: 'center',
		color: colors.$030319,
		...fontStyles.semibold,
		fontSize: 18,
		marginHorizontal: 20
	},
	unloadContent: {
		marginTop: 8,
		color: colors.transparent,
		fontSize: 13,
		marginLeft: 22
	},
	flexOne: {
		flex: 1
	},
	aboutIcon: {
		alignSelf: 'center',
		marginBottom: 30
	},
	aboutInfoLayout: {
		flexDirection: 'row',
		marginTop: 30,
		paddingHorizontal: 20
	},
	aboutConent: {
		marginLeft: 10,
		flexShrink: 1
	},
	abountItemTitle: {
		color: colors.$030319,
		fontSize: 18,
		...fontStyles.semibold
	},
	aboutItemDesc: {
		color: colors.$60657D,
		fontSize: 14,
		marginTop: 6,
		lineHeight: 18,
		flexShrink: 1
	},
	flatListFooter: {
		height: 40
	},
	animation: {
		width: 52,
		height: 52
	},
	requestImg: {
		position: 'absolute',
		left: 0,
		top: 0
	},
	flexGrowOne: {
		flexGrow: 1
	},
	aboutBottomHeigth: {
		height: 50
	}
});

export const HomePage = 1;
const SelectNftPage = 2;
const SetUrlPage = 3;
const AboutPage = 4;

const screenWidth = Device.getDeviceWidth();
const itemSpace = 23;
const itemSize = (screenWidth - 20 * 2 - itemSpace * 2) / 3;
const itemTextHeight = 26;

/**
 * Account access approval component
 */
class EnsSettingView extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		allCollectibleContracts: PropTypes.object,
		allCollectibles: PropTypes.object,
		ensEntry: PropTypes.object,
		goOpeanSea: PropTypes.func,
		setAvatarData: PropTypes.func,
		page: PropTypes.number,
		setCurrentPage: PropTypes.func,
		setKeyboardState: PropTypes.func
	};

	state = {
		selectedAddress: Engine.context.PreferencesController.state.selectedAddress,
		urlValue: '',
		requestUrl: null,
		avatarLoading: false,
		avatarLoadSuccess: false,
		avatarLoadError: false
	};

	keyboardDidHideListener = null;
	keyboardDidShowListener = null;

	componentDidMount() {
		this.keyboardDidShowListener = this.keyboardDidShow.bind(this);
		this.keyboardDidHideListener = this.keyboardDidHide.bind(this);
		Keyboard.addListener('keyboardDidShow', this.keyboardDidShowListener);
		Keyboard.addListener('keyboardDidHide', this.keyboardDidHideListener);
	}

	componentWillUnmount() {
		this.keyboardDidShowListener && Keyboard.removeListener('keyboardDidShow', this.keyboardDidShowListener);
		this.keyboardDidShowListener && Keyboard.removeListener('keyboardDidHide', this.keyboardDidHideListener);
	}

	keyboardDidShow(e) {
		this.props.setKeyboardState && this.props.setKeyboardState(true);
	}

	keyboardDidHide(e) {
		setTimeout(() => {
			this.props.setKeyboardState && this.props.setKeyboardState(false);
			if (this.props.page === SetUrlPage && !!this.state.urlValue) {
				let { urlValue } = this.state;
				if (util.isIPFSUrl(urlValue)) {
					urlValue = util.makeIPFSUrl(urlValue, Engine.context.CollectiblesController.state.ipfsGateway);
				}
				if (!util.isEtherscanAvailable() && !!urlValue) {
					urlValue = 'https://pali.pollum.cloud/proxy-png?url=' + urlValue;
				} else if (!!urlValue && urlValue.startsWith('http://')) {
					urlValue = 'https://pali.pollum.cloud/proxy-png?url=' + urlValue;
				}
				if ((urlValue && urlValue.startsWith('http://')) || urlValue.startsWith('https://')) {
					if (urlValue.trim() !== this.state.requestUrl) {
						this.setState({
							avatarLoadSuccess: false,
							avatarLoadError: false,
							avatarLoading: true,
							requestUrl: urlValue.trim()
						});
					}
				} else {
					this.setState({
						avatarLoadSuccess: false,
						avatarLoadError: true,
						avatarLoading: false,
						requestUrl: ''
					});
				}
			}
		}, 100);
	}

	renderItemDetail = (data, index, columnCount) => {
		const { ensEntry, setAvatarData } = this.props;
		const itemWidth = itemSize;
		const left = index % columnCount > 0 ? itemSpace : 0;
		const top = itemSpace; //Math.floor(index / columnCount) > 0 ? itemSpace : 0;
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				key={'two-key-' + index}
				activeOpacity={1.0}
				style={{
					marginLeft: left,
					marginTop: top,
					width: itemWidth,
					height: itemWidth + itemTextHeight
				}}
				onPress={() => {
					const avatarData = {
						address: ensEntry.address,
						name: ensEntry.ensName,
						avatarUrl: data.image_url,
						avatarText: getEip155Url(data)
					};
					setAvatarData && setAvatarData(avatarData);
				}}
			>
				<NFTImage
					style={[
						styles.borderRadius10,
						{
							width: itemWidth,
							height: itemWidth
						}
					]}
					imageUrl={data.image_url}
					showBorder
					onLoadEnd={() => {
						// this.setImagesCache(data.image_url);
					}}
				/>

				<View
					style={[
						styles.justifyContentEnd,
						{
							width: itemWidth,
							height: itemTextHeight
						}
					]}
				>
					<Text
						numberOfLines={1}
						allowFontScaling={false}
						style={[
							styles.detailName,
							isDarkMode && baseStyles.textDark,
							{
								width: itemWidth
							}
						]}
					>
						{data.name || data.token_id}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	renderHome = () => {
		const { ensEntry } = this.props;
		const width = screenWidth - 6 * 2;
		const height = (width * 158.0) / 362;
		const smallHeight = (width * 118.0) / 363;
		const hasAvatarUrl = ensEntry.avatarUrl;
		const { isDarkMode } = this.context;

		return (
			<View style={styles.alignItemCenter}>
				<View style={styles.homeTop}>
					<Image source={require('../../../images/ic_ens_big.png')} />
					<Text style={[styles.homeTitle, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
						{strings('ens_setting.ens_avatar')}
					</Text>
					<TouchableOpacity
						hitSlop={styles.hitSlop}
						onPress={() => {
							this.props.setCurrentPage(AboutPage);
						}}
					>
						<Image source={require('../../../images/ask.png')} />
					</TouchableOpacity>
				</View>
				<Text style={styles.homeDesc} allowFontScaling={false}>
					{strings('ens_setting.decentralised_avatar')}
				</Text>
				{hasAvatarUrl ? (
					<View style={styles.alignItemCenter}>
						<NFTImage
							style={styles.homeIcon}
							imageUrl={ensEntry.avatarUrl}
							defaultImg={require('../../../images/ic_ens_avatar.png')}
						/>
						<Text style={styles.homeEnsName} allowFontScaling={false}>
							{ensEntry.ensName}
						</Text>
					</View>
				) : (
					<View style={styles.homeNoAvatarLayout}>
						<Image
							style={{ width: 80, height: 80 }}
							source={require('../../../images/ic_ens_avatar.png')}
						/>
						<View style={styles.homeNoAvatarContent}>
							<Image source={require('../../../images/img_ens_tip_arrow.png')} />
							<View style={styles.homeNoAvatarTip}>
								<Text style={styles.homeTipTitle}>
									{strings('ens_setting.hi_ens_name', { name: ensEntry.ensName })}
								</Text>
								<Text style={styles.homeTipDesc}>{strings('ens_setting.set_url_tip')}</Text>
							</View>
						</View>
					</View>
				)}

				<TouchableOpacity
					style={[styles.homeSetNftLayout, hasAvatarUrl ? { width, height: smallHeight } : { width, height }]}
					activeOpacity={0.9}
					onPress={() => {
						this.props.setCurrentPage(SelectNftPage);
					}}
				>
					<Image
						source={
							hasAvatarUrl
								? require('../../../images/img_ens_nft_bg_small.png')
								: require('../../../images/img_ens_nft_bg.png')
						}
						style={[styles.homeSetNftBg, hasAvatarUrl ? { width, height: smallHeight } : { width, height }]}
					/>
					<Text
						style={[styles.homeSetNftTitle, hasAvatarUrl && styles.homeSetNftTitleSmall]}
						allowFontScaling={false}
					>
						{strings('ens_setting.set_your_nft')}
					</Text>
					<Text style={styles.homeSetNftDesc} allowFontScaling={false}>
						{strings('ens_setting.as_avatar')}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.homeSetUrlLayout, hasAvatarUrl ? { width, height: smallHeight } : { width, height }]}
					activeOpacity={0.9}
					onPress={() => {
						this.setState({
							urlValue: '',
							avatarLoadSuccess: false,
							avatarLoadError: false,
							avatarLoading: false,
							requestUrl: ''
						});
						this.props.setCurrentPage(SetUrlPage);
					}}
				>
					<Image
						source={
							hasAvatarUrl
								? require('../../../images/img_ens_url_bg_small.png')
								: require('../../../images/img_ens_url_bg.png')
						}
						style={[styles.homeSetNftBg, hasAvatarUrl ? { width, height: smallHeight } : { width, height }]}
					/>
					<Text
						style={[styles.homeSetNftTitle, hasAvatarUrl && styles.homeSetNftTitleSmall]}
						allowFontScaling={false}
					>
						{strings('ens_setting.set_image_url')}
					</Text>
					<Text style={styles.homeSetNftDesc} allowFontScaling={false}>
						{strings('ens_setting.to_avatar')}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderSelectNft = () => {
		const { allCollectibles, allCollectibleContracts, goOpeanSea } = this.props;
		const currentChainId = getChainIdByType(ChainType.Ethereum);
		const collectibles = [];
		if (allCollectibles[currentChainId]) {
			collectibles.push(...allCollectibles[currentChainId]);
		}
		const allItems = [];
		collectibles.forEach((token, index) => {
			const contract = allCollectibleContracts?.[token.chainId]?.find(
				contract => contract.address === token.address
			);
			allItems.push({ ...token, asset_contract: contract });
		});
		const { isDarkMode } = this.context;
		return (
			<View style={styles.itemBaseLayout}>
				<View style={styles.titleLayout}>
					<TouchableOpacity
						hitSlop={styles.hitSlop}
						onPress={() => {
							this.props.setCurrentPage(HomePage);
						}}
						style={styles.backPaddingLeft}
					>
						<EvilIcons
							name="chevron-left"
							size={32}
							style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
						/>
					</TouchableOpacity>
					<Text style={[styles.titleText, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
						{' '}
						{strings('ens_setting.select_an_nft')}
					</Text>
					<View style={styles.width44} />
				</View>
				<View style={styles.contentLayout}>
					{allItems.length > 0 ? (
						<TouchableWithoutFeedback>
							<View style={styles.flatListPadding}>
								<FlatList
									renderItem={({ item, index }) => this.renderItemDetail(item, index, 3)}
									data={allItems}
									keyExtractor={(item, index) => 'nft' + 3 + '-detail-' + index}
									numColumns={3}
									horizontal={false}
									ListHeaderComponent={() => (
										<Text style={[styles.listHeaderText, isDarkMode && baseStyles.textDark]}>
											{strings('ens_setting.ens_accepts_nfts')}
										</Text>
									)}
									ListFooterComponent={() => <View style={styles.flatListFooter} />}
									showsVerticalScrollIndicator={false}
								/>
							</View>
						</TouchableWithoutFeedback>
					) : (
						<View style={styles.noNftLayout}>
							<Image
								source={require('../../../images/img_ens_nft_no.png')}
								style={styles.alignSelfCenter}
							/>
							<Text
								style={[styles.noAnyNftText, isDarkMode && baseStyles.textDark]}
								allowFontScaling={false}
							>
								{strings('ens_setting.not_any_nft')}
							</Text>
							<Text
								style={[styles.canBuyOnText, isDarkMode && baseStyles.textDark]}
								allowFontScaling={false}
							>
								{strings('ens_setting.your_can_buy_on')}
							</Text>
							<TouchableOpacity
								style={styles.openSeaTouch}
								activeOpacity={0.8}
								onPress={() => {
									goOpeanSea && goOpeanSea();
								}}
							>
								<Image source={require('../../../images/ic_opensea.png')} />
								<Text style={styles.openSeaText} allowFontScaling={false}>
									{strings('ens_setting.opensea')}
								</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</View>
		);
	};

	onUrlValueChange = value => {
		this.setState({ urlValue: value });
	};

	renderSetUrl = () => {
		const { ensEntry, setAvatarData } = this.props;
		const { urlValue, requestUrl, avatarLoading, avatarLoadSuccess, avatarLoadError } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View style={styles.itemBaseLayout}>
				<View style={styles.titleLayout}>
					<TouchableOpacity
						hitSlop={styles.hitSlop}
						onPress={() => {
							this.props.setCurrentPage(HomePage);
						}}
						style={styles.backPaddingLeft}
					>
						<EvilIcons
							name="chevron-left"
							size={32}
							style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
						/>
					</TouchableOpacity>
					<Text style={[styles.titleText, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
						{strings('ens_setting.set_url')}
					</Text>
					<View style={styles.width44} />
				</View>
				<KeyboardAwareScrollView enableOnAndroid contentContainerStyle={styles.flexGrowOne}>
					<View style={styles.contentLayout}>
						<View style={styles.setUrlIcon}>
							{!avatarLoadSuccess && (
								<View style={[styles.setUrlIcon, { backgroundColor: colors.$C4C5CD }]}>
									{avatarLoading ? (
										<LottieView
											style={styles.animation}
											autoPlay
											loop
											source={require('../../../animations/connect_loading.json')}
										/>
									) : (
										<Image source={require('../../../images/img_ens_no_avatar.png')} />
									)}
								</View>
							)}
							{(avatarLoading || avatarLoadSuccess) && (
								<FastImage
									style={[styles.setUrlIcon, styles.requestImg]}
									source={{ uri: requestUrl }}
									onLoadEnd={() => {
										this.setState({
											avatarLoadSuccess: true,
											avatarLoadError: false,
											avatarLoading: false
										});
									}}
									onError={() => {
										this.setState({
											avatarLoadSuccess: false,
											avatarLoadError: true,
											avatarLoading: false
										});
									}}
								/>
							)}
						</View>

						<Text style={[styles.setUrlName, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
							{ensEntry.ensName}
						</Text>
						<TextInput
							allowFontScaling={false}
							style={[styles.textInput, isDarkMode && baseStyles.textDark]}
							value={urlValue}
							placeholder={strings('ens_setting.enter_http_ipfs')}
							placeholderTextColor={colors.$8F92A1}
							onChangeText={this.onUrlValueChange}
							returnKeyType={'done'}
						/>
						<View style={styles.underline} />
						<Text
							style={[styles.unloadContent, avatarLoadError && { color: colors.$FC6564 }]}
							allowFontScaling={false}
						>
							{strings('ens_setting.unable_load_content')}
						</Text>
						<View style={styles.flexOne} />
						<TouchableOpacity
							disabled={!avatarLoadSuccess}
							style={[
								styles.urlDoneTouch,
								avatarLoadSuccess &&
									(isDarkMode
										? baseStyles.darkConfirmButton
										: { backgroundColor: colors.brandPink300 })
							]}
							onPress={() => {
								const data = {
									address: ensEntry.address,
									name: ensEntry.ensName,
									avatarUrl: requestUrl,
									avatarText: requestUrl
								};
								setAvatarData && setAvatarData(data);
							}}
						>
							<Text
								style={[
									styles.urlDoneText,
									avatarLoadSuccess &&
										(isDarkMode ? baseStyles.darkConfirmText : { color: colors.white })
								]}
								allowFontScaling={false}
							>
								{strings('navigation.ok')}
							</Text>
						</TouchableOpacity>
					</View>
				</KeyboardAwareScrollView>
			</View>
		);
	};

	renderAbountAvatar = () => {
		const { isDarkMode } = this.context;
		const icons = [
			require('../../../images/ic_ens_about_what.png'),
			require('../../../images/ic_ens_about_format.png'),
			require('../../../images/ic_ens_about_stored.png'),
			require('../../../images/ic_ens_about_fee.png')
		];
		const titles = [
			strings('ens_setting.about_title_1'),
			strings('ens_setting.about_title_2'),
			strings('ens_setting.about_title_3'),
			strings('ens_setting.about_title_4')
		];

		const descs = [
			strings('ens_setting.about_desc_1'),
			strings('ens_setting.about_desc_2'),
			strings('ens_setting.about_desc_3'),
			strings('ens_setting.about_desc_4')
		];

		return (
			<View style={styles.itemBaseLayout}>
				<View style={styles.titleLayout}>
					<TouchableOpacity
						hitSlop={styles.hitSlop}
						style={styles.backPaddingLeft}
						onPress={() => {
							this.props.setCurrentPage(HomePage);
						}}
					>
						<EvilIcons
							name="chevron-left"
							size={32}
							style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
						/>
					</TouchableOpacity>
					<Text style={[styles.titleText, isDarkMode && baseStyles.textDark]} allowFontScaling={false}>
						{strings('ens_setting.about_ens_avatar')}
					</Text>
					<View style={styles.width44} />
				</View>
				<View style={styles.contentLayout}>
					<View style={styles.flexOne} />
					<Image source={require('../../../images/img_ens_brantly.png')} style={styles.aboutIcon} />

					{icons.map((icon, index) => (
						<View style={styles.aboutInfoLayout} key={'about-index-' + index}>
							<Image source={icon} />
							<View style={styles.aboutConent}>
								<Text
									style={[styles.abountItemTitle, isDarkMode && baseStyles.textDark]}
									allowFontScaling={false}
								>
									{titles[index]}
								</Text>
								<Text style={[styles.aboutItemDesc]} allowFontScaling={false}>
									{descs[index]}
								</Text>
							</View>
						</View>
					))}
					<View style={styles.flexOne} />
					<View style={styles.aboutBottomHeigth} />
				</View>
			</View>
		);
	};

	render = () => {
		const { page } = this.props;
		const width = screenWidth - 6 * 2;
		let height = (width * 158.0) / 362;
		height = height * 2 + 300;
		const hasAvatarUrl = this.props.ensEntry.avatarUrl;
		if (hasAvatarUrl) {
			const smallHeight = (width * 118.0) / 363;
			height = smallHeight * 2 + 350;
		}
		const { isDarkMode } = this.context;

		return (
			<View style={[styles.rootView, isDarkMode && baseStyles.darkBackground, { height }]}>
				{page === SelectNftPage
					? this.renderSelectNft()
					: page === SetUrlPage
					? this.renderSetUrl()
					: page === AboutPage
					? this.renderAbountAvatar()
					: this.renderHome()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	allCollectibleContracts:
		state.engine.backgroundState.CollectiblesController.allCollectibleContracts[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	allCollectibles:
		state.engine.backgroundState.CollectiblesController.allCollectibles[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {}
});

export default connect(mapStateToProps)(EnsSettingView);
