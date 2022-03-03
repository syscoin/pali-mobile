export function toggleTestnetVisible() {
	return {
		type: 'TOGGLE_TESTNET_VISIBILE'
	};
}

export function SetUseTestServer(useTestServer) {
	return {
		type: 'USE_TEST_SERVER',
		useTestServer
	};
}

export function SetUpdateConfig(updateConfig) {
	return {
		type: 'SET_UPDATE_CONFIG',
		updateConfig
	};
}

export function SetAppstoreBaseVersion(appstoreBaseVersion) {
	return {
		type: 'SET_APPSTORE_BASE_VERSION',
		appstoreBaseVersion
	};
}

export function startNetworkChange(chainType, change) {
	return {
		type: 'START_NETWORK_CHANGE',
		chainType,
		change
	};
}

export function endNetworkChange(chainType, change) {
	return {
		type: 'END_NETWORK_CHANGE',
		chainType,
		change
	};
}

export function updateContractList(contractList) {
	return {
		type: 'UPDATE_CONTRACT_LIST',
		contractList
	};
}

export function addApproveInfo(info) {
	return {
		type: 'ADD_APPROVE_INFO',
		info
	};
}

export function removeApproveInfo(metaID) {
	return {
		type: 'REMOVE_APPROVE_INFO',
		metaID
	};
}

export function updateLockScreen(locked) {
	return {
		type: 'UPDATE_LOCK_SCREEN',
		locked
	};
}

export function updateSortType(sortType) {
	return {
		type: 'UPDATE_SORT_TYPE',
		sortType
	};
}

export function setHideRiskTokens(hideRiskTokens) {
	return {
		type: 'SET_HIDE_RISK_TOKENS',
		hideRiskTokens
	};
}

export function updateFamousAccounts(famousAccounts) {
	return {
		type: 'UPDATE_FAMOUS_ACCOUNTS',
		famousAccounts
	};
}
