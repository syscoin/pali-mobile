export function toggleCollectibleContractModal() {
	return {
		type: 'TOGGLE_COLLECTIBLE_CONTRACT_MODAL'
	};
}

export function toggleReceiveModal(asset) {
	return {
		type: 'TOGGLE_RECEIVE_MODAL',
		asset
	};
}

export function toggleDappTransactionModal(show) {
	return {
		type: 'TOGGLE_DAPP_TRANSACTION_MODAL',
		show
	};
}

export function toggleApproveModal(show) {
	return {
		type: 'TOGGLE_APPROVE_MODAL',
		show
	};
}

export function toggleApproveModalInModal(show) {
	return {
		type: 'TOGGLE_APPROVE_MODAL_IN_MODAL',
		show
	};
}

export function toggleOngoingTransactionsModal(show) {
	return {
		type: 'TOGGLE_ONGOING_TRANSACTIONS_MODAL',
		show
	};
}
