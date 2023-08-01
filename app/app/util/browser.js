import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL, util } from 'paliwallet-core';
import React from 'react';
import { strings } from '../../locales/i18n';

/**
 * Return host from url string
 *
 * @param {string} url - String containing url
 * @param {string} defaultProtocol - Protocol string to append to URLs that have none
 * @returns {string} - String corresponding to host
 */
export function getHost(url, defaultProtocol = 'https://') {
	const hasProtocol = url && url.match(/^[a-z]*:\/\//);
	const urlObj = new URL(hasProtocol ? url : `${defaultProtocol}${url}`);
	const { hostname } = urlObj;
	return hostname;
}

/**
 * Return an URL object from url string
 *
 * @param {string} url - String containing url
 * @returns {object} - URL object
 */
export function getUrlObj(url) {
	const urlObj = new URL(url);
	return urlObj;
}

export function appendLanguage(url) {
	if (!url) {
		return url;
	}
	let newUrl = url;
	const language = strings('other.accept_language');
	if (url.indexOf('?') !== -1) {
		newUrl += '&hl=' + language;
	} else {
		newUrl += '?hl=' + language;
	}
	return newUrl;
}

export async function fetchHomepage() {
	try {
		const response = await fetch(`https://go.libsss.com/api/v1/index/index`, {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'Accept-Language': strings('other.accept_language')
			},
			body: null,
			method: 'GET'
		}).then(r => r.json());
		if (response?.code === 200) {
			return response.data;
		}
	} catch (e) {
		util.logDebug('PPYang availableArbMainnet fetch fail, e', e);
	}
	return null;
}

export function getLanguageDapp(dappPageAll) {
	return dappPageAll.en;
}

export function getDapp(dappPageAll) {
	const dApps = [];
	const dappPage = getLanguageDapp(dappPageAll);
	if (dappPage?.networks?.length) {
		dappPage.networks.forEach(netwrok => {
			if (netwrok?.content?.length) {
				netwrok.content.forEach(dapps => {
					if (dapps?.items?.length) {
						dapps.items.forEach(dapp => {
							const img =
								dapp.logo ||
								'https://pali-images.s3.amazonaws.com/files/' +
									dapp.name.replace(/\s/g, '') +
									'logo' +
									'.png';

							dApps.push({ title: dapp.name, url: dapp.url, img, chain: netwrok.chain });
						});
					}
				});
			}
		});
	}
	return dApps;
}

export const activeTabRef = React.createRef();
export function setActiveTab(tab) {
	if (tab) {
		activeTabRef.current = tab;
		AsyncStorage.setItem('storage_activeTabId', String(tab.id));
	} else {
		activeTabRef.current = null;
		AsyncStorage.removeItem('storage_activeTabId');
	}
}

export function getActiveTabId() {
	return activeTabRef.current?.id;
}

export async function getStorageActiveTabId() {
	const activeTabId = await AsyncStorage.getItem('storage_activeTabId');
	return activeTabId;
}

export function getActiveTab() {
	return activeTabRef.current;
}

export function getActiveUrl(browser) {
	let activeTabUrl = null;
	const activeTabId = getActiveTabId();
	if (browser.tabs && browser.tabs.length > 0) {
		const activieTab = browser.tabs.find(tab => tab.id === activeTabId);
		if (!activieTab) {
			return null;
		}
		activeTabUrl = activieTab.url;
	}
	return activeTabUrl;
}
