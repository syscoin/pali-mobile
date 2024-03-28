import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	AppState,
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	DeviceEventEmitter,
	Image,
	Linking,
	Platform,
	NativeEventEmitter
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import GlobalAlert from '../UI/GlobalAlert';
import BackgroundTimer from 'react-native-background-timer';
import Approval from '../Views/Approval';
import NotificationManager from '../../core/NotificationManager';
import Engine from '../../core/Engine';
import AppConstants from '../../core/AppConstants';
import { baseStyles, colors, fontStyles } from '../../styles/common';
import WC2Manager from '../../../app/core/WalletConnect/WalletConnectV2';
import FadeOutOverlay from '../UI/FadeOutOverlay';
import {
	hexToBN,
	getChainTypeByChainId,
	getTokenDecimals,
	getAssetSymbol,
	calcAllAddressPrices,
	getTickerByType
} from '../../util/number';
import { setEtherTransaction, setTransactionObject } from '../../actions/transaction';
import PersonalSign from '../UI/PersonalSign';
import TypedSign from '../UI/TypedSign';
import Modal from 'react-native-modal';
import { util, CrossChainType, BN, ChainType, OnEventTag } from 'paliwallet-core';
import { strings } from '../../../locales/i18n';

import {
	getMethodData,
	TOKEN_METHOD_TRANSFER,
	decodeTransferData,
	APPROVE_FUNCTION_SIGNATURE,
	equalMethodId,
	POLYGON_ERC20_WITHDRAW_FUNCTION_SIGNATURE
} from '../../util/transactions';
import { safeToChecksumAddress } from '../../util/address';
import MessageSign from '../UI/MessageSign';
import Approve from '../Views/ApproveView/Approve';
import TransactionTypes from '../../core/TransactionTypes';
import Notification from '../UI/Notification';
import TransactionTips from '../UI/TransactionTips';
import { showTransactionNotification, showSimpleNotification } from '../../actions/notification';
import {
	toggleDappTransactionModal,
	toggleApproveModal,
	toggleApproveModalInModal,
	toggleOngoingTransactionsModal
} from '../../actions/modals';
import AccountApproval from '../UI/AccountApproval';
import MainNavigator from './MainNavigator';
import QrScanner from '../Views/QRScanner';
import HintView from '../UI/HintView';
import NFTImage from '../UI/NFTImage';
import { hideScanner } from '../../actions/scanner';
import OngoingTransactions from '../UI/OngoingTransactions';
import ShareImageView from '../UI/ShareImageView';
import { onEvent, onEventWithMap } from '../../util/statistics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersionCode } from '../../util/ApiClient';
import Device from '../../util/Device';
import {
	BIOMETRY_CHOICE_DISABLED,
	STORAGE_NEW_VERSION_CODE,
	STORAGE_UPDATE_VERSION_SHOW_MODAL
} from '../../constants/storage';
import { launchAppInGooglePlay, supportGooglePlay, jumpIosApp } from '../../util/NativeUtils';
import PushNotification from 'react-native-push-notification';
import SharedDeeplinkManager from '../../core/DeeplinkManager';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { updateLockScreen } from '../../actions/settings';
import WalletConnectList from '../UI/WalletConnectList';
import { hideWalletConnectList, showWalletConnectIcon, hideWalletConnectIcon } from '../../actions/walletconnect';
import { toggleShowHint } from '../../actions/hint';
import { logDebug } from 'paliwallet-core/dist/util';
import SecureKeychain from '../../core/SecureKeychain';
import { isMainnetChain } from '../../util/ControllerUtils';
import { useTheme } from '../../theme/ThemeProvider';
import AntIcon from 'react-native-vector-icons/AntDesign';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	animation: {
		width: 52,
		height: 52
	},
	navigatorView: {
		paddingBottom: Device.isIphone14ProOrMax() ? 34 : 0,
		flex: 1
	},
	shareView: {
		position: 'absolute',
		top: 0,
		left: -1000
	},
	versionModal: {
		backgroundColor: colors.white,
		borderRadius: 10,
		width: 280,
		height: 300,
		alignSelf: 'center',
		alignItems: 'center'
	},
	closeTouch: {
		height: 34,
		width: 43,
		paddingTop: 10,
		paddingRight: 19,
		alignSelf: 'flex-end'
	},
	newVersion: {
		fontSize: 20,
		...fontStyles.bold,
		color: colors.$030319,
		marginTop: 14
	},
	versionName: {
		fontSize: 16,
		color: colors.$030319,
		marginBottom: 20,
		marginTop: 4
	},
	line: {
		backgroundColor: colors.$F0F0F0,
		width: '100%',
		height: 0.5
	},
	touchBtn: {
		height: 50,
		width: 240,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	updateNow: {
		fontSize: 16,
		color: colors.brandPink300
	},
	viewDetail: {
		fontSize: 16,
		color: colors.$60657D
	},
	notifyModalContainer: {
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		flexDirection: 'row',
		paddingVertical: 27,
		paddingHorizontal: 26,
		width: '80%'
	},
	notifyTitle: {
		color: colors.$030319,
		fontSize: 18,
		...fontStyles.bold,
		alignSelf: 'center',
		marginBottom: 12,
		textAlign: 'center'
	},
	notifyDesc: {
		color: colors.$60657D,
		fontSize: 13,
		alignSelf: 'center',
		lineHeight: 20
	},
	notifyTouchOk: {
		marginTop: 10,
		height: 44,
		marginBottom: -10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	notifyOkLabel: {
		fontSize: 16,
		color: colors.$030319
	},
	modalMarginTop: {
		marginTop: 120
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
	}
});

const Main = props => {
	const [connected, setConnected] = useState(true);
	const [signMessage, setSignMessage] = useState(false);
	const [signMessageParams, setSignMessageParams] = useState({ data: '' });
	const [signType, setSignType] = useState(false);
	const [walletConnectRequest, setWalletConnectRequest] = useState(false);
	const [walletConnectRequestInfo, setWalletConnectRequestInfo] = useState({});
	const [currentPageTitle, setCurrentPageTitle] = useState('');
	const [currentPageUrl, setCurrentPageUrl] = useState('');
	const [allSession, setAllSession] = useState({});
	const [isAddChainModalVisible, setIsAddChainModalVisible] = useState(false);
	const [addChainInfo, setAddChainInfo] = useState('');
	const [reloadCounter, setReloadCounter] = useState(0);

	const backgroundMode = useRef(false);
	const removeConnectionStatusListener = useRef();

	const lockTimer = useRef(null);

	const setTransactionObject = props.setTransactionObject;
	const toggleApproveModal = props.toggleApproveModal;
	const toggleApproveModalInModal = props.toggleApproveModalInModal;
	const toggleDappTransactionModal = props.toggleDappTransactionModal;
	const setEtherTransaction = props.setEtherTransaction;
	const toggleOngoingTransactionsModal = props.toggleOngoingTransactionsModal;
	const { toggleShowHint } = props;
	const [showUpdateModal, setShowUpdateModal] = useState(false);

	const [showShareViewType, setShowShareViewType] = useState(null);

	const [showNotificationModal, setShowNotificationModal] = useState(false);
	const [notificationTitle, setNotificationTitle] = useState('');
	const [notificationMessage, setNotificationMessage] = useState('');
	const [notificationUrl, setNotificationUrl] = useState('');
	const { isDarkMode } = useTheme();

	const pollForIncomingTransactions = useCallback(async () => {
		await Engine.refreshTransactionHistory();
		// Stop polling if the app is in the background
		if (!backgroundMode.current) {
			setTimeout(() => {
				pollForIncomingTransactions();
			}, AppConstants.TX_CHECK_NORMAL_FREQUENCY);
		}
	}, [backgroundMode]);

	const onUnapprovedMessage = (messageParams, type) => {
		const { title: currentPageTitle, url: currentPageUrl } = messageParams.meta;
		delete messageParams.meta;
		setSignMessageParams(messageParams);
		setSignType(type);
		setCurrentPageTitle(currentPageTitle);
		setCurrentPageUrl(currentPageUrl);
		setSignMessage(true);
	};

	const connectionChangeHandler = useCallback(
		state => {
			if (!state) {
				return;
			}
			const { isConnected } = state;
			// Show the modal once the status changes to offline
			if (connected && isConnected === false) {
				//props.navigation.navigate('OfflineModeView');
			}
			if (connected !== isConnected && isConnected !== null) {
				setConnected(isConnected);
			}
		},
		[connected, setConnected]
	);

	const getAssetByType = useCallback((chainId, form, to) => {
		const { allTokens } = Engine.context.AssetsController.state;
		const tokens = allTokens[form]?.[chainId] || [];
		return tokens.find(({ address }) => address === to);
	}, []);

	const onUnapprovedTransaction = useCallback(
		async transactionMeta => {
			if (transactionMeta.origin === TransactionTypes.MMM) {
				return;
			}
			const {
				transaction: { value, gas, gasPrice, data, chainId }
			} = transactionMeta;
			const to = safeToChecksumAddress(transactionMeta.transaction.to);
			util.logDebug('PPYang onUnapprovedTransaction to:', to, data, chainId, transactionMeta.origin);

			if (!transactionMeta.origin) {
				const arbEthParam = await Engine.contracts[ChainType.Arbitrum].getdepositETHMethodId();
				const arbParam = await Engine.contracts[ChainType.Arbitrum].getdepositMethodId();
				if (
					(equalMethodId(data, arbEthParam[1]) && arbEthParam[0] === to) ||
					(equalMethodId(data, arbParam[1]) && arbParam[0] === to)
				) {
					let extraInfo = transactionMeta.extraInfo;
					if (!extraInfo) {
						extraInfo = {};
					}
					extraInfo.crossChainType = CrossChainType.depositArb;
					extraInfo.crossChainDone = true;
					transactionMeta.extraInfo = extraInfo;
					DeviceEventEmitter.emit('MigrateTransactionMeta', transactionMeta);
					return;
				}

				const withdrawEthParam = await Engine.contracts[ChainType.Arbitrum].getwithdrawETHMethodId();
				const withdrawParam = await Engine.contracts[ChainType.Arbitrum].getwithdrawERC20MethodId();
				if (
					(equalMethodId(data, withdrawEthParam[1]) && withdrawEthParam[0] === to) ||
					(equalMethodId(data, withdrawParam[1]) && withdrawParam[0] === to)
				) {
					let extraInfo = transactionMeta.extraInfo;
					if (!extraInfo) {
						extraInfo = {};
					}
					extraInfo.crossChainType = CrossChainType.withdrawArb;
					extraInfo.crossChainDone = true;
					transactionMeta.extraInfo = extraInfo;
					DeviceEventEmitter.emit('MigrateTransactionMeta', transactionMeta);
					return;
				}

				const polygonEthParam = await Engine.contracts[ChainType.Polygon].getdepositEtherForUserMethodId();
				const polygonParam = await Engine.contracts[ChainType.Polygon].getdepositERC20ForUserMethodId();
				const polygonParam2 = await Engine.contracts[ChainType.Polygon].getdepositERC20ForUserMethodId2();
				if (
					(equalMethodId(data, polygonEthParam[1]) && polygonEthParam[0] === to) ||
					(equalMethodId(data, polygonParam[1]) && polygonParam[0] === to) ||
					(equalMethodId(data, polygonParam2[1]) && polygonParam2[0] === to)
				) {
					let extraInfo = transactionMeta.extraInfo;
					if (!extraInfo) {
						extraInfo = {};
					}
					extraInfo.crossChainType = CrossChainType.depositPolygon;
					extraInfo.crossChainDone = false;
					transactionMeta.extraInfo = extraInfo;
					DeviceEventEmitter.emit('MigrateTransactionMeta', transactionMeta);
					return;
				}

				if (
					transactionMeta.chainId === Engine.networks[ChainType.Polygon].state.provider.chainId &&
					data &&
					data.substr(0, 10) === POLYGON_ERC20_WITHDRAW_FUNCTION_SIGNATURE
				) {
					let extraInfo = transactionMeta.extraInfo;
					if (!extraInfo) {
						extraInfo = {};
					}
					extraInfo.crossChainType = CrossChainType.withdrawPolygon;
					extraInfo.crossChainDone = true;
					transactionMeta.extraInfo = extraInfo;
					DeviceEventEmitter.emit('MigrateTransactionMeta', transactionMeta);
					return;
				}
			}

			const polygonExitParam = await Engine.contracts[ChainType.Polygon].getexitERC20MethodId();
			if (equalMethodId(data, polygonExitParam[1]) && polygonExitParam[0] === to) {
				transactionMeta.origin = TransactionTypes.ORIGIN_CLAIM;
			}

			const claimParam = await Engine.contracts[ChainType.Arbitrum].getexecuteTransactionMethodId();
			if (equalMethodId(data, claimParam[2]) && (claimParam[0] === to || claimParam[1] === to)) {
				transactionMeta.origin = TransactionTypes.ORIGIN_CLAIM;
			}

			transactionMeta.transaction.gas = hexToBN(gas);
			transactionMeta.transaction.gasPrice = hexToBN(gasPrice);

			if (
				(value === '0x0' || !value) &&
				data &&
				data !== '0x' &&
				to &&
				(await getMethodData(data)).name === TOKEN_METHOD_TRANSFER
			) {
				const from = safeToChecksumAddress(transactionMeta.transaction.from);
				const type = getChainTypeByChainId(transactionMeta.chainId);
				let asset = getAssetByType(transactionMeta.chainId, type, from, to);
				if (!asset) {
					try {
						asset = {};
						asset.decimals = await getTokenDecimals(type, to);
						asset.symbol = await getAssetSymbol(type, to);
					} catch (e) {
						// This could fail when requesting a transfer in other network
						asset = { symbol: 'ERC20', decimals: new BN(0) };
					}
				}

				const decodedData = decodeTransferData('transfer', data);
				transactionMeta.transaction.value = hexToBN(decodedData[2]);
				transactionMeta.transaction.to = decodedData[0];

				asset.type = type;
				setTransactionObject({
					type: 'INDIVIDUAL_TOKEN_TRANSACTION',
					selectedAsset: asset,
					id: transactionMeta.id,
					origin: transactionMeta.origin,
					...transactionMeta.transaction
				});
			} else if (transactionMeta.origin === TransactionTypes.ORIGIN_CLAIM) {
				transactionMeta.transaction.value = hexToBN(value);
				setTransactionObject({
					type: 'INDIVIDUAL_TOKEN_TRANSACTION',
					id: transactionMeta.id,
					origin: transactionMeta.origin,
					...transactionMeta.transaction
				});
			} else {
				const type = getChainTypeByChainId(transactionMeta.chainId);
				const ticker = getTickerByType(type);
				transactionMeta.transaction.value = hexToBN(value);

				setEtherTransaction({
					id: transactionMeta.id,
					origin: transactionMeta.origin,
					ticker,
					...transactionMeta.transaction
				});
			}

			if (data && data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE) {
				transactionMeta.origin === TransactionTypes.ORIGIN_MOVE_TO_L2 ||
				transactionMeta.origin === TransactionTypes.ORIGIN_CANCEL_APPROVAL
					? toggleApproveModalInModal()
					: toggleApproveModal();
			} else {
				toggleDappTransactionModal();
			}
		},
		[
			getAssetByType,
			setEtherTransaction,
			setTransactionObject,
			toggleApproveModal,
			toggleApproveModalInModal,
			toggleDappTransactionModal
		]
	);

	const showLoginView = useCallback(async () => {
		if (props && props.navigation) {
			const biometryChoice = !(await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED));
			const biometryType = await SecureKeychain.getSupportedBiometryType();
			const rememberMe = !biometryType && !biometryChoice && !!(await SecureKeychain.getGenericPassword());
			logDebug(
				'PPYang biometryChoice:',
				biometryChoice,
				' biometryType:',
				biometryType,
				' rememberMe:',
				rememberMe
			);
			if (!rememberMe) {
				props.updateLockScreen(true);
				setTimeout(() => {
					props.navigation.navigate('LoginView', { translate: 'forNoAnimation', path: 'Main' });
				}, 1);
			}
		}
	}, [props]);

	const handleAppStateChange = useCallback(
		appState => {
			const newModeIsBackground = appState === 'background';
			// If it was in background and it's not anymore
			// we need to stop the Background timer
			if (backgroundMode.current && !newModeIsBackground) {
				lockTimer.current = null;
				BackgroundTimer.stopBackgroundTimer();
				pollForIncomingTransactions();
				DeviceEventEmitter.emit('BackgroundMode', false);
			}

			backgroundMode.current = newModeIsBackground;

			const { TokenBalancesController } = Engine.context;
			TokenBalancesController.configure({ backgroundMode: newModeIsBackground });

			// If the app is now in background, we need to start
			// the background timer, which is less intense
			if (backgroundMode.current) {
				lockTimer.current = Date.now();
				BackgroundTimer.runBackgroundTimer(async () => {
					// logDebug('PPYang runBackgroundTimer time:', Date.now() - lockTimer.current);
					if (lockTimer.current && Date.now() - lockTimer.current >= 5 * 60 * 1000) {
						lockTimer.current = null;
						await showLoginView();
					}
					await Engine.refreshTransactionHistory();
				}, AppConstants.TX_CHECK_BACKGROUND_FREQUENCY);
				DeviceEventEmitter.emit('BackgroundMode', true);
			}
		},
		[showLoginView, pollForIncomingTransactions]
	);

	const onSignAction = () => setSignMessage(false);

	const renderSigningModal = () => (
		<Modal
			isVisible={signMessage && !props.isLockScreen}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={[styles.bottomModal]}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={onSignAction}
			onBackButtonPress={onSignAction}
			onSwipeComplete={onSignAction}
			swipeDirection={'down'}
			propagateSwipe
			useNativeDriver
		>
			{signType === 'personal' && (
				<PersonalSign
					messageParams={signMessageParams}
					onCancel={onSignAction}
					onConfirm={onSignAction}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
				/>
			)}
			{signType === 'typed' && (
				<TypedSign
					messageParams={signMessageParams}
					onCancel={onSignAction}
					onConfirm={onSignAction}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
				/>
			)}
			{signType === 'eth' && (
				<MessageSign
					navigation={props.navigation}
					messageParams={signMessageParams}
					onCancel={onSignAction}
					onConfirm={onSignAction}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
				/>
			)}
		</Modal>
	);

	const onWalletConnectSessionApproval = () => {
		setWalletConnectRequest(false);

		WC2Manager.hub.emit('walletconnectSessionRequest::approved', walletConnectRequestInfo);
		setTimeout(() => setWalletConnectRequestInfo({}), 500);

		setTimeout(() => {
			loadSessions();
		}, 1000);
	};

	const loadSessions = useCallback(async () => {
		const sessions = await WC2Manager.getWCSessions();

		setAllSession(sessions);
	}, [setAllSession]);

	useEffect(() => {
		loadSessions();
	}, [loadSessions]);

	const onWalletConnectSessionRejected = () => {
		setWalletConnectRequest(false);
		WC2Manager.hub.emit('walletconnectSessionRequest::rejected', walletConnectRequestInfo);
		setWalletConnectRequestInfo({});
	};

	const renderWalletConnectSessionRequestModal = () =>
		walletConnectRequestInfo && (
			<Modal
				isVisible={walletConnectRequest && !props.isLockScreen}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={onWalletConnectSessionRejected}
				onBackButtonPress={onWalletConnectSessionRejected}
				swipeDirection={'down'}
				propagateSwipe
				statusBarTranslucent
				useNativeDriver
			>
				<AccountApproval
					onCancel={onWalletConnectSessionRejected}
					onConfirm={onWalletConnectSessionApproval}
					currentPageInformation={walletConnectRequestInfo}
				/>
			</Modal>
		);

	const renderWalletConnectListModal = () =>
		props.walletConnectListVisible && (
			<Modal
				isVisible={!props.isLockScreen}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={[styles.bottomModal, styles.modalMarginTop]}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onBackdropPress={props.hideWalletConnectList}
				onSwipeComplete={props.hideWalletConnectList}
				onBackButtonPress={props.hideWalletConnectList}
				swipeDirection={'down'}
				propagateSwipe
				statusBarTranslucent
			>
				<View>
					<WalletConnectList allSession={allSession} />
				</View>
			</Modal>
		);

	const renderDappTransactionModal = () =>
		props.dappTransactionModalVisible && (
			<Approval dappTransactionModalVisible toggleDappTransactionModal={props.toggleDappTransactionModal} />
		);

	const renderApproveModal = () =>
		props.approveModalVisible && <Approve modalVisible toggleApproveModal={props.toggleApproveModal} />;

	const renderQRScannerModal = () =>
		props.qrScannerModalVisible && (
			<Modal
				isVisible={!props.isLockScreen}
				onBackdropPress={props.hideScanner}
				onBackButtonPress={props.hideScanner}
				onSwipeComplete={props.hideScanner}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.bottomModal}
			>
				<QrScanner />
			</Modal>
		);

	const renderHintView = () => props.showHintView && <HintView hintText={props.hintText} />;

	const showUpdateModalIfNeeded = async () => {
		const latestVersionCode = props.updateConfig?.latest_version_code
			? Number(props.updateConfig.latest_version_code)
			: 0;
		const currentVersionCode = Number(getAppVersionCode());
		if (latestVersionCode <= currentVersionCode) {
			return;
		}
		const storageUpdateVersion = await AsyncStorage.getItem(STORAGE_NEW_VERSION_CODE);
		let showModal = false;
		if (storageUpdateVersion) {
			if (latestVersionCode !== Number(storageUpdateVersion)) {
				await AsyncStorage.setItem(STORAGE_NEW_VERSION_CODE, latestVersionCode.toString());
				await AsyncStorage.setItem(STORAGE_UPDATE_VERSION_SHOW_MODAL, '1');
				showModal = true;
			} else {
				const modalCount = await AsyncStorage.getItem(STORAGE_UPDATE_VERSION_SHOW_MODAL);
				if (modalCount === '1') {
					await AsyncStorage.setItem(STORAGE_UPDATE_VERSION_SHOW_MODAL, '2');
					showModal = true;
				}
			}
		} else {
			await AsyncStorage.setItem(STORAGE_NEW_VERSION_CODE, latestVersionCode.toString());
			await AsyncStorage.setItem(STORAGE_UPDATE_VERSION_SHOW_MODAL, '1');
			showModal = true;
		}
		if (showModal) {
			setShowUpdateModal(true);
		}
	};

	const showNotifyDialog = (titleParam, messageParam, urlParam) => {
		let title = titleParam;
		let message = messageParam;
		let url = urlParam;
		if (!title) {
			title = '';
		}
		if (!message) {
			message = '';
		}
		if (!url) {
			url = '';
		}
		if (title !== '' || message !== '') {
			setNotificationTitle(title);
			setNotificationMessage(message);
			setNotificationUrl(url);
			setShowNotificationModal(true);
		}
	};

	const initPushEvent = () => {
		PushNotification.configure({
			onRegister(token) {
				if (Platform.OS === 'android') {
					util.logDebug('===firebase android deviceToken: ', token);
				} else {
					util.logDebug('===ios deviceToken: ', token);
				}
			},
			onNotification(notification) {
				if (!notification) {
					return;
				}
				if (Platform.OS === 'ios') {
					//ios tester : {"action": "com.apple.UNNotificationDefaultActionIdentifier", "badge": undefined, "data": {"actionIdentifier": "com.apple.UNNotificationDefaultActionIdentifier", "aps": {"alert": "100Hello"}, "userInteraction": 1, "yourCustomKey": "1"}, "finish": [Function finish], "foreground": false, "id": undefined, "message": "100Hello", "reply_text": undefined, "soundName": undefined, "subtitle": null, "title": null, "userInteraction": true}
					//ios umeng :  {"action": "com.apple.UNNotificationDefaultActionIdentifier", "badge": undefined, "data": {"dialog": "true", "url": "http://www.weibo.com", "actionIdentifier": "com.apple.UNNotificationDefaultActionIdentifier", "aps": {"alert": [Object], "mutable-content": 1, "sound": "default", "url": "http://www.baidu.com"}, "d": "uu2kwui163469939473310", "p": 0, "userInteraction": 1}, "finish": [Function finish], "foreground": true, "id": undefined, "message": "a-通知内容", "reply_text": undefined, "soundName": undefined, "subtitle": "a-副标题", "title": "a-主标题", "userInteraction": true}
					if (notification?.userInteraction) {
						const url = notification.data?.url;
						if (url) {
							SharedDeeplinkManager.handleBrowserUrl(url);
							return;
						}
						const dialog = notification.data?.dialog;
						if (dialog) {
							showNotifyDialog(notification.title, notification.message, '');
						}
					} else if (notification?.foreground) {
						const url = notification.data?.url;
						showNotifyDialog(notification.title, notification.message, url);
					}
				} else if (Platform.OS === 'android') {
					//android firebase receiver: {"channelId": "fcm_fallback_notification_channel", "color": null, "data": {"dialog": "true", "url": "http://www.baidu.com"}, "finish": [Function finish], "foreground": true, "id": "-928953403", "message": "c-通知文字", "priority": "high", "smallIcon": "ic_notification", "sound": null, "tag": "campaign_collapse_key_5123097815763150524", "title": "c-通知标题", "userInteraction": false, "visibility": "private"}
					//android firebase click: {"channelId": "fcm_fallback_notification_channel", "color": null, "data": {"dialog": "true", "url": "http://www.baidu.com"}, "finish": [Function finish], "foreground": true, "id": "-928953403", "message": "c-通知文字", "priority": "high", "smallIcon": "ic_notification", "sound": null, "tag": "campaign_collapse_key_5123097815763150524", "title": "c-通知标题", "userInteraction": true, "visibility": "private"}
					//进程死的情况下： android firebase click： {"data": {"collapse_key": "io.gopocket", "dialog": "true", "from": "735994113424", "gcm.n.analytics_data": {"from": "735994113424", "google.c.a.c_id": "8998426946077960746", "google.c.a.c_l": "c-通知名称", "google.c.a.e": "1", "google.c.a.ts": "1634701249", "google.c.a.udt": "0"}, "google.delivered_priority": "high", "google.message_id": "0:1634701249323656%22c7a44622c7a446", "google.original_priority": "high", "google.sent_time": 1634701249294, "google.ttl": 2419200, "url": "http://www.baidu.com"}, "finish": [Function finish], "foreground": false, "userInteraction": true}
					//由于进程杀死情况下无法获取正常的通知和标题，所以放在自定义参数里面获取通知内容
					//进程死的情况下： android firebase click  {"data": {"collapse_key": "io.gopocket", "dialog": "true", "from": "735994113424", "gcm.n.analytics_data": {"from": "735994113424", "google.c.a.c_id": "8417487004935009873", "google.c.a.c_l": "c-通知名称", "google.c.a.e": "1", "google.c.a.ts": "1634702040", "google.c.a.udt": "0"}, "google.delivered_priority": "high", "google.message_id": "0:1634702040533244%22c7a44622c7a446", "google.original_priority": "high", "google.sent_time": 1634702040524, "google.ttl": 2419200, "message": "custom-通知文字", "title": "custom-标题", "url": "http://www.baidu.com"}, "finish": [Function finish], "foreground": false, "userInteraction": true}
					//来自firebase安卓推送
					if (notification?.userInteraction) {
						const url = notification.data?.url;
						if (url) {
							SharedDeeplinkManager.handleBrowserUrl(url);
							return;
						}
						const dialog = notification.data?.dialog;
						if (dialog) {
							showNotifyDialog(notification.data?.title, notification.data?.message, '');
						}
					} else if (notification?.foreground) {
						const url = notification.data?.url;
						showNotifyDialog(notification.data?.title, notification.data?.message, url);
					}
				}
				notification.finish(PushNotificationIOS.FetchResult.NoData);
			},

			onRegistrationError(err) {
				console.error(err.message, err);
			},
			permissions: {
				alert: true,
				badge: true,
				sound: true
			},
			popInitialNotification: true,
			requestPermissions: true
		});

		if (Platform.OS === 'android') {
			const eventEmitter = new NativeEventEmitter();
			eventEmitter.addListener('AndroidUmengPushEvent', params => {
				//umeng android:  {"event": "{\"display_type\":\"notification\",\"extra\":{\"dialog\":\"true\",\"url\":\"http:\\/\\/www.baidu.com\"},\"body\":{\"after_open\":\"go_app\",\"ticker\":\"b-通知标题\",\"title\":\"b-通知标题\",\"play_sound\":\"true\",\"text\":\"b-通知内容\"},\"msg_id\":\"uuk0hs1163469965087710\"}"}
				const event = params.event;
				let content;
				try {
					content = JSON.parse(event);
				} catch (err) {
					console.log('parse json error: ', err);
				}
				if (content) {
					const url = content.extra?.url;
					if (url) {
						SharedDeeplinkManager.handleBrowserUrl(url);
						return;
					}
					const dialog = content.extra?.dialog;
					if (dialog) {
						showNotifyDialog(content.body?.title, content.body?.text, '');
					}
				}
			});
		}
	};

	const onUnapprovedTransactionDelay = async transactionMeta => {
		props.hideWalletConnectList();
		setWalletConnectRequest(false);
		setTimeout(async () => {
			onUnapprovedTransaction(transactionMeta);
		}, 20);
	};
	const handleSessionRequest = useCallback(data => {
		setWalletConnectRequest(true);
		setWalletConnectRequestInfo(data);
	}, []);

	const handleAddChain = useCallback(
		async data => {
			setIsAddChainModalVisible(true);
			setAddChainInfo(data);
			loadSessions();
		},
		[loadSessions]
	);

	const handleAddChainApproved = useCallback(async () => {
		setIsAddChainModalVisible(false);
		toggleShowHint(strings('chainSetting.custom_network_added'));
		loadSessions();
	}, [toggleShowHint, loadSessions]);

	const handleUpdateSessions = useCallback(() => {
		loadSessions();
	}, [loadSessions]);

	const reloadChild = () => {
		setReloadCounter(reloadCounter + 1);
	};

	useEffect(() => {
		DeviceEventEmitter.addListener('languageUpdated', reloadChild);
		return () => {
			DeviceEventEmitter.removeAllListeners('languageUpdated');
		};
	}, [reloadChild]);

	useEffect(() => {
		WC2Manager.hub.on('walletconnectSessionRequest', handleSessionRequest);
		WC2Manager.hub.on('walletconnectAddChain', handleAddChain);
		WC2Manager.hub.on('walletconnectAddChain:approved', handleAddChainApproved);
		WC2Manager.hub.on('walletconnect::updateSessions', handleUpdateSessions);

		// Cleanup function to remove the event listeners when the component unmounts
		return () => {
			WC2Manager.hub.off('walletconnectSessionRequest', handleSessionRequest);
			WC2Manager.hub.off('walletconnectAddChain', handleAddChain);
			WC2Manager.hub.off('walletconnectAddChain:approved', handleAddChainApproved);
			WC2Manager.hub.off('walletconnect::updateSessions', handleUpdateSessions);
		};
	}, [handleSessionRequest, handleAddChain, handleAddChainApproved, handleUpdateSessions]);

	useEffect(() => {
		AppState.addEventListener('change', handleAppStateChange);

		if (Platform.OS === 'ios') {
			Engine.context.TransactionController.hub.on('unapprovedTransaction', onUnapprovedTransactionDelay);
		} else {
			Engine.context.TransactionController.hub.on('unapprovedTransaction', onUnapprovedTransaction);
		}

		Engine.context.MessageManager.hub.on('unapprovedMessage', messageParams =>
			onUnapprovedMessage(messageParams, 'eth')
		);

		Engine.context.PersonalMessageManager.hub.on('unapprovedMessage', messageParams =>
			onUnapprovedMessage(messageParams, 'personal')
		);

		Engine.context.TypedMessageManager.hub.on('unapprovedMessage', messageParams =>
			onUnapprovedMessage(messageParams, 'typed')
		);

		DeviceEventEmitter.addListener('showShareView', type => {
			setShowShareViewType(type);
		});

		setTimeout(() => {
			NotificationManager.init({
				navigation: props.navigation,
				showTransactionNotification: props.showTransactionNotification,
				showSimpleNotification: props.showSimpleNotification
			});
			pollForIncomingTransactions();
			removeConnectionStatusListener.current = NetInfo.addEventListener(connectionChangeHandler);
			showUpdateModalIfNeeded();
		}, 200);

		setTimeout(async () => {
			const { PreferencesController, KeyringController } = Engine.context;
			let accountEventId = 'Account10+';
			const identities = PreferencesController.state.identities;
			const identitiesLength = Object.keys(identities).length;
			if (identitiesLength <= 10) {
				accountEventId = 'Account' + identitiesLength;
			}
			let walletCountEventId = 'WalletCount5+';
			const keyrings = KeyringController.state.keyrings;
			const keyringsLength = keyrings.length;
			if (keyringsLength <= 5) {
				walletCountEventId = 'WalletCount' + keyringsLength;
			}
			onEvent(accountEventId);
			onEvent(walletCountEventId);

			const { allAmountOfChain, allBalanceOfChain } = await calcAllAddressPrices();
			const getValue = value => {
				if (value <= 0) {
					return 'USD0';
				}
				if (value < 100) {
					return 'USD0+';
				}
				if (value < 1000) {
					return 'USD100+';
				}
				if (value < 10000) {
					return 'USD1k+';
				}
				if (value < 100000) {
					return 'USD10k+';
				}
				if (value < 1000000) {
					return 'USD100k+';
				}
				if (value < 10000000) {
					return 'USD1M+';
				}
				return 'USD10M+';
			};
			let allAmount = 0;
			let chainValue = {};
			for (const type in Engine.networks) {
				const chainType = Number(type);
				if (chainType === ChainType.RPCBase) {
					continue;
				}
				chainValue[chainType] = 'testnet';
				if (isMainnetChain(chainType)) {
					const amount = allAmountOfChain[chainType] || 0;
					allAmount += amount;
					chainValue[chainType] = getValue(amount);
				}
			}

			const amoutEventId = getValue(allAmount);
			const eventMap = {};
			for (const type in chainValue) {
				const chainType = Number(type);
				const name = OnEventTag[chainType]?.EventValueName;
				if (name) {
					eventMap[name] = chainValue[type];
				}
			}
			onEventWithMap(amoutEventId, eventMap);

			if (allBalanceOfChain) {
				for (const type in allBalanceOfChain) {
					const chainType = Number(type);
					const balance = allBalanceOfChain[chainType];
					const tag = OnEventTag[chainType]?.EventActiveUsers;
					if (balance && balance > 0 && tag) {
						onEvent(tag);
					}
				}
			}
			util.logDebug('leon.w@umeng stat: ', walletCountEventId, accountEventId, amoutEventId);
		}, 30 * 1000);

		initPushEvent();

		return function cleanup() {
			AppState.removeEventListener('change', handleAppStateChange);
			Engine.context.PersonalMessageManager.hub.removeAllListeners();
			Engine.context.TypedMessageManager.hub.removeAllListeners();
			Engine.context.TransactionController.hub.removeListener('unapprovedTransaction', onUnapprovedTransaction);
			WC2Manager.hub.removeAllListeners();
			removeConnectionStatusListener.current && removeConnectionStatusListener.current();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (allSession && Object.keys(allSession).length > 0) {
			props.showWalletConnectIcon();
		} else {
			props.hideWalletConnectIcon();
			props.hideWalletConnectList();
		}
	}, [allSession, props]);

	const ongoingTransactionsModalVisible = () => (
		<Modal
			isVisible={props.ongoingTransactionsModalVisible && !props.isLockScreen}
			onBackdropPress={() => toggleOngoingTransactionsModal(false)}
			onBackButtonPress={() => toggleOngoingTransactionsModal(false)}
			onSwipeComplete={() => toggleOngoingTransactionsModal(false)}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.bottomModal}
			useNativeDriver={Device.isAndroid()}
			backdropTransitionOutTiming={0}
		>
			<OngoingTransactions navigation={props.navigation} close={() => toggleOngoingTransactionsModal(false)} />
		</Modal>
	);

	const renderUpdateModal = () => {
		if (showUpdateModal) {
			return (
				<Modal
					isVisible={!props.isLockScreen}
					animationIn="slideInUp"
					animationOut="slideOutDown"
					backdropOpacity={0.7}
					animationInTiming={300}
					animationOutTiming={300}
					onSwipeComplete={() => setShowUpdateModal(false)}
					onBackButtonPress={() => setShowUpdateModal(false)}
					swipeDirection={'down'}
				>
					<View style={[styles.versionModal, isDarkMode && baseStyles.darkModalBackground]}>
						<TouchableOpacity style={styles.closeTouch} onPress={() => setShowUpdateModal(false)}>
							<AntIcon color={isDarkMode ? colors.white : colors.paliGrey300} size={16} name={'close'} />
						</TouchableOpacity>
						<Image
							style={{ width: 90, height: 90, resizeMode: 'contain' }}
							source={require('../../images/pali.png')}
						/>
						<Text style={[styles.newVersion, isDarkMode && baseStyles.textDark]}>
							{strings('version_update.find_new_version')}
						</Text>
						<Text style={[styles.versionName, isDarkMode && baseStyles.textDark]}>
							{props.updateConfig.latest_version}
						</Text>
						<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
						<TouchableOpacity
							style={styles.touchBtn}
							onPress={async () => {
								setShowUpdateModal(false);
								if (Device.isAndroid()) {
									const support = await supportGooglePlay();
									if (support) {
										launchAppInGooglePlay();
									} else {
										console.warn('We do not support download from other source');
										// We do not support download from other source
										// const downloadUrl = props.updateConfig.download_url;
										// if (downloadUrl) {
										// 	Linking.openURL(downloadUrl);
										// }
									}
								} else {
									jumpIosApp();
								}
							}}
						>
							<Text style={styles.updateNow}>{strings('version_update.update_now')}</Text>
						</TouchableOpacity>
						<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
						<TouchableOpacity
							style={styles.touchBtn}
							onPress={async () => {
								setShowUpdateModal(false);
								props.navigation.navigate('UpdateCheck');
							}}
						>
							<Text style={[styles.viewDetail, isDarkMode && baseStyles.subTextDark]}>
								{strings('version_update.view_details')}
							</Text>
						</TouchableOpacity>
					</View>
				</Modal>
			);
		}
	};
	const onAddChainModalCancel = async () => {
		setTimeout(() => WC2Manager.hub.emit('walletconnectAddChain:rejected', addChainInfo.requestInfo), 500);
		setIsAddChainModalVisible(false);
		setAddChainInfo('');
	};
	const onAddChainModalConfirm = async () => {
		try {
			const { nickname, rpcTarget, chainId, ticker, explorerUrl } = addChainInfo.rpcInfo;

			const type = await Engine.networks[ChainType.RPCBase].addNetwork(
				nickname,
				rpcTarget,
				chainId,
				ticker,
				explorerUrl
			);

			await Engine.context.PreferencesController.addRpcChain(addChainInfo.selectedAddress, type);

			setTimeout(() => WC2Manager.hub.emit('walletconnectAddChain:approved', addChainInfo.requestInfo), 500);
		} catch (e) {
			util.logDebug('leon.w@ add chain error: ', e, addChainInfo.rpcInfo);
		}
		setIsAddChainModalVisible(false);
		setAddChainInfo('');
	};
	const renderAddChainModal = () => {
		if (isAddChainModalVisible && addChainInfo && addChainInfo.rpcInfo) {
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
								imageUrl={addChainInfo?.rpcInfo?.icon}
								defaultImg={require('../../images/browser.png')}
							/>
							<Text style={[styles.addChainModalSubTitle, isDarkMode && baseStyles.subTextDark]}>
								{addChainInfo.rpcInfo.url}
							</Text>
						</View>
						<View style={styles.addChainModalLine} />
						<View style={styles.addChainModalItemWrapper}>
							<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
								{strings('app_settings.network_name_label')}
							</Text>
							<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
								{addChainInfo.rpcInfo.nickname}
							</Text>
						</View>
						<View style={styles.addChainModalItemWrapper}>
							<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
								{strings('app_settings.network_rpc_url_label')}
							</Text>
							<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
								{addChainInfo.rpcInfo.rpcTarget}
							</Text>
						</View>
						<View style={styles.addChainModalItemWrapper}>
							<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
								{strings('app_settings.network_chain_id_label')}
							</Text>
							<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
								{addChainInfo.rpcInfo.chainId}
							</Text>
						</View>
						<View style={styles.addChainModalItemWrapper}>
							<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
								{strings('app_settings.network_symbol_label')}
							</Text>
							<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
								{addChainInfo.ticker}
							</Text>
						</View>
						<View style={styles.addChainModalItemWrapper}>
							<Text style={[styles.addChainModalItemTitle, isDarkMode && baseStyles.subTextDark]}>
								{strings('app_settings.network_explorer_label')}
							</Text>
							<Text style={[styles.addChainModalItemContent, isDarkMode && baseStyles.textDark]}>
								{addChainInfo.rpcInfo.explorerUrl}
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
		} else {
			return null;
		}
	};

	const renderNotificationsModal = () => (
		<Modal statusBarTranslucent isVisible={showNotificationModal && !props.isLockScreen}>
			<View style={[styles.notifyModalContainer, isDarkMode && baseStyles.darkModalBackground]}>
				<View style={styles.flex}>
					{notificationTitle !== '' && (
						<Text style={[styles.notifyTitle, isDarkMode && baseStyles.textDark]}>{notificationTitle}</Text>
					)}
					<Text style={[styles.notifyDesc, isDarkMode && baseStyles.subTextDark]}>{notificationMessage}</Text>
					<TouchableOpacity
						style={styles.notifyTouchOk}
						onPress={() => {
							setShowNotificationModal(false);
							if (notificationUrl !== '') {
								SharedDeeplinkManager.handleBrowserUrl(notificationUrl);
							}
						}}
					>
						<Text style={[styles.notifyOkLabel, isDarkMode && baseStyles.textDark]}>
							{strings('other.i_know')}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);

	const settingsRoutes = [
		'WalletManagementView',
		'RevealPrivateCredentialView',
		'VerifySeedPhraseView',
		'ResetPasswordView',
		'SecuritySettingsView',
		'AboutView',
		'DeveloperOptionsView',
		'CurrencyUnitView',
		'UpdateCheckView',
		'DrawingBoardView',
		'DrawingGuideView',
		'CheckEnvGuideView',
		'ManualBackupStep1View',
		'ManualBackupStep2View',
		'ImportFromSeedView',
		'ImportPrivateKeyView',
		'LanguageSelectorView',
		'LoginView'
	];

	const inSettings = settingsRoutes.includes(
		props.navigation.state.routes[props.navigation.state.routes.length - 1].routeName
	);

	return (
		<React.Fragment key={reloadCounter + 'main-screen'}>
			<View style={styles.flex}>
				<View
					style={[
						styles.navigatorView,
						{
							backgroundColor: isDarkMode
								? inSettings
									? colors.brandBlue700
									: colors.brandBlue500
								: colors.white
						}
					]}
				>
					<SafeAreaProvider>
						<MainNavigator navigation={props.navigation} />
					</SafeAreaProvider>
				</View>
				<GlobalAlert />
				<FadeOutOverlay />
				<Notification navigation={props.navigation} />
				{!props.isLockScreen && <TransactionTips />}
				{showShareViewType && (
					<View style={styles.shareView}>
						<ShareImageView
							close={() => setShowShareViewType(null)}
							selectedAddress={props.selectedAddress}
							chainType={showShareViewType}
						/>
					</View>
				)}
			</View>
			{renderAddChainModal()}
			{renderQRScannerModal()}
			{renderSigningModal()}
			{renderWalletConnectSessionRequestModal()}
			{renderDappTransactionModal()}
			{renderApproveModal()}
			{renderHintView()}

			{ongoingTransactionsModalVisible()}

			{renderUpdateModal()}
			{renderNotificationsModal()}
			{renderWalletConnectListModal()}
		</React.Fragment>
	);
};

Main.router = MainNavigator.router;

Main.propTypes = {
	/**
	 * Object that represents the navigator
	 */
	navigation: PropTypes.object,
	/**
	 * Action that sets an ETH transaction
	 */
	setEtherTransaction: PropTypes.func,
	/**
	 * Action that sets a transaction
	 */
	setTransactionObject: PropTypes.func,
	/**
	 * mapping(address => ContactEntry)
	 */
	identities: PropTypes.object,
	/**
	 * Array of ERC20 assets
	 */
	selectedAddress: PropTypes.string,
	/**
	 * Dispatch showing a transaction notification
	 */
	showTransactionNotification: PropTypes.func,
	/**
	 * Dispatch showing a simple notification
	 */
	showSimpleNotification: PropTypes.func,
	/**
	/* Hides or shows dApp transaction modal
	*/
	toggleDappTransactionModal: PropTypes.func,
	/**
	/* Hides or shows approve modal
	*/
	toggleApproveModal: PropTypes.func,
	toggleApproveModalInModal: PropTypes.func,
	/**
	/* dApp transaction modal visible or not
	*/
	dappTransactionModalVisible: PropTypes.bool,
	/**
	/* Token approve modal visible or not
	*/
	approveModalVisible: PropTypes.bool,
	/**
	 * Boolean that determines the status of the networks modal
	 */
	networkModalVisible: PropTypes.bool,

	bscNetworkModalVisible: PropTypes.bool,

	qrScannerModalVisible: PropTypes.bool,
	walletConnectListVisible: PropTypes.bool,
	hideScanner: PropTypes.func,
	hideWalletConnectList: PropTypes.func,
	showWalletConnectIcon: PropTypes.func,
	hideWalletConnectIcon: PropTypes.func,
	showHintView: PropTypes.bool,
	hintText: PropTypes.string,
	// eslint-disable-next-line react/no-unused-prop-types
	ongoingTransactionsModalVisible: PropTypes.bool,
	toggleOngoingTransactionsModal: PropTypes.func,
	updateConfig: PropTypes.object,
	updateLockScreen: PropTypes.func,
	isLockScreen: PropTypes.bool,
	toggleShowHint: PropTypes.func
};

const mapStateToProps = state => ({
	qrScannerModalVisible: state.scanner.isVisible,
	walletConnectListVisible: state.walletconnect.isVisible,
	identities: state.engine.backgroundState.PreferencesController.identities,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	dappTransactionModalVisible: state.modals.dappTransactionModalVisible,
	approveModalVisible: state.modals.approveModalVisible,
	networkModalVisible: state.modals.networkModalVisible,
	bscNetworkModalVisible: state.modals.bscNetworkModalVisible,
	showHintView: state.hint.showHint,
	hintText: state.hint.hintText,
	ongoingTransactionsModalVisible: state.modals.ongoingTransactionsModalVisible,
	updateConfig: state.settings.updateConfig,
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	setEtherTransaction: transaction => dispatch(setEtherTransaction(transaction)),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showTransactionNotification: args => dispatch(showTransactionNotification(args)),
	showSimpleNotification: args => dispatch(showSimpleNotification(args)),
	toggleDappTransactionModal: (show = null) => dispatch(toggleDappTransactionModal(show)),
	toggleApproveModal: show => dispatch(toggleApproveModal(show)),
	toggleApproveModalInModal: show => dispatch(toggleApproveModalInModal(show)),
	hideScanner: () => dispatch(hideScanner()),
	hideWalletConnectList: () => dispatch(hideWalletConnectList()),
	hideWalletConnectIcon: () => dispatch(hideWalletConnectIcon()),
	showWalletConnectIcon: () => dispatch(showWalletConnectIcon()),
	toggleOngoingTransactionsModal: show => dispatch(toggleOngoingTransactionsModal(show)),
	updateLockScreen: locked => dispatch(updateLockScreen(locked)),
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});
export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Main);
