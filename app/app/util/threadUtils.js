// eslint-disable-next-line import/prefer-default-export
export function getInternalFunctions(cls) {
	if (!cls) {
		return [];
	}
	const funcs = [];
	if (cls.prototype) {
		const props = Object.getOwnPropertyNames(cls.prototype);
		props && funcs.push(...props);
	}
	const obj = Object.getPrototypeOf(cls);
	if (obj) {
		funcs.push(...getInternalFunctions(obj));
	}
	return funcs;
}

export function getExportFunctions(cls) {
	if (!cls) {
		return [];
	}
	const funcs = [];
	for (const name in cls) {
		if (typeof cls[name] === 'function') {
			funcs.push(name);
		}
	}
	return funcs;
}
