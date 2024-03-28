import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, TextInput, Image, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import SecureKeychain from '../../../core/SecureKeychain';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { BIOMETRY_CHOICE, TRUE } from '../../../constants/storage';
import MStatusBar from '../../UI/MStatusBar';
import { util } from 'paliwallet-core';
import { isHDMainAddress, tryVerifyPassword } from '../../../core/Vault';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	rowWrapper: {
		flex: 1,
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
	seedPhraseTitle: {
		fontSize: 18,
		marginTop: 10,
		color: colors.$030319,
		...fontStyles.semibold
	},
	seedPhraseWrapper: {
		marginTop: 4,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between'
	},
	wordWrapper: {
		marginBottom: 10,
		width: 148,
		height: 40,
		backgroundColor: colors.brandPink30026,
		borderRadius: 10,
		flexDirection: 'row',
		alignItems: 'center'
	},
	numberWrapper: {
		backgroundColor: colors.white,
		width: 18,
		height: 18,
		borderRadius: 18,
		marginLeft: 14,
		justifyContent: 'center',
		alignItems: 'center'
	},
	number: {
		fontSize: 10,
		color: colors.$666666,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	word: {
		fontSize: 16,
		color: colors.$030319,
		lineHeight: 19,
		marginLeft: 10
	},
	tryUnlockButton: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 120
	},
	tryUnlockButtonText: {
		color: colors.white,
		fontSize: 16
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
	privateKeyWrapper: {
		marginTop: 20,
		paddingTop: 11,
		paddingBottom: 20,
		paddingHorizontal: 14,
		borderRadius: 5,
		height: 122,
		backgroundColor: colors.$F6F6F6
	},
	privateKeyText: {
		fontSize: 13,
		color: colors.$030319
	},
	varifyButton: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 30
	},
	varifyButtonText: {
		color: colors.white,
		fontSize: 16
	},
	whatSeedPhraseView: {
		marginTop: 20,
		borderRadius: 10,
		padding: 20,
		backgroundColor: colors.$F9F9F9
	},
	keepSeedPhraseSafeView: {
		marginTop: 31,
		borderRadius: 10,
		padding: 20,
		backgroundColor: colors.$F9F9F9
	},
	borderTitleView: {
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row'
	},
	borderTitleText: {
		color: colors.$030319,
		fontSize: 20,
		...fontStyles.semibold,
		marginLeft: 2
	},
	borderDesc: {
		marginTop: 10,
		color: colors.$60657D,
		fontSize: 14,
		lineHeight: 22
	}
});

/**
 * View that displays private account information as private key or seed phrase
 */
class RevealPrivateCredential extends PureComponent {
	static contextType = ThemeContext;
	state = {
		privateCredential: null,
		unlocked: false,
		password: '',
		warningIncorrectPassword: '',
		keyringIndex: this.props.navigation.getParam('keyringIndex', 0),
		walletName: this.props.navigation.getParam('walletName', ''),
		seed: ''
	};
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Cancel function to be called when cancel button is clicked. If not provided, we go to previous screen on cancel
		 */
		cancel: PropTypes.func
	};

	async componentDidMount() {
		// Try to use biometrics to unloc
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
		PreventScreenshot.forbid();
	}

	componentWillUnmount = () => {
		PreventScreenshot.allow();
	};

	cancel = () => {
		if (this.props.cancel) return this.props.cancel();
		const { navigation } = this.props;
		navigation.pop();
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

	renderSeedphraseView = seed => {
		const words = (seed && seed.split(' ')) || [];
		const wordLength = words.length;
		const { isDarkMode } = this.context;
		return (
			<ScrollView showsVerticalScrollIndicator={false}>
				<View style={styles.columnWrapper}>
					<View style={styles.seedPhraseWrapper}>
						{words.slice(0, wordLength).map((word, i) => (
							<View
								key={`word_${i}`}
								style={[styles.wordWrapper, isDarkMode && baseStyles.darkActionBackground]}
							>
								<View style={[styles.numberWrapper, isDarkMode && baseStyles.lightBlueBackground]}>
									<Text style={[styles.number, isDarkMode && baseStyles.textDark]}>{`${i + 1}`}</Text>
								</View>
								<Text style={[styles.word, isDarkMode && baseStyles.textDark]}>{`${word}`}</Text>
							</View>
						))}
					</View>
					<View style={[styles.whatSeedPhraseView, isDarkMode && baseStyles.darkActionBackground]}>
						<View style={styles.borderTitleView}>
							<Text style={[styles.borderTitleText, isDarkMode && baseStyles.textDark]}>
								{strings('wallet_management.what_seed_phrase')}
							</Text>
						</View>
						<Text style={[styles.borderDesc, isDarkMode && baseStyles.subTextDark]}>
							{strings('wallet_management.what_seed_phrase_desc')}
						</Text>
					</View>
					<View style={[styles.keepSeedPhraseSafeView, isDarkMode && baseStyles.darkActionBackground]}>
						<View style={styles.borderTitleView}>
							<Text style={[styles.borderTitleText, isDarkMode && baseStyles.textDark]}>
								{strings('wallet_management.keep_seed_phrase_safe')}
							</Text>
						</View>
						<Text style={[styles.borderDesc, isDarkMode && baseStyles.subTextDark]}>
							{strings('wallet_management.keep_seed_phrase_safe_desc')}
						</Text>
					</View>
					<TouchableOpacity
						style={styles.varifyButton}
						activeOpacity={0.8}
						onPress={() => {
							this.props.navigation.navigate('VerifySeedPhrase', {
								keyringIndex: this.state.keyringIndex,
								walletName: this.state.walletName,
								matchSeed: this.state.privateCredential.seed
							});
						}}
					>
						<Text style={styles.varifyButtonText}>
							{strings('wallet_management.verify_your_seed_phrase')}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		);
	};

	renderPrivateKeyView = privateKey => {
		const { isDarkMode } = this.context;
		return (
			<View style={styles.columnWrapper}>
				<Text style={[styles.seedPhraseTitle, isDarkMode && baseStyles.textDark]}>
					{strings('reveal_credential.your_private_key')}
				</Text>
				<View style={[styles.privateKeyWrapper, isDarkMode && baseStyles.darkInputBackground]}>
					<Text style={[styles.privateKeyText, isDarkMode && baseStyles.textDark]}>{privateKey}</Text>
				</View>
				<TouchableOpacity style={styles.tryUnlockButton} onPress={this.cancel}>
					<Text style={styles.tryUnlockButtonText}>{strings('reveal_credential.confirm')}</Text>
				</TouchableOpacity>
			</View>
		);
	};

	render = () => {
		const { unlocked, password, privateCredential } = this.state;
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}
				testID={'reveal-private-credential-screen'}
			>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={
						isHDMainAddress(this.props.navigation.getParam('keyringIndex', 0))
							? strings('wallet_management.seed_phrase_for_wallet_title', {
									walletName: this.props.navigation.getParam('walletName', '')
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  })
							: strings(`reveal_credential.private_key_title`)
					}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<View style={styles.rowWrapper}>
					{unlocked ? (
						privateCredential.seed ? (
							this.renderSeedphraseView(privateCredential.seed)
						) : (
							this.renderPrivateKeyView(privateCredential.privateKey)
						)
					) : (
						<View style={styles.columnWrapper}>
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
								<Text style={styles.completeButtonText}>{strings('reveal_credential.confirm')}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(RevealPrivateCredential);
