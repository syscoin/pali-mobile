import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
	Text,
	StyleSheet,
	View,
	TouchableOpacity,
	BackHandler,
	ScrollView,
	Image,
	Linking,
	Share,
	Platform,
	PanResponder,
	DeviceEventEmitter,
	RefreshControl
} from 'react-native';
import { withNavigation } from 'react-navigation';
import { WebView } from 'react-native-webview';
import Icon from '../../../components/UI/Icon';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { useTheme } from '../../../theme/ThemeProvider';
import Engine from '../../../core/Engine';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import { colors, baseStyles, fontStyles, activeOpacity } from '../../../styles/common';
import {
	JS_ANDROID_LONGPRESS_LOADEND,
	JS_SET_PLATFORM,
	JS_ENABLE_VCONSOLE,
	JS_WEBVIEW_URL,
	SPA_urlChangeListener
} from '../../../util/browserScripts';
import Entypo from 'react-native-vector-icons/Entypo';
import { strings } from '../../../../locales/i18n';
import WebviewError from '../../UI/WebviewError';
import { addFavouriteDapp, removeFavouriteDapp, updateTab } from '../../../actions/browser';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import { SetUseTestServer } from '../../../actions/settings';
import { ChainType, util, URL } from 'paliwallet-core';
import { toggleShowHint } from '../../../actions/hint';
import { checkPermissionAndSave } from '../../../util/ImageUtils.android';
import { getAppVersion, getAppVersionCode, getChannel, getDeviceId, getDeviceInfo } from '../../../util/ApiClient';
import { decrypt, encrypt, encryptString } from '../../../util/CryptUtils';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import { createAsyncMiddleware } from 'json-rpc-engine';
import BackgroundBridge from '../../../core/BackgroundBridge';
import { resemblesAddress } from '../../../util/address';
import { ethErrors } from 'eth-json-rpc-errors';
import { matchDefaultChainType, matchUserSelectedChainType, matchWhitelistDapps } from '../../../util/walletconnect';
import HomePage from '../../UI/HomePage';
import AntIcon from 'react-native-vector-icons/AntDesign';

import Modal from 'react-native-modal';
import Clipboard from '@react-native-community/clipboard';
import { showAlert } from '../../../actions/alert';
import { AutoCompleteType_HOMEPAGE } from '../../../core/AutoCompleteController';
import { onEvent } from '../../../util/statistics';
import { getChainIdByType, getNetworkController, getChainTypeByChainId } from '../../../util/number';
import { isPrefixedFormattedHexString } from '../../../util/networks';
import { getIsRpc, getDefiIcon, getRpcName } from '../../../util/rpcUtil';
import NFTImage from '../../UI/NFTImage';
import { getActiveTabId } from '../../../util/browser';
import NativeThreads from '../../../threads/NativeThreads';
import { callSqlite } from '../../../util/ControllerUtils';
import { ChainTypeBgDefi, ChainTypes, chainTypeTochain, getChainTypeName } from '../../../util/ChainTypeImages';

const { HOMEPAGE_URL, USER_AGENT } = AppConstants;

const API_WHITE_LIST = [
	'go.libsss.com',
	'pocket.libsss.com',
	'go.morpheuscommunity.net',
	'pocket.sardin.cn',
	'gopocket.finance',
	'gopocket.security',
	'pali.pollum.cloud',
	'community.gopocket.xyz'
];

const POPULAR_HOSTS = [
	'baidu.com',
	'app.pegasys.fi',
	'luxy.io',
	'google.com',
	'google.com.hk',
	'google.com.tw',
	'google.cn',
	'chainge.finance',
	...API_WHITE_LIST
];

const checkSecurityUrl = 'https://go.morpheuscommunity.net/api/v1/index/checkUrl';
const checkSecurityUrlForTesting = 'https://go.libsss.com/api/v1/index/checkUrl';

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white
	},
	progressBarWrapper: {
		height: 3,
		width: '100%',
		zIndex: 100
	},
	webview: {
		...baseStyles.flexGrow,
		position: 'relative',
		zIndex: 1
	},
	homepage: {
		position: 'absolute'
	},
	popupBg: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		zIndex: 1,
		top: 0,
		left: 0,
		backgroundColor: colors.overlay
	},
	popupContent: {
		position: 'absolute',
		bottom: 0,
		width: '100%',
		paddingLeft: 20,
		paddingTop: 20,
		paddingRight: 20,
		backgroundColor: colors.white
	},
	saveBtn: {
		width: '100%',
		height: 44,
		marginBottom: 20,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 10,
		borderColor: colors.brandPink300
	},
	btnText: {
		fontSize: 16,
		color: colors.brandPink300
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	moreModalWrapper: {
		minHeight: 406,
		backgroundColor: colors.$F6F6F6,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	},
	moreModalContainer: {
		flex: 1,
		justifyContent: 'center'
	},
	scrollView: {
		height: 102
	},
	dappNetLayout: {
		height: 146,
		justifyContent: 'center'
	},
	dappAccountLayout: {
		height: 156,
		justifyContent: 'center'
	},
	dappLine: {
		backgroundColor: colors.$F0F0F0,
		flex: 1,
		height: 1,
		maxHeight: 1
	},
	dappNetScroll: {
		marginLeft: 6,
		marginTop: 14,
		marginRight: 20,
		flexDirection: 'row'
	},
	dappAccountScroll: {
		marginLeft: 6,
		marginTop: 14,
		marginRight: 20,
		flexDirection: 'row'
	},
	dappNetTouchItem: {
		width: 86,
		height: 68,
		borderRadius: 10,
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center'
	},
	dappNetTouchItemSeleted: {
		backgroundColor: colors.brandPink300
	},
	dappAccountTouchItem: {
		width: 120,
		height: 68,
		borderRadius: 10,
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 12
	},
	dappAccountTouchItemSeleted: {
		backgroundColor: colors.brandPink300
	},
	dappNetName: {
		marginTop: 6,
		fontSize: 11,
		color: colors.$666666,
		marginHorizontal: 2
	},
	dappNetNameSeleted: {
		color: colors.white
	},
	dappAccountName: {
		fontSize: 13,
		color: colors.$666666
	},
	dappAccountNameSeleted: {
		color: colors.white,
		...fontStyles.bold
	},
	dappAccountAddress: {
		fontSize: 11,
		color: colors.$999999,
		marginTop: 4
	},
	dappAccountAddressSeleted: {
		color: colors.white08
	},
	dappTitle: {
		fontSize: 14,
		color: colors.$202020,
		...fontStyles.bold,
		marginLeft: 20
	},
	itemSpace: {
		marginLeft: 14
	},
	row: {
		flexDirection: 'row'
	},
	touchItem: {
		height: 102,
		width: 82,
		alignItems: 'center',
		paddingTop: 30
	},
	text1: {
		marginTop: 8,
		fontSize: 11,
		color: colors.$030319,
		textAlign: 'center'
	},
	addChainModalWrapper: {
		minHeight: 406,
		backgroundColor: colors.$F6F6F6,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 30,
		paddingVertical: 30
	},
	addChainModalTitle: {
		color: colors.$030319,
		fontSize: 20,
		lineHeight: 24,
		...fontStyles.semibold
	},
	addChainModalSubTitleWrapper: {
		flexDirection: 'row',
		marginBottom: 21,
		marginTop: 6
	},
	addChainModalSubIcon: {
		width: 16,
		height: 16,
		borderRadius: 3
	},
	addChainModalSubTitle: {
		color: colors.$8F92A1,
		lineHeight: 14,
		fontSize: 12,
		marginLeft: 5
	},
	addChainModalLine: {
		borderBottomWidth: 1,
		borderBottomColor: colors.$F0F0F0
	},
	addChainModalItemWrapper: {
		flexDirection: 'row',
		paddingTop: 20
	},
	addChainModalItemTitle: {
		width: 125,
		lineHeight: 19,
		color: colors.$60657D,
		fontSize: 14
	},
	addChainModalItemContent: {
		color: colors.$030319,
		fontSize: 14,
		lineHeight: 19
	},
	addChainModalActionWrapper: {
		marginTop: 30,
		flexDirection: 'row',
		alignItems: 'center'
	},
	addChainModalCancel: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center'
	},
	addChainModalCancelText: {
		fontSize: 14,
		color: colors.brandPink300
	},
	addChainModalConfirm: {
		flex: 1.4,
		height: 44,
		marginLeft: 19,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center'
	},
	addChainModalConfirmText: {
		fontSize: 14,
		color: colors.white
	},
	flexOne: {
		flex: 1
	}
});

const BrowserTab = props => {
	const [showPopup, setShowPopup] = useState(false);
	const [imageData, setImageData] = useState('');
	const [backEnabled, setBackEnabled] = useState(false);
	const [forwardEnabled, setForwardEnabled] = useState(false);
	const [progress, setProgress] = useState(0);
	const [initialUrl, setInitialUrl] = useState('');
	const [error, setError] = useState(null);
	const [url, setUrl] = useState('');
	const [title, setTitle] = useState('');
	const icon = useRef(null);
	const webviewRef = useRef(null);
	const webviewUrlPostMessagePromiseResolve = useRef(null);
	const backgroundBridges = useRef([]);
	const [entryScriptWeb3, setEntryScriptWeb3] = useState(null);
	const [entryScriptVConsole, setEntryScriptVConsole] = useState('(function () {})()');
	const chain_type = useRef(ChainType.Ethereum);
	const load_start_called = useRef(true);
	const user_selected_chain_type_once = useRef({});
	const [showHomepage, setShowHomepage] = useState(true);
	const [moreModalVisible, setMoreModalVisible] = useState(false);
	const [addChainModalVisible, setAddChainModalVisible] = useState(false);
	const addressScrollviewRef = useRef(null);
	const networkScrollviewRef = useRef(null);
	const [animToHome, setAnimToHome] = useState(false);
	const reload_once_when_load_end_url = useRef(null);
	const last_load_start_url_info = useRef(null);
	const add_chain_request = useRef(null);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshEnable, setRefreshEnable] = useState(Device.isIos());
	const [initListener, setInitListener] = useState(false);
	const { isDarkMode } = useTheme();

	const isTabActive = useCallback(() => getActiveTabId() === props.tabId, [props.tabId]);

	const updateUrlAndTitle = useCallback(
		async (_url, _title) => {
			if (!_url) {
				props.updateTab && props.updateTab(props.tabId, { url: _url, title: _title });
				return;
			}
			setUrl(_url);
			props.addressBarRef.current?.setUrl(_url);

			if (!_title) {
				const hostname = String(new URL(_url).hostname);
				if (hostname?.startsWith('www.')) {
					_title = hostname.slice(4);
				} else if (hostname?.startsWith('m.')) {
					_title = hostname.slice(2);
				} else {
					_title = hostname;
				}
				const dapp_info = await callSqlite('getWhitelistDapp', _url, hostname);
				if (dapp_info?.title) {
					_title = dapp_info.title;
				}
			}
			setTitle(_title);
			props.addressBarRef.current?.setTitle(_title);
			props.updateTab && props.updateTab(props.tabId, { url: _url, title: _title });
		},
		[props]
	);

	const go = useCallback(
		async (url, title) => {
			props.addressBarRef.current && props.addressBarRef.current.setInputEditing(false);
			user_selected_chain_type_once.current = null;
			if (!url || url === HOMEPAGE_URL) {
				setShowHomepage(true);
				setProgress(0);
				setBackEnabled(false);
				props.addressBarRef.current?.setBackEnabled(false);
				setForwardEnabled(false);
				updateUrlAndTitle(HOMEPAGE_URL, 'homepage');
				return;
			}
			const hasProtocol = url.match(/^[a-z]*:\/\//);
			const sanitizedURL = hasProtocol ? url : `https://${url}`;
			setInitialUrl(sanitizedURL);
			setShowHomepage(false);
			setProgress(0);
			setBackEnabled(false);
			props.addressBarRef.current?.setBackEnabled(false);
			setForwardEnabled(false);
			updateUrlAndTitle(sanitizedURL, title);
		},
		[props.addressBarRef, updateUrlAndTitle]
	);

	const openHomepageUrl = async (item: AutoCompleteResult) => {
		if (item.type === AutoCompleteType_HOMEPAGE) {
			callSqlite('updateWhitelistDapp', item.url, item.title, item.desc, item.chain, item.img, Date.now());
		}
		go(item.url, item.title);
	};

	const goBack = useCallback(() => {
		if (!backEnabled) {
			go(HOMEPAGE_URL);
			return;
		}

		const { current } = webviewRef;
		current && current.goBack();
	}, [backEnabled, go]);

	const reload = useCallback(() => {
		const { current } = webviewRef;
		current && current.reload();
	}, []);

	const setChainType = async chainType => {
		const { hostname } = new URL(url);
		let result = matchDefaultChainType(url, hostname, props.defaultChainTypes);
		if (!result.found) {
			result = await matchWhitelistDapps(hostname);
		}
		if (result.found) {
			user_selected_chain_type_once.current = chainType;
		} else {
			callSqlite('updateUserSelectedChainTypes', hostname, chainType);
		}
		load_start_called.current = false;
		reload();
		setTimeout(() => {
			if (!load_start_called.current) {
				load_start_called.current = true;
				reload();
			}
		}, 1000);
	};

	useEffect(() => {
		const initialUrl = props.initialUrl || AppConstants.HOMEPAGE_URL;
		go(initialUrl);

		const getEntryScriptWeb3 = async () => {
			const entryScriptWeb3 = await EntryScriptWeb3.get();
			setEntryScriptWeb3(entryScriptWeb3 + SPA_urlChangeListener + JS_SET_PLATFORM());
			if (__DEV__) {
				const entryScriptVConsole = await EntryScriptWeb3.getVConsole();
				setEntryScriptVConsole(entryScriptVConsole + JS_ENABLE_VCONSOLE);
			}
		};

		getEntryScriptWeb3();
		return function cleanup() {
			backgroundBridges.current.forEach(bridge => bridge.onDisconnect());
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!isTabActive()) {
			return;
		}
		const currentUrl = props.navigation.getParam('newTabUrl', null);
		const chainType = props.navigation.getParam('chainType', null);
		const reloadOnce = props.navigation.getParam('reloadOnce', false);
		if (currentUrl) {
			if (props.initialUrl && props.initialUrl !== '' && props.initialUrl !== AppConstants.HOMEPAGE_URL) {
				props.newTab();
				return;
			}
			props.navigation.setParams({
				newTabUrl: null
			});
			if (chainType) {
				props.navigation.setParams({
					chainType: null
				});
				const hostname = String(new URL(currentUrl).hostname);
				callSqlite('getWhitelistDapp', currentUrl, hostname).then(dapp_info => {
					callSqlite(
						'updateWhitelistDapp',
						currentUrl,
						dapp_info ? dapp_info.title : currentUrl,
						dapp_info ? dapp_info.desc : currentUrl,
						chainTypeTochain(Number(chainType)),
						dapp_info?.img,
						dapp_info ? dapp_info.timestamp : 0
					);
				});
			}
			go(currentUrl);
			if (reloadOnce) {
				props.navigation.setParams({
					reloadOnce: false
				});
				reload_once_when_load_end_url.current = currentUrl;
			} else {
				reload_once_when_load_end_url.current = null;
			}
		}
	}, [go, isTabActive, props, reload]);

	const getRpcMethodMiddleware = ({ hostname, getProviderState }) =>
		// all user facing RPC calls not implemented by the provider
		createAsyncMiddleware(async (req, res, next) => {
			const getAccounts = async (_url, _hostname) => {
				const { selectedAddress } = props;
				const isEnabled = true;
				return isEnabled && selectedAddress ? [selectedAddress] : [];
			};

			const rpcMethods = {
				eth_chainId: async () => {
					const chainId = getChainIdByType(chain_type.current);
					if (chainId && !chainId.startsWith('0x')) {
						// Convert to hex
						res.result = `0x${parseInt(chainId, 10).toString(16)}`;
					}
				},
				net_version: async () => {
					const chainId = getChainIdByType(chain_type.current);
					res.result = chainId;
				},
				eth_requestAccounts: async () => {
					const { selectedAddress } = props;
					res.result = [selectedAddress];
				},
				eth_accounts: async () => {
					res.result = await getAccounts(url, hostname);
				},
				eth_coinbase: async () => {
					const accounts = await getAccounts(url, hostname);
					res.result = accounts.length > 0 ? accounts[0] : null;
				},
				eth_sign: async () => {
					const { MessageManager } = Engine.context;
					const pageMeta = {
						meta: {
							url,
							title,
							icon: icon.current
						}
					};
					const rawSig = await MessageManager.addUnapprovedMessageAsync({
						data: req.params[1],
						from: req.params[0],
						...pageMeta
					});

					res.result = rawSig;
				},
				personal_sign: async () => {
					const { PersonalMessageManager } = Engine.context;
					const firstParam = req.params[0];
					const secondParam = req.params[1];
					const params = {
						data: firstParam,
						from: secondParam
					};

					if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
						params.data = secondParam;
						params.from = firstParam;
					}

					const pageMeta = {
						meta: {
							url,
							title,
							icon: icon.current
						}
					};
					const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
						...params,
						...pageMeta
					});

					res.result = rawSig;
				},
				eth_signTypedData: async () => {
					const { TypedMessageManager } = Engine.context;
					const pageMeta = {
						meta: {
							url,
							title,
							icon: icon.current
						}
					};
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: req.params[0],
							from: req.params[1],
							...pageMeta
						},
						'V1'
					);

					res.result = rawSig;
				},
				eth_signTypedData_v3: async () => {
					const { TypedMessageManager } = Engine.context;
					const data = JSON.parse(req.params[1]);
					const chainId = data.domain.chainId;

					if (!getNetworkController(chainId)) {
						throw ethErrors.rpc.invalidRequest(
							`Provided chainId (${chainId}) must match the active chainId`
						);
					}

					const pageMeta = {
						meta: {
							url,
							title,
							icon: icon.current
						}
					};

					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: req.params[1],
							from: req.params[0],
							...pageMeta
						},
						'V3'
					);

					res.result = rawSig;
				},
				eth_signTypedData_v4: async () => {
					const { TypedMessageManager } = Engine.context;
					const data = JSON.parse(req.params[1]);
					const chainId = data.domain.chainId;

					if (!getNetworkController(chainId)) {
						throw ethErrors.rpc.invalidRequest(
							`Provided chainId (${chainId}) must match the active chainId`
						);
					}

					const pageMeta = {
						meta: {
							url,
							title,
							icon: icon.current
						}
					};
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: req.params[1],
							from: req.params[0],
							...pageMeta
						},
						'V4'
					);

					res.result = rawSig;
				},
				web3_clientVersion: async () => {
					const version = global.appVersion;
					res.result = `MetaMask/${version}/Beta/Mobile`;
				},
				wallet_scanQRCode: () =>
					new Promise((resolve, reject) => {
						this.props.navigation.navigate('QRScanner', {
							onScanSuccess: data => {
								const regex = new RegExp(req.params[0]);
								if (regex && !regex.exec(data)) {
									reject({ message: 'NO_REGEX_MATCH', data });
								} else if (!regex && !/^(0x){1}[0-9a-fA-F]{40}$/i.exec(data.target_address)) {
									reject({ message: 'INVALID_ETHEREUM_ADDRESS', data: data.target_address });
								}
								let result = data;
								if (data.target_address) {
									result = data.target_address;
								} else if (data.scheme) {
									result = JSON.stringify(data);
								}
								res.result = result;
								resolve();
							},
							onScanError: e => {
								throw ethErrors.rpc.internal(e.toString());
							}
						});
					}),
				wallet_watchAsset: async () => {
					const {
						params: {
							options: { address, decimals, image, symbol },
							type
						}
					} = req;
					switch (type) {
						case 'ERC20':
							util.validateTokenToWatch({ address, decimals, image, symbol });
							break;
						default:
							throw new Error(`Asset of type ${type} not supported`);
					}
					await Engine.context.AssetsController.addToken(address, symbol, decimals, chain_type.current);
					res.result = address;
					setTimeout(() => props.toggleShowHint(strings('browser.add_asset_tip', { symbol })), 1000);
				},
				metamask_getProviderState: async () => {
					res.result = {
						...getProviderState(),
						accounts: await getAccounts(url, hostname)
					};
				},
				metamask_logWeb3ShimUsage: () => (res.result = null),
				wallet_addEthereumChain: () => {
					util.logDebug('leon.w@wallet_addEthereumChain: ', JSON.stringify(req));
					if (!req.params?.[0] || typeof req.params[0] !== 'object') {
						throw ethErrors.rpc.invalidParams({
							message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`
						});
					}
					const params = req.params[0];
					const {
						chainId,
						chainName,
						nativeCurrency: { symbol },
						rpcUrls,
						blockExplorerUrls
					} = params;
					const _chainId = typeof chainId === 'string' && chainId.toLowerCase();
					if (!isPrefixedFormattedHexString(_chainId)) {
						throw ethErrors.rpc.invalidParams(
							`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
						);
					}

					const chainIdDecimal = parseInt(_chainId, 16).toString(10);
					const type = getChainTypeByChainId(chainIdDecimal);
					// 如下逻辑成立，表示不存在当前chainId
					if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
						add_chain_request.current = {
							url,
							chainId: String(chainIdDecimal),
							nickname: chainName,
							rpcTarget: rpcUrls[0],
							ticker: symbol,
							explorerUrl: blockExplorerUrls[0]
						};
						setAddChainModalVisible(true);
						res.result = null;
						return;
					}
					if (type !== chain_type.current) {
						setTimeout(() => setChainType(type), 100);
					}
					res.result = null;
				},
				wallet_switchEthereumChain: () => {
					util.logDebug('leon.w@wallet_switchEthereumChain: ', JSON.stringify(req));
					if (!req.params?.[0] || typeof req.params[0] !== 'object') {
						throw ethErrors.rpc.invalidParams({
							message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`
						});
					}
					const params = req.params[0];
					const { chainId } = params;
					const _chainId = typeof chainId === 'string' && chainId.toLowerCase();
					if (!isPrefixedFormattedHexString(_chainId)) {
						throw ethErrors.rpc.invalidParams(
							`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
						);
					}

					const chainIdDecimal = parseInt(_chainId, 16).toString(10);
					const type = getChainTypeByChainId(chainIdDecimal);
					// 如下逻辑成立，表示不存在当前chainId
					if (type === ChainType.Ethereum && chainIdDecimal !== '1') {
						const rpcList = require('../../../data/rpc-chains.json');
						const rpcItem = rpcList.find(
							rpc =>
								String(rpc.chainId) === chainIdDecimal &&
								rpc.name &&
								rpc.rpc &&
								rpc.rpc.length > 0 &&
								rpc.nativeCurrency?.symbol &&
								rpc.infoURL
						);
						if (rpcItem) {
							add_chain_request.current = {
								url,
								chainId: String(chainIdDecimal),
								nickname: rpcItem.name,
								rpcTarget: rpcItem.rpc[0],
								ticker: rpcItem.nativeCurrency.symbol,
								explorerUrl: rpcItem.infoURL
							};
							setAddChainModalVisible(true);
						}
						res.result = null;
						return;
					}
					if (type !== chain_type.current) {
						setTimeout(() => setChainType(type), 100);
					}
					res.result = null;
				}
			};

			if (!rpcMethods[req.method]) {
				return next();
			}
			await rpcMethods[req.method]();
		});

	const initializeBackgroundBridge = (url, chain_type, isMainFrame) => {
		const newBridge = new BackgroundBridge({
			webview: webviewRef,
			url,
			chain_type,
			getRpcMethodMiddleware,
			isMainFrame
		});
		backgroundBridges.current.push(newBridge);
	};

	const onShouldStartLoadWithRequest = nativeEvent => {
		const { url } = nativeEvent;
		try {
			if (url.startsWith('wc:') || url.startsWith('paliwallet://wc')) {
				SharedDeeplinkManager.parse(url, {
					origin: undefined
				});
				return false;
			}
		} catch (e) {
			util.logDebug('leon.w@onShouldStartLoadWithRequest: ', nativeEvent, e);
		}
		return true;
	};

	// eslint-disable-next-line no-unused-vars
	const webCallAllowed = url => {
		if (!url) {
			return false;
		}
		const hostName = new URL(url).hostname;
		let allow = false;
		for (const item of API_WHITE_LIST) {
			if (hostName.endsWith(item)) {
				allow = true;
				break;
			}
		}
		return allow;
	};

	const switchTestServer = url => {
		if (!url) {
			return;
		}
		if (url === 'https://er.run/') {
			if (!props.useTestServer) {
				props.setUseTestServer(true);
				util.setUseTestServer(true);
				NativeThreads.get().callEngineAsync('setUseTestServer', true);
				setTimeout(() => props.toggleShowHint('test server enabled'), 2000);
			}
		} else if (url === 'https://er.run/faq') {
			if (props.useTestServer) {
				props.setUseTestServer(false);
				util.setUseTestServer(false);
				NativeThreads.get().callEngineAsync('setUseTestServer', false);
				setTimeout(() => props.toggleShowHint('test server disabled'), 2000);
			}
		}
	};

	const initBackgroundBridge = async _url => {
		backgroundBridges.current.length && backgroundBridges.current.forEach(bridge => bridge.onDisconnect());
		backgroundBridges.current = [];
		const origin = new URL(_url).origin;
		const hostname = new URL(_url).hostname;
		let result;
		if (user_selected_chain_type_once.current) {
			result = { found: true, chain_type: user_selected_chain_type_once.current };
			user_selected_chain_type_once.current = null;
		} else {
			result = matchDefaultChainType(_url, hostname, props.defaultChainTypes);
			if (!result.found) {
				result =
					last_load_start_url_info.current &&
					last_load_start_url_info.current.hostname === hostname &&
					Date.now() - last_load_start_url_info.current.timestamp < 2000
						? { chain_type: chain_type.current, found: true }
						: await matchWhitelistDapps(hostname);
			}
			// 但是本客户端又不支持这样的链
			if (result.found && !props.allChains.includes(result.chain_type)) {
				result = { found: false, chain_type: ChainType.Ethereum };
			}
			if (!result.found) {
				result = await matchUserSelectedChainType(hostname);
			}
		}
		last_load_start_url_info.current = { hostname, timestamp: Date.now() };
		chain_type.current = result.chain_type;
		initializeBackgroundBridge(origin, chain_type.current, true);
	};

	const sendUmengEvent = safeLevel => {
		if (safeLevel === 3) {
			onEvent('DappHighRisk');
		} else if (safeLevel === 2) {
			onEvent('DappMediumRisk');
		}
	};

	const checkSecurity = async urlStr => {
		if (!urlStr) {
			return;
		}

		const currentHostname = new URL(urlStr).hostname;

		for (const host of POPULAR_HOSTS) {
			if (currentHostname.endsWith(host)) {
				// setSafeLevel(1);
				sendUmengEvent(1);

				const { current } = props.addressBarRef;
				if (current) {
					current.setSecurityInfo(1, currentHostname, '');
				}
				return;
			}
		}

		let result = await callSqlite('getWhitelistDapp', currentHostname)?.timestamp;
		if (result) {
			const dif = Date.now() - result;
			if (dif < 1000 * 60 * 1) {
				// setSafeLevel(1);
				sendUmengEvent(1);
				const { current } = props.addressBarRef;
				if (current) {
					current.setSecurityInfo(1, currentHostname, '');
				}
				return;
			}
		}
		result = await callSqlite('getBlacklistDappByUrl', currentHostname);
		if (result) {
			if (Date.now() - result.timestamp < 1000 * 60 * 1) {
				// setSafeLevel(result.level);
				// setsafeDesc(result.desc);
				sendUmengEvent(result.level);
				const { current } = props.addressBarRef;
				if (current) {
					current.setSecurityInfo(result.level, currentHostname, result.desc);
					setTimeout(() => {
						current.showSecurityMenu();
					}, 200);
				}
				return;
			}
		}

		const body = JSON.stringify({
			url: urlStr,
			time: Date.now()
		});
		const encrypted_body = await encryptString(body);
		util.handleFetch(util.useTestServer() ? checkSecurityUrlForTesting : checkSecurityUrl, {
			method: 'POST',
			body: JSON.stringify({ content: encrypted_body }),
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'Accept-Language': strings('other.accept_language')
			}
		})
			.then(result => {
				if (result?.code !== 200 || result?.msg !== 'success') {
					return;
				}
				const data = result?.data;
				if (!data) {
					return;
				}
				if (!data.url) {
					return;
				}
				if (data.dapp && data.dapp.length > 0) {
					const content = data.dapp[0];
					if (content && content.safe_level === 1) {
						const hostname = new URL(content.url).hostname;
						callSqlite('getWhitelistDapp', hostname).then(dapp_info => {
							callSqlite(
								'updateWhitelistDapp',
								urlStr,
								content.title,
								content.desc,
								dapp_info ? dapp_info.chain : content.chain,
								content.img,
								Date.now()
							);
						});
					}
				}
				const checkHostname = new URL(data.url).hostname;
				if (checkHostname === currentHostname) {
					const safeLevel = data.safe_level;
					const safeDesc = data.safe_desc;
					const safeHosturl = checkHostname;
					if (safeLevel === 2 || safeLevel === 3) {
						callSqlite('updateBlacklistDapps', safeHosturl, safeLevel, safeDesc);
					}
					// setSafeLevel(safeLevel);
					// setsafeDesc(safeDesc);
					sendUmengEvent(safeLevel);
					const { current } = props.addressBarRef;
					if (current) {
						current.setSecurityInfo(safeLevel, safeHosturl, safeDesc);
						if (safeLevel === 2 || safeLevel === 3) {
							setTimeout(() => {
								current.showSecurityMenu();
							}, 200);
						}
					}
				}
			})
			.catch(e => {
				util.logDebug('error: ', e);
			});
	};

	const onLoadStart = async ({ nativeEvent }) => {
		if (nativeEvent.injectForThisURL) {
			const { current } = webviewRef;

			current && current.injectJavaScript(entryScriptWeb3 + SPA_urlChangeListener);
		}

		props.addressBarRef.current && props.addressBarRef.current.setInputEditing(false);
		load_start_called.current = true;
		webviewUrlPostMessagePromiseResolve.current = null;
		setError(false);
		setBackEnabled(nativeEvent.canGoBack);
		props.addressBarRef.current?.setBackEnabled(nativeEvent.canGoBack);
		setForwardEnabled(nativeEvent.canGoForward);
		updateUrlAndTitle(nativeEvent.url);
		icon.current = null;
		switchTestServer(nativeEvent.url);
		initBackgroundBridge(nativeEvent.url);
		checkSecurity(nativeEvent.url);
	};

	const onLoadProgress = ({ nativeEvent: { progress } }) => {
		setProgress(progress);
	};

	const onLoadEnd = ({ nativeEvent }) => {
		if (nativeEvent.loading) {
			return;
		}
		const { current } = webviewRef;
		let javascriptString = JS_WEBVIEW_URL;
		if (Device.isAndroid()) {
			javascriptString += JS_ANDROID_LONGPRESS_LOADEND;
		}
		current && current.injectJavaScript(javascriptString);

		const promiseResolver = resolve => {
			webviewUrlPostMessagePromiseResolve.current = resolve;
		};
		const promise = current ? new Promise(promiseResolver) : Promise.resolve(url);

		promise.then(info => {
			const { hostname: currentHostname } = new URL(url);
			const { hostname } = new URL(nativeEvent.url);
			if (info.url === nativeEvent.url && currentHostname === hostname) {
				setBackEnabled(nativeEvent.canGoBack);
				props.addressBarRef.current?.setBackEnabled(nativeEvent.canGoBack);
				setForwardEnabled(nativeEvent.canGoForward);
				updateUrlAndTitle(nativeEvent.url);
				if (info.icon) {
					icon.current = info.icon;
				}
				callSqlite('addBrowserHistory', nativeEvent.url, nativeEvent.title, info.icon);
			}
		});
		if (reload_once_when_load_end_url.current) {
			reload_once_when_load_end_url.current = null;
			setTimeout(() => reload(), 300);
		}
	};

	const onMessage = ({ nativeEvent }) => {
		let data = nativeEvent.data;

		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			if (!data || (!data.type && !data.name)) {
				return;
			}
			if (data.name) {
				backgroundBridges.current.forEach(bridge => {
					if (bridge.isMainFrame) {
						const { origin } = data && data.origin && new URL(data.origin);
						bridge.url === origin && bridge.onMessage(data);
					} else {
						bridge.url === data.origin && bridge.onMessage(data);
					}
				});
				return;
			}

			switch (data.type) {
				case 'GET_WEBVIEW_URL': {
					const { url } = data.payload;
					if (url === nativeEvent.url) {
						webviewUrlPostMessagePromiseResolve.current &&
							webviewUrlPostMessagePromiseResolve.current(data.payload);
					}
					break;
				}
				case 'NAVIGATION_STATE_CHANGED': {
					setBackEnabled(nativeEvent.canGoBack);
					props.addressBarRef.current?.setBackEnabled(nativeEvent.canGoBack);
					setForwardEnabled(nativeEvent.canGoForward);
					break;
				}
				case 'IMG_LONG_PRESS': {
					setShowPopup(true);
					setImageData(data.url);
					break;
				}
				case 'GET_DEVICE_ID': {
					if (webCallAllowed(nativeEvent.url)) {
						data.deviceId = getDeviceId();
					}
					const { current } = webviewRef;
					current && current.postMessage(JSON.stringify(data));
					break;
				}
				case 'GET_CHANNEL': {
					if (webCallAllowed(nativeEvent.url)) {
						data.channel = getChannel();
					}
					const { current } = webviewRef;
					current && current.postMessage(JSON.stringify(data));
					break;
				}
				case 'GET_APP_VERSION': {
					if (webCallAllowed(nativeEvent.url)) {
						data.appVersion = getAppVersion();
					}
					const { current } = webviewRef;
					current && current.postMessage(JSON.stringify(data));
					break;
				}
				case 'GET_APP_VERSION_CODE': {
					if (webCallAllowed(nativeEvent.url)) {
						data.appVersionCode = getAppVersionCode();
					}
					const { current } = webviewRef;
					current && current.postMessage(JSON.stringify(data));
					break;
				}
				case 'GET_DEVICE_INFO': {
					if (webCallAllowed(nativeEvent.url)) {
						data.deviceInfo = getDeviceInfo();
					}
					const { current } = webviewRef;
					current && current.postMessage(JSON.stringify(data));
					break;
				}
				case 'GET_MAIN_ADDRESS': {
					if (webCallAllowed(nativeEvent.url)) {
						const { KeyringController } = Engine.context;
						KeyringController.getAccounts()
							.then(accounts => {
								data.mainAddress = accounts[0];
								const { current } = webviewRef;
								current && current.postMessage(JSON.stringify(data));
							})
							.catch(e => {
								util.logError('PPYang getMainAddress fail, e:', e);
							});
					} else {
						const { current } = webviewRef;
						current && current.postMessage(JSON.stringify(data));
					}
					break;
				}
				case 'AES_ENCRYPT': {
					if (webCallAllowed(nativeEvent.url)) {
						encrypt(data.data)
							.then(result => {
								data.encryptData = result;
								const { current } = webviewRef;
								current && current.postMessage(JSON.stringify(data));
							})
							.catch(e => {
								util.logError('PPYang encrypt fail, e:', e);
							});
					} else {
						const { current } = webviewRef;
						current && current.postMessage(JSON.stringify(data));
					}
					break;
				}
				case 'AES_ENCRYPT_STRING': {
					if (webCallAllowed(nativeEvent.url)) {
						encryptString(data.data)
							.then(result => {
								data.encryptData = result;
								const { current } = webviewRef;
								current && current.postMessage(JSON.stringify(data));
							})
							.catch(e => {
								util.logError('PPYang encryptString fail, e:', e);
							});
					} else {
						const { current } = webviewRef;
						current && current.postMessage(JSON.stringify(data));
					}
					break;
				}
				case 'AES_DECRYPT': {
					if (webCallAllowed(nativeEvent.url)) {
						decrypt(data.data)
							.then(result => {
								data.decryptData = result;
								const { current } = webviewRef;
								current && current.postMessage(JSON.stringify(data));
							})
							.catch(e => {
								util.logError('PPYang decrypt fail, e:', e);
							});
					} else {
						const { current } = webviewRef;
						current && current.postMessage(JSON.stringify(data));
					}
					break;
				}
			}
		} catch (e) {
			util.logError(e, `Browser::onMessage on ${url}`);
		}
	};

	const renderProgressBar = () => (
		<View style={styles.progressBarWrapper}>
			<WebviewProgressBar progress={progress} />
		</View>
	);

	const onError = ({ nativeEvent: errorInfo }) => {
		util.logError('BrowserTab onError', errorInfo);
		setError(errorInfo);
	};

	const onSaveClick = async () => {
		try {
			await checkPermissionAndSave(imageData);
			setShowPopup(false);
		} catch (error) {
			util.logError('Browser save image --> ', error);
		}
	};

	const renderPopup = () => (
		<TouchableOpacity style={styles.popupBg} activeOpacity={1} onPress={() => setShowPopup(false)}>
			<View style={styles.popupContent}>
				<TouchableOpacity style={styles.saveBtn} onPress={onSaveClick} activeOpacity={0.6}>
					<Text style={styles.btnText}>{strings('permission.save_picture')}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.saveBtn} onPress={() => setShowPopup(false)} activeOpacity={0.6}>
					<Text style={styles.btnText}>{strings('permission.cancel')}</Text>
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	);

	const hideMoreModal = () => {
		setMoreModalVisible(false);
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const showMoreModal = () => {
		setMoreModalVisible(true);
	};

	const selectDappNetwork = chainType => {
		setChainType(chainType);
		hideMoreModal();
	};

	const setSelectedAddress = async address => {
		const { PreferencesController } = Engine.context;
		await PreferencesController.setSelectedAddress(address);
	};

	const getFavicon = async url => {
		const hName = new URL(url).hostname;
		const dapp = await callSqlite('getWhitelistDapp', url, hName);
		if (dapp?.img) {
			return dapp?.img;
		}
		const history = await callSqlite('getBrowserHistory');
		for (const subHistory of history) {
			const hostName = new URL(subHistory.url).hostname;
			if (hostName === hName) {
				if (subHistory.icon) {
					return subHistory.icon;
				}
			}
		}
		return 'https://' + new URL(url).hostname + '/favicon.ico';
	};

	const addFavouriteDapp = async () => {
		const logo = await getFavicon(url);
		props.addFavouriteDapp({
			url,
			name: title,
			chain: chainTypeTochain(chain_type.current),
			logo
		});
		props.toggleShowHint(strings('browser.added_to_favourites'));
	};

	const renderMoreModal = () => {
		let isAddFavorite = false;
		let { favouriteDapps } = props;
		if (favouriteDapps.length > 0) {
			favouriteDapps = favouriteDapps.filter(dapp => !dapp.del);
			if (favouriteDapps.length > 0) {
				favouriteDapps = favouriteDapps.sort((dappA, dappB) => dappB.pos <= dappA.pos);
				if (url && !showHomepage) {
					const hostname = String(new URL(url).hostname);
					if (
						favouriteDapps.find(
							item =>
								item.hostname === hostname &&
								(!item.chain || item.chain === chainTypeTochain(chain_type.current))
						)
					) {
						isAddFavorite = true;
					}
				}
			}
		}
		const favoriteIcon = isAddFavorite
			? require('../../../images/ic_favorites_y.png')
			: require('../../../images/ic_defi_favourite.png');

		const toolImgSource = [
			require('../../../images/ic_defi_home.png'),
			favoriteIcon,
			require('../../../images/ic_defi_refresh.png'),
			require('../../../images/ic_defi_close.png'),
			require('../../../images/ic_defi_share.png'),
			require('../../../images/ic_defi_network.png'),
			require('../../../images/ic_defi_copy.png')
		];
		const toolIconSource = ['home', 'staro', 'sync', 'close', 'export', 'earth', 'copy1'];

		const toolName = [
			'browser.home',
			'browser.favourite',
			'browser.refresh',
			'browser.close_tab',
			'browser.share',
			'browser.open_in_browser',
			'browser.copy_link'
		];

		let firstItem = 0;
		const contactEntrys = [];
		Object.values(props.identities).forEach((value, index) => {
			if (value.address === props.selectedAddress) {
				firstItem = index;
			}
			contactEntrys.push(value);
		});

		return (
			<Modal
				isVisible={!props.isLockScreen}
				onBackdropPress={hideMoreModal}
				onBackButtonPress={hideMoreModal}
				onSwipeComplete={hideMoreModal}
				statusBarTranslucent
				style={styles.bottomModal}
				animationType="fade"
				useNativeDriver
			>
				<View>
					<View style={[styles.moreModalWrapper, isDarkMode && baseStyles.darkBackground]}>
						<View style={styles.moreModalContainer}>
							<ScrollView
								horizontal
								style={styles.scrollView}
								showsHorizontalScrollIndicator={false}
								keyboardShouldPersistTaps="handled"
							>
								<View style={styles.row}>
									{toolName.map((item, index) => (
										<TouchableOpacity
											key={'tool-' + index}
											style={styles.touchItem}
											onPress={() => {
												hideMoreModal();
												if (item === 'browser.home') {
													go(HOMEPAGE_URL);
												} else if (item === 'browser.favourite') {
													if (url && !showHomepage) {
														if (isAddFavorite) {
															props.removeFavouriteDapp({
																url,
																name: title,
																chain: chainTypeTochain(chain_type.current)
															});
															props.toggleShowHint(
																strings('browser.removed_from_favourites')
															);
														} else {
															addFavouriteDapp();
														}
													}
												} else if (item === 'browser.close_tab') {
													props.closeTab && props.closeTab(props.tabId);
												} else if (item === 'browser.refresh') {
													reload();
												} else if (item === 'browser.share') {
													setTimeout(() => {
														if (Platform.OS === 'ios') {
															Share.share({ message: title, url });
														} else {
															Share.share({ message: url, title });
														}
													}, 100);
												} else if (item === 'browser.open_in_browser') {
													Linking.openURL(url);
												} else if (item === 'browser.copy_link') {
													Clipboard.setString(url);
													props.showAlert({
														isVisible: true,
														autodismiss: 1500,
														content: 'clipboard-alert',
														data: {
															msg: strings('browser.link_copied')
														}
													});
												}
											}}
										>
											{isDarkMode ? (
												<AntIcon
													name={toolIconSource[index]}
													color={isDarkMode ? colors.white : colors.paliGrey200}
													size={20}
												/>
											) : (
												<Image source={toolImgSource[index]} />
											)}
											<Text
												style={[styles.text1, isDarkMode && baseStyles.textDark]}
												allowFontScaling={false}
											>
												{strings(item)}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</ScrollView>
							<View style={styles.dappLine} />
							<View style={styles.dappNetLayout}>
								<View>
									<Text style={[styles.dappTitle, isDarkMode && baseStyles.textDark]}>
										{strings('browser.dapp_network')}
									</Text>
									<ScrollView
										ref={networkScrollviewRef}
										horizontal
										showsHorizontalScrollIndicator={false}
										keyboardShouldPersistTaps="handled"
										onContentSizeChange={(contentWidth, contentHeight) => {
											const { current } = networkScrollviewRef;
											if (current) {
												let itemIndex = 0;
												props.allChains.forEach((item, index) => {
													if (chain_type.current === item) {
														itemIndex = index;
														return;
													}
												});
												const left = (contentWidth * itemIndex) / props.allChains.length;
												current.scrollTo({ x: left, animated: false });
											}
										}}
									>
										<View style={styles.dappNetScroll}>
											{props.allChains.map((item, index) => {
												const isRpc = getIsRpc(item);
												return (
													<TouchableOpacity
														key={'defi-net-' + index}
														activeOpacity={activeOpacity}
														style={[
															styles.dappNetTouchItem,
															styles.itemSpace,
															isDarkMode && baseStyles.darkCardBackground,
															chain_type.current === item &&
																styles.dappNetTouchItemSeleted
														]}
														onPress={() => {
															selectDappNetwork(item);
														}}
													>
														{isRpc ? (
															getDefiIcon(item)
														) : (
															<Image source={ChainTypeBgDefi[ChainTypes.indexOf(item)]} />
														)}
														<Text
															allowFontScaling={false}
															numberOfLines={1}
															style={[
																styles.dappNetName,
																isDarkMode && baseStyles.textDark,
																chain_type.current === item && styles.dappNetNameSeleted
															]}
														>
															{isRpc ? getRpcName(item) : getChainTypeName(item)}
														</Text>
													</TouchableOpacity>
												);
											})}
										</View>
									</ScrollView>
								</View>
							</View>

							<View style={styles.dappLine} />
							<View style={styles.dappAccountLayout}>
								<View>
									<Text style={[styles.dappTitle, isDarkMode && baseStyles.textDark]}>
										{strings('browser.dapp_account')}
									</Text>
									<ScrollView
										ref={addressScrollviewRef}
										horizontal
										showsHorizontalScrollIndicator={false}
										onContentSizeChange={(contentWidth, contentHeight) => {
											const { current } = addressScrollviewRef;
											if (current) {
												const left = (contentWidth * firstItem) / contactEntrys.length;
												current.scrollTo({ x: left, animated: false });
											}
										}}
										keyboardShouldPersistTaps="handled"
									>
										<View style={styles.dappAccountScroll}>
											{contactEntrys.map((item, index) => (
												<TouchableOpacity
													activeOpacity={activeOpacity}
													key={'dapp-account-' + index}
													style={[
														styles.dappAccountTouchItem,
														styles.itemSpace,
														isDarkMode && baseStyles.darkCardBackground,
														index === firstItem && styles.dappAccountTouchItemSeleted
													]}
													onPress={() => {
														setSelectedAddress(item.address);
														hideMoreModal();
														reload();
													}}
												>
													<Text
														style={[
															styles.dappAccountName,
															isDarkMode && baseStyles.textDark,
															index === firstItem && styles.dappAccountNameSeleted
														]}
														allowFontScaling={false}
														numberOfLines={1}
													>
														{item.name}
													</Text>
													<Text
														style={[
															styles.dappAccountAddress,
															isDarkMode && baseStyles.subTextDark,
															index === firstItem && styles.dappAccountAddressSeleted
														]}
														allowFontScaling={false}
														numberOfLines={1}
														ellipsizeMode={'middle'}
													>
														{item.address}
													</Text>
												</TouchableOpacity>
											))}
										</View>
									</ScrollView>
								</View>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		);
	};

	const onAddChainModalCancel = () => {
		setAddChainModalVisible(false);
		util.logDebug('leon.w@ user canceld to add chain', add_chain_request.current);
		add_chain_request.current = null;
	};

	const onAddChainModalConfirm = async () => {
		setAddChainModalVisible(false);
		try {
			const { nickname, rpcTarget, chainId, ticker, explorerUrl } = add_chain_request.current;
			const type = await Engine.networks[ChainType.RPCBase].addNetwork(
				nickname,
				rpcTarget,
				chainId,
				ticker,
				explorerUrl
			);
			await Engine.context.PreferencesController.addRpcChain(props.selectedAddress, type);
			if (type !== chain_type.current) {
				setTimeout(() => setChainType(type), 100);
			}
		} catch (e) {
			util.logDebug('leon.w@ add chain error: ', e, add_chain_request.current);
		}
		add_chain_request.current = null;
	};

	const renderAddChainModal = () => {
		return (
			<Modal
				isVisible={!props.isLockScreen}
				statusBarTranslucent
				style={styles.bottomModal}
				animationType="fade"
				useNativeDriver
			>
				<View style={[styles.addChainModalWrapper, isDarkMode && baseStyles.darkModalBackground]}>
					<Text style={[styles.addChainModalTitle, isDarkMode && baseStyles.textDark]}>
						{strings('app_settings.add_custom_network_label')}
					</Text>
					<View style={styles.addChainModalSubTitleWrapper}>
						<NFTImage
							style={styles.addChainModalSubIcon}
							imageUrl={icon.current}
							defaultImg={require('../../../images/browser.png')}
						/>
						<Text style={styles.addChainModalSubTitle}>{url}</Text>
					</View>
					<View style={styles.addChainModalLine} />
					<View style={styles.addChainModalItemWrapper}>
						<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('app_settings.network_name_label')}
						</Text>
						<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
							{add_chain_request.current?.nickname}
						</Text>
					</View>
					<View style={styles.addChainModalItemWrapper}>
						<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('app_settings.network_rpc_url_label')}
						</Text>
						<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
							{add_chain_request.current?.rpcTarget}
						</Text>
					</View>
					<View style={styles.addChainModalItemWrapper}>
						<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('app_settings.network_chain_id_label')}
						</Text>
						<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
							{add_chain_request.current?.chainId}
						</Text>
					</View>
					<View style={styles.addChainModalItemWrapper}>
						<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('app_settings.network_symbol_label')}
						</Text>
						<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
							{add_chain_request.current?.ticker}
						</Text>
					</View>
					<View style={styles.addChainModalItemWrapper}>
						<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('app_settings.network_explorer_label')}
						</Text>
						<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
							{add_chain_request.current?.explorerUrl}
						</Text>
					</View>
					<View style={styles.addChainModalActionWrapper}>
						<TouchableOpacity style={styles.addChainModalCancel} onPress={onAddChainModalCancel}>
							<Text style={styles.addChainModalCancelText}>{strings('transaction.reject')}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.addChainModalConfirm} onPress={onAddChainModalConfirm}>
							<Text style={styles.addChainModalConfirmText}>{strings('transaction.confirm')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		);
	};

	const panResponder = PanResponder.create({
		onStartShouldSetPanResponder: (evt, gestureState) => true,
		onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
		onMoveShouldSetPanResponder: (evt, gestureState) => false,
		onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,
		onPanResponderTerminationRequest: (evt, gestureState) => false,
		onShouldBlockNativeResponder: (evt, gestureState) => false,
		onPanResponderRelease: (evt, gestureState) => {
			const { current } = props.addressBarRef;
			if (!current) {
				return;
			}
			if (
				gestureState.x0 < 30 &&
				gestureState.dx > 50 &&
				(Math.abs(gestureState.dy) < 30 || gestureState.dx > Math.abs(gestureState.dy) * 1.6)
			) {
				if (Platform.OS === 'ios') {
					if (!backEnabled) {
						setAnimToHome(true);
						current.backPress();
						setTimeout(() => {
							setAnimToHome(false);
						}, 300);
					}
				} else {
					current.backPress();
				}
			} else if (
				Platform.OS !== 'ios' &&
				forwardEnabled &&
				gestureState.x0 > Device.getDeviceWidth() - 30 &&
				gestureState.dx < -50 &&
				(Math.abs(gestureState.dy) < 30 || Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6)
			) {
				const { current } = webviewRef;
				current && current.goForward();
			}
		}
	});

	useEffect(() => {
		const onBack = () => {
			if (backEnabled) {
				goBack();
				return true;
			} else if (!showHomepage) {
				go(HOMEPAGE_URL);
				return true;
			}
		};

		const handleAndroidBackPress = () => {
			if (!isTabActive()) {
				return false;
			}
			if (!props.navigation.isFocused()) {
				return false;
			}
			const { current } = props.addressBarRef;
			if (current) {
				if (current.getIsInputEditing()) {
					return current.backPress();
				}
			}
			return onBack();
		};

		const addressbarState = msg => {
			if (!isTabActive()) {
				return false;
			}
			if (msg.state === 'back') {
				return onBack();
			} else if (msg.state === 'more') {
				showMoreModal();
			} else if (msg.state === 'goHome') {
				go(HOMEPAGE_URL);
			} else if (msg.state === 'go') {
				go(msg.url, msg.title);
			}
		};

		BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);
		DeviceEventEmitter.addListener('AddressbarStateEmitter', addressbarState);

		if (!initListener) {
			// Handle hardwareBackPress event only for browser, not components rendered on top
			props.navigation.addListener('willFocus', () => {
				BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);
				DeviceEventEmitter.addListener('AddressbarStateEmitter', addressbarState);
			});
			props.navigation.addListener('willBlur', () => {
				BackHandler.removeEventListener('hardwareBackPress', handleAndroidBackPress);
				DeviceEventEmitter.removeAllListeners('AddressbarStateEmitter');
			});
			setInitListener(true);
		}
		return function cleanup() {
			BackHandler.removeEventListener('hardwareBackPress', handleAndroidBackPress);
			DeviceEventEmitter.removeAllListeners('AddressbarStateEmitter');
		};
	}, [backEnabled, go, goBack, initListener, isTabActive, props.addressBarRef, props.navigation, showHomepage]);

	const handleScroll = event => {
		if (Device.isIos()) {
			if (event.nativeEvent.contentOffset.y <= 5) {
				!refreshEnable && setRefreshEnable(true);
			} else {
				refreshEnable && setRefreshEnable(false);
			}
		}
	};
	const handleRefresh = () => {
		setRefreshing(true);
		reload();
		setTimeout(() => {
			setRefreshing(false);
		}, 1000);
	};

	/**
	 * Main render
	 */

	return (
		<View style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}>
			<View style={styles.webview}>
				{(!showHomepage || animToHome) && !!entryScriptWeb3 && (
					<ScrollView
						refreshControl={
							<RefreshControl refreshing={refreshing} enabled={refreshEnable} onRefresh={handleRefresh} />
						}
						showsVerticalScrollIndicator={false}
						scrollEnabled={refreshEnable}
						contentContainerStyle={styles.flexOne}
					>
						<WebView
							{...panResponder.panHandlers}
							ref={webviewRef}
							setSupportMultipleWindows={false}
							renderError={() => <WebviewError error={error} onReload={reload} />}
							source={{ uri: initialUrl }}
							injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
							injectedJavaScript={entryScriptVConsole}
							style={[
								styles.webview,
								// eslint-disable-next-line react-native/no-inline-styles
								animToHome && { left: Device.getDeviceWidth(), index: 10000 },
								isDarkMode && baseStyles.darkBackground
							]}
							onLoadStart={onLoadStart}
							onLoadEnd={onLoadEnd}
							onLoadProgress={onLoadProgress}
							onMessage={onMessage}
							onError={onError}
							onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
							originWhitelist={['http://*', 'https://*', 'wc:', 'paliwallet://']}
							userAgent={USER_AGENT}
							sendCookies
							javascriptEnabled
							allowsInlineMediaPlayback
							allowsLinkPreview
							useWebkit
							allowsBackForwardNavigationGestures
							onScroll={handleScroll}
						/>
					</ScrollView>
				)}
				{showHomepage && (
					<HomePage style={styles.homepage} openUrl={openHomepageUrl} navigation={props.navigation} />
				)}

				{showPopup && renderPopup()}
			</View>
			{renderProgressBar()}
			{moreModalVisible && renderMoreModal()}
			{addChainModalVisible && renderAddChainModal()}
		</View>
	);
};

BrowserTab.propTypes = {
	navigation: PropTypes.object,
	selectedAddress: PropTypes.string,
	useTestServer: PropTypes.bool,
	setUseTestServer: PropTypes.func,
	toggleShowHint: PropTypes.func,
	defaultChainTypes: PropTypes.object,
	identities: PropTypes.object,
	showAlert: PropTypes.func,
	isLockScreen: PropTypes.bool,
	onMomentumScrollEnd: PropTypes.func,
	onMomentumScrollBegin: PropTypes.func,
	onGestureEvent: PropTypes.any,
	tabId: PropTypes.number,
	updateTab: PropTypes.func,
	initialUrl: PropTypes.string,
	closeTab: PropTypes.func,
	newTab: PropTypes.func,
	favouriteDapps: PropTypes.array,
	addFavouriteDapp: PropTypes.func,
	removeFavouriteDapp: PropTypes.func,
	addressBarRef: PropTypes.object,
	allChains: PropTypes.array
};

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	useTestServer: state.settings.useTestServer,
	defaultChainTypes: state.browser.defaultChainTypesV2,
	identities: state.engine.backgroundState.PreferencesController.identities,
	isLockScreen: state.settings.isLockScreen,
	favouriteDapps: state.browser.favouriteDapps,
	allChains: state.engine.backgroundState.PreferencesController.allChains || []
});

const mapDispatchToProps = dispatch => ({
	setUseTestServer: useTestServer => dispatch(SetUseTestServer(useTestServer)),
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText)),
	showAlert: config => dispatch(showAlert(config)),
	addFavouriteDapp: dapp => dispatch(addFavouriteDapp(dapp)),
	removeFavouriteDapp: dapp => dispatch(removeFavouriteDapp(dapp)),
	updateTab: (id, url) => dispatch(updateTab(id, url))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigation(BrowserTab));
