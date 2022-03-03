/**
 * Clears transaction object completely
 */
export function resetTransaction() {
	return {
		type: 'RESET_TRANSACTION'
	};
}

/**
 * Sets transaction to address and ensRecipient in case is available
 *
 * @param {string} from - Address to send the transaction from
 * @param {string} to - Address to send the transaction to
 * @param {string} ensRecipient - Resolved ens name to send the transaction to
 * @param {string} transactionToName - Resolved address book name for to address
 * @param {string} transactionFromName - Resolved address book name for from address
 */
export function setRecipient(from, to, ensRecipient, transactionToName, transactionFromName) {
	return {
		type: 'SET_RECIPIENT',
		from,
		to,
		ensRecipient,
		transactionToName,
		transactionFromName
	};
}

/**
 * Sets asset as selectedAsset
 *
 * @param {object} selectedAsset - Asset to start the transaction with
 */
export function setSelectedAsset(selectedAsset) {
	return {
		type: 'SET_SELECTED_ASSET',
		selectedAsset
	};
}

/**
 * Sets transaction object to be sent
 *
 * @param {object} transaction - Transaction object with from, to, data, gas, gasPrice, value
 */
export function prepareTransaction(transaction) {
	return {
		type: 'PREPARE_TRANSACTION',
		transaction
	};
}

/**
 * Sets any attribute in transaction object
 *
 * @param {object} transaction - New transaction object
 */
export function setTransactionObject(transaction) {
	return {
		type: 'SET_TRANSACTION_OBJECT',
		transaction
	};
}

/**
 * Enable selectable tokens (ERC20 and Ether) to send in a transaction
 *
 * @param {object} asset - Asset to start the transaction with
 */
export function setTokensTransaction(asset) {
	return {
		type: 'SET_TOKENS_TRANSACTION',
		asset
	};
}

/**
 * Enable Ether only to send in a transaction
 *
 * @param {object} transaction - Transaction additional object
 */
export function setEtherTransaction(transaction) {
	return {
		type: 'SET_ETHER_TRANSACTION',
		transaction
	};
}

/**
 * Enable individual ERC721 asset only to send in a transaction
 *
 * @param {object} collectible - Collectible object to be sent
 */
export function setIndividualCollectibleTransaction(collectible) {
	return {
		type: 'SET_INDIVIDUAL_COLLECTIBLE_TRANSACTION',
		collectible
	};
}

/**
 * Enable selectable ERC721 assets who's current account is owner of a specific contract to be sent in a transaction
 *
 * @param {object} collectible - Collectible of the type contract collectible that the user wants to send
 */
export function setCollectibleContractTransaction(collectible) {
	return {
		type: 'SET_COLLECTIBLE_CONTRACT_TRANSACTION',
		collectible
	};
}
