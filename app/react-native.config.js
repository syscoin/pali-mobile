// react-native.config.js
// eslint-disable-next-line import/no-commonjs
module.exports = {
	assets: ['./assets/fonts'],
	dependencies: {
		'react-native-gesture-handler': {
			platforms: {
				android: null // disable Android platform, other platforms will still autolink if provided
			}
		},
		'react-native-video': {
			platforms: {
				android: {
					sourceDir: '../node_modules/react-native-video/android-exoplayer'
				}
			}
		},
		'react-native-threads': {
			platforms: {
				android: null
			}
		}
	}
};
