import { NativeModules } from 'react-native';

export async function supportGooglePlay() {
	const support = await NativeModules.RNToolsManager.supportGooglePlay();
	return support;
}

export async function launchAppInGooglePlay() {
	NativeModules.RNToolsManager.launchAppInGooglePlay();
}

export async function isTestFlight() {
	const isTestflight = await NativeModules.RNToolsManager.isTestflight();
	return isTestflight === 'TESTFLIGHT';
}

export async function jumpIosApp() {
	// const isTestflight = await isTestFlight();
	// if (isTestflight) {
	// 	NativeModules.RNToolsManager.jumpTestFlight('JIeW1QjV');
	// } else {
	NativeModules.RNToolsManager.jumpAppStore('1576488287'); //微信id,测试使用 414478124
	// }
}

export async function iosShake() {
	await NativeModules.RNToolsManager.shake();
}
