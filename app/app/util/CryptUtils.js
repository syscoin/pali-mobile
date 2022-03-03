// eslint-disable-next-line import/no-extraneous-dependencies
import { encode } from '@ethersproject/base64';
import { NativeModules } from 'react-native';

const secretKey = 'fajfladsjfkladsfjadlksfjsakdlfja';

export async function encrypt(bytes: byte[]) {
	return encryptString(encode(bytes));
}

export async function encryptString(content: string) {
	const encrytStr = await NativeModules.RNToolsManager.encrypt(content, secretKey);
	return encrytStr;
}

export async function decrypt(bytes: byte[]) {
	return decryptString(encode(bytes));
}

export async function decryptString(content: string) {
	const encrytStr = await NativeModules.RNToolsManager.decryptBase64(content, secretKey);
	return encrytStr;
}
