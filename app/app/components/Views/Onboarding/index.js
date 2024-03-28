import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, Image, View, ScrollView, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { colors, fontStyles, baseStyles, activeOpacity } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import Animated, { EasingNode } from 'react-native-reanimated';
import PreventScreenshot from '../../../core/PreventScreenshot';

import CreateBackground from '../../../images/addbackground.png';
import ImportBackground from '../../../images/seedphrasebackground.png';
import BackgroundWelcome from '../../../images/backgroundWelcome.png';
import Create from '../../../images/Add.png';
import Import from '../../../images/seedphrase.png';
import PaliLogo from '../../../images/img_share_logo.png';
import Logo from '../../../images/img_support_network.png';
import importKey from '../../../images/ic_import_key.png';
import importKeyBackground from '../../../images/import_key_background.png';
import MStatusBar from '../../UI/MStatusBar';
import { ChooseTypeCreate, ChooseTypeImportPrivateKey, ChooseTypeImportSeedPhrase } from '../ChoosePassword';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	scroll: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	scrollWrapper: {
		flex: 1
	},
	ctas: {
		flex: 1,
		alignItems: 'center'
	},
	buttonDescription: {
		...fontStyles.normal,
		fontSize: 16,
		textAlign: 'center',
		color: colors.grey600,
		lineHeight: 30
	},
	backgroundImageView: {
		width: '100%',
		height: '60%',
		position: 'absolute'
	},

	logo: {
		width: 250,
		height: 70
	},
	createButtonWrapper: {
		width: 320,
		height: '15%',
		marginTop: 62
	},
	importButtonWrapper: {
		marginTop: 16,
		width: 320,
		height: '15%'
	},
	buttonBackground: {
		flex: 1
	},
	createWallet: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 36
	},
	addButton: {
		width: 45,
		height: 45
	},
	importButton: {
		width: 45,
		height: 45
	},
	importKey: {
		width: 50,
		height: 50
	},
	createWalletText: {
		marginLeft: 15.5,
		fontSize: 16,
		color: colors.white,
		...fontStyles.bold,
		width: 150,
		lineHeight: 22
	},
	bottomText: {
		fontSize: 12,
		textAlign: 'center',
		color: colors.$8F92A1,
		marginHorizontal: 38
	},
	footerLogo: {
		marginTop: 6,
		marginBottom: 23,
		width: 270,
		height: 25
	},
	importKeyWrapper: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.$FF894B,
		width: 320,
		height: 44,
		marginTop: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	importKeyText: {
		...fontStyles.semibold,
		fontSize: 16,
		color: colors.$FF894B,
		marginLeft: 10
	}
});

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	notificationAnimated = new Animated.Value(100);

	animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: EasingNode.linear,
			useNativeDriver: true
		}).start();
	};

	componentDidMount() {
		PreventScreenshot.forbid();
	}

	componentWillUnmount() {
		PreventScreenshot.allow();
	}

	onPressCreate = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', { ChooseType: ChooseTypeCreate });
		};
		action();
	};

	onPressImport = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', { ChooseType: ChooseTypeImportSeedPhrase });
		};
		action();
	};

	onPressImportPrivateKey = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', { ChooseType: ChooseTypeImportPrivateKey });
		};
		action();
	};

	renderContent() {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.ctas}>
				<MStatusBar navigation={this.props.navigation} />
				<View style={baseStyles.flexGrow} />
				{!isDarkMode && (
					<ImageBackground
						style={styles.backgroundImageView}
						source={BackgroundWelcome}
						resizeMode="stretch"
						repeat="repeat"
					/>
				)}
				<Image resizeMode="contain" source={PaliLogo} style={styles.logo} />

				<TouchableOpacity
					style={styles.createButtonWrapper}
					onPress={this.onPressCreate}
					activeOpacity={activeOpacity}
				>
					<ImageBackground style={styles.buttonBackground} source={CreateBackground} resizeMode={'stretch'}>
						<View style={styles.createWallet}>
							<Image source={Create} style={styles.addButton} />
							<Text style={styles.createWalletText}>{strings('onboarding.start_exploring_now')}</Text>
						</View>
					</ImageBackground>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.importButtonWrapper}
					onPress={this.onPressImport}
					activeOpacity={activeOpacity}
				>
					<ImageBackground style={styles.buttonBackground} source={ImportBackground} resizeMode={'stretch'}>
						<View style={styles.createWallet}>
							<Image source={Import} style={styles.importButton} />
							<Text style={styles.createWalletText}>{strings('onboarding.import_seed_phrase')}</Text>
						</View>
					</ImageBackground>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.importButtonWrapper}
					onPress={this.onPressImportPrivateKey}
					activeOpacity={activeOpacity}
				>
					<ImageBackground
						style={styles.buttonBackground}
						source={importKeyBackground}
						resizeMode={'stretch'}
					>
						<View style={styles.createWallet}>
							<Image source={importKey} style={styles.importButton} />
							<Text style={styles.createWalletText}>{strings('onboarding.import_private_key')}</Text>
						</View>
					</ImageBackground>
				</TouchableOpacity>

				<View style={baseStyles.flexGrow} />
				<Text style={[styles.bottomText, isDarkMode && baseStyles.subTextDark]}>
					{strings('onboarding.prompt_text')}
				</Text>
				<Image style={styles.footerLogo} resizeMode="contain" source={Logo} />
			</View>
		);
	}

	render() {
		const { isDarkMode } = this.context;
		return (
			<View style={[baseStyles.flexGrow, isDarkMode && baseStyles.darkBackground]} testID={'onboarding-screen'}>
				<View style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}>
					<ScrollView
						style={baseStyles.flexGrow}
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.scrollWrapper}>{this.renderContent()}</View>
					</ScrollView>
				</View>
				<FadeOutOverlay />
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({});

export default connect(
	null,
	mapDispatchToProps
)(Onboarding);
