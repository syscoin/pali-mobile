import ReactNative from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import I18n from 'react-native-i18n';
import { LANGUAGE, FIRST_APP_LOAD } from '../app/constants/storage';

// Import all locales
import en from './en.json';
import zh from './zh-cn.json';
import es from './es.json';
// Should the app fallback to English if user locale doesn't exists
I18n.fallbacks = true;
I18n.defaultLocale = 'en';
// Define the supported translations
I18n.translations = {
	en,
	zh,
	es
};
// If language selected get locale
getUserPreferableLocale();

// Uncomment this for using RTL
//const currentLocale = I18n.currentLocale();

// Is it a RTL language?
export const isRTL = false; // currentLocale.indexOf('jaJp') === 0;

// Set locale
export async function setLocale(locale) {
	I18n.locale = locale;
	await AsyncStorage.setItem(LANGUAGE, locale);
}

// Get languages
export function getLanguages() {
	return {
		en: 'English',
		zh: 'Chinese - China',
		es: 'Spanish'
	};
}

// Initialize language of the app.
export async function checkAndSetLocale() {
	const firstAppLoad = await AsyncStorage.getItem(FIRST_APP_LOAD);
	//Just run on the first load
	if (firstAppLoad) return;

	const supportedLanguages = Object.keys(getLanguages());

	// Get the current locale from i18n and split by '-' to get the language part only
	const currentLocale = I18n.locale.split('-')[0];

	if (supportedLanguages.includes(currentLocale)) {
		setLocale(currentLocale);
	} else {
		setLocale('en');
	}
	await AsyncStorage.setItem(FIRST_APP_LOAD, 'true');
}

// Allow RTL alignment in RTL languages
ReactNative.I18nManager.allowRTL(isRTL);

// The method we'll use instead of a regular string
export function strings(name, params = {}) {
	return I18n.t(name, params);
}

// Allow persist locale after app closed
async function getUserPreferableLocale() {
	const locale = await AsyncStorage.getItem(LANGUAGE);
	if (locale) {
		I18n.locale = locale;
	}
}

export default I18n;
