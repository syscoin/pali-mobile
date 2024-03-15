import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	StyleSheet,
	View,
	FlatList,
	Text,
	Image,
	TouchableOpacity,
	DeviceEventEmitter,
	ActivityIndicator
} from 'react-native';
import { baseStyles, colors } from '../../../styles/common';
import Device from '../../../util/Device';
import { updateGridArray, updateImagesCache } from '../../../actions/nft';
import LottieView from 'lottie-react-native';
import { strings } from '../../../../locales/i18n';
import { ChainType, util } from 'paliwallet-core';
import { isSvgFile, isVideoFile, toLowerCaseEquals } from '../../../util/general';
import NFTImage from '../NFTImage';
import { getChainIdByType, getChainTypeByChainId } from '../../../util/number';
import Engine from '../../../core/Engine';
import ImageCapInset from '../ImageCapInset';
import { getRpcChainTypeByChainId, isRpcChainId } from '../../../util/ControllerUtils';
import { getIcLogoByChainType, getIcTagByChainType } from '../../../util/ChainTypeImages';
import { ThemeContext } from '../../../theme/ThemeProvider';

const favoriteAddr = '0xfavorite';

const styles = StyleSheet.create({
	childrenWrapper: {
		marginHorizontal: 38,
		marginVertical: 42
	},
	cardWrapper: {
		flex: 1,
		marginHorizontal: -2,
		marginTop: -17,
		marginBottom: -10
	},
	animation: {
		width: 60,
		height: 60
	},
	animLayout: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 80
	},
	tagView: {
		position: 'absolute',
		left: 30,
		top: 20,
		width: 20,
		height: 20
	},
	itemLayout: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	contractIcon: {
		width: 40,
		height: 40,
		borderRadius: 20
	},
	contractFavoriteIcon: {
		width: 24,
		height: 24,
		borderRadius: 12
	},
	contractName: {
		marginLeft: 16,
		color: colors.$030319,
		fontSize: 16,
		flex: 1
	},
	contractNameMargin: {
		marginLeft: 6
	},
	touchGrid: {
		height: 24,
		justifyContent: 'center',
		flexDirection: 'row',
		alignItems: 'center'
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
	lottieLayout: {
		position: 'absolute',
		left: 0,
		top: 0,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.$EFEFEF,
		borderRadius: 10
	},
	numberItemToken: {
		fontSize: 14,
		color: colors.$8F92A1,
		marginRight: 10
	},
	noNftText: {
		color: colors.$404040,
		fontSize: 16,
		marginTop: 10
	},
	noNftLayout: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: 50
	},
	safeTagL: {
		position: 'absolute',
		width: 30,
		height: 30,
		top: -10,
		right: -10
	},
	safeTagM: {
		position: 'absolute',
		width: 24,
		height: 24,
		top: -8,
		right: -8
	},
	safeTagS: {
		position: 'absolute',
		width: 21,
		height: 21,
		top: -7,
		right: -7
	},
	loadMorePadding: {
		paddingTop: 5
	}
});

const screenWidth = Device.getDeviceWidth();
const LOAD_COUNT = 15;

class Nft extends PureComponent {
	lottieAnim = true;
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		selectedAddress: PropTypes.string,
		currentAddress: PropTypes.string,
		allCollectibles: PropTypes.object,
		allCollectibleContracts: PropTypes.object,
		favoriteCollectibles: PropTypes.array,
		currentChainType: PropTypes.number,
		gridArray: PropTypes.object,
		updateGridArray: PropTypes.func,
		updateImagesCache: PropTypes.func,
		imagesCache: PropTypes.array
	};

	state = {
		isEtherscanAvailableWaited: false,
		allContracts: [],
		allCollectiblesList: [],
		dataCollectibles: [],
		dataContracts: [],
		loadEnd: false,
		isLoading: false
	};

	isEndReached = false;
	isScrollTop = true;

	componentDidMount = async () => {
		await util.isEtherscanAvailableAsync();
		this.setState({ isEtherscanAvailableWaited: true });

		DeviceEventEmitter.addListener('onParentScroll', this.onParentScroll);
		this.loadData();
	};

	componentWillUnmount = () => {
		DeviceEventEmitter.removeAllListeners('onParentScroll');
	};

	componentDidUpdate(preProps, preState) {
		if (this.props.currentAddress) {
			if (!this.state.isLoading) {
				// eslint-disable-next-line react/no-did-update-set-state
				this.setState({ isLoading: true });
			}
		} else if (
			preProps.favoriteCollectibles.length !== this.props.favoriteCollectibles.length ||
			preProps.selectedAddress !== this.props.selectedAddress ||
			preProps.currentChainType !== this.props.currentChainType
		) {
			this.loadData(0);
		} else if (
			this.isScrollTop &&
			(preProps.allCollectibles !== this.props.allCollectibles ||
				preProps.allCollectibleContracts !== this.props.allCollectibleContracts)
		) {
			const startIndex =
				this.state.dataCollectibles.length >= LOAD_COUNT ? this.state.dataCollectibles.length - LOAD_COUNT : 0;
			this.loadData(startIndex, true);
		}
	}

	onParentScroll = type => {
		//Pull down refresh
		if (type === 100) {
			this.loadData(0);
			return;
		}

		if (type === 2) {
			this.isScrollTop = true;
			return;
		}
		this.isScrollTop = false;
		if (type === 3) {
			return;
		}
		if (this.isEndReached || this.state.loadEnd) {
			return;
		}
		this.isEndReached = true;
		setTimeout(() => {
			this.isEndReached = false;
			this.loadData(this.state.dataCollectibles.length);
		}, 100);
	};

	loadData = async (startIndex = 0, focusUpdate = false) => {
		if (this.isEndReached) {
			return;
		}
		if (this.state.loadEnd && startIndex !== 0 && !focusUpdate) {
			return;
		}
		this.isEndReached = true;

		const { selectedAddress, currentChainType, allCollectibleContracts, favoriteCollectibles } = this.props;
		const { PreferencesController } = Engine.context;
		const rpcChainIds = await Engine.networks[ChainType.RPCBase].getEnabledChain();

		const allContracts = this.state.allContracts;
		let allCollectiblesList = this.state.allCollectiblesList;

		if (startIndex === 0 || focusUpdate) {
			allContracts.length = 0;
			allCollectiblesList.length = 0;
			if (currentChainType === ChainType.All) {
				if (favoriteCollectibles && favoriteCollectibles.length > 0) {
					const favorites = [];
					for (const type in Engine.networks) {
						const chainType = Number(type);
						if (chainType === ChainType.RPCBase) {
							if (rpcChainIds?.length > 0) {
								rpcChainIds.forEach(chain => {
									const rpcFavorites = favoriteCollectibles.filter(
										token => token.chainId === chain.chainId
									);
									rpcFavorites && rpcFavorites.length > 0 && favorites.push(...rpcFavorites);
								});
							}
						} else {
							if (!(await PreferencesController.isDisabledChain(selectedAddress, chainType))) {
								const chainId = getChainIdByType(chainType);
								if (allCollectibleContracts[chainId] && allCollectibleContracts[chainId].length > 0) {
									const chainFavorites = favoriteCollectibles.filter(
										token => token.chainId === chainId
									);
									chainFavorites && chainFavorites.length > 0 && favorites.push(...chainFavorites);
								}
							}
						}
					}
					if (favorites.length > 0) {
						allContracts.push({ favoriteAddr, favorites });
					}
				}

				for (const type in Engine.networks) {
					const chainType = Number(type);
					if (chainType === ChainType.RPCBase) {
						if (rpcChainIds?.length > 0) {
							rpcChainIds.forEach(chain => {
								if (allCollectibleContracts[chain.chainId]) {
									allContracts.push(...allCollectibleContracts[chain.chainId]);
								}
							});
						}
					} else {
						const chainId = getChainIdByType(chainType);
						if (
							!(await PreferencesController.isDisabledChain(selectedAddress, chainType)) &&
							allCollectibleContracts[chainId]
						) {
							allContracts.push(...allCollectibleContracts[chainId]);
						}
					}
				}
			} else {
				const currentChainId = getChainIdByType(currentChainType);
				if (allCollectibleContracts[currentChainId] && allCollectibleContracts[currentChainId].length > 0) {
					if (favoriteCollectibles && favoriteCollectibles.length > 0) {
						const favorites = favoriteCollectibles.filter(token => token.chainId === currentChainId);
						if (favorites && favorites.length > 0) {
							allContracts.push({ favoriteAddr, favorites });
						}
					}
					allContracts.push(...allCollectibleContracts[currentChainId]);
				}
			}
			if (allContracts.length > 0) {
				const { selectedAddress, allCollectibles, currentChainType, allCollectibleContracts } = this.props;
				const { PreferencesController, SecurityController } = Engine.context;

				const collectibles = [];
				if (currentChainType === ChainType.All) {
					for (const type in Engine.networks) {
						const chainType = Number(type);
						if (chainType === ChainType.RPCBase) {
							rpcChainIds?.forEach(chain => {
								if (allCollectibles[chain.chainId]) {
									collectibles.push(...allCollectibles[chain.chainId]);
								}
							});
						} else {
							const chainId = getChainIdByType(chainType);
							if (
								!(await PreferencesController.isDisabledChain(selectedAddress, chainType)) &&
								allCollectibles[chainId]
							) {
								collectibles.push(...allCollectibles[chainId]);
							}
						}
					}
				} else {
					const currentChainId = getChainIdByType(currentChainType);
					if (allCollectibles[currentChainId]) {
						collectibles.push(...allCollectibles[currentChainId]);
					}
				}

				for (const item of allContracts) {
					const isFavorite = item.favoriteAddr === favoriteAddr;
					let items = [];
					if (!isFavorite) {
						items = collectibles.filter(
							asset => asset.address?.toLowerCase() === item.address?.toLowerCase()
						);
					}
					const securityNfts = SecurityController?.state?.securityNfts || [];

					items = items.map((token, i) => {
						let address = token.address || token.contract;
						let type;
						if (isRpcChainId(token.chainId)) {
							type = getRpcChainTypeByChainId(token.chainId);
						} else {
							type = getChainTypeByChainId(token.chainId);
						}
						const contract = allCollectibleContracts?.[token.chainId]?.find(
							contract => contract.address === address
						);
						const securityData = securityNfts.find(v => toLowerCaseEquals(v.address, address));
						return { ...token, type, asset_contract: contract, securityData };
					});

					if (items.length > 0) {
						allCollectiblesList = [...allCollectiblesList, ...items];
					}
				}
			}
		}
		const listLength = allCollectiblesList.length;
		const dataCollectibles = [...allCollectiblesList];
		const allCollectibles = [...allCollectiblesList];
		const dataContracts = [...allContracts];
		let loadEnd = true;
		const nextCount = startIndex + LOAD_COUNT;
		if (listLength > 0) {
			if (nextCount < listLength) {
				dataCollectibles.length = nextCount;
				loadEnd = false;
			}
		}
		if (dataCollectibles.length > 0) {
			const collectibles = dataCollectibles[dataCollectibles.length - 1];
			const index = dataContracts.findIndex(
				contracts => contracts.address?.toLowerCase() === collectibles.address?.toLowerCase()
			);
			if (index < 0) {
				dataContracts.length = 1;
			} else {
				dataContracts.length = index + 1;
			}
		}
		if (startIndex === 0 || focusUpdate) {
			this.setState(
				{
					allContracts,
					allCollectiblesList,
					allCollectibles,
					dataCollectibles,
					dataContracts,
					loadEnd,
					isLoading: false
				},
				() => {
					this.isEndReached = false;
				}
			);
		} else {
			this.setState({ dataCollectibles, dataContracts, loadEnd, isLoading: false }, () => {
				this.isEndReached = false;
			});
		}
	};

	renderItem = (item, baseIndex) => {
		const { selectedAddress, gridArray, updateGridArray } = this.props;

		const collectibles = this.state.dataCollectibles;
		const allCollectibles = this.state.allCollectibles;

		const isFavorite = item.favoriteAddr === favoriteAddr;

		let items = [];

		if (isFavorite) {
			item.favorites.forEach(favorite => {
				const tempItem = allCollectibles.filter(
					asset =>
						asset.chainId === favorite.chainId &&
						asset.token_id === favorite.token_id &&
						asset.address === favorite.address
				);
				if (tempItem && tempItem.length > 0) {
					items.push(tempItem[0]);
				}
			});
		} else {
			items = collectibles.filter(asset => asset.address?.toLowerCase() === item.address?.toLowerCase());
		}

		if (!items || items.length === 0) {
			return;
		}

		let columnCount = isFavorite ? 1 : 2;
		if (gridArray && gridArray[selectedAddress] && gridArray[selectedAddress][item.address]) {
			columnCount = gridArray[selectedAddress][item.address];
		}
		const itemSize = this.getItemSize(columnCount);
		const itemSpace = this.getItemSpace(columnCount);
		const rowCount = Math.ceil(items.length / columnCount);
		const height =
			rowCount * itemSize + itemSpace * (rowCount - 1) + this.getItemTextHeight(columnCount) * rowCount;

		this.lottieAnim = items.length < 10;
		const { isDarkMode } = this.context;

		return (
			<ImageCapInset
				style={styles.cardWrapper}
				source={
					Device.isAndroid()
						? isDarkMode
							? { uri: 'dark500_card' }
							: { uri: 'default_card' }
						: isDarkMode
						? require('../../../images/dark500_card.png')
						: require('../../../images/default_card.png')
				}
				capInsets={baseStyles.capInsets}
			>
				<View style={styles.childrenWrapper}>
					<View style={styles.itemLayout}>
						{isFavorite ? (
							<Image
								source={require('../../../images/ic_favorites_y.png')}
								style={styles.contractFavoriteIcon}
							/>
						) : (
							<NFTImage
								style={styles.contractIcon}
								imageUrl={item.image_url}
								defaultImg={require('../../../images/img_default.png')}
							/>
						)}

						{!isFavorite && (
							<Image
								style={styles.tagView}
								source={
									isDarkMode
										? getIcLogoByChainType(getChainTypeByChainId(item.chainId))
										: getIcTagByChainType(getChainTypeByChainId(item.chainId))
								}
							/>
						)}

						<Text
							style={[
								styles.contractName,
								isFavorite && styles.contractNameMargin,
								isDarkMode && baseStyles.textDark
							]}
							numberOfLines={1}
							allowFontScaling={false}
						>
							{isFavorite ? strings('nft.favorites') : item.name}
						</Text>
						<TouchableOpacity
							style={styles.touchGrid}
							onPress={() => {
								updateGridArray(this.props.selectedAddress, item.address, (columnCount % 3) + 1);
							}}
						>
							<Text style={[styles.numberItemToken, isDarkMode && baseStyles.textDark]}>
								{items.length}
							</Text>

							<Image
								source={
									columnCount === 1
										? require('../../../images/ic_list_one.png')
										: columnCount === 2
										? require('../../../images/ic_list_two.png')
										: require('../../../images/ic_list_three.png')
								}
							/>
						</TouchableOpacity>
					</View>
					{/* eslint-disable-next-line react-native/no-inline-styles */}
					<View style={{ height, marginTop: 17 }}>
						<FlatList
							key={'key-nft' + columnCount + '-detail-' + baseIndex}
							renderItem={({ item, index }) => this.renderItemDetail(item, index, columnCount)}
							data={items}
							keyExtractor={(item, index) => 'nft' + baseIndex + '-detail-' + index}
							numColumns={columnCount}
							horizontal={false}
							removeClippedSubviews
						/>
					</View>
				</View>
			</ImageCapInset>
		);
	};

	onItemPress = data => {
		this.props.navigation.navigate('NftView', { nftToken: data });
	};

	containUrl = imageUrl => this.props.imagesCache.indexOf(imageUrl) !== -1;

	setImagesCache = imageUrl => {
		if (!imageUrl || this.containUrl(imageUrl)) {
			return;
		}
		if (!isVideoFile(imageUrl) && !isSvgFile(imageUrl)) {
			this.props.updateImagesCache(imageUrl);
		}
	};

	renderItemDetail = (data, index, columnCount, baseIndex) => {
		const itemWidth = this.getItemSize(columnCount);
		const left = index % columnCount > 0 ? this.getItemSpace(columnCount) : 0;
		const top = Math.floor(index / columnCount) > 0 ? this.getItemSpace(columnCount) : 0;
		const tagStyle = columnCount === 3 ? styles.safeTagS : columnCount === 2 ? styles.safeTagM : styles.safeTagL;
		const image_url =
			data.image_thumbnail_url === 'error' || !data.image_thumbnail_url
				? data.image_url
				: data.image_thumbnail_url;

		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				activeOpacity={1.0}
				style={{
					marginLeft: left,
					marginTop: top,
					width: itemWidth,
					height: itemWidth + this.getItemTextHeight(columnCount)
				}}
				onPress={() => {
					this.onItemPress(data);
				}}
			>
				{!!image_url && !isSvgFile(image_url) && !isVideoFile(image_url) && !this.containUrl(image_url) && (
					<View
						style={[
							styles.lottieLayout,
							{
								width: itemWidth,
								height: itemWidth
							},
							isDarkMode && baseStyles.darkBackground
						]}
					>
						{this.lottieAnim ? (
							<LottieView
								style={{ width: itemWidth * 0.7, height: itemWidth * 0.7 }}
								autoPlay
								loop
								source={require('../../../animations/nft_loading_img.json')}
							/>
						) : (
							<Image
								resizeMode="contain"
								style={{ width: itemWidth * 0.39, height: itemWidth * 0.39 }}
								source={require('../../../images/defaul_loading_icon.png')}
							/>
						)}
					</View>
				)}

				<NFTImage
					style={[
						styles.borderRadius10,

						{
							width: itemWidth,
							height: itemWidth
						}
					]}
					imageUrl={image_url}
					showBorder
					onLoadEnd={() => {
						if (this.lottieAnim) {
							this.setImagesCache(data.image_url);
						}
					}}
					isThumbnail
				/>

				{columnCount === 2 && (
					<View
						style={[
							styles.justifyContentEnd,
							{
								width: itemWidth,
								height: this.getItemTextHeight(columnCount)
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
				)}
				{data.securityData && <Image style={tagStyle} source={require('../../../images/tag_safe.png')} />}
			</TouchableOpacity>
		);
	};

	getItemSize = columnCount => {
		if (columnCount === 1) {
			return screenWidth - 20 * 2 - 16 * 2;
		} else if (columnCount === 2) {
			return (screenWidth - 20 * 2 - 16 * 2 - this.getItemSpace(2)) / 2;
		}
		return (screenWidth - 20 * 2 - 16 * 2 - this.getItemSpace(3) * 2) / 3;
	};

	getItemSpace = columnCount => {
		if (columnCount === 1) {
			return 16;
		} else if (columnCount === 2) {
			return 15;
		}
		return 9;
	};

	getItemTextHeight = columnCount => {
		if (columnCount === 1) {
			return 0;
		} else if (columnCount === 2) {
			return 26;
		}
		return 0;
	};

	renderLoading = () => {
		const { isDarkMode } = this.context;
		return (
			<View>
				<View style={[styles.animLayout, isDarkMode && baseStyles.darkBackground]}>
					<LottieView
						style={styles.animation}
						autoPlay
						loop
						source={require('../../../animations/tokens_loading.json')}
					/>
				</View>
			</View>
		);
	};

	renderLoadMoreView() {
		return (
			<View style={styles.loadMorePadding}>
				{!this.state.loadEnd && <ActivityIndicator size={'small'} color={colors.brandPink300} />}
			</View>
		);
	}

	render = () => {
		if (!this.state.isEtherscanAvailableWaited || this.state.isLoading) {
			return this.renderLoading();
		}
		const { isDarkMode } = this.context;
		const { dataContracts } = this.state;

		if (dataContracts.length === 0) {
			return (
				<View style={styles.noNftLayout}>
					<View style={styles.noNftLayout}>
						<Image
							source={
								isDarkMode
									? require('../../../images/no_nft_img_dark.png')
									: require('../../../images/no_nft_img.png')
							}
						/>
						<Text style={[styles.noNftText, isDarkMode && baseStyles.textDark]}>
							{strings('nft.no_nft_found')}
						</Text>
					</View>
				</View>
			);
		}

		return (
			<View>
				<FlatList
					data={dataContracts}
					renderItem={({ item, index }) => this.renderItem(item, index)}
					keyExtractor={(item, index) => 'key-' + index}
					ListFooterComponent={() => this.renderLoadMoreView()}
					removeClippedSubviews
				/>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	allCollectibles:
		state.engine.backgroundState.CollectiblesController.allCollectibles[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	allCollectibleContracts:
		state.engine.backgroundState.CollectiblesController.allCollectibleContracts[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || {},
	favoriteCollectibles:
		state.engine.backgroundState.CollectiblesController.favoriteCollectibles[
			state.engine.backgroundState.PreferencesController.selectedAddress
		] || [],
	gridArray: state.nft.gridArray,
	imagesCache: state.nft.imagesCache
});

const mapDispatchToProps = dispatch => ({
	updateGridArray: (address, contractAddress, columnCount) =>
		dispatch(updateGridArray(address, contractAddress, columnCount)),
	updateImagesCache: imageUrl => dispatch(updateImagesCache(imageUrl))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Nft);
