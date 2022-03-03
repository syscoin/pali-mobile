import Engine from './Engine';
import { KeyringTypes } from 'gopocket-core';

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password = '', keyringIndex = 0) => {
	const { KeyringController } = Engine.context;
	const mnemonic = await KeyringController.exportSeedPhrase(password, keyringIndex);
	return JSON.stringify(mnemonic).replace(/"/g, '');
};

export const getSeedPhraseSplit = async (password = '') => (await getSeedPhrase(password)).split(' ');

export const getPrivateKey = async (password = '', keyringIndex = 0) => {
	const { KeyringController } = Engine.context;
	const accounts = await KeyringController.getKeyringAccounts(keyringIndex);
	return await KeyringController.exportAccount(password, accounts[0]);
};

export const tryVerifyPassword = async (password: string, keyringIndex = 0) => {
	const { KeyringController } = Engine.context;
	const keyring = KeyringController.state.keyrings[keyringIndex];
	const privateCredential = {};
	if (keyring.type === KeyringTypes.hd) {
		privateCredential.seed = await getSeedPhrase(password, keyringIndex);
	} else {
		privateCredential.privateKey = await getPrivateKey(password, keyringIndex);
	}
	return privateCredential;
};

export const isHDMainAddress = (keyringIndex = 0) =>
	Engine.context.KeyringController.state.keyrings[keyringIndex].type === KeyringTypes.hd;
