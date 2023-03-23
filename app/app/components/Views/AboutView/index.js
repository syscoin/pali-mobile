import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, Linking, NativeModules, Platform } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { getVersion } from 'react-native-device-info';
import MStatusBar from '../../UI/MStatusBar';
import PropTypes from 'prop-types';
import TitleBar from '../../UI/TitleBar';

import { SafeAreaView } from 'react-native-safe-area-context';

const styles = {
	flex: {
		flex: 1
	},
	flex3: {
		flex: 3
	},
	wrapper: {
		flex: 1,
		alignItems: 'center'
	},
	image: {
		marginTop: 26
	},
	slogan: {
		marginTop: 8,
		fontSize: 16,
		color: colors.grey450
	},
	version: {
		marginTop: 20,
		fontSize: 14,
		color: colors.$202020,
		...fontStyles.bold
	},
	line: {
		backgroundColor: colors.$F0F0F0,
		height: 0.5,
		alignSelf: 'stretch',
		marginHorizontal: 30
	},
	itemLayout: {
		alignItems: 'center',
		alignSelf: 'stretch',
		marginLeft: 30,
		marginRight: 30,
		height: 59
	},
	itemTitle: {
		fontSize: 14,
		color: colors.$030319,
		...fontStyles.bold,
		marginLeft: 40
	},
	touch: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 59,
		width: '100%'
	}
};

export default class AboutView extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object
	};

	state = {
		version: ''
	};

	componentDidMount = async () => {
		const currentVersion = await getVersion();
		this.setState({ version: 'V ' + currentVersion });
	};

	goWebsite = () => {
		Linking.openURL('https://gopocket.finance');
	};

	goDiscord = () => {
		Linking.openURL('https://discord.gg/EHTVmPkMcP');
	};

	goTwitter = () => {
		Linking.openURL('https://twitter.com/GoPocketWallet');
	};

	goMedium = () => {
		Linking.openURL('https://gopocket.medium.com');
	};

	goTelegram = () => {
		const language =
			Platform.OS === 'ios'
				? NativeModules.SettingsManager.settings.AppleLocale
				: NativeModules.I18nManager.localeIdentifier;
		if (language === 'zh_CN') {
			Linking.openURL('https://t.me/joinchat/HVYgzVN_cpxkMGFl');
		} else {
			Linking.openURL('https://t.me/joinchat/JdFpLIODMmg3NGU1');
		}
	};

	render() {
		return (
			<SafeAreaView style={styles.wrapper}>
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
				<TitleBar
					title={strings('app_settings.about')}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<View style={styles.flex} />
				<Image style={styles.logo} source={require('../../../images/logo_about.png')} />
				<Text style={styles.slogan}>{strings('other.scale_in_proud')}</Text>
				<Text style={styles.version}>{this.state.version}</Text>
				<View style={styles.flex} />

				<View style={styles.line} />
				<View style={styles.itemLayout}>
					<TouchableOpacity style={styles.touch} onPress={this.goWebsite}>
						<Image style={styles.logo} source={require('../../../images/ic_website.png')} />
						<Text style={styles.itemTitle}>{strings('other.official_website')}</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={styles.line} />

				<View style={styles.line} />
				<View style={styles.itemLayout}>
					<TouchableOpacity style={styles.touch} onPress={this.goDiscord}>
						<Image style={styles.logo} source={require('../../../images/ic_discord.png')} />
						<Text style={styles.itemTitle}>Discord</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={styles.line} />

				<View style={styles.line} />
				<View style={styles.itemLayout}>
					<TouchableOpacity style={styles.touch} onPress={this.goTwitter}>
						<Image style={styles.logo} source={require('../../../images/ic_twitter.png')} />
						<Text style={styles.itemTitle}>Twitter</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={styles.line} />

				<View style={styles.line} />
				<View style={styles.itemLayout}>
					<TouchableOpacity style={styles.touch} onPress={this.goMedium}>
						<Image style={styles.logo} source={require('../../../images/ic_medium.png')} />
						<Text style={styles.itemTitle}>Medium</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={styles.line} />
				<View style={styles.itemLayout}>
					<TouchableOpacity style={styles.touch} onPress={this.goTelegram}>
						<Image style={styles.logo} source={require('../../../images/ic_telegarm.png')} />
						<Text style={styles.itemTitle}>Telegram</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>

				<View style={styles.line} />

				<View style={styles.flex3} />
			</SafeAreaView>
		);
	}
}
