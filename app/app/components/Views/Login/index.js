import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Switch,
	ActivityIndicator,
	Text,
	View,
	StyleSheet,
	Image,
	TextInput,
	TouchableOpacity,
	Keyboard,
	DeviceEventEmitter,
	BackHandler
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Engine from '../../../core/Engine';
import { colors, fontStyles, baseStyles, activeOpacity } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import { connect } from 'react-redux';
import { TRUE, BIOMETRY_CHOICE_DISABLED, BIOMETRY_CHOICE, BACKUP_VAULT } from '../../../constants/storage';
import { passwordRequirementsMet } from '../../../util/password';
import Device from '../../../util/Device';
import BiometryButton from '../../UI/BiometryButton';
import { util } from 'paliwallet-core';
import { updateLockScreen } from '../../../actions/settings';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 20
	},
	image: {
		alignSelf: 'center'
	},
	field: {
		marginTop: 56,
		flexDirection: 'column'
	},
	label: {
		fontSize: 18,
		...fontStyles.semibold
	},
	ctaWrapper: {
		marginTop: 60
	},
	errorMsg: {
		minHeight: 15,
		fontSize: 13,
		color: colors.$FC6564,
		lineHeight: 15,
		marginTop: 8
	},
	biometrics: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 7
	},
	biometryLabel: {
		fontSize: 13,
		color: colors.$030319
	},
	biometrySwitch: {
		transform: Device.isIos() ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : []
	},
	keyboardScrollableWrapper: {
		flexGrow: 1
	},
	createButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	incompleteButtonWrapper: {
		backgroundColor: colors.$E6E6E6,
		borderColor: colors.$DCDCDC,
		borderWidth: 0.5
	},
	createButtonText: {
		color: colors.white,
		fontSize: 16,
		...fontStyles.normal
	},
	incompleteButtonText: {
		color: colors.$A6A6A6
	},
	footerImage: {
		marginTop: 20,
		marginBottom: 30,
		alignSelf: 'center',
		width: 85
	},
	biometryButton: {
		paddingTop: 2,
		alignSelf: 'center'
	},
	inputWrapper: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 2,
		borderBottomWidth: 1,
		borderColor: colors.$F0F0F0
	},
	input: {
		flex: 1,
		fontSize: 13,
		paddingVertical: 12,
		paddingHorizontal: 0,
		color: colors.$030319
	}
});

/* TODO: we should have translation strings for these */
const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
const WRONG_PASSWORD_ERROR_ANDROID = 'Error: error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT';
const VAULT_ERROR = 'Error: Cannot unlock without a previous vault.';
const CLEAN_VAULT_ERROR =
	'Pali Wallet encountered an error, Please reinstall Pali Wallet and restore with your seed phrase.';

/**
 * View where returning users can authenticate
 */
class Login extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		updateLockScreen: PropTypes.func
	};

	state = {
		password: '',
		rememberMe: false,
		loading: false,
		error: null,
		biometryType: null,
		biometryChoice: false,
		invalidBiometry: false,
		hasCredentials: false,
		isBackgroundMode: this.props.navigation.getParam('path') === 'Main'
	};

	fieldRef = React.createRef();

	componentDidMount() {
		this.loadBiometric();
		if (this.state.isBackgroundMode && Device.isAndroid()) {
			BackHandler.addEventListener('hardwareBackPress', this.onBackAndroid);
		}
	}

	componentWillUnmount() {
		this.removeBackgroundMode();
		if (this.state.isBackgroundMode && Device.isAndroid()) {
			BackHandler.removeEventListener('hardwareBackPress', this.onBackAndroid);
		}
	}

	onBackAndroid = () => {
		if (this.state.isBackgroundMode) {
			return true;
		}
		return false;
	};

	async tryAgainBiometric(mode) {
		if (!mode) {
			this.removeBackgroundMode();
			await this.tryBiometric();
		}
	}

	listenBackgroundMode() {
		this.tryAgainBiometricFunc = this.tryAgainBiometric.bind(this);
		DeviceEventEmitter.once('BackgroundMode', this.tryAgainBiometricFunc);
	}

	removeBackgroundMode() {
		this.tryAgainBiometricFunc && DeviceEventEmitter.removeListener('BackgroundMode', this.tryAgainBiometricFunc);
		this.tryAgainBiometricFunc = null;
	}

	async loadBiometric() {
		const choice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
		const disabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
		this.setState({
			biometryChoice: !disabled
		});
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			this.setState({
				biometryType: Device.isAndroid() ? 'biometrics' : biometryType,
				hasCredentials: choice
			});

			if (!disabled) {
				setTimeout(() => {
					const { TokenBalancesController } = Engine.context;
					if (TokenBalancesController.config.backgroundMode) {
						this.listenBackgroundMode();
						return;
					}
					this.tryBiometric();
				}, 100);
			}
		} else if (Device.isIos()) {
			this.setState({ invalidBiometry: true });
		} else if (!choice && !disabled) {
			this.setState({ rememberMe: false });
		} else if (!choice && disabled) {
			const rememberMe = !!(await SecureKeychain.getGenericPassword());
			this.setState({ rememberMe });
		} else {
			this.setState({ invalidBiometry: true });
		}
	}

	onLoginClick = () => {
		if (this.state.loading) {
			return;
		}
		this.setState({ loading: true, error: null });
		Keyboard.dismiss();
		this.onLogin().then(result => {
			!result && this.setState({ loading: false });
		});
	};

	onLogin = async () => {
		const { password } = this.state;
		const locked = !passwordRequirementsMet(password);
		if (locked) {
			this.setState({ error: strings('login.invalid_password') });
			return false;
		}
		const { KeyringController } = Engine.context;

		try {
			if (this.props.navigation.getParam('path')) {
				await KeyringController.verifyPassword(password);
				this.props.updateLockScreen(false);
				this.props.navigation.pop();
			} else {
				// Restore vault with user entered password
				await KeyringController.verifyPassword(password);
				setTimeout(() => {
					KeyringController.submitPassword(password);
				}, 10);
				if (this.state.biometryChoice && this.state.biometryType) {
					const biometryChoice = Device.isIos() && (await AsyncStorage.getItem(BIOMETRY_CHOICE));
					if (biometryChoice !== TRUE) {
						await SecureKeychain.resetGenericPassword();
						await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
					}
				} else if (this.state.rememberMe) {
					await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.REMEMBER_ME);
				} else if (!Device.isIos() || this.state.biometryType) {
					await SecureKeychain.resetGenericPassword();
				}
				this.props.navigation.navigate('HomeNav');
			}
			return true;
		} catch (e) {
			// Should we force people to enable passcode / biometrics?
			await SecureKeychain.resetGenericPassword();
			const error = e.toString();
			if (
				error.toLowerCase() === WRONG_PASSWORD_ERROR.toLowerCase() ||
				error.toLowerCase() === WRONG_PASSWORD_ERROR_ANDROID.toLowerCase()
			) {
				this.setState({ error: strings('login.invalid_password') });
			} else if (error.toLowerCase() === PASSCODE_NOT_SET_ERROR.toLowerCase()) {
				this.setState({
					error:
						'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)'
				});
			} else if (error.toLowerCase() === VAULT_ERROR.toLowerCase()) {
				try {
					const vault = await AsyncStorage.getItem(BACKUP_VAULT, '');
					if (vault) {
						await KeyringController.revertVault(vault);
						return await this.onLogin();
					}
				} catch (e) {
					util.logError('Failed to revert vault', e);
				}
				this.setState({
					error: CLEAN_VAULT_ERROR
				});
			} else {
				this.setState({ error });
			}
			util.logError(error, 'Failed to login');
		}
		return false;
	};

	tryBiometric = async () => {
		const { current: field } = this.fieldRef;
		field?.blur();
		try {
			const credentials = await SecureKeychain.getGenericPassword();
			if (!credentials) return false;
			field?.blur();
			this.setState({ password: credentials.password });
			field?.blur();
			this.onLoginClick();
		} catch (error) {
			if (!(await SecureKeychain.getSupportedBiometryType())) {
				this.setState({ invalidBiometry: true });
			}
			util.logWarn('PPYang tryBiometric', error);
		}
		field?.blur();
		return true;
	};

	updateBiometryChoice = async biometryChoice => {
		if (!biometryChoice) {
			await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		} else {
			await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
		}
		this.setState({ biometryChoice });
	};

	renderSwitch = () => {
		const { biometryType, rememberMe, biometryChoice, invalidBiometry } = this.state;
		return (
			<View style={styles.biometrics}>
				{invalidBiometry ? (
					biometryChoice ? (
						<Text style={[styles.biometryLabel, { color: colors.$FC6564 }]}>
							{strings(`biometrics.rejectBiometry`)}
						</Text>
					) : (
						<></>
					)
				) : biometryType ? (
					<>
						<Text style={styles.biometryLabel}>
							{strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
						</Text>
						<View style={styles.flex} />
						<View>
							<Switch
								onValueChange={this.updateBiometryChoice}
								value={biometryChoice}
								style={styles.biometrySwitch}
								trackColor={{ true: colors.$4CD964, false: colors.grey300 }}
								ios_backgroundColor={colors.grey300}
								thumbColor={colors.white}
							/>
						</View>
					</>
				) : (
					<>
						<Text style={styles.biometryLabel}>{strings(`choose_password.remember_me`)}</Text>
						<View style={styles.flex} />
						<Switch
							onValueChange={rememberMe => this.setState({ rememberMe })}
							value={rememberMe}
							style={styles.biometrySwitch}
							trackColor={{ true: colors.$4CD964, false: colors.grey300 }}
							thumbColor={colors.white}
							ios_backgroundColor={colors.grey300}
						/>
					</>
				)}
			</View>
		);
	};

	setPassword = val => this.setState({ password: val, error: null });

	render = () => (
		<SafeAreaView style={styles.mainWrapper}>
			<KeyboardAwareScrollView
				style={styles.wrapper}
				contentContainerStyle={styles.keyboardScrollableWrapper}
				resetScrollToCoords={{ x: 0, y: 0 }}
				keyboardShouldPersistTaps="handled"
			>
				<View testID={'login'} style={baseStyles.flexGrow}>
					<View style={baseStyles.flexGrow} />
					<Image source={require('../../../images/logo_about.png')} style={styles.image} />
					<View style={styles.field}>
						<Text style={styles.label}>{strings('login.password')}</Text>
						<View style={styles.inputWrapper}>
							<TextInput
								ref={this.fieldRef}
								style={styles.input}
								value={this.state.password}
								onChangeText={this.setPassword}
								secureTextEntry
								placeholder={strings('login.password')}
								placeholderTextColor={colors.$8F92A1}
								onSubmitEditing={this.onLoginClick}
								returnKeyType={'done'}
								autoCapitalize="none"
							/>
							<View style={styles.biometryButton}>
								<BiometryButton
									onPress={this.tryBiometric}
									hidden={
										!(
											this.state.biometryChoice &&
											this.state.biometryType &&
											this.state.hasCredentials
										)
									}
									type={this.state.biometryType}
								/>
							</View>
						</View>
					</View>

					<Text style={styles.errorMsg} testID={'invalid-password-error'}>
						{!!this.state.error && this.state.error}
					</Text>

					{this.renderSwitch()}

					<View style={styles.ctaWrapper}>
						<TouchableOpacity
							style={[
								styles.createButtonWrapper,
								this.state.password.length <= 0 && styles.incompleteButtonWrapper
							]}
							onPress={this.onLoginClick}
							disabled={this.state.loading || this.state.password.length <= 0}
							activeOpacity={activeOpacity}
						>
							{this.state.loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Text
									style={[
										styles.createButtonText,
										this.state.password.length <= 0 && styles.incompleteButtonText
									]}
								>
									{strings('login.login')}
								</Text>
							)}
						</TouchableOpacity>
					</View>

					{/* eslint-disable-next-line react-native/no-inline-styles */}
					<View style={{ flex: 2 }} />

					<Image style={styles.footerImage} source={require('../../../images/footer_logo.png')} />
				</View>
			</KeyboardAwareScrollView>
			<FadeOutOverlay />
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
	updateLockScreen: locked => dispatch(updateLockScreen(locked))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Login);
