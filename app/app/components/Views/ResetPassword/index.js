import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	KeyboardAvoidingView,
	ActivityIndicator,
	Text,
	View,
	TextInput,
	StyleSheet,
	TouchableOpacity
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connect } from 'react-redux';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import { BIOMETRY_CHOICE_DISABLED } from '../../../constants/storage';
import { passwordRequirementsMet } from '../../../util/password';
import { toggleShowHint } from '../../../actions/hint';
import PromptView from '../../UI/PromptView';
import MStatusBar from '../../UI/MStatusBar';
import { util } from 'paliwallet-core';
import { tryVerifyPassword } from '../../../core/Vault';
import Engine from '../../../core/Engine';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trigger } from 'react-native-haptic-feedback';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	confirm_title: {
		fontSize: 28,
		color: colors.$030319,
		...fontStyles.semibold,
		lineHeight: 34
	},
	confirm_label: {
		fontSize: 14,
		color: colors.$60657D,
		marginTop: 10,
		marginBottom: 16,
		lineHeight: 20
	},
	wrapper: {
		flex: 1,
		marginBottom: 10
	},
	scrollableWrapper: {
		flex: 1,
		paddingHorizontal: 32
	},
	keyboardScrollableWrapper: {
		flexGrow: 1
	},
	field: {
		position: 'relative'
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
		marginTop: 67
	},
	hintLabel: {
		marginTop: 30,
		fontSize: 18,
		color: colors.$030319,
		textAlign: 'left',
		...fontStyles.semibold
	},
	titlePadding: {
		paddingTop: 6
	},
	confirmPasswordWrapper: {
		flex: 1,
		padding: 30,
		paddingTop: 36
	},
	warningMessageText: {
		fontSize: 13,
		color: colors.$FC6564
	},
	keyboardAvoidingView: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	},
	wrongRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8
	},
	completeButtonWrapper: {
		backgroundColor: colors.brandPink300,
		borderColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 0,
		marginTop: 67
	},
	incompleteButtonWrapper: {
		backgroundColor: colors.$E6E6E6,
		borderColor: colors.$DCDCDC,
		borderWidth: 0.5
	},
	completeButtonText: {
		color: colors.white,
		fontSize: 16
	},
	incompleteButtonText: {
		color: colors.$A6A6A6
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
		fontSize: 16,
		...fontStyles.normal
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const RESET_PASSWORD = 'reset_password';
const CONFIRM_PASSWORD = 'confirm_password';

/**
 * View where users can set their password for the first time
 */
class ResetPassword extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,

		toggleShowHint: PropTypes.func
	};

	state = {
		password: '',
		confirmPassword: '',
		secureTextEntry: true,
		rememberMe: false,
		loading: false,
		error: null,
		errorTitle: null,
		view: CONFIRM_PASSWORD,
		originalPassword: null,
		ready: true
	};

	confirmPasswordInput = React.createRef();

	onPressCreate = async () => {
		const { loading, password, confirmPassword } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const canSubmit = passwordsMatch;

		if (!canSubmit) return;
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
		try {
			this.setState({ loading: true });

			await this.changePassword();

			// Set biometrics for new password
			await SecureKeychain.resetGenericPassword();

			try {
				const biometryChoice = !(await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED));
				const biometryType = await SecureKeychain.getSupportedBiometryType();
				const rememberMe = !biometryType && !biometryChoice && !!(await SecureKeychain.getGenericPassword());
				trigger('notificationSuccess', options);

				if (biometryType && biometryChoice) {
					await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
				} else if (rememberMe) {
					await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.REMEMBER_ME);
				}
			} catch (error) {
				util.logError('onPressCreate', error);
			}

			this.setState({ loading: false }, () => {
				this.props.toggleShowHint(strings('reset_password.password_reset'));
				this.props.navigation.pop();
			});
		} catch (error) {
			util.logWarn('PPYang ResetPassword error:', error && error.toString());
			// Should we force people to enable passcode / biometrics?
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
	};

	changePassword = async () => {
		const { originalPassword, password } = this.state;
		const { KeyringController } = Engine.context;
		await KeyringController.changePassword(originalPassword, password);
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	tryUnlockWithPassword = async password => {
		this.setState({ ready: false });
		try {
			// Just try
			await tryVerifyPassword(password);
			this.setState({
				password: null,
				originalPassword: password,
				ready: true,
				view: RESET_PASSWORD
			});
		} catch (e) {
			util.logWarn('PPYang tryUnlockWithPassword error:', e);
			const msg = strings('reveal_credential.wrong_password');
			this.setState({
				warningIncorrectPassword: msg,
				ready: true
			});
		}
	};

	tryUnlock = () => {
		const { password } = this.state;
		this.tryUnlockWithPassword(password);
	};

	onPasswordChange = val => {
		this.setState({ password: val });
	};

	toggleShowHide = () => {
		this.setState(state => ({ secureTextEntry: !state.secureTextEntry }));
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	setConfirmPassword = val => this.setState({ confirmPassword: val });

	renderConfirmPassword() {
		const { warningIncorrectPassword, password } = this.state;
		return (
			<KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={'padding'}>
				<KeyboardAwareScrollView
					style={baseStyles.flexGrow}
					enableOnAndroid
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.confirmPasswordWrapper}>
						<Text style={styles.confirm_title}>{strings('manual_backup_step_1.confirm_password')}</Text>
						<Text style={styles.confirm_label}>{strings('manual_backup_step_1.before_continiuing')}</Text>
						<TextInput
							style={baseStyles.input}
							placeholder={strings('manual_backup_step_1.password')}
							placeholderTextColor={colors.grey100}
							onChangeText={this.onPasswordChange}
							secureTextEntry
							onSubmitEditing={this.tryUnlock}
							testID={'private-credential-password-text-input'}
						/>

						<View style={styles.wrongRow}>
							<Text style={styles.warningMessageText}>{warningIncorrectPassword}</Text>
						</View>
						<TouchableOpacity
							style={[
								styles.completeButtonWrapper,
								password.length <= 0 && styles.incompleteButtonWrapper
							]}
							onPress={this.tryUnlock}
						>
							<Text
								style={[styles.completeButtonText, password.length <= 0 && styles.incompleteButtonText]}
							>
								{strings('manual_backup_step_1.confirm')}
							</Text>
						</TouchableOpacity>
					</View>
				</KeyboardAwareScrollView>
			</KeyboardAvoidingView>
		);
	}

	renderResetPassword() {
		const { password, confirmPassword, loading } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const showMatchLength = password && password.length > 0 && password.length < 6;
		const showMatchPwd =
			!passwordsMatch && password && password.length > 0 && confirmPassword && confirmPassword.length > 0;
		const canSubmit = passwordsMatch;

		return (
			<View style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'choose-password-screen'}>
					<KeyboardAwareScrollView
						style={styles.scrollableWrapper}
						contentContainerStyle={styles.keyboardScrollableWrapper}
						resetScrollToCoords={{ x: 0, y: 0 }}
						keyboardShouldPersistTaps="handled"
					>
						<View testID={'create-password-screen'}>
							<Text style={[styles.hintLabel, styles.titlePadding]}>
								{strings('reset_password.password')}
							</Text>
							<TextInput
								style={baseStyles.input}
								value={password}
								onChangeText={this.onPasswordChange}
								secureTextEntry
								placeholder={strings('choose_password.enter_password')}
								placeholderTextColor={colors.$8F92A1}
								testID="input-password"
								onSubmitEditing={this.jumpToConfirmPassword}
								returnKeyType="next"
								autoCapitalize="none"
							/>
							<Text style={styles.passwordStrengthLabel}>
								{showMatchLength ? strings('choose_password.must_be_at_least') : ''}
							</Text>
							<View style={styles.field}>
								<Text style={styles.hintLabel}>{strings('reset_password.confirm_password')}</Text>
								<TextInput
									ref={this.confirmPasswordInput}
									style={baseStyles.input}
									value={confirmPassword}
									onChangeText={this.setConfirmPassword}
									secureTextEntry
									placeholder={strings('choose_password.enter_password')}
									placeholderTextColor={colors.$8F92A1}
									testID={'input-password-confirm'}
									onSubmitEditing={this.onPressCreate}
									returnKeyType={'done'}
									autoCapitalize="none"
								/>
								<Text style={styles.passwordStrengthLabel}>
									{showMatchPwd ? strings('choose_password.password_not_match') : ''}
								</Text>
							</View>
						</View>

						<View style={styles.ctaWrapper}>
							<TouchableOpacity
								style={[styles.createButtonWrapper, !canSubmit && styles.incompleteButtonWrapper]}
								onPress={this.onPressCreate}
								disabled={!canSubmit && loading}
							>
								{loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text style={[styles.createButtonText, !canSubmit && styles.incompleteButtonText]}>
										{strings('reset_password.title')}
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
			</View>
		);
	}

	render() {
		const { view, ready } = this.state;
		if (!ready) return this.renderLoader();
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={strings('password_reset.change_password')}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				{view === RESET_PASSWORD ? this.renderResetPassword() : this.renderConfirmPassword()}
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ResetPassword);
