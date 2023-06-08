import { REHYDRATE } from 'redux-persist';

const initialState = {
	// allCollectibles: {
	// 	[address: string]: { [chainId: string]: number };
	// }
	gridArray: {},
	imagesCache: [],
	videoUrls: [],
	imageUrls: [],
	audioUrls: [],
	//TODO: update api url to Pali ones
	outofMemoryUrls: [
		'https://pali.pollum.cloud/proxy-png?url=https://storage.opensea.io/files/fb23bc7b452086e7e2aaa841cefc487d.gif',
		'https://storage.opensea.io/files/fb23bc7b452086e7e2aaa841cefc487d.gif'
	]
};

const nftReducer = (state = initialState, action) => {
	switch (action.type) {
		case REHYDRATE:
			if (action.payload && action.payload.nft) {
				return { ...state, ...action.payload.nft };
			}
			return state;
		case 'UPDATE_GRID_ARRAY': {
			const gridArray = state.gridArray ? { ...state.gridArray } : {};
			gridArray[action.address] = {
				...gridArray[action.address],
				[action.contractAddress]: action.columnCount
			};
			return {
				...state,
				gridArray
			};
		}
		case 'UPDATE_IMAGES_CACHE': {
			const imagesCache = state.imagesCache ? [...state.imagesCache] : [];
			if (action.imageUrl && imagesCache.indexOf(action.imageUrl) === -1) {
				imagesCache.push(action.imageUrl);
			}
			return {
				...state,
				imagesCache
			};
		}
		case 'ADD_VIDEO_URL': {
			const videoUrls = state.videoUrls ? [...state.videoUrls] : [];
			if (action.url && videoUrls.indexOf(action.url) === -1) {
				videoUrls.push(action.url);
			}
			return {
				...state,
				videoUrls
			};
		}
		case 'ADD_IMAGE_URL': {
			const imageUrls = state.imageUrls ? [...state.imageUrls] : [];
			if (action.url && imageUrls.indexOf(action.url) === -1) {
				imageUrls.push(action.url);
			}
			return {
				...state,
				imageUrls
			};
		}
		case 'ADD_AUDIO_URL': {
			const audioUrls = state.audioUrls ? [...state.audioUrls] : [];
			if (action.url && audioUrls.indexOf(action.url) === -1) {
				audioUrls.push(action.url);
			}
			return {
				...state,
				audioUrls
			};
		}
		case 'ADD_OUT_OF_MEMORY_URL': {
			const outofMemoryUrls = state.outofMemoryUrls ? [...state.outofMemoryUrls] : [];
			if (action.url && outofMemoryUrls.indexOf(action.url) === -1) {
				outofMemoryUrls.push(action.url);
			}
			return {
				...state,
				outofMemoryUrls
			};
		}
		default:
			return state;
	}
};
export default nftReducer;
