import EthQuery from 'ethjs-query';
import { ChainType, KeyringTypes, util } from 'paliwallet-core';
import EngineImpl from '../core/EngineImpl';

const ZERO_BALANCE = '0x0';
const MAX = 20;

/**
 * Get an account balance from the network.
 * @param {string} address - The account address
 * @param {EthQuery} ethQuery - The EthQuery instance to use when asking the network
 */
const getBalance = async (address, ethQuery) => {
	const balance = await util.safelyExecuteWithTimeout(
		async () =>
			await new Promise((resolve, reject) => {
				ethQuery.getBalance(address, (error, balance) => {
					if (error) {
						util.logError('importAdditionalAccounts getBalance', error);
						reject(error);
					} else {
						const balanceHex = util.BNToHex(balance);
						resolve(balanceHex || ZERO_BALANCE);
					}
				});
			}),
		true,
		5000
	);
	return balance || ZERO_BALANCE;
};

/**
 * Updates identities in the preferences controllers
 * @param {array} accounts - an array of addresses
 */
const updateIdentities = async accounts => {
	const { KeyringController, PreferencesController } = EngineImpl.context;
	const newAccounts = await KeyringController.getAccounts();
	PreferencesController.updateIdentities(newAccounts);
	newAccounts.forEach(selectedAddress => {
		if (!accounts.includes(selectedAddress)) {
			PreferencesController.update({ selectedAddress });
		}
	});

	// setSelectedAddress to the initial account
	PreferencesController.setSelectedAddress(accounts[0]);
};

export const isHDMainAddress = (keyringIndex = 0) =>
	EngineImpl.context.KeyringController.state.keyrings[keyringIndex].type === KeyringTypes.hd;

/**
 * Add additional accounts in the wallet based on balance
 */
export default async () => {
	const { KeyringController } = EngineImpl.context;
	const network = EngineImpl.networks[ChainType.Ethereum];
	const { provider } = network;

	try {
		if (!isHDMainAddress()) return;

		if (network.state.network === 'loading') {
			return;
		}

		const ethQuery = new EthQuery(provider);
		let accounts = await KeyringController.getAccounts();
		let lastBalance = await getBalance(accounts[accounts.length - 1], ethQuery);

		let i = 0;
		// seek out the first zero balance
		while (lastBalance !== ZERO_BALANCE) {
			if (i === MAX) break;
			await KeyringController.addNewAccountWithoutUpdate();
			accounts = await KeyringController.getAccounts();
			const address = accounts[accounts.length - 1];
			lastBalance = await getBalance(address, ethQuery);
			if (lastBalance === ZERO_BALANCE) {
				await KeyringController.removeAccount(address);
			}
			i++;
		}

		await updateIdentities(accounts);
	} catch (e) {
		util.logError('PPYang importAdditionalAccounts e:', e);
	}
};
