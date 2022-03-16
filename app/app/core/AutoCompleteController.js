import { strings } from '../../locales/i18n';
import TopDomains from './TopDomains';
import { util, URL } from 'gopocket-core';
import NativeThreads from '../threads/NativeThreads';
import { callSqlite } from '../util/ControllerUtils';

export const AutoCompleteType_URL = 1;
export const AutoCompleteType_SEARCH = 2;
export const AutoCompleteType_DAPP = 3;
export const AutoCompleteType_RECENT = 4;
export const AutoCompleteType_SEARCH_RECENT = 5;
export const AutoCompleteType_HOMEPAGE = 6;

export class AutoCompleteResult {
	type: number;
	url: string;
	img: string;
	title: string;
	chain: number;
	desc: string;
}

export type Listener = (text: string, result: AutoCompleteResult[]) => void;

export class AutoCompleteController {
	listener_: Listener;
	text_: string;
	results_: AutoCompleteResult[];
	googleUrl = text => `https://www.google.com/search?q=${text}&ie=UTF=8`;
	baiduUrl = text => `https://m.baidu.com/s?word=${text}`;
	// suggestionUrl = text => `https://api.maiziqianbao.net/apiDapp/searchDapps?v=2.0&type=ETH&key=${text}`;
	suggestionUrl = text => `https://go.morpheuscommunity.net/api/v1/index/search?keywords=${text}`;
	suggestionUrlForTesting = text => `https://go.libsss.com/api/v1/index/search?keywords=${text}`;
	target_search_: string;

	constructor(listener: Listener) {
		this.listener_ = listener;
		this.target_search_ = strings('other.accept_language') === 'zh' ? this.baiduUrl : this.googleUrl;
	}

	startAutocomplete = async text => {
		this.text_ = text;
		this.results_ = [];
		if (!this.text_ || !this.text_.trim()) {
			const history = await callSqlite('getBrowserHistory');
			const results = [];
			for (const subHistory of history) {
				const hostName = new URL(subHistory.url).hostname;
				if (!results.find(result => result.hostName === hostName)) {
					const dapp = await callSqlite('getWhitelistDapp', subHistory.url, hostName.toLowerCase());
					results.push({
						type: AutoCompleteType_RECENT,
						url: subHistory.url,
						img: dapp?.img || subHistory.icon || 'https://' + hostName + '/favicon.ico',
						title: dapp?.title || subHistory.name,
						hostName
					});
					if (results.length >= 20) {
						break;
					}
				}
			}
			if (this.listener_) {
				this.listener_(text, results);
			}
			return;
		}
		if (this.text_.startsWith('gopocket://')) {
			const url_item = {
				type: AutoCompleteType_URL,
				url: text,
				img: require('../images/ic_defi_network.png'),
				title: text
			};
			this.results_.push(url_item);
		}
		if (this.containsTopDomain(text)) {
			const url_item = {
				type: AutoCompleteType_URL,
				url: this.fixedUrl(text.trim()),
				img: require('../images/ic_defi_network.png'),
				title: this.fixedUrl(text.trim())
			};
			this.results_.push(url_item);
		}
		if (this.isIPAddress(text)) {
			const url_item = {
				type: AutoCompleteType_URL,
				url: text,
				img: require('../images/ic_defi_network.png'),
				title: text
			};
			this.results_.push(url_item);
		}
		const search_item = {
			type: AutoCompleteType_SEARCH,
			url: this.target_search_(encodeURIComponent(text)),
			img: require('../images/ic_defi_search_l.png'),
			title: text
		};
		this.results_.push(search_item);
		const historys = await this.completeHistory(text);
		this.results_.push(...historys);
		if (this.listener_) {
			this.listener_(text, this.results_);
		}
		this.fetchSuggestions(text);
	};

	completeHistory = async text => {
		if (!text) {
			return [];
		}
		const lowText = text.toLowerCase();
		const history = await callSqlite('getBrowserHistory');
		const blacklistDapps = await callSqlite('getBlacklistDapps');
		const results = [];
		for (const subHistory of history) {
			const hostName = new URL(subHistory.url).hostname;
			if (blacklistDapps[hostName]) {
				continue;
			}
			if (results.find(result => result.hostName === hostName)) {
				continue;
			}
			if (hostName.toLowerCase().includes(lowText)) {
				const dapp = await callSqlite('getWhitelistDapp', subHistory.url, hostName.toLowerCase());
				results.push({
					type: AutoCompleteType_SEARCH_RECENT,
					url: subHistory.url,
					img: dapp?.img || subHistory.icon || 'https://' + hostName + '/favicon.ico',
					title: dapp?.title || subHistory.url,
					hostName
				});
				if (results.length >= 2) {
					break;
				}
			}
		}
		return results;
	};

	containsTopDomain = (text: string) => {
		if (!text) {
			return false;
		}
		const upper_text = text.toUpperCase();
		for (const domain of TopDomains) {
			const sub_string = '.' + domain;
			if (upper_text.includes(sub_string)) {
				return true;
			}
		}
		return false;
	};

	isIPAddress = text => {
		if (!text) {
			return false;
		}
		let _text = text;
		if (!_text.startsWith('http')) {
			_text = 'http://' + _text;
		}
		try {
			const url = new URL(_text);
			const hostname = url.hostname;
			const re = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
			if (re.test(hostname)) {
				if (RegExp.$1 < 256 && RegExp.$2 < 256 && RegExp.$3 < 256 && RegExp.$4 < 256) {
					return true;
				}
			}
			return false;
		} catch (error) {
			return false;
		}
	};

	fixedUrl = (url: string) => (url.match(/^[a-z]*:\/\//) ? url : `https://${url}`);

	fetchSuggestions = text => {
		util.handleFetch(util.useTestServer() ? this.suggestionUrlForTesting(text) : this.suggestionUrl(text), {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'Accept-Language': strings('other.accept_language')
			}
		})
			.then(result => {
				if (this.text_ !== text) {
					return;
				}
				if (result?.code !== 200 || result?.msg !== 'success') {
					return;
				}
				const dapps = result?.data?.data;
				if (!dapps) {
					return;
				}
				const suggestions = [];
				for (const dapp of dapps) {
					const dapp_item = {
						type: AutoCompleteType_DAPP,
						url: dapp.url,
						title: dapp.title,
						desc: dapp.desc,
						chain: dapp.chain,
						img: dapp.img
					};
					suggestions.push(dapp_item);
				}
				if (this.text_ === text && suggestions.length > 0) {
					const subSuggestions = suggestions.slice(0, 20);
					subSuggestions.forEach(dapp => {
						const dappHostName = new URL(dapp.url).hostname;
						this.results_ = this.results_.filter(result => result.hostName !== dappHostName);
					});
					this.results_.push(...subSuggestions);
					if (this.listener_) {
						this.listener_(this.text_, this.results_);
					}
				}
			})
			.catch(e => {
				util.logDebug('leon.w@fetchSuggestions: ', e);
			});
	};
}
