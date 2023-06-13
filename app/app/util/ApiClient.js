import { API_KEY } from '@env';
import { ChainType, util } from 'gopocket-core';
import { NativeModules, Platform } from 'react-native';
import { getBuildNumber, getVersion } from 'react-native-device-info';
import { addFavouriteDapps, updateDappPage, updateDefaultTypes } from '../actions/browser';
import { SetAppstoreBaseVersion, SetUpdateConfig, updateContractList, updateFamousAccounts } from '../actions/settings';
import Engine from '../core/Engine';
import PreventScreenshot from '../core/PreventScreenshot';
import { store } from '../store';
import NativeThreads from '../threads/NativeThreads';
import { getLanguageDapp } from '../util/browser';
import { decryptString } from './CryptUtils';
import Device, { getIosDeviceInfo } from './Device';
import { isTestFlight } from './NativeUtils';
import { getDapp } from './browser';

const TEST_INVITE_URL = 'http://pocket.libsss.com';
//TODO: update api url to Pali ones
const RELEASE_INVITE_URL = 'https://community.gopocket.xyz';

const log = util.logInfo;
let fetch_config_success = false;

const fetchConfig = async () => {
	//TODO: update api url to Pali ones
	const configUrl = util.useTestServer()
		? 'https://pali.pollum.cloud/app/config?app_id=PaliDev'
		: 'https://pali.pollum.cloud/app/config?app_id=Pali';

	try {
		const response = await fetch(configUrl);
		if (response.status === 200) {
			try {
				const rawData = await response.text();
				const content = await decryptString(JSON.parse(rawData).data);
				const jsonContent = JSON.parse(content);
				const updateConfig = jsonContent.update_config;
				const chainTypes = jsonContent.chain_types_v2;
				const appstoreBaseVersion = jsonContent.appstore_base_version;
				let dappPage = jsonContent.dapp_page;
				const contractList = jsonContent.contract_list;
				const useOffchainEndPoint = jsonContent.use_offchain_endpoint;
				const ipfsGateway = jsonContent.ipfs_gateway;
				const famousAccounts = jsonContent.famous_accounts;
				if (updateConfig) {
					const config = Device.isAndroid() ? updateConfig.android : updateConfig.iphone;
					store.dispatch(SetUpdateConfig(config));
				}
				if (chainTypes) {
					store.dispatch(updateDefaultTypes(chainTypes));
				}
				if (appstoreBaseVersion) {
					store.dispatch(SetAppstoreBaseVersion(appstoreBaseVersion));
				}
				if (dappPage) {
					store.dispatch(updateDappPage(dappPage));
					NativeThreads.get().callSqliteAsync('updateWhitelistDapps', getDapp(dappPage));
					const lDapp = getLanguageDapp(dappPage);
					lDapp?.favourites && store.dispatch(addFavouriteDapps(lDapp?.favourites));
				}
				if (contractList) {
					store.dispatch(updateContractList(contractList));
				}
				if (famousAccounts) {
					store.dispatch(updateFamousAccounts(famousAccounts));
				}
				if (ipfsGateway) {
					Engine.context.CollectiblesController.setIpfsGateway(ipfsGateway);
				}
				if (Device.isIos()) {
					const appstoreBaseVersion = Number(store.getState().settings.appstoreBaseVersion);
					global.shouldHideSthForAppStoreReviewer =
						!appstoreBaseVersion || Number(getAppVersionCode()) > appstoreBaseVersion;
				}
				global.useOffchainEndPoint = !!useOffchainEndPoint;
			} finally {
				fetch_config_success = true;
				util.logDebug('leon.w@fetch_config_success');
			}
		}
	} catch (e) {
		util.logDebug('cyh fetch config fail, e', e);
	}
	if (!fetch_config_success) {
		setTimeout(() => fetchConfig(), 5000);
	}
};

export async function initApiClient() {
	global.channel = await PreventScreenshot.getChannel();
	global.appVersion = await getVersion();
	global.appVersionCode = await getBuildNumber();
	global.deviceInfo = await new Promise(resolve => {
		if (Platform.OS === 'android') {
			NativeModules.RNToolsManager.getDeviceInfo().then(event => {
				resolve(event);
			});
			return;
		}
		getIosDeviceInfo().then(info => {
			resolve(info);
		});
	});
	if (Platform.OS === 'android') {
		global.deviceId = '';
		global.testFlight = false;
		global.shouldHideSthForAppStoreReviewer = false;
	} else {
		global.deviceId = '';
		global.testFlight = await isTestFlight();
		const appstoreBaseVersion = Number(store.getState().settings.appstoreBaseVersion);
		global.shouldHideSthForAppStoreReviewer =
			!appstoreBaseVersion || Number(getAppVersionCode()) > appstoreBaseVersion;
	}

	global.useOffchainEndPoint = false;
	await fetchConfig();
	const etherscan_key = await Engine.getScanKey(ChainType.Ethereum);
	util.checkEtherscanAvailable('0xd8da6bf26964af9d7eed9e03e53415d37aa96045', etherscan_key).then(
		etherscanAvailable => {
			NativeThreads.get().callEngineAsync('setEtherscanAvailable', etherscanAvailable);
			util.setEtherscanAvailable(etherscanAvailable);
			util.logDebug(`leon.w@etherscanAvailable=${etherscanAvailable}`);
		}
	);

	log(
		'initApiClient -> ' +
			JSON.stringify({
				API_KEY,
				deviceId: global.deviceId,
				channel: global.channel,
				appVersion: global.appVersion,
				appVersionCode: global.appVersionCode,
				deviceInfo: global.deviceInfo,
				testFlight: global.testFlight,
				useOffchainEndPoint: global.useOffchainEndPoint,
				shouldHideSthForAppStoreReviewer: global.shouldHideSthForAppStoreReviewer
			})
	);
}

export function getDeviceId() {
	return global.deviceId;
}

export function getChannel() {
	return global.channel;
}

export function getAppVersion() {
	return global.appVersion;
}

export function getAppVersionCode() {
	return global.appVersionCode;
}

export function getDeviceInfo() {
	return global.deviceInfo;
}

export function getTestFlight() {
	return global.testFlight;
}

export function getInviteUrl() {
	const isTest = util.useTestServer();
	return isTest ? TEST_INVITE_URL : RELEASE_INVITE_URL;
}

export function shouldHideSthForAppStoreReviewer() {
	return global.shouldHideSthForAppStoreReviewer;
}

export async function useOffchainEndPoint() {
	let try_count = 8;
	// eslint-disable-next-line no-unmodified-loop-condition
	while (!fetch_config_success && try_count > 0) {
		await new Promise(resolve => setTimeout(() => resolve(true), 500));
		try_count -= 1;
	}
	return global.useOffchainEndPoint;
}
