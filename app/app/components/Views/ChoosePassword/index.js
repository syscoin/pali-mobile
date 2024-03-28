import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Switch, Text, View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connect } from 'react-redux';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import { passwordRequirementsMet } from '../../../util/password';
import { TRUE, BIOMETRY_CHOICE_DISABLED } from '../../../constants/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import PromptView from '../../UI/PromptView';
import { ThemeContext } from '../../../theme/ThemeProvider';
import Device from '../../../util/Device';

import TitleBar from '../../UI/TitleBar';
import MStatusBar from '../../UI/MStatusBar';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	flex1: {
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
	newPwdContent: {
		marginTop: 40
	},
	confirmPwdContent: {
		marginTop: 30
	},
	input: {
		marginTop: 2,
		fontSize: 13,
		paddingVertical: 12,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderColor: colors.$F0F0F0,
		color: colors.$030319
	},
	passwordStrengthLabel: {
		marginTop: 8,
		height: 16,
		fontSize: 13,
		color: colors.$FC6564,
		textAlign: 'left',
		...fontStyles.normal
	},
	ctaWrapper: {
		marginBottom: 30
	},
	biometrics: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 43
	},
	biometryLabel: {
		flex: 1,
		fontSize: 11,
		...fontStyles.bold,
		color: colors.$030319
	},
	biometrySwitch: {
		flex: 0,
		transform: Device.isIos() ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : []
	},
	hintLabel: {
		fontSize: 18,
		lineHeight: 21,
		color: colors.$030319,
		...fontStyles.semibold
	},
	createButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	createButtonText: {
		color: colors.white,
		fontSize: 16
	},
	incompleteButtonWrapper: {
		backgroundColor: colors.$E6E6E6,
		borderColor: colors.$DCDCDC,
		borderWidth: 0.5
	},
	incompleteButtonText: {
		color: colors.$A6A6A6
	}
});

export const ChooseTypeCreate = 'CREATE_WALLET';
export const ChooseTypeImportSeedPhrase = 'IMPORT_SEED_PHRASE';
export const ChooseTypeImportPrivateKey = 'IMPORT_PRIVATE_KEY';

/**
 * View where users can set their password for the first time
 */
class ChoosePassword extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		password: '',
		confirmPassword: '',
		rememberMe: false,
		loading: false,
		error: null,
		errorTitle: null,
		biometryType: null,
		biometryChoice: false,
		chooseType: this.props.navigation.getParam('ChooseType', ChooseTypeCreate)
	};

	mounted = true;

	confirmPasswordInput = React.createRef();

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			this.setState({ biometryType: Device.isAndroid() ? 'biometrics' : biometryType, biometryChoice: true });
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressCreate = () => {
		this.setState({ loading: true });
		this.doPressCreate().then(() => {
			this.setState({ loading: false });
		});
	};

	doPressCreate = async () => {
		const { loading, password, confirmPassword, chooseType } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;

		if (!passwordsMatch) return;
		if (loading) return;
		if (!passwordRequirementsMet(password)) {
			this.setState({
				error: strings('choose_password.must_be_at_least'),
				errorTitle: strings('import_from_seed.password_length_title')
			});
			return;
		} else if (password !== confirmPassword) {
			this.setState({
				error: strings('import_from_seed.password_dont_match'),
				errorTitle: strings('import_from_seed.wrong_password')
			});
			return;
		}
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			this.props.navigation.navigate('BiometricSecurity', {
				ChooseType: chooseType,
				password
			});
		} else if (chooseType === ChooseTypeCreate) {
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

	close() {
		this.props.navigation.pop();
	}

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
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
		const { biometryType, rememberMe, biometryChoice } = this.state;
		return (
			<View style={styles.biometrics}>
				{biometryType ? (
					<>
						<Text style={styles.biometryLabel}>
							{strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
						</Text>
						<View>
							<Switch
								onValueChange={this.updateBiometryChoice}
								value={biometryChoice}
								style={styles.biometrySwitch}
								trackColor={{ true: colors.$4CD964, false: colors.grey300 }}
								ios_backgroundColor={colors.grey300}
							/>
						</View>
					</>
				) : (
					<>
						<Text style={styles.biometryLabel}>{strings(`choose_password.remember_me`)}</Text>
						<Switch
							onValueChange={rememberMe => this.setState({ rememberMe })} // eslint-disable-line react/jsx-no-bind
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

	onPasswordChange = val => {
		this.setState({ password: val });
	};

	setConfirmPassword = val => this.setState({ confirmPassword: val });

	render() {
		const { password, confirmPassword, loading, chooseType } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const canSubmit = passwordsMatch;
		const showMatchLength = password && password.length > 0 && password.length < 6;
		const showMatchPwd =
			!passwordsMatch && password && password.length > 0 && confirmPassword && confirmPassword.length > 0;
		const { isDarkMode } = this.context;

		return (
			<SafeAreaView style={[styles.mainWrapper, isDarkMode && baseStyles.darkBackground]}>
				<View style={styles.wrapper}>
					<MStatusBar navigation={this.props.navigation} />
					<TitleBar
						title={strings(
							chooseType === ChooseTypeCreate ? 'onboarding.create_wallet' : 'onboarding.import_wallet'
						)}
						onBack={this.close.bind(this)}
					/>
					<KeyboardAwareScrollView
						style={styles.scrollableWrapper}
						contentContainerStyle={styles.keyboardScrollableWrapper}
						resetScrollToCoords={{ x: 0, y: 0 }}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
							{strings('choose_password.title')}
						</Text>
						<Text style={[styles.secondaryTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('choose_password.secondary_title')}
						</Text>
						<View style={styles.newPwdContent}>
							<Text style={[styles.hintLabel, isDarkMode && baseStyles.textDark]}>
								{strings('choose_password.password')}
							</Text>
							<TextInput
								style={[styles.input, isDarkMode && baseStyles.textDark]}
								value={password}
								onChangeText={this.onPasswordChange}
								secureTextEntry
								placeholder={strings('choose_password.enter_password')}
								placeholderTextColor={colors.$8F92A1}
								onSubmitEditing={this.jumpToConfirmPassword}
								returnKeyType="next"
								autoCapitalize="none"
							/>
							<Text style={styles.passwordStrengthLabel}>
								{showMatchLength ? strings('choose_password.must_be_at_least') : ''}
							</Text>
						</View>
						<View style={styles.confirmPwdContent}>
							<Text style={[styles.hintLabel, isDarkMode && baseStyles.textDark]}>
								{strings('choose_password.confirm_password')}
							</Text>
							<TextInput
								ref={this.confirmPasswordInput}
								style={[styles.input, isDarkMode && baseStyles.textDark]}
								value={confirmPassword}
								onChangeText={this.setConfirmPassword}
								secureTextEntry
								placeholder={strings('choose_password.enter_again_to_confirm')}
								placeholderTextColor={colors.$8F92A1}
								onSubmitEditing={this.onPressCreate}
								returnKeyType={'done'}
								autoCapitalize="none"
								onFocus={this.password2InputFocused || null}
								onBlur={this.password2InputFocused || null}
							/>
							<Text style={styles.passwordStrengthLabel}>
								{showMatchPwd ? strings('choose_password.password_not_match') : ''}
							</Text>
						</View>
						<View style={styles.flex1} />
						<View style={styles.ctaWrapper}>
							<TouchableOpacity
								style={[styles.createButtonWrapper, !canSubmit && styles.incompleteButtonWrapper]}
								onPress={this.onPressCreate}
								disabled={!canSubmit || loading}
								activeOpacity={activeOpacity}
							>
								{loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text style={[styles.createButtonText, !canSubmit && styles.incompleteButtonText]}>
										{strings('other.next')}
									</Text>
								)}
							</TouchableOpacity>
						</View>
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
)(ChoosePassword);
