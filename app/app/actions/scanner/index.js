export function hideScanner() {
	return {
		type: 'HIDE_SCANNER'
	};
}

export function showScanner({ onStartScan, onScanError, onScanSuccess }) {
	return {
		type: 'SHOW_SCANNER',
		onStartScan,
		onScanError,
		onScanSuccess
	};
}

export function showScannerInModal({ onStartScan, onScanError, onScanSuccess }) {
	return {
		type: 'SHOW_SCANNER_IN_MODAL',
		onStartScan,
		onScanError,
		onScanSuccess
	};
}
