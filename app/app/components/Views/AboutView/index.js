import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, Linking, NativeModules, Platform } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { getVersion } from 'react-native-device-info';
import MStatusBar from '../../UI/MStatusBar';
import PropTypes from 'prop-types';
import TitleBar from '../../UI/TitleBar';
import Icon from '../../UI/Icon';
import { ThemeContext } from '../../../theme/ThemeProvider';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { SafeAreaView } from 'react-native-safe-area-context';

const styles = {
	flex: {
		flex: 1
	},
	flex3: {
		flex: 3
	},
	borderRadiusTop: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	},
	borderRadiusBottom: {
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20
	},
	wrapper: {
		flex: 1,
		alignItems: 'center'
	},
	imgCircle: {
		backgroundColor: colors.white,
		width: 80,
		height: 80,
		borderRadius: 100,
		justifyContent: 'center',
		alignItems: 'center'
	},

	logoPali: {
		width: 65,
		height: 65,
		resizeMode: 'contain'
	},
	title: {
		marginTop: 5,
		color: colors.white,
		fontSize: 16,
		...fontStyles.bold
	},
	txTitle: {
		fontSize: 20,
		lineHeight: 24,
		...fontStyles.semibold,
		color: colors.white
	},
	backgroundImage: {
		width: '100%',
		height: 240,
		zIndex: -1,
		position: 'absolute',
		top: 0,
		borderBottomRightRadius: 20,
		borderBottomLeftRadius: 20
	},

	slogan: {
		marginTop: 8,
		fontSize: 16,
		color: colors.grey450
	},
	version: {
		marginTop: 5,
		fontSize: 14,
		color: colors.white,
		...fontStyles.bold
	},
	line: {
		backgroundColor: colors.$F0F0F0,
		height: 0.5,
		alignSelf: 'stretch',
		marginHorizontal: 15
	},
	itemLayout: {
		alignItems: 'center',
		alignSelf: 'stretch',
		marginLeft: 15,
		marginRight: 15,
		height: 59,
		backgroundColor: colors.paliGrey100,
		paddingHorizontal: 15
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
	},
	footer: {
		alignItems: 'center'
	},
	footerFont: {
		color: colors.paliGrey300,
		fontSize: 12,
		...fontStyles.normal
	}
};

export default class AboutView extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object
	};
	static contextType = ThemeContext;

	state = {
		version: ''
	};

	componentDidMount = async () => {
		const currentVersion = await getVersion();
		this.setState({ version: 'Version: ' + currentVersion });
	};

	goWebsite = () => {
		Linking.openURL('https://paliwallet.com/');
	};

	goDiscord = () => {
		Linking.openURL('https://discord.gg/syscoin');
	};

	goTwitter = () => {
		Linking.openURL('https://twitter.com/PaliWallet');
	};

	goTelegram = () => {
		Linking.openURL('https://t.me/Syscoin_Official');
	};

	render() {
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}>
				<Image source={require('../../../images/pali_background.png')} style={styles.backgroundImage} />
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
				<TitleBar
					title={strings('app_settings.about')}
					onBack={() => {
						this.props.navigation.pop();
					}}
					titleStyle={styles.txTitle}
					withBackground
				/>

				<View style={styles.imgCircle}>
					<Image style={styles.logoPali} source={require('../../../images/pali.png')} />
				</View>
				<Text style={styles.title}>PALI WALLET</Text>
				<Text style={styles.version}>{this.state.version}</Text>
				<View style={styles.flex} />

				<View style={[styles.itemLayout, styles.borderRadiusTop, isDarkMode && baseStyles.darkBackground600]}>
					<TouchableOpacity style={styles.touch} onPress={this.goWebsite}>
						<MaterialIcon color={isDarkMode ? colors.white : colors.black} size={22} name="web" />
						<Text style={[styles.itemTitle, isDarkMode && baseStyles.textDark]}>
							{strings('other.official_website')}
						</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />

				<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
				<View style={[styles.itemLayout, isDarkMode && baseStyles.darkBackground600]}>
					<TouchableOpacity style={styles.touch} onPress={this.goDiscord}>
						<MaterialIcon color={isDarkMode ? colors.white : colors.black} size={22} name="discord" />

						<Text style={[styles.itemTitle, isDarkMode && baseStyles.textDark]}>Discord</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
				<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
				<View style={[styles.itemLayout, isDarkMode && baseStyles.darkBackground600]}>
					<TouchableOpacity style={styles.touch} onPress={this.goTwitter}>
						<MaterialIcon color={isDarkMode ? colors.white : colors.black} size={22} name="twitter" />
						<Text style={[styles.itemTitle, isDarkMode && baseStyles.textDark]}>Twitter</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>
				<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
				<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />

				<View
					style={[styles.itemLayout, styles.borderRadiusBottom, isDarkMode && baseStyles.darkBackground600]}
				>
					<TouchableOpacity style={styles.touch} onPress={this.goTelegram}>
						<MaterialIcon color={isDarkMode ? colors.white : colors.black} size={22} name="telegram" />
						<Text style={[styles.itemTitle, isDarkMode && baseStyles.textDark]}>Telegram</Text>
						<View style={styles.flex} />
						<Image style={styles.logo} source={require('../../../images/about_arrow.png')} />
					</TouchableOpacity>
				</View>

				<View style={styles.flex3} />

				<View style={styles.footer}>
					<Text style={styles.footerFont} allowFontScaling={false}>
						{strings('app_settings.powered_by')}
					</Text>
					<Icon name={'coinGecko'} color={colors.white} width="100" height="35" />
				</View>
			</SafeAreaView>
		);
	}
}
