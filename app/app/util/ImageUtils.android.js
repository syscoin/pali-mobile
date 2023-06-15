import { Platform, PermissionsAndroid, ToastAndroid } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import { RNFS } from 'paiwallet-core';
import CameraRoll from '@react-native-community/cameraroll';
import { strings } from '../../locales/i18n';

export async function checkPermissionAndSave(imageData) {
	if (Platform.OS !== 'android') {
		return;
	}
	try {
		const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
		if (hasPermission) {
			saveImage(imageData);
			ToastAndroid.show(strings('permission.save_img_succeed'), 2);
			return Promise.resolve();
		}
		const requestOptions = {
			title: strings('permission.storage_req_title'),
			message: strings('permission.storage_req_msg'),
			buttonNeutral: strings('permission.button_neutral'),
			buttonNegative: strings('permission.button_negative'),
			buttonPositive: strings('permission.button_positive')
		};
		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
			requestOptions
		);
		if (granted) {
			saveImage(imageData);
			ToastAndroid.show(strings('permission.save_img_succeed'), 2);
			return Promise.resolve();
		}
		ToastAndroid.show(strings('permission.req_denied'), 2);
		return Promise.reject();
	} catch (error) {
		ToastAndroid.show(strings('permission.save_img_error'), 2);
		return Promise.reject();
	}
}

export async function saveImage(url) {
	if (!url) {
		return Promise.reject('url is null');
	}
	const dirs = Platform.OS === 'ios' ? RNFS.LibraryDirectoryPath : RNFS.PicturesDirectoryPath; // 外部文件，共享目录的绝对路径（仅限android）
	const downloadDest = `${dirs}/image-${Date.now()}.png`;
	try {
		if (url.startsWith('data:image')) {
			saveBase64Image(downloadDest, url);
		} else {
			saveSimpleImage(downloadDest, url);
		}
		return Promise.resolve();
	} catch (error) {
		return Promise.reject(error);
	}
}

async function saveSimpleImage(file, url) {
	const options = {
		fromUrl: url,
		toFile: file,
		background: true,
		begin: res => {
			// console.log('begin', res);
			// console.log('contentLength:', res.contentLength / 1024 / 1024, 'M');
		}
	};
	await RNFS.downloadFile(options).promise;
	await CameraRoll.save(file);
}

async function saveBase64Image(file, url) {
	const imageDatas = url.split('base64,');
	const imageData = imageDatas[1];

	await RNFetchBlob.fs.writeFile(file, imageData, 'base64');
	await CameraRoll.save(file);
}

export default {
	saveImage
};
