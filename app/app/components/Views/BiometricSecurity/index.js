import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import { strings } from '../../../../locales/i18n';
import PropTypes from 'prop-types';
import { ChooseTypeCreate, ChooseTypeImportPrivateKey, ChooseTypeImportSeedPhrase } from '../ChoosePassword';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Device from '../../../util/Device';
import SecureKeychain from '../../../core/SecureKeychain';
import { ThemeContext } from '../../../theme/ThemeProvider';

import contextImage from '../../../images/img_create_biometric.png';
import imgTouchId from '../../../images/ic_touchid.png';
import imgFaceId from '../../../images/ic_faceid.png';
import imgbiometrics from '../../../images/ic_auth.png';
import PromptView from '../../UI/PromptView';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1
	},
	scrollableWrapper: {
		flex: 1,
		paddingHorizontal: 30
	},
	keyboardScrollableWrapper: {
		flexGrow: 1
	},
	title: {
		fontSize: 28,
		marginTop: 36,
		lineHeight: 34,
		color: colors.$030319,
		...fontStyles.semibold
	},
	secondaryTitle: {
		fontSize: 14,
		marginTop: 10,
		lineHeight: 20,
		color: colors.$60657D
	},
	contextImage: {
		width: 325,
		height: 325,
		alignSelf: 'center'
	},
	createButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row'
	},
	createButtonText: {
		color: colors.white,
		fontSize: 16
	},
	biometricsLogo: {
		marginLeft: 9
	},
	skipButtonWrapper: {
		marginTop: 24,
		paddingHorizontal: 40,
		marginBottom: 30,
		alignSelf: 'center'
	},
	skipButtonText: {
		color: colors.$60657D,
		fontSize: 16
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

class BiometricSecurity extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object
	};

	state = {
		chooseType: this.props.navigation.getParam('ChooseType', ChooseTypeCreate),
		password: this.props.navigation.getParam('password', ''),
		biometryType: null,
		loading: false,
		error: null,
		errorTitle: null
	};

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		this.setState({
			biometryType: Device.isAndroid() ? 'biometrics' : biometryType
		});
	}

	getBiometricStr = () => {
		const { biometryType } = this.state;
		if (biometryType === 'FaceID') {
			return strings('choose_password.face_id');
		} else if (biometryType === 'TouchID') {
			return strings('choose_password.touch_id');
		}
		return strings('choose_password.bio_auth');
	};

	getEnableBiometricStr = () => {
		const { biometryType } = this.state;
		if (biometryType === 'FaceID') {
			return strings('biometrics.enable_faceid');
		} else if (biometryType === 'TouchID') {
			return strings('biometrics.enable_touchid');
		}
		return strings('biometrics.enable_biometrics');
	};

	getBiometricLogo = () => {
		const { biometryType } = this.state;
		if (biometryType === 'FaceID') {
			return imgFaceId;
		} else if (biometryType === 'TouchID') {
			return imgTouchId;
		}
		return imgbiometrics;
	};

	onEnableBiometric = () => {
		this.setState({ loading: true });
		this.doEnableBiometric().then(result => {
			this.setState({ loading: false });
			if (result) {
				this.startCreateWallet();
			}
		});
	};

	doEnableBiometric = async () => {
		const { password } = this.state;
		try {
			await SecureKeychain.resetGenericPassword();
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
			return true;
		} catch (error) {
			if (error.toString() === PASSCODE_NOT_SET_ERROR) {
				this.setState({
					error: strings('choose_password.security_alert_title'),
					errorTitle: strings('choose_password.security_alert_message'),
					loading: false
				});
			} else {
				this.setState({
					error: error.toString(),
					errorTitle: 'Error',
					loading: false
				});
			}
		}
		return false;
	};

	onSkip = () => {
		setTimeout(async () => {
			await SecureKeychain.resetGenericPassword();
		}, 10);
		this.startCreateWallet();
	};

	startCreateWallet = () => {
		const { chooseType, password } = this.state;
		if (chooseType === ChooseTypeCreate) {
			this.props.navigation.navigate('DrawingGuide', {
				headerLeftHide: true,
				ChooseType: chooseType,
				password
			});
		} else if (chooseType === ChooseTypeImportSeedPhrase) {
			this.props.navigation.navigate('ImportFromSeed', {
				ChooseType: chooseType,
				password
			});
		} else if (chooseType === ChooseTypeImportPrivateKey) {
			this.props.navigation.navigate('ImportPrivateKey', {
				ChooseType: chooseType,
				password
			});
		}
	};

	onBack = () => {
		this.props.navigation.pop();
	};

	render() {
		const { chooseType, loading } = this.state;
		const { isDarkMode } = this.context;

		return (
			<SafeAreaView style={[styles.mainWrapper, isDarkMode && baseStyles.darkBackground]}>
				<View style={styles.wrapper}>
					<MStatusBar navigation={this.props.navigation} />
					<TitleBar
						title={strings(
							chooseType === ChooseTypeCreate ? 'onboarding.create_wallet' : 'onboarding.import_wallet'
						)}
						onBack={this.onBack}
					/>
					<KeyboardAwareScrollView
						style={styles.scrollableWrapper}
						contentContainerStyle={styles.keyboardScrollableWrapper}
						resetScrollToCoords={{ x: 0, y: 0 }}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
							{strings('choose_password.biometric_security')}
						</Text>
						<Text style={[styles.secondaryTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('choose_password.biometric_security_hint', { biometric: this.getBiometricStr() })}
						</Text>
						<View style={baseStyles.flexGrow} />
						<Image style={styles.contextImage} source={contextImage} resizeMode="contain" />
						<View style={baseStyles.flex2} />

						<TouchableOpacity
							style={styles.createButtonWrapper}
							onPress={this.onEnableBiometric}
							disabled={loading}
							activeOpacity={activeOpacity}
						>
							{loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<>
									<Text style={[styles.createButtonText, isDarkMode && baseStyles.textDark]}>
										{this.getEnableBiometricStr()}
									</Text>
									<Image style={styles.biometricsLogo} source={this.getBiometricLogo()} />
								</>
							)}
						</TouchableOpacity>
						<TouchableOpacity activeOpacity={1} style={styles.skipButtonWrapper} onPress={this.onSkip}>
							<Text style={[styles.skipButtonText, isDarkMode && baseStyles.subTextDark]}>
								{strings('other.skip')}
							</Text>
						</TouchableOpacity>

						<PromptView
							isVisible={this.state.errorTitle != null && this.state.error != null}
							title={this.state.errorTitle}
							message={this.state.error}
							onRequestClose={() => {
								this.setState({ error: null, errorTitle: null });
							}}
						/>
					</KeyboardAwareScrollView>
				</View>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(BiometricSecurity);
