import AsyncStorage from '@react-native-async-storage/async-storage';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
	ActivityIndicator,
	Animated,
	BackHandler,
	Dimensions,
	Easing,
	Image,
	NativeModules,
	ScrollView,
	StatusBar,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Swiper from 'react-native-swiper';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { AutoCompleteType_HOMEPAGE } from '../../../core/AutoCompleteController';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { shouldHideSthForAppStoreReviewer } from '../../../util/ApiClient';
import NFTImage from '../NFTImage';
import NetworkTabBar from './NetworkTabBar';

import { addFavouriteDapp, removeFavouriteDapp, updateFavouriteDapps } from '../../../actions/browser';
import { toggleShowHint } from '../../../actions/hint';
import notFavourites from '../../../images/ic_favourites_gray.png';
import favourites from '../../../images/ic_favourites_y.png';
import { chainToChainType, getIcTagByChainType, getIcLogoByChainType } from '../../../util/ChainTypeImages';
import Device from '../../../util/Device';
import DraggableGrid from '../DraggableGrid';
import { ThemeContext } from '../../../theme/ThemeProvider';

const screenWidth = Dimensions.get('window').width;
const dragParentWidth = screenWidth - (20 + 20);
const dragColumnCount = 4;
const dragItemWidth = dragParentWidth / dragColumnCount;
const dragItemHeight = 96;

const styles = {
	root: {
		width: '100%',
		height: '100%',
		backgroundColor: colors.white
	},
	loader: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	indicator: {
		alignSelf: 'center'
	},
	bannerContainer: {
		marginTop: 26,
		flex: 1
	},
	bannerBtn: {
		paddingHorizontal: 20
	},
	bannerImage: {
		width: '100%'
	},
	tabView: {},
	content: {},
	contentName: {
		fontSize: 16,
		lineHeight: 22,
		color: colors.$030319,
		...fontStyles.semibold,
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 20
	},
	items: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
		marginTop: 24,
		marginHorizontal: 12
	},
	singleItem: {
		flexDirection: 'row',
		marginBottom: 20,
		marginLeft: 20
	},
	singleContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	singleItemContent: {
		flex: 1,
		marginLeft: 12
	},
	singleItemName: {
		fontSize: 16,
		lineHeight: 19,
		color: colors.$030319
	},
	singleItemDesc: {
		fontSize: 13,
		lineHeight: 15,
		marginTop: 4,
		color: colors.$8F92A1
	},
	singleItemFavourite: {
		marginRight: 10,
		paddingHorizontal: 10,
		alignItems: 'center',
		justifyContent: 'center'
	},
	item: {
		width: dragItemWidth,
		height: dragItemHeight,
		alignItems: 'center',
		justifyContent: 'center'
	},
	itemIcon: {
		width: 48,
		height: 48,
		borderRadius: 10
	},
	itemTag: {
		height: 20,
		width: 20,
		minWidth: 20,
		position: 'absolute',
		top: 40,
		left: dragItemWidth / 2 + 13
	},
	itemName: {
		marginTop: 10,
		fontSize: 12,
		lineHeight: 14,
		color: colors.$030319
	},
	dot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.white06,
		marginHorizontal: 2
	},
	activeDot: {
		width: 8,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.white,
		marginHorizontal: 2
	},
	paginationStyle: {
		bottom: 10,
		right: 34,
		left: null
	},
	fillBg: {
		height: 300
	}
};

let loadBannerHeight;

const HOMEPAGE_TAB_INDEX = 'HOMEPAGE_TAB_INDEX';

class HomePage extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		dappPageAll: PropTypes.object,
		favouriteDapps: PropTypes.array,
		openUrl: PropTypes.func,
		style: PropTypes.object,
		toggleShowHint: PropTypes.func,
		addFavouriteDapp: PropTypes.func,
		removeFavouriteDapp: PropTypes.func,
		updateFavouriteDapps: PropTypes.func
	};

	state = {
		shouldHideSth: false,
		dappPage: undefined,
		bannerHeight: (screenWidth - 40) * 0.4,
		initialPage: 0,
		itemDragging: false,
		onDrag: false,
		rotateAnim: new Animated.Value(0)
	};

	animationSlider = Animated.sequence([
		Animated.timing(this.state.rotateAnim, {
			toValue: -3,
			duration: 150,
			easing: Easing.linear,
			useNativeDriver: false
		}),
		Animated.timing(this.state.rotateAnim, {
			toValue: 3,
			duration: 150,
			easing: Easing.linear,
			useNativeDriver: false
		}),
		Animated.timing(this.state.rotateAnim, {
			toValue: 0,
			duration: 150,
			easing: Easing.linear,
			useNativeDriver: false
		})
	]);

	isAnimimg = false;
	scrollY = 0;
	scrollViewHeight = 0;
	scrollViewRef = React.createRef();
	draggableGridRef = React.createRef();
	scrollTime = 0;
	statusBarHeight = 0;

	startAnimation = () => {
		if (!this.isAnimimg) {
			this.isAnimimg = true;
			this.state.rotateAnim.setValue(0);
			Animated.loop(this.animationSlider).start();
		}
	};

	stopAnimation = () => {
		if (this.isAnimimg) {
			this.isAnimimg = false;
			this.state.rotateAnim.setValue(0);
			Animated.loop(this.animationSlider).stop();
		}
	};

	async componentDidMount() {
		Device.isAndroid() && BackHandler.addEventListener('hardwareBackPress', this.onBackAndroid);
		this._navListener = this.props.navigation.addListener('didBlur', () => {
			this.setItemDragging(false);
		});
		const { dappPageAll } = this.props;
		const dappPage = strings('other.accept_language') === 'es' ? dappPageAll.es : dappPageAll.en;
		const shouldHideSth = shouldHideSthForAppStoreReviewer();

		let initialPage = 0;
		const tabIndex = await AsyncStorage.getItem(HOMEPAGE_TAB_INDEX);
		if (tabIndex) {
			initialPage = Number(tabIndex);
			if (dappPage?.networks) {
				if (tabIndex > dappPage.networks.length) {
					initialPage = 0;
				}
			}
		}

		this.setState({ shouldHideSth, dappPage, initialPage });
		this.loadBannerSize(dappPage);
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				if (statusBarHeight) {
					this.statusBarHeight = statusBarHeight.height;
				}
			});
		} else {
			this.statusBarHeight = StatusBar.currentHeight || 0;
		}
		if (Device.isAndroid()) {
			const tabIndex = await AsyncStorage.getItem(HOMEPAGE_TAB_INDEX);

			if (tabIndex && this.scrollableTabView) {
				this.scrollableTabView.goToPage(tabIndex);
			}
		}
	}

	componentWillUnmount() {
		this._navListener.remove();
		Device.isAndroid() && BackHandler.removeEventListener('hardwareBackPress', this.onBackAndroid);
	}

	onBackAndroid = () => {
		if (this.state.itemDragging) {
			this.setItemDragging(false);
			return true;
		}
		return false;
	};

	addFavourites(item) {
		if (!item) {
			return;
		}
		this.props.addFavouriteDapp(item);
		this.props.toggleShowHint(strings('other.added_to_favourites'));
	}

	removeFavourites(item) {
		if (!item) {
			return;
		}
		this.props.removeFavouriteDapp(item);
		this.props.toggleShowHint(strings('other.removed_from_favourites'));
	}

	updateFavouritesSort(favouritesSort) {
		if (!favouritesSort?.length) {
			return;
		}
		const favourites = this.props.favouriteDapps.map(item => ({ ...item }));
		favouritesSort.forEach(sort => {
			const dapp = favourites.find(dapp => dapp.url === sort.url && dapp.chain === sort.chain);
			if (dapp) {
				dapp.pos = sort.pos;
			}
		});
		this.props.updateFavouriteDapps(favourites);
	}

	loadBannerSize(dappPage) {
		if (!loadBannerHeight) {
			if (dappPage?.showBanner && dappPage?.banners?.length > 0) {
				Image.getSize(dappPage.banners[0].image, (width, height) => {
					loadBannerHeight = Math.floor(((screenWidth - 40) * height) / width);
					// this.setState({ bannerHeight: loadBannerHeight });
				});
			}
		}
	}

	renderTabBar = () => {
		const { isDarkMode } = this.context;
		return <NetworkTabBar backgroundColor={isDarkMode ? colors.brandBlue700 : colors.white} />;
	};

	renderBanner(dappPage) {
		if (!dappPage.banners?.length) {
			return;
		}
		const { bannerHeight } = this.state;
		return (
			<View style={[styles.bannerContainer, { height: loadBannerHeight || bannerHeight }]}>
				<Swiper
					autoplay
					autoplayTimeout={3.5}
					showsButtons={false}
					showsPagination
					removeClippedSubviews={false}
					dotStyle={styles.dot}
					activeDotStyle={styles.activeDot}
					paginationStyle={styles.paginationStyle}
				>
					{dappPage.banners.map((banner, index) => (
						<TouchableOpacity
							style={styles.bannerBtn}
							activeOpacity={1}
							onPress={() => {
								this.props.openUrl && this.props.openUrl(banner);
							}}
							key={`banner_${index}`}
						>
							<NFTImage
								style={[styles.bannerImage, { height: loadBannerHeight || bannerHeight }]}
								imageUrl={banner.image}
								resizeMode={'stretch'}
							/>
						</TouchableOpacity>
					))}
				</Swiper>
			</View>
		);
	}

	renderTabs(dappPage) {
		const tabs = [];
		if (!this.state.shouldHideSth) {
			tabs.push(
				<View style={styles.content} tabLabel={`${strings('other.favorites')}:${-1}`} key={'network_-1'}>
					{this.renderFavourites()}
				</View>
			);

			const otherTabs = dappPage?.networks?.map((tab, index) => (
				<View style={styles.content} tabLabel={tab.name + ':' + tab.chain} key={`network_${index}`}>
					{this.renderContent(tab.content, tab.chain)}
				</View>
			));
			if (otherTabs?.length > 0) {
				tabs.push(...otherTabs);
			}
		}
		return tabs;
	}

	renderContent(content, chain) {
		const { isDarkMode } = this.context;
		return content?.map((items, index) => (
			<View key={`network_${index}`}>
				<Text style={[styles.contentName, isDarkMode && baseStyles.textDark]}>{items.name}</Text>
				{this.renderSingleItems(items.items, chain)}
			</View>
		));
	}

	renderSingleItems(items, chain) {
		const { isDarkMode } = this.context;
		return items?.map((item, index) => {
			const imageUri =
				item?.logo ||
				'https://pali-images.s3.amazonaws.com/files/' + item?.name.replace(/\s/g, '') + 'logo' + '.png';
			const isFavourite = this.props.favouriteDapps.find(
				dapp => !dapp.del && dapp.url === item.url && dapp.chain === chain
			);
			return (
				<View style={styles.singleItem} key={`item_${index}`}>
					<TouchableOpacity
						activeOpacity={1}
						style={styles.singleContent}
						onPress={() => {
							item &&
								this.props.openUrl &&
								this.props.openUrl({
									...item,
									title: item.name,
									chain,
									img: imageUri,
									type: AutoCompleteType_HOMEPAGE
								});
						}}
					>
						<NFTImage style={styles.itemIcon} imageUrl={imageUri} />
						<View style={styles.singleItemContent}>
							<Text
								style={[styles.singleItemName, isDarkMode && baseStyles.textDark]}
								numberOfLines={1}
								ellipsizeMode={'tail'}
							>
								{item.name}
							</Text>
							<Text
								style={[styles.singleItemDesc, isDarkMode && baseStyles.subTextDark]}
								numberOfLines={1}
								ellipsizeMode={'tail'}
							>
								{item.desc}
							</Text>
						</View>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.singleItemFavourite}
						activeOpacity={1}
						onPress={() => {
							isFavourite
								? this.removeFavourites({ ...item, chain })
								: this.addFavourites({ ...item, chain });
						}}
					>
						<Image source={isFavourite ? favourites : notFavourites} />
					</TouchableOpacity>
				</View>
			);
		});
	}

	renderFavourites() {
		let allFavourites = this.props.favouriteDapps.filter(dapp => !dapp.del);
		allFavourites = allFavourites.sort((dappA, dappB) => dappB.pos <= dappA.pos);
		allFavourites = allFavourites.map(dapp => ({ ...dapp, key: `${dapp.url}${dapp.chain || 0}` }));
		return this.renderDragGridView(allFavourites);
	}

	renderDragGridView(allFavourites) {
		return (
			<>
				<DraggableGrid
					numColumns={4}
					data={allFavourites}
					renderItem={this.renderDragItem.bind(this)}
					itemHeight={dragItemHeight}
					onDragStart={() => {
						this.onDragStateChange(true);
						this.setItemDragging(true);
					}}
					onDragRelease={items => {
						const favouritesSort = [];
						items.forEach((item, index) => {
							favouritesSort.push({ ...item, pos: index });
						});
						this.updateFavouritesSort(favouritesSort);
						this.onDragStateChange(false);
					}}
					onItemPress={indexItem => {
						this.openUrl(indexItem);
					}}
					dragStartAnimation={{
						transform: [
							{
								rotate: this.state.rotateAnim.interpolate({
									inputRange: [0, 360],
									outputRange: ['0deg', '360deg']
								})
							}
						]
					}}
					onDeletePress={item => {
						this.removeFavourites(item);
					}}
					inDragging={this.state.itemDragging}
					onMovePos={this.onMovePos.bind(this)}
					ref={this.draggableGridRef}
				/>
				<TouchableOpacity
					style={styles.fillBg}
					onPress={() => {
						this.setItemDragging(false);
					}}
				/>
			</>
		);
	}

	setItemDragging(drag) {
		if (drag) {
			this.startAnimation();
		} else {
			this.stopAnimation();
		}
		this.setState({ itemDragging: drag });
	}

	onDragStateChange(state) {
		this.setState({ onDrag: state });
	}

	openUrl(item) {
		if (!item) {
			return;
		}

		const imageUri =
			item?.logo ||
			'https://pali-images.s3.amazonaws.com/files/' + item?.name.replace(/\s/g, '') + 'logo' + '.png';
		this.props.openUrl &&
			this.props.openUrl({
				...item,
				title: item.name,
				img: imageUri,
				type: AutoCompleteType_HOMEPAGE
			});
	}

	renderDragItem(item) {
		const { isDarkMode } = this.context;
		const imageUri =
			item?.logo ||
			'https://pali-images.s3.amazonaws.com/files/' + item?.name.replace(/\s/g, '') + 'logo' + '.png';

		const tagIcon = isDarkMode
			? getIcLogoByChainType(chainToChainType(item?.chain))
			: getIcTagByChainType(chainToChainType(item?.chain));
		const key = JSON.stringify({ url: item.url, chain: item.chain });

		return (
			<View style={styles.item} key={key}>
				<NFTImage style={styles.itemIcon} imageUrl={imageUri} />
				{tagIcon && <Image style={styles.itemTag} source={tagIcon} />}
				<Text
					style={[styles.itemName, isDarkMode && baseStyles.textDark]}
					numberOfLines={1}
					ellipsizeMode={'tail'}
				>
					{item.name}
				</Text>
			</View>
		);
	}

	async onChangeTab(tab) {
		this.setItemDragging(false);
		await AsyncStorage.setItem('HOMEPAGE_TAB_INDEX', `${tab.i}`);
	}

	onScroll(event) {
		this.scrollY = event.nativeEvent.contentOffset.y;
	}

	onScrollLayout(event) {
		this.scrollViewHeight = event.nativeEvent.layout.height;
	}

	onMovePos(event) {
		if (Date.now() - this.scrollTime < 500) {
			return;
		}
		const y = event.y;
		const minHeight = this.statusBarHeight + (dragItemHeight / 10) * 5;
		const maxHeight = this.statusBarHeight + this.scrollViewHeight - (dragItemHeight / 10) * 2;
		if (y <= minHeight) {
			let top = this.statusBarHeight;
			if (!this.state.shouldHideSth && this.state.dappPage?.banners?.length) {
				top += loadBannerHeight || this.state.bannerHeight;
			}
			if (this.scrollY >= top) {
				let sy = this.scrollY - dragItemHeight;
				if (sy < 0) {
					sy = 0;
				}
				this.scrollViewRef.current?.scrollTo({ y: sy, animated: true });
				this.scrollTime = Date.now();
				this.draggableGridRef.current?.setMoveOffset(dragItemHeight, event.x, event.y);
			}
		} else if (y >= maxHeight) {
			if (this.draggableGridRef.current?.state.gridHeight) {
				let maxScrollArea =
					this.draggableGridRef.current?.state.gridHeight.__getValue() + 70 + this.statusBarHeight;
				if (!this.state.shouldHideSth && this.state.dappPage?.banners?.length) {
					maxScrollArea += loadBannerHeight || this.state.bannerHeight;
				}
				maxScrollArea -= this.scrollViewHeight;
				if (this.scrollY > maxScrollArea) {
					return;
				}
			}
			const sy = this.scrollY + dragItemHeight;
			this.scrollViewRef.current?.scrollTo({ y: sy, animated: true });
			this.scrollTime = Date.now();
			this.draggableGridRef.current?.setMoveOffset(-dragItemHeight, event.x, event.y);
		}
	}

	render() {
		const { dappPage, shouldHideSth, initialPage, onDrag } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.root, isDarkMode && baseStyles.darkBackground, this.props.style]}>
				{dappPage ? (
					<ScrollView
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						scrollEnabled={!onDrag}
						onScroll={this.onScroll.bind(this)}
						scrollEventThrottle={200}
						onLayout={this.onScrollLayout.bind(this)}
						ref={this.scrollViewRef}
					>
						{!shouldHideSth && dappPage.showBanner && this.renderBanner(dappPage)}
						{dappPage.showContent && (
							<ScrollableTabView
								ref={ref => {
									this.scrollableTabView = ref;
								}}
								style={styles.tabView}
								renderTabBar={this.renderTabBar}
								locked
								onChangeTab={this.onChangeTab.bind(this)}
								initialPage={initialPage}
							>
								{this.renderTabs(dappPage)}
							</ScrollableTabView>
						)}
					</ScrollView>
				) : (
					<View style={styles.loader}>
						<ActivityIndicator size="large" color={isDarkMode ? colors.paliBlue400 : colors.brandPink300} />
					</View>
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	dappPageAll: state.browser.dappPage,
	favouriteDapps: state.browser.favouriteDapps
});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText)),
	addFavouriteDapp: dapp => dispatch(addFavouriteDapp(dapp)),
	removeFavouriteDapp: dapp => dispatch(removeFavouriteDapp(dapp)),
	updateFavouriteDapps: dapp => dispatch(updateFavouriteDapps(dapp))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(HomePage);
