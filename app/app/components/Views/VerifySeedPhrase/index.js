import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, TextInput, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import SecureKeychain from '../../../core/SecureKeychain';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { BIOMETRY_CHOICE, TRUE } from '../../../constants/storage';
import MStatusBar from '../../UI/MStatusBar';
import { util } from 'paliwallet-core';
import { tryVerifyPassword } from '../../../core/Vault';
import { failedSeedPhraseRequirements, isValidMnemonic, parseSeedPhrase } from '../../../util/validators';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	rowWrapper: {
		paddingHorizontal: 30
	},
	columnWrapper: {
		paddingVertical: 20
	},
	warningText: {
		fontSize: 13,
		color: colors.$FC6564
	},
	enterPassword: {
		marginTop: 16,
		color: colors.$202020,
		fontSize: 18,
		lineHeight: 21,
		...fontStyles.semibold
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
		fontSize: 16,
		...fontStyles.bold
	},
	seedPhrase: {
		marginTop: 30,
		paddingTop: 14,
		paddingLeft: 14,
		paddingRight: 14,
		paddingBottom: 14,
		fontSize: 13,
		borderRadius: 5,
		height: 122,
		backgroundColor: colors.$F6F6F6,
		color: colors.$030319,
		textAlignVertical: 'top'
	},
	ctaWrapper: {
		marginTop: 14
	},
	importButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	importButtonText: {
		color: colors.white,
		fontSize: 16
	},
	verifyErrorView: {
		flexDirection: 'row',
		height: 38,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 68,
		borderRadius: 10
	},
	errorText: {
		marginLeft: 6,
		color: colors.$030319,
		fontSize: 14
	}
});

class VerifySeedPhrase extends PureComponent {
	state = {
		privateCredential: null,
		unlocked: this.props.navigation.getParam('matchSeed', null) !== null,
		password: '',
		warningIncorrectPassword: '',
		keyringIndex: this.props.navigation.getParam('keyringIndex', 0),
		matchSeed: this.props.navigation.getParam('matchSeed', null),
		seed: '',
		errorState: -1 //-1：初始状态， 0：成功；  1：失败,
	};
	static contextType = ThemeContext;
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	async componentDidMount() {
		// Try to use biometrics to unloc
		if (!this.state.matchSeed) {
			const biometryType = await SecureKeychain.getSupportedBiometryType();
			if (biometryType) {
				const biometryChoice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
				if (biometryChoice === TRUE) {
					try {
						const credentials = await SecureKeychain.getGenericPassword();
						if (credentials) {
							this.tryUnlockWithPassword(credentials.password);
						}
					} catch (error) {
						util.logWarn('PPYang getGenericPassword', error);
					}
				}
			}
		}
		PreventScreenshot.forbid();
	}

	componentWillUnmount = () => {
		PreventScreenshot.allow();
	};

	async tryUnlockWithPassword(password) {
		try {
			const privateCredential = await tryVerifyPassword(password, this.state.keyringIndex);
			this.setState({ privateCredential, unlocked: true });
		} catch (e) {
			const msg = strings('reveal_credential.wrong_password');
			this.setState({
				unlock: false,
				warningIncorrectPassword: msg
			});
		}
	}

	tryUnlock = () => {
		const { password } = this.state;
		this.tryUnlockWithPassword(password);
	};

	onPasswordChange = password => {
		this.setState({ password });
	};

	onSeedWordsChange = seed => {
		this.setState({ seed });
	};

	onPressverify = async originSeed => {
		const { seed } = this.state;
		const parsedSeed = parseSeedPhrase(seed);
		if (failedSeedPhraseRequirements(parsedSeed) || !isValidMnemonic(parsedSeed)) {
			this.setState({ errorState: 1 });
		} else if (originSeed === parsedSeed) {
			this.setState({ errorState: 0 });
		} else {
			this.setState({ errorState: 1 });
		}
	};

	renderVerifyView = originSeed => {
		const { seed, errorState } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View>
				<TextInput
					value={seed}
					numberOfLines={3}
					style={[styles.seedPhrase, , isDarkMode && [baseStyles.textDark, baseStyles.darkInputBackground]]}
					multiline
					placeholder={strings('import_from_seed.seed_phrase_placeholder')}
					placeholderTextColor={colors.$8F92A1}
					onChangeText={this.onSeedWordsChange}
					testID="input-seed-phrase"
					blurOnSubmit
					onSubmitEditing={() => {
						this.onPressverify(originSeed);
					}}
					returnKeyType="next"
					autoCapitalize="none"
					autoCorrect={false}
				/>

				<View
					style={[
						styles.verifyErrorView,
						{
							backgroundColor:
								errorState === 0
									? colors.correctBg
									: errorState === 1
									? colors.errorBg
									: colors.transparent
						}
					]}
				>
					{errorState !== -1 && (
						<>
							<Image
								source={
									errorState === 0
										? require('../../../images/ic_verify_success.png')
										: require('../../../images/ic_verify_error.png')
								}
							/>
							<Text style={[styles.errorText, isDarkMode && baseStyles.textDark]}>
								{errorState === 0
									? strings('wallet_management.keep_them_safe_place')
									: strings('wallet_management.wrong_seed_phrase')}
							</Text>
						</>
					)}
				</View>

				<View style={styles.ctaWrapper}>
					<TouchableOpacity
						style={styles.importButtonWrapper}
						onPress={() => {
							this.onPressverify(originSeed);
						}}
						activeOpacity={activeOpacity}
					>
						<Text style={styles.importButtonText}>{strings('wallet_management.verify')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	render = () => {
		const { unlocked, password, privateCredential, matchSeed } = this.state;
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}
				testID={'reveal-private-credential-screen'}
			>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={strings('wallet_management.verify_seed_phrase_title', {
						walletName: this.props.navigation.getParam('walletName', '')
					})}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<View>
					<View style={styles.rowWrapper}>
						{unlocked ? (
							this.renderVerifyView(matchSeed || privateCredential.seed)
						) : (
							<View style={[styles.columnWrapper]}>
								<Text style={[styles.enterPassword, isDarkMode && baseStyles.textDark]}>
									{strings('reveal_credential.enter_password')}
								</Text>
								<TextInput
									style={[baseStyles.input, isDarkMode && baseStyles.textDark]}
									testID={'private-credential-password-text-input'}
									placeholder={strings('choose_password.enter_password')}
									placeholderTextColor={colors.$8F92A1}
									onChangeText={this.onPasswordChange}
									secureTextEntry
									onSubmitEditing={this.tryUnlock}
								/>

								<View style={styles.wrongRow}>
									<Text style={styles.warningText}>{this.state.warningIncorrectPassword}</Text>
								</View>

								<TouchableOpacity
									style={[
										styles.completeButtonWrapper,
										password.length <= 0 && styles.incompleteButtonWrapper
									]}
									onPress={this.tryUnlock}
								>
									<Text style={styles.completeButtonText}>
										{strings('reveal_credential.confirm')}
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(VerifySeedPhrase);
