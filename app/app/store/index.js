import { createStore } from 'redux';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { util } from 'paliwallet-core';
import { migrations, version } from './migrations';

const encryptName = (name: string) => {
	const _name = name.toLowerCase();
	const a_code = 'a'.charCodeAt(0);
	const z_code = 'z'.charCodeAt(0);
	let encrypted_name = '';
	for (let i = 0; i < _name.length; i++) {
		let charCode = _name.charCodeAt(i) + (i % 2) * 2 - 1;
		if (charCode < a_code) {
			charCode += 1;
		}
		if (charCode > z_code) {
			charCode -= 1;
		}
		encrypted_name += String.fromCharCode(charCode);
	}
	return encrypted_name;
};

const hashCode = (name: string) => {
	let hash = 0;
	let chr;
	if (name.length === 0) return hash;
	for (let i = 0; i < name.length; i++) {
		chr = name.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

const keyring = 'KeyringController';

const appendKeyringIfRootMissing = async () => {
	try {
		const keyringContent = await FilesystemStorage.getItem(encryptName(keyring));
		if (keyringContent) {
			const keyringValue = JSON.parse(keyringContent);
			return {
				engine: {
					backgroundState: {
						[keyring]: keyringValue
					}
				}
			};
		}
	} catch (e) {
		util.logDebug('leon.w@appendKeyringIfRootMissing error=', e);
	}
	return undefined;
};

const g_hash_table = {};

const MigratedStorage = {
	async getItem(key) {
		let res;
		try {
			res = await FilesystemStorage.getItem(key);
		} catch (e) {
			util.logDebug('leon.w@getItem error ', key, e);
		}
		if (!res) {
			return await appendKeyringIfRootMissing();
		}
		let value;
		try {
			value = JSON.parse(res);
		} catch (e) {
			util.logDebug('leon.w@getItem json parse error ', e);
		}
		if (!value) {
			return await appendKeyringIfRootMissing();
		}
		Object.keys(value).forEach(key => {
			try {
				if (typeof value[key] === 'string') {
					value[key] = JSON.parse(value[key]);
				}
			} catch (e) {
				util.logDebug('leon.w@json parse error: ', key, value[key], e);
			}
		});
		const backgroundStateValue = value.engine?.backgroundState;
		if (backgroundStateValue) {
			for (const item in backgroundStateValue) {
				try {
					const itemContent = await FilesystemStorage.getItem(encryptName(item));
					if (itemContent) {
						value.engine.backgroundState[item] = JSON.parse(itemContent);
					}
				} catch (e) {
					util.logDebug('leon.w@getItem failed ', item, e);
				}
			}
		}
		return value;
	},
	async setItem(key, value) {
		let newValue = value;
		const backgroundStateValue = newValue.engine?.backgroundState;
		if (backgroundStateValue) {
			newValue = { ...newValue, engine: { backgroundState: { ...backgroundStateValue } } };
			for (const item in backgroundStateValue) {
				try {
					const content = JSON.stringify(backgroundStateValue[item]);
					const hash_content = hashCode(content);
					if (g_hash_table[item] !== hash_content) {
						await FilesystemStorage.setItem(encryptName(item), content);
						g_hash_table[item] = hash_content;
					}
				} catch (e) {
					util.logDebug('leon.w@setItem error ', e);
				}
				newValue.engine.backgroundState[item] = {};
			}
		}
		const content = JSON.stringify(newValue);
		const hash_content = hashCode(content);
		if (g_hash_table[key] !== hash_content) {
			await FilesystemStorage.setItem(key, content);
			g_hash_table[key] = hash_content;
		}
	},
	async removeItem(key) {
		try {
			return await FilesystemStorage.removeItem(key);
		} catch (error) {
			util.logError(error, { message: 'Failed to remove item' });
		}
	}
};

const persistConfig = {
	throttle: 300,
	key: 'root',
	version,
	migrate: createMigrate(migrations, { debug: false }),
	storage: MigratedStorage,
	stateReconciler: autoMergeLevel2,
	serialize: false,
	deserialize: false,
	timeout: 600000
};

const pReducer = persistReducer(persistConfig, rootReducer);

export const store = createStore(pReducer);
export const persistor = persistStore(store);
