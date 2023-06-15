import Device from '../util/Device';
import { RNFS } from 'paliwallet-core';

const EntryScriptWeb3 = {
	entryScriptWeb3: null,
	entryScriptVConsole: null,
	tvHtml: null,
	async init() {
		this.entryScriptWeb3 = Device.isIos()
			? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageBridgeWeb3.js`, 'utf8')
			: await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

		return this.entryScriptWeb3;
	},
	async initVConsole() {
		if (!__DEV__) {
			return null;
		}
		this.entryScriptVConsole = Device.isIos()
			? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageVConsole.js`, 'utf8')
			: await RNFS.readFileAssets(`InpageVConsole.js`);

		return this.entryScriptVConsole;
	},
	async get() {
		// Return from cache
		if (this.entryScriptWeb3) return this.entryScriptWeb3;

		// If for some reason it is not available, get it again
		return await this.init();
	},
	async getVConsole() {
		if (this.entryScriptVConsole) return this.entryScriptVConsole;

		return await this.initVConsole();
	},
	async initTVhtml() {
		this.tvHtml = Device.isIos()
			? await RNFS.readFile(`${RNFS.MainBundlePath}/advanced.html`, 'utf8')
			: await RNFS.readFileAssets(`advanced.html`);
		return this.tvHtml;
	},
	async getTVhtml() {
		// Return from cache
		if (this.tvHtml) return this.tvHtml;
		// If for some reason it is not available, get it again
		return await this.initTVhtml();
	}
};

export default EntryScriptWeb3;
