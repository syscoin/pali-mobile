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
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
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
import { strings } from '../../../../locales/i18n';
import WebviewError from '../../UI/WebviewError';
import { addFavouriteDapp, removeFavouriteDapp, updateTab } from '../../../actions/browser';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import { SetUseTestServer } from '../../../actions/settings';
import { ChainType, util, URL } from 'gopocket-core';
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

const OpenedTabs = ({ tabs, imagePreviewUrl, closeTab, closeAllTabs }) => {
	console.log(tabs);
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

	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
			{tabs.map((tab, index) => (
				<View key={index}>
					<TouchableOpacity

					// onPress={() => onSelectTab(index)}
					>
						<Text style={{ padding: 10 }}>{tab.url}</Text>
						{tab.favicon && <Image style={{ width: 20, height: 20 }} source={{ uri: tab.favicon }} />}
						{/* <Image source={getFavicon(tab.url)} /> */}
						<Image source={{ uri: tab.uri }} style={{ width: 180, height: 180 }} />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => closeTab(tab.id)}>
						<Text>fechar</Text>
					</TouchableOpacity>
				</View>
			))}
			<TouchableOpacity onPress={() => closeAllTabs()}>
				<Text>Close All Tabs</Text>
			</TouchableOpacity>
		</View>
	);
};
export default OpenedTabs;
