import React, { PureComponent } from 'react';
import {
	ActivityIndicator,
	BackHandler,
	Dimensions,
	FlatList,
	Image,
	ImageBackground,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import { ChainType, defaultEnabledChains } from 'paliwallet-core';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import DragGridView from '../../Views/DragGridView';
import Engine from '../../../core/Engine';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/Device';
import ImageCapInset from '../../UI/ImageCapInset';
import { getRpcName, getIsRpc, getAssetIcon } from '../../../util/rpcUtil';
import PromptView from '../PromptView';
import { toggleShowHint } from '../../../actions/hint';
import { ChainTypeSettingsItems } from '../../../util/ChainTypeImages';
import { ThemeContext } from '../../../theme/ThemeProvider';

const { width: viewportWidth } = Dimensions.get('window');
const dragParentWidth = viewportWidth - (20 + 20) * 2;
const dragColumnCount = Math.floor(dragParentWidth / 80);
const dragItemWidth = 80 + ((dragParentWidth - dragColumnCount * 80) % dragColumnCount) / dragColumnCount;
const dragItemHeight = 84;

const PAGE_HOME = 1;
const PAGE_INPUT_RPC = 2;
const PAGE_RPC_LIST = 3;

const styles = StyleSheet.create({
	childrenWrapper: {
		flex: 1,
		marginHorizontal: 40,
		marginVertical: 40
	},
	backIcon: {
		color: colors.black
	},
	alignRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
	icon: {
		width: 18,
		height: 18
	},
	doneButton: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10
	},
	itemView: {
		alignItems: 'center',
		width: dragItemWidth,
		height: dragItemHeight,
		justifyContent: 'center'
	},
	itemText: {
		fontSize: 12,
		color: colors.$030319,
		marginTop: 6
	},
	paddingBottom20: {
		paddingBottom: 20
	},
	titleLayout: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	titleText: {
		color: colors.$030319,
		fontSize: 20,
		...fontStyles.semibold,
		marginRight: 10
	},
	flexOne: {
		flex: 1
	},
	accountName: {
		color: colors.paliGrey200,
		fontSize: 12,
		marginLeft: 6
	},
	descText: {
		color: colors.$8F92A1,
		fontSize: 12,
		marginTop: 5
	},
	lineView: {
		backgroundColor: colors.$F0F0F0,
		height: 1,
		width: '100%',
		marginVertical: 20
	},
	enableLayout: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 13
	},
	enableText: {
		color: colors.$030319,
		fontSize: 16,
		...fontStyles.semibold,
		marginLeft: 6
	},
	minHeight: {
		minHeight: 70
	},
	noDisableLayout: {
		height: 70,
		justifyContent: 'center',
		alignItems: 'center'
	},
	noDisableText: {
		fontSize: 12,
		color: colors.$8F92A1
	},
	doneText: {
		color: colors.white,
		fontSize: 16
	},
	cardWrapper: {
		flex: 1,
		marginHorizontal: 0,
		marginTop: -20,
		marginBottom: -10
	},
	customNetwork: {
		fontSize: 13,
		color: colors.brandPink300
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	underline: {
		borderBottomWidth: 1,
		borderBottomColor: colors.$F0F0F0
	},
	textInput: {
		fontSize: 14,
		color: colors.$030319,
		backgroundColor: colors.white,
		borderRadius: 100,
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderWidth: 1,
		borderColor: colors.paliGrey200
	},
	rpcRow: {
		flexDirection: 'row',
		marginBottom: 8,
		alignItems: 'center'
	},
	rpcName: {
		width: 72,
		color: colors.$030319,
		fontSize: 14
	},
	addButton: {
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.$E6E6E6, //brandPink300,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10
	},
	addText: {
		color: colors.$A6A6A6,
		fontSize: 16,
		...fontStyles.bold
	},
	rpcList: {
		fontSize: 13,
		color: colors.brandPink300
	},
	rpcItem: {
		alignItems: 'center',
		width: '100%'
	},
	marginRight6: {
		marginRight: 6
	},
	marginLeft6: {
		marginLeft: 6
	},
	rpcItemContent: {
		alignItems: 'center',
		flexDirection: 'row',
		paddingBottom: 8,
		flex: 1,
		justifyContent: 'space-between'
	},
	rpcItemTitle: {
		color: colors.black,
		fontSize: 14,
		...fontStyles.semibold
	},
	rpcItemRow: {
		flexDirection: 'row'
	},
	rpcItemCurrency: {
		color: colors.$030319,
		fontSize: 12
	},
	rpcItemChainId: {
		color: colors.$030319,
		fontSize: 12,
		...fontStyles.semibold,
		marginTop: 6
	},
	rpcItemData: {
		marginLeft: 4
	},
	rpcItemDataCurrency: {
		color: colors.brandPink300,
		fontSize: 14
	},
	rpcItemDataChainId: {
		color: colors.$60657D,
		fontSize: 12,
		marginTop: 6
	},
	line: {
		backgroundColor: colors.$F0F0F0,
		width: '100%',
		height: 0.5
	},
	rpcMarginTop: {
		marginTop: 14
	},
	searchContainer: {
		flexDirection: 'row',
		height: 50,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.$ccc,
		borderRadius: 100,
		paddingHorizontal: 20,
		marginBottom: 24
	},
	customRpcInfoTilte: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16
	},
	curstomRpcLabel: {
		marginLeft: 6,
		...fontStyles.semibold,
		color: colors.$333333,
		fontSize: 16
	}
});

class ChainSettingView extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		selectedAddress: PropTypes.string,
		identities: PropTypes.object,
		toggleChainEditing: PropTypes.func,
		baseStyle: PropTypes.array,
		onDragRelease: PropTypes.func,
		onDragStart: PropTypes.func,
		toggleShowHint: PropTypes.func,
		allChains: PropTypes.array
	};

	state = {
		currentPage: PAGE_HOME,
		nameValue: '',
		rpcValue: '',
		chainValue: '',
		currencyValue: '',
		explorerValue: '',
		rpcBtnEnalbe: false,
		loading: false,
		error: null,
		searchTerm: '',
		filteredRpcList: []
	};

	dragFavorityRef = React.createRef();
	dragDisableRef = React.createRef();
	rpcTextInputRef = React.createRef();
	chainTextInputRef = React.createRef();
	currencyTextInputRef = React.createRef();
	explorerTextInputRef = React.createRef();
	rpcListData = require('../../../data/rpc-chains.json');

	componentDidMount = async () => {
		if (Platform.OS === 'android') {
			BackHandler.addEventListener('hardwareBackPress', this.onBackAndroid);
		}
	};

	componentWillUnmount = () => {
		if (Platform.OS === 'android') {
			BackHandler.removeEventListener('hardwareBackPress', this.onBackAndroid);
		}
	};

	onBackAndroid = () => {
		if (this.props.navigation.isFocused()) {
			const { currentPage } = this.state;
			if (currentPage === PAGE_INPUT_RPC) {
				this.setState({ currentPage: PAGE_HOME });
			} else if (currentPage === PAGE_RPC_LIST) {
				this.setState({ currentPage: PAGE_INPUT_RPC });
			} else if (currentPage === PAGE_HOME) {
				return false;
			}
			return true;
		}
		return false;
	};

	renderItemView = (item, index) => {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.itemView} key={item.chainType}>
				{item.isRpc ? getAssetIcon(item.chainType) : <Image source={item.icon} />}
				<Text
					style={[styles.itemText, isDarkMode && baseStyles.textDark]}
					numberOfLines={1}
					allowFontScaling={false}
				>
					{item.text}
				</Text>
			</View>
		);
	};

	renderCustomRPC = () => {
		const { nameValue, rpcValue, chainValue, currencyValue, explorerValue, rpcBtnEnalbe, loading } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View>
				<View style={styles.customRpcInfoTilte}>
					<Text style={[styles.curstomRpcLabel, isDarkMode && baseStyles.textDark]}>
						{strings('chainSetting.info')}
					</Text>
					<View style={styles.flexOne} />
					<TouchableOpacity
						activeOpacity={0.5}
						onPress={() => {
							this.setState({ currentPage: PAGE_RPC_LIST });
						}}
						hitSlop={styles.hitSlop}
					>
						<Text style={styles.rpcList}>{strings('chainSetting.choose_from_rpc_List')}</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.rpcRow}>
					<View style={styles.flexOne}>
						<TextInput
							allowFontScaling={false}
							style={[
								styles.textInput,
								isDarkMode && { color: 'white', borderColor: colors.white016 },
								isDarkMode && baseStyles.darkBackground600
							]}
							value={nameValue}
							placeholder={strings('chainSetting.network_name')}
							placeholderTextColor={colors.$8F92A1}
							onChangeText={value => {
								this.setState({ nameValue: value, rpcBtnEnalbe: value && rpcValue && chainValue });
							}}
							returnKeyType={'next'}
							onSubmitEditing={() => {
								this.rpcTextInputRef?.current?.focus();
							}}
							blurOnSubmit={false}
						/>
					</View>
				</View>
				<View style={styles.rpcRow}>
					<View style={styles.flexOne}>
						<TextInput
							ref={this.rpcTextInputRef}
							allowFontScaling={false}
							style={[
								styles.textInput,
								isDarkMode && { color: 'white', borderColor: colors.white016 },
								isDarkMode && baseStyles.darkBackground600
							]}
							value={rpcValue}
							placeholder={strings('chainSetting.rpc_url')}
							placeholderTextColor={colors.$8F92A1}
							onChangeText={value => {
								this.setState({ rpcValue: value, rpcBtnEnalbe: nameValue && value && chainValue });
							}}
							returnKeyType={'next'}
							onSubmitEditing={() => {
								this.chainTextInputRef?.current?.focus();
							}}
							blurOnSubmit={false}
						/>
					</View>
				</View>
				<View style={styles.rpcRow}>
					<View style={styles.flexOne}>
						<TextInput
							ref={this.chainTextInputRef}
							allowFontScaling={false}
							style={[
								styles.textInput,
								isDarkMode && { color: 'white', borderColor: colors.white016 },
								isDarkMode && baseStyles.darkBackground600
							]}
							value={chainValue}
							placeholder={strings('chainSetting.chain_id')}
							placeholderTextColor={colors.$8F92A1}
							onChangeText={value => {
								this.setState({ chainValue: value, rpcBtnEnalbe: nameValue && rpcValue && value });
							}}
							returnKeyType={'next'}
							onSubmitEditing={() => {
								this.currencyTextInputRef?.current?.focus();
							}}
							blurOnSubmit={false}
						/>
					</View>
				</View>
				<View style={styles.rpcRow}>
					<View style={styles.flexOne}>
						<TextInput
							ref={this.currencyTextInputRef}
							allowFontScaling={false}
							style={[
								styles.textInput,
								isDarkMode && { color: 'white', borderColor: colors.white016 },
								isDarkMode && baseStyles.darkBackground600
							]}
							value={currencyValue}
							placeholder={strings('chainSetting.currency_symbol')}
							placeholderTextColor={colors.$8F92A1}
							onChangeText={value => {
								this.setState({ currencyValue: value });
							}}
							returnKeyType={'next'}
							onSubmitEditing={() => {
								this.explorerTextInputRef?.current?.focus();
							}}
							blurOnSubmit={false}
						/>
					</View>
				</View>
				<View style={styles.rpcRow}>
					<View style={styles.flexOne}>
						<TextInput
							ref={this.explorerTextInputRef}
							allowFontScaling={false}
							style={[
								styles.textInput,
								isDarkMode && { color: 'white', borderColor: colors.white016 },
								isDarkMode && baseStyles.darkBackground600
							]}
							value={explorerValue}
							placeholder={strings('chainSetting.explorer_url')}
							placeholderTextColor={colors.$8F92A1}
							onChangeText={value => {
								this.setState({ explorerValue: value });
							}}
							returnKeyType={'done'}
						/>
					</View>
				</View>
				<TouchableOpacity
					activeOpacity={0.8}
					style={[styles.addButton, rpcBtnEnalbe && { backgroundColor: colors.brandPink300 }]}
					disabled={!rpcBtnEnalbe}
					onPress={this.addRpc}
				>
					{loading ? (
						<ActivityIndicator size="small" color={colors.white} />
					) : (
						<Text style={[styles.addText, rpcBtnEnalbe && { color: colors.white }]}>
							{strings('chainSetting.add')}
						</Text>
					)}
				</TouchableOpacity>
			</View>
		);
	};

	renderRpcListItem = (item, index) => {
		//图片142， 93
		const itemWidth = '100%';
		const itemHeight = 44;
		const { isDarkMode } = this.context;
		return (
			<View
				style={[
					styles.rpcItem,
					{
						width: itemWidth,
						height: itemHeight
					}
				]}
			>
				<TouchableOpacity
					activeOpacity={0.5}
					style={styles.alignRow}
					onPress={() => {
						this.setState({
							currentPage: PAGE_INPUT_RPC,
							nameValue: item.name,
							rpcValue: item.rpc[0],
							chainValue: String(item.chainId),
							currencyValue: item.nativeCurrency.symbol,
							explorerValue: item.infoURL || '',
							rpcBtnEnalbe: true
						});
					}}
				>
					<View style={styles.rpcItemContent}>
						<View style={styles.alignRow}>
							<Text
								style={[styles.rpcItemTitle, isDarkMode && baseStyles.textDark]}
								numberOfLines={1}
								allowFontScaling={false}
							>
								{item.name.length > 15 ? `${item.name.substring(0, 12)}...` : item.name}{' '}
							</Text>

							<Text style={styles.rpcItemDataCurrency} numberOfLines={1} allowFontScaling={false}>
								{item.nativeCurrency?.symbol}
							</Text>
						</View>
						<View style={styles.rpcItemRow}>
							<View>
								<Text
									style={[styles.rpcItemChainId, isDarkMode && baseStyles.textDark]}
									numberOfLines={1}
									allowFontScaling={false}
								>
									{strings('chainSetting.chain_id_item')}
								</Text>
							</View>

							<View style={styles.rpcItemData}>
								<Text style={styles.rpcItemDataChainId} numberOfLines={1} allowFontScaling={false}>
									{item.chainId}
								</Text>
							</View>
						</View>
					</View>
				</TouchableOpacity>
				<View style={styles.line} />
			</View>
		);
	};

	debounce = (func, delay) => {
		let inDebounce;
		return function() {
			const context = this;
			const args = arguments;
			clearTimeout(inDebounce);
			inDebounce = setTimeout(() => func.apply(context, args), delay);
		};
	};

	searchInArray = searchTerm => {
		const filteredData = this.rpcListData.filter(item => {
			const itemName = item.name ? item.name.toLowerCase() : '';
			const itemChain = item.chain ? item.chain.toLowerCase() : '';
			const itemSymbol =
				item.nativeCurrency && item.nativeCurrency.symbol ? item.nativeCurrency.symbol.toLowerCase() : '';

			return (
				itemName.includes(searchTerm.toLowerCase()) ||
				itemChain.includes(searchTerm.toLowerCase()) ||
				itemSymbol.includes(searchTerm.toLowerCase())
			);
		});

		this.setState({ filteredRpcList: filteredData });
	};

	// Call the debounced search function
	handleSearchChange = searchTerm => {
		this.setState({ searchTerm });
		this.debouncedSearch(searchTerm);
	};

	debouncedSearch = this.debounce(this.searchInArray, 100);

	renderRpcList = () => {
		const { searchTerm, filteredRpcList } = this.state;
		const rpcList = searchTerm ? filteredRpcList : this.rpcListData;

		rpcList.sort((x, y) => x.name.toUpperCase().localeCompare(y.name.toUpperCase()));
		const { isDarkMode } = this.context;
		return (
			<View style={styles.rpcMarginTop}>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View
						style={[
							styles.searchContainer,
							isDarkMode && { color: 'white', borderColor: colors.white016 },
							isDarkMode && baseStyles.darkBackground600
						]}
					>
						<TextInput
							placeholder="Search..."
							style={[{ flex: 1 }, isDarkMode && { color: 'white' }]}
							value={searchTerm}
							placeholderTextColor={colors.paliGrey200}
							onChangeText={this.handleSearchChange}
						/>

						<Image source={require('../../../images/ic_search_blue.png')} style={styles.icon} />
					</View>
				</KeyboardAvoidingView>
				<FlatList
					renderItem={({ item, index }) => this.renderRpcListItem(item, index)}
					data={rpcList}
					keyExtractor={(item, index) => 'rpc-detail-' + index}
					numColumns={1}
					horizontal={false}
					showsVerticalScrollIndicator={false}
				/>
			</View>
		);
	};

	addRpc = async () => {
		const { nameValue, rpcValue, chainValue, currencyValue, explorerValue } = this.state;
		const { PreferencesController, TokenBalancesController } = Engine.context;
		this.setState({ loading: true });
		try {
			const chainType = await Engine.networks[ChainType.RPCBase].addNetwork(
				nameValue.trim(),
				rpcValue.trim(),
				chainValue.trim(),
				currencyValue.trim() || 'ETH',
				explorerValue.trim()
			);
			await PreferencesController.addRpcChain(this.props.selectedAddress, chainType);
			TokenBalancesController.pollAll();
			this.setState({ currentPage: PAGE_HOME });
			this.props.toggleShowHint(strings('chainSetting.custom_network_added'));
		} catch (e) {
			let str = 'other.unknown_error';
			if (e?.message === 'Wrong URL') {
				str = 'other.wrong_url';
			} else if (e?.message === 'Chain already exists') {
				str = 'other.chain_exists';
			} else if (e?.message === 'RPC node not responding') {
				str = 'other.rpc_not_responding';
			} else if (e?.message === 'Wrong Chain ID') {
				str = 'other.wrong_chain_id';
			}
			this.setState({ error: strings(str) });
		}
		this.setState({ loading: false });
	};

	render = () => {
		const {
			toggleChainEditing,
			identities,
			selectedAddress,
			baseStyle,
			onDragRelease,
			onDragStart,
			allChains
		} = this.props;
		const { currentPage, error } = this.state;
		if (!identities[selectedAddress]) {
			return;
		}
		const favouriteChains = identities[selectedAddress]?.enabledChains || defaultEnabledChains;
		const disabledChains = allChains.filter(chainType => !favouriteChains.includes(chainType));
		const favouriteChainItems = [];
		const disableChainItems = [];
		favouriteChains.forEach(chainType => {
			if (getIsRpc(chainType)) {
				favouriteChainItems.push({ text: getRpcName(chainType), isRpc: true, chainType });
			} else {
				const item = ChainTypeSettingsItems.filter(item => item.chainType === chainType);
				if (item && item.length > 0) {
					favouriteChainItems.push(item[0]);
				}
			}
		});
		if (disabledChains.length > 0) {
			disabledChains.forEach(chainType => {
				if (getIsRpc(chainType)) {
					disableChainItems.push({ text: getRpcName(chainType), isRpc: true, chainType });
				} else {
					const item = ChainTypeSettingsItems.filter(item => item.chainType === chainType);
					if (item && item.length > 0) {
						disableChainItems.push(item[0]);
					}
				}
			});
		}
		const { isDarkMode } = this.context;
		return (
			<View>
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
					<View style={[styles.childrenWrapper, baseStyle]} showsVerticalScrollIndicator={false}>
						<View style={styles.paddingBottom20}>
							<View style={styles.titleLayout}>
								{currentPage !== PAGE_HOME && (
									<TouchableOpacity
										hitSlop={styles.hitSlop}
										onPress={() => {
											if (currentPage === PAGE_RPC_LIST) {
												this.setState({ currentPage: PAGE_INPUT_RPC });
											} else if (currentPage === PAGE_INPUT_RPC) {
												this.setState({ currentPage: PAGE_HOME });
											}
										}}
									>
										<EvilIcons
											name="chevron-left"
											size={32}
											style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
										/>
									</TouchableOpacity>
								)}
								<Text style={[styles.titleText, isDarkMode && baseStyles.textDark]}>
									{currentPage === PAGE_HOME
										? strings('chainSetting.title')
										: currentPage === PAGE_INPUT_RPC
										? strings('chainSetting.custom_rpc')
										: strings('chainSetting.rpc_list')}
								</Text>
								<View style={styles.flexOne} />
								<Image source={require('../../../images/ic_chain_account.png')} />
								<Text style={styles.accountName}>{identities[selectedAddress]?.name}</Text>
							</View>
							{currentPage !== PAGE_RPC_LIST && (
								<Text style={styles.descText}>
									{currentPage === PAGE_INPUT_RPC
										? strings('chainSetting.custom_rpc_desc')
										: strings('chainSetting.desc')}
								</Text>
							)}

							{currentPage !== PAGE_RPC_LIST && (
								<View style={[styles.lineView, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
							)}
							{currentPage === PAGE_INPUT_RPC && this.renderCustomRPC()}
							{currentPage === PAGE_RPC_LIST && this.renderRpcList()}
							{currentPage === PAGE_HOME && (
								<View>
									<View style={styles.enableLayout}>
										<Text style={[styles.enableText, isDarkMode && baseStyles.textDark]}>
											{strings('chainSetting.enable')}
										</Text>
										<View style={styles.flexOne} />
										<TouchableOpacity
											hitSlop={styles.hitSlop}
											onPress={() => {
												this.setState({
													currentPage: PAGE_INPUT_RPC,
													nameValue: '',
													rpcValue: '',
													chainValue: '',
													currencyValue: '',
													explorerValue: ''
												});
											}}
										>
											<Text style={styles.customNetwork}>
												{strings('chainSetting.custom_network')}
											</Text>
										</TouchableOpacity>
									</View>
									<DragGridView
										ref={this.dragFavorityRef}
										itemWidth={dragItemWidth}
										itemHeight={dragItemHeight}
										itemsPerRow={dragColumnCount}
										onDragRelease={items => {
											const itemOrder = items.itemOrder;
											const favouriteSortChains = [];
											itemOrder.forEach(item => {
												favouriteSortChains.push(Number(item.key));
											});
											setTimeout(async () => {
												await Engine.context.PreferencesController.updateChains(
													selectedAddress,
													favouriteSortChains
												);
												onDragRelease && onDragRelease();
											}, 130);
										}}
										onDragStart={() => {
											onDragStart && onDragStart();
										}}
										onOperateItem={indexItem => {
											const chainType = Number(indexItem?.item?.key);
											const index = favouriteChains.indexOf(chainType);
											if (index !== -1) {
												favouriteChains.splice(index, 1);
											}
											const diableIndex = disabledChains.indexOf(chainType);
											if (diableIndex === -1) {
												disabledChains.push(chainType);
											}
											setTimeout(async () => {
												await Engine.context.PreferencesController.updateChains(
													selectedAddress,
													favouriteChains
												);
												const { current } = this.dragDisableRef;
												current?.updateChildren();
											}, 250);
										}}
										operateTag={favouriteChainItems.length === 1 ? 0 : 1}
										canDrag={favouriteChainItems.length > 1}
									>
										{favouriteChainItems.map((item, index) => this.renderItemView(item, index))}
									</DragGridView>

									<View style={[styles.lineView, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
									<View style={styles.enableLayout}>
										<Text style={[styles.enableText, isDarkMode && baseStyles.textDark]}>
											{strings('chainSetting.disable')}
										</Text>
									</View>
									<View style={styles.minHeight}>
										{disabledChains.length > 0 ? (
											<DragGridView
												ref={this.dragDisableRef}
												itemWidth={dragItemWidth}
												itemHeight={dragItemHeight}
												itemsPerRow={dragColumnCount}
												onOperateItem={itemOrder => {
													const chainType = Number(itemOrder?.item?.key);
													const index = disabledChains.indexOf(chainType);
													if (index !== -1) {
														disabledChains.splice(index, 1);
													}
													const addIndex = favouriteChains.indexOf(chainType);
													if (addIndex === -1) {
														favouriteChains.push(chainType);
													}
													setTimeout(async () => {
														await Engine.context.PreferencesController.updateChains(
															selectedAddress,
															favouriteChains
														);
														const { current } = this.dragFavorityRef;
														current?.updateChildren();
													}, 250);
												}}
												onRpcCloseItem={itemOrder => {
													const chainType = Number(itemOrder?.item?.key);
													const index = disabledChains.indexOf(chainType);
													if (index !== -1) {
														disabledChains.splice(index, 1);
													}

													setTimeout(async () => {
														await Engine.networks[ChainType.RPCBase].removeNetwork(
															chainType
														);
														await Engine.context.PreferencesController.removeRpcChain(
															chainType
														);
													}, 250);
												}}
												operateTag={2}
												canDrag={false}
											>
												{disableChainItems.map((item, index) =>
													this.renderItemView(item, index)
												)}
											</DragGridView>
										) : (
											<View style={styles.noDisableLayout}>
												<Text style={[styles.noDisableText, isDarkMode && baseStyles.textDark]}>
													{strings('chainSetting.no_disabled_chains')}
												</Text>
											</View>
										)}
									</View>
									<View style={[styles.lineView, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />

									<TouchableOpacity
										style={styles.doneButton}
										onPress={() => {
											toggleChainEditing && toggleChainEditing();
										}}
									>
										<Text style={styles.doneText}>{strings('chainSetting.done')}</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>
				</ImageCapInset>
				<PromptView
					isVisible={error != null}
					title={strings('transactions.transaction_error')}
					message={error}
					onRequestClose={() => {
						this.setState({ error: null });
					}}
				/>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	identities: state.engine.backgroundState.PreferencesController.identities,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	allChains: state.engine.backgroundState.PreferencesController.allChains || []
});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ChainSettingView);
