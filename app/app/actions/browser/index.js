export function updateDefaultTypes(chainTypes) {
	return {
		type: 'UPDATE_DEFAULT_CHAIN_TYPES',
		chainTypes
	};
}

export function updateDappPage(dappPage) {
	return {
		type: 'UPDATE_DAPP_PAGE',
		dappPage
	};
}

/**
 * Creates a new tab
 *
 * @param {string} url - The website's url
 */
export function createNewTab(url, addRight, activeTabId) {
	return {
		type: 'CREATE_NEW_TAB',
		url,
		id: Date.now(),
		addRight,
		activeTabId
	};
}

/**
 * Creates a new tab at last position
 *
 * @param {string} url - The website's url
 */
export function createNewTabLast(url, addRight, activeTabId) {
	return {
		type: 'CREATE_NEW_TAB_LAST',
		url,
		id: Date.now(),
		addRight,
		activeTabId
	};
}

/**
 * Closes an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function closeTab(id, activeTabId) {
	return {
		type: 'CLOSE_TAB',
		id,
		activeTabId
	};
}

export function setActiveTab(id) {
	return {
		type: 'SET_ACTIVE_TAB',
		id
	};
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 * @param {string} url - The website's url
 */
export function updateTab(id, data) {
	return {
		type: 'UPDATE_TAB',
		id,
		data
	};
}

/**
 * Closes all the opened tabs
 */
export function closeAllTabs() {
	return {
		type: 'CLOSE_ALL_TABS'
	};
}

export function saveTabs(saveNum, activeTabId) {
	return {
		type: 'SAVE_TABS',
		saveNum,
		activeTabId
	};
}

export function addFavouriteDapp(dapp) {
	return {
		type: 'ADD_FAVOURITE_DAPP',
		dapp
	};
}

export function addFavouriteDapps(dapps) {
	return {
		type: 'ADD_FAVOURITE_DAPPS',
		dapps
	};
}

export function removeFavouriteDapp(dapp) {
	return {
		type: 'REMOVE_FAVOURITE_DAPP',
		dapp
	};
}

export function updateFavouriteDapps(dapps) {
	return {
		type: 'UPDATE_FAVOURITE_DAPPS',
		dapps
	};
}
