module.exports = {
	presets: ['module:metro-react-native-babel-preset'],
	plugins: [
		[
			'module:react-native-dotenv',
			{
				moduleName: '@env',
				path: 'apikeys/.env',
				blacklist: null,
				whitelist: null,
				safe: false,
				allowUndefined: true
			}
		],
		'react-native-reanimated/plugin'
	]
};
