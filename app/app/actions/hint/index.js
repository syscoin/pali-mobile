export function toggleShowHint(hintText) {
	return {
		type: 'SHOW_HINT',
		hintText
	};
}

export function toggleHideHint() {
	return {
		type: 'HIDE_HINT'
	};
}
