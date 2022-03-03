export function updateGridArray(address, contractAddress, columnCount) {
	return {
		type: 'UPDATE_GRID_ARRAY',
		address,
		contractAddress,
		columnCount
	};
}

export function updateImagesCache(imageUrl) {
	return {
		type: 'UPDATE_IMAGES_CACHE',
		imageUrl
	};
}

export function addVideoUrl(url) {
	return {
		type: 'ADD_VIDEO_URL',
		url
	};
}

export function addImageUrl(url) {
	return {
		type: 'ADD_IMAGE_URL',
		url
	};
}

export function addAudioUrl(url) {
	return {
		type: 'ADD_AUDIO_URL',
		url
	};
}

export function addOutOfMemoryUrl(url) {
	return {
		type: 'ADD_OUT_OF_MEMORY_URL',
		url
	};
}
