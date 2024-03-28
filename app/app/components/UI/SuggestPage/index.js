import React, { PureComponent } from 'react';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { ThemeContext } from '../../../theme/ThemeProvider';
import AntIcon from 'react-native-vector-icons/AntDesign';
import {
	AutoCompleteController,
	AutoCompleteResult,
	AutoCompleteType_DAPP,
	AutoCompleteType_RECENT,
	AutoCompleteType_SEARCH,
	AutoCompleteType_SEARCH_RECENT,
	AutoCompleteType_URL
} from '../../../core/AutoCompleteController';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { shouldHideSthForAppStoreReviewer } from '../../../util/ApiClient';
import NFTImage from '../NFTImage';
import AppConstants from '../../../core/AppConstants';
import {
	chainToChainType,
	getIcTagByChainType,
	getShareImage,
	getIcLogoByChainType
} from '../../../util/ChainTypeImages';

const styles = {
	root: {
		width: '100%',
		height: '100%',
		backgroundColor: colors.white
	},
	search: {
		marginTop: 10
	},
	item: {
		height: 44,
		flexDirection: 'row',
		paddingHorizontal: 20,
		alignItems: 'center',
		marginTop: 2
	},
	itemIcon: {
		height: 24,
		width: 24,
		borderRadius: 6
	},
	itemText: {
		marginLeft: 12,
		fontSize: 14,
		lineHeight: 16,
		color: colors.$404040
	},
	itemContent: {
		marginLeft: 12
	},
	itemTitle: {
		alignItems: 'center',
		flexDirection: 'row'
	},
	itemTitleText: {
		fontSize: 14,
		lineHeight: 16,
		color: colors.$030319
	},
	itemTitleLogo: {
		height: 14,
		width: 14,
		marginLeft: 6
	},
	itemSubtitle: {
		fontSize: 11,
		lineHeight: 13,
		color: colors.$8F92A1,
		marginTop: 2
	},
	suggest: {
		marginTop: 20,
		marginLeft: 20,
		marginBottom: 6,
		fontSize: 18,
		lineHeight: 21,
		color: colors.$030319,
		...fontStyles.semibold
	},
	favoriteIcon: {
		width: 40,
		height: 40,
		borderRadius: 10
	},
	favoriteItem: {
		width: 76,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 25,
		marginBottom: 10
	},
	favoriteLable: {
		marginTop: 8,
		fontSize: 11,
		color: colors.$030319,
		paddingHorizontal: 5
	},
	favoriteBase: {
		flexDirection: 'row',
		marginLeft: 17,
		alignItems: 'center'
	},
	favoriteLine: {
		backgroundColor: colors.$E6E6E6,
		height: 30,
		width: 1,
		marginHorizontal: 7
	},
	itemTag: {
		height: 18,
		width: 18,
		position: 'absolute',
		top: 25,
		left: 45
	}
};

class SuggestPage extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		openUrl: PropTypes.func,
		searchText: PropTypes.string,
		style: PropTypes.object,
		favourites: PropTypes.array
	};

	state = {
		searchResults: [],
		inputText: ''
	};

	curSearchText: string = null;
	shouldHideSth = shouldHideSthForAppStoreReviewer();

	constructor() {
		super();
		this.autoCompleteController = new AutoCompleteController(this.autoCompleteControllerListener.bind(this));
	}

	async componentDidMount() {
		this.onSearchTextChange(this.props.searchText);
	}

	onSubmit() {
		const item = this.state.searchResults[0];
		item && this.props.openUrl && this.props.openUrl(item);
	}

	autoCompleteControllerListener(text: string, result: AutoCompleteResult[]) {
		if (!text && this.curSearchText !== text) {
			return;
		}
		this.setState({ searchResults: [...result] });
	}

	onSearchTextChange(text) {
		if (this.curSearchText === text) {
			return;
		}
		this.curSearchText = text;
		this.autoCompleteController.startAutocomplete(text);
	}

	renderSearch(results) {
		if (!results?.length) {
			return;
		}
		return <View style={styles.search}>{results.map((result, index) => this.renderItem(result, index))}</View>;
	}

	renderSuggest(results) {
		if (!results?.length) {
			return;
		}
		return (
			<View>
				<Text style={[styles.suggest, isDarkMode && baseStyles.textDark]}>{strings('other.dApp')}</Text>
				{results.map((result, index) => {
					const filterResults = results.filter(res => result.title === res.title);
					return this.renderItem(result, index, filterResults?.length > 1);
				})}
			</View>
		);
	}

	renderRecent(results) {
		if (!results?.length) {
			return;
		}
		const { isDarkMode } = this.context;
		return (
			<View>
				<Text style={[styles.suggest, isDarkMode && baseStyles.textDark]}>{strings('other.recent')}</Text>
				{results.map((result, index) => this.renderItem(result, index))}
			</View>
		);
	}

	renderItem(item, index, showChain = false) {
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				style={styles.item}
				activeOpacity={1}
				key={`search_${index}`}
				onPress={() => {
					this.props.openUrl && this.props.openUrl(item);
				}}
			>
				{item.type === AutoCompleteType_URL || item.type === AutoCompleteType_SEARCH ? (
					<>
						<AntIcon
							size={18}
							color={isDarkMode ? colors.white : colors.paliGrey600}
							name="search1"
							style={styles.itemIcon}
						/>

						<Text
							style={[styles.itemText, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							ellipsizeMode={'tail'}
						>
							{item.title}
						</Text>
					</>
				) : (
					<>
						<Image
							style={styles.itemIcon}
							source={{ uri: item.img }}
							defaultSource={require('../../../images/ic_defi_network.png')}
						/>
						<View style={styles.itemContent}>
							<View style={styles.itemTitle}>
								<Text
									style={[styles.itemTitleText, isDarkMode && baseStyles.textDark]}
									numberOfLines={1}
									ellipsizeMode={'tail'}
								>
									{item.title}
								</Text>
								{showChain && item.chain && (
									<Image
										style={styles.itemTitleLogo}
										source={getShareImage(chainToChainType(item.chain))}
									/>
								)}
							</View>

							<Text style={styles.itemSubtitle} numberOfLines={1} ellipsizeMode={'tail'}>
								{item.desc || item.url}
							</Text>
						</View>
					</>
				)}
			</TouchableOpacity>
		);
	}

	rennderFavoriteItem = (item, index) => {
		const imageUri =
			item?.logo ||
			'https://pali-images.s3.amazonaws.com/files/' + item?.name.replace(/\s/g, '') + 'logo' + '.png';
		const { isDarkMode } = this.context;
		const tagIcon = isDarkMode
			? getIcLogoByChainType(chainToChainType(item?.chain))
			: getIcTagByChainType(chainToChainType(item?.chain));
		return (
			<TouchableOpacity
				style={styles.favoriteItem}
				activeOpacity={1}
				key={`favorite_${index}`}
				onPress={() => {
					this.props.openUrl &&
						this.props.openUrl({
							url: item?.url,
							name: item?.name
						});
				}}
			>
				<NFTImage style={styles.favoriteIcon} imageUrl={imageUri} />
				<Text
					numberOfLines={1}
					style={[styles.favoriteLable, isDarkMode && baseStyles.textDark]}
					ellipsizeMode={'middle'}
				>
					{item?.name}
				</Text>
				{tagIcon && <Image style={styles.itemTag} source={tagIcon} />}
			</TouchableOpacity>
		);
	};

	renderFavorite = () => {
		if (this.curSearchText && this.curSearchText.trim() !== '') {
			return;
		}
		let { favourites } = this.props;
		if (favourites.length > 0) {
			favourites = favourites.filter(dapp => !dapp.del);
			if (favourites.length > 0) {
				favourites = favourites.sort((dappA, dappB) => dappB.pos <= dappA.pos);
			}
		}
		const { isDarkMode } = this.context;
		return (
			<View>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps={'always'}>
					<View style={styles.favoriteBase}>
						<TouchableOpacity
							style={styles.favoriteItem}
							activeOpacity={1}
							onPress={() => {
								this.props.openUrl &&
									this.props.openUrl({
										url: AppConstants.HOMEPAGE_URL,
										name: AppConstants.HOMEPAGE_URL
									});
							}}
						>
							<Image style={styles.favoriteIcon} source={require('../../../images/ic_dapp_home.png')} />
							<Text
								numberOfLines={1}
								style={[styles.favoriteLable, isDarkMode && baseStyles.textDark]}
								ellipsizeMode={'middle'}
							>
								{strings('browser.home')}
							</Text>
						</TouchableOpacity>
						{favourites.length > 0 && <View style={styles.favoriteLine} />}
						{favourites.length > 0 &&
							favourites.map((item, index) => this.rennderFavoriteItem(item, index))}
					</View>
				</ScrollView>
			</View>
		);
	};

	render() {
		const { searchResults } = this.state;
		const { isDarkMode } = this.context;
		const search = searchResults?.filter(
			result =>
				result.type === AutoCompleteType_URL ||
				result.type === AutoCompleteType_SEARCH ||
				result.type === AutoCompleteType_SEARCH_RECENT
		);
		const dapp = searchResults?.filter(result => result.type === AutoCompleteType_DAPP);
		const recent = searchResults?.filter(result => result.type === AutoCompleteType_RECENT);
		return (
			<KeyboardAwareScrollView
				style={[styles.root, this.props.style, isDarkMode && baseStyles.darkBackground]}
				resetScrollToCoords={{ x: 0, y: 0 }}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View>
					{this.renderSearch(search)}
					{!this.shouldHideSth && this.renderSuggest(dapp)}
					{!this.shouldHideSth && this.renderFavorite()}
					{this.renderRecent(recent)}
				</View>
			</KeyboardAwareScrollView>
		);
	}
}

export default SuggestPage;
