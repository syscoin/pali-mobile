import { strings } from '../../locales/i18n';

// eslint-disable-next-line import/prefer-default-export
export function renderError(e) {
	if (!e) {
		return e;
	}
	if (e.message && e.message.startsWith('No keyring found for the requested account.')) {
		return strings('other.access_observe_account');
	}
	return e.message;
}
