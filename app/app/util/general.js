export const tlc = str => str?.toLowerCase?.();

/**
 * Fetch that fails after timeout
 *
 * @param url - Url to fetch
 * @param options - Options to send with the request
 * @param timeout - Timeout to fail request
 *
 * @returns - Promise resolving the request
 */
export function timeoutFetch(url, options, timeout = 500) {
	return Promise.race([
		fetch(url, options),
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export function findBottomTabRouteNameFromNavigatorState({ routes }) {
	let route = routes?.[routes.length - 1];
	let routeName;
	while (route.index !== undefined) {
		routeName = route?.routeName;
		route = route?.routes?.[route.index];
	}
	return routeName;
}

export function findRouteNameFromNavigatorState({ routes }) {
	let route = routes?.[routes.length - 1];
	while (route.index !== undefined) {
		route = route?.routes?.[route.index];
	}
	return route?.routeName;
}

export const toLowerCaseEquals = (a, b) => {
	if (!a && !b) return false;
	return tlc(a) === tlc(b);
};

export const isSvgFile = url => {
	if (url) {
		const index = url?.lastIndexOf('.');
		if (index !== -1) {
			const sub = url.substring(index, url.length);
			if (sub?.toLowerCase() === '.svg') {
				return true;
			}
		}
	}
	return false;
};

export const isVideoFile = url => {
	if (url) {
		const index = url?.lastIndexOf('.');
		if (index !== -1) {
			const sub = url.substring(index, url.length)?.toLowerCase();
			if (
				sub === '.mp4' ||
				sub === '.mov' ||
				sub === '.wmv' ||
				sub === '.flv' ||
				sub === '.avi' ||
				sub === '.avchd' ||
				sub === '.mkv'
			) {
				return true;
			}
		}
	}
	return false;
};

export const isMp3File = url => {
	if (url) {
		const index = url?.lastIndexOf('.');
		if (index !== -1) {
			const sub = url.substring(index, url.length)?.toLowerCase();
			if (sub === '.mp3') {
				return true;
			}
		}
	}
	return false;
};

export const isImageFile = url => {
	if (url) {
		const index = url?.lastIndexOf('.');
		if (index !== -1) {
			const sub = url.substring(index, url.length)?.toLowerCase();
			if (sub === '.jpg' || sub === '.png' || sub === '.jpeg') {
				return true;
			}
		}
		if (url?.indexOf('imageType=jpg') !== -1) {
			return true;
		}
	}
	return false;
};

export const deepEquals = (x, y) => {
	if (x === y) {
		return true;
	} else if (typeof x === 'object' && x != null && (typeof y === 'object' && y != null)) {
		if (Object.keys(x).length !== Object.keys(y).length) {
			return false;
		}
		for (const prop in x) {
			if (Object.prototype.hasOwnProperty.call(y, prop)) {
				if (!deepEquals(x[prop], y[prop])) {
					return false;
				}
			} else {
				return false;
			}
		}
		return true;
	}
	return false;
};
