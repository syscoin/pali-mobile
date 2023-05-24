import React, { PureComponent } from 'react';
import {
	Text,
	View,
	StyleSheet,
	ActivityIndicator,
	Image,
	TouchableOpacity,
	ScrollView,
	Platform,
	BackHandler
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, activeOpacity } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import PreventScreenshot from '../../../core/PreventScreenshot';
import SecureKeychain from '../../../core/SecureKeychain';
import { MANUAL_BACKUP_STEPS, SEED_PHRASE, CONFIRM_PASSWORD } from '../../../constants/onboarding';
import { connect } from 'react-redux';
import { getSeedPhraseSplit } from '../../../core/Vault';
import MStatusBar from '../../UI/MStatusBar';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 30
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 300,
		justifyContent: 'center',
		alignItems: 'center'
	},
	action: {
		fontSize: 28,
		marginTop: 30,
		color: colors.$030319,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.semibold
	},
	seedPhraseWrapper: {
		marginTop: 30,
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
	goButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 30
	},
	goButtonText: {
		color: colors.white,
		fontSize: 16,
		...fontStyles.normal
	},
	laterButtonWrapper: {
		marginTop: 20,
		marginBottom: 50,
		height: 22,
		justifyContent: 'center',
		alignItems: 'center'
	},
	laterButtonText: {
		color: colors.$030319,
		fontSize: 16
	},
	whatSeedPhraseView: {
		marginTop: 30,
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
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
class ManualBackupStep1 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	steps = MANUAL_BACKUP_STEPS;

	state = {
		currentStep: 1,
		warningIncorrectPassword: undefined,
		ready: false,
		view: SEED_PHRASE
	};

	componentDidMount = async () => {
		this.fromWalletManager = this.props.navigation.getParam('fromWalletManager', false);
		this.words = this.props.navigation.getParam('words', []);
		if (!this.words.length) {
			try {
				const credentials = await SecureKeychain.getGenericPassword();
				if (credentials) {
					this.words = await getSeedPhraseSplit(credentials.password);
				} else {
					this.setState({ view: CONFIRM_PASSWORD });
				}
			} catch (e) {
				this.setState({ view: CONFIRM_PASSWORD });
			}
		}
		this.setState({ ready: true }, () => {
			PreventScreenshot.forbid();
		});
		if (Platform.OS === 'android') {
			BackHandler.addEventListener('hardwareBackPress', this.onBackAndroid);
		}
	};
	componentWillUnmount = () => {
		if (Platform.OS === 'android') {
			BackHandler.removeEventListener('hardwareBackPress', this.onBackAndroid);
		}
	};

	onBackAndroid = () => {
		if (!this.props.navigation.isFocused()) {
			return false;
		}
		return true;
	};

	onPasswordChange = password => {
		this.setState({ password });
	};

	goNext = () => {
		if (this.fromWalletManager) {
			this.props.navigation.navigate('ManualBackupStep2View', {
				words: this.words,
				steps: this.steps,
				fromWalletManager: this.fromWalletManager
			});
		} else {
			this.props.navigation.navigate('ManualBackupStep2', {
				words: this.words,
				steps: this.steps,
				fromWalletManager: this.fromWalletManager
			});
		}
	};

	goHome = () => {
		if (this.fromWalletManager) {
			this.props.navigation.navigate('WalletManagement');
		} else {
			this.props.navigation.navigate('HomeNav');
		}
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	renderSeedphraseView = () => {
		const words = this.words || [];
		const wordLength = words.length;
		return (
			<ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
				<MStatusBar navigation={this.props.navigation} />
				<Text style={styles.action}>{strings('manual_backup_step_1.wallet_backup')}</Text>
				<View style={styles.seedPhraseWrapper}>
					{this.words.slice(0, wordLength).map((word, i) => (
						<View key={`word_${i}`} style={styles.wordWrapper}>
							<View style={styles.numberWrapper}>
								<Text style={styles.number}>{`${i + 1}`}</Text>
							</View>
							<Text style={styles.word}>{`${word}`}</Text>
						</View>
					))}
				</View>

				<View style={styles.whatSeedPhraseView}>
					<View style={styles.borderTitleView}>
						<Image source={require('../../../images/ic_wallet_doubt.png')} />
						<Text style={styles.borderTitleText}>{strings('wallet_management.what_seed_phrase')}</Text>
					</View>
					<Text style={styles.borderDesc}>{strings('wallet_management.what_seed_phrase_desc')}</Text>
				</View>
				<View style={styles.keepSeedPhraseSafeView}>
					<View style={styles.borderTitleView}>
						<Image source={require('../../../images/ic_wallet_dengpao.png')} />
						<Text style={styles.borderTitleText}>{strings('wallet_management.keep_seed_phrase_safe')}</Text>
					</View>
					<Text style={styles.borderDesc}>{strings('wallet_management.keep_seed_phrase_safe_desc')}</Text>
				</View>
				<TouchableOpacity style={styles.goButtonWrapper} onPress={this.goNext} activeOpacity={activeOpacity}>
					<Text style={styles.goButtonText}>{strings('manual_backup_step_1.go')}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.laterButtonWrapper} onPress={this.goHome} activeOpacity={activeOpacity}>
					<Text style={styles.laterButtonText}>{strings('manual_backup_step_1.later')}</Text>
				</TouchableOpacity>
			</ScrollView>
		);
	};

	render() {
		const { ready } = this.state;
		if (!ready) return this.renderLoader();
		return <SafeAreaView style={styles.mainWrapper}>{this.renderSeedphraseView()}</SafeAreaView>;
	}
}

const mapDispatchToProps = dispatch => ({});

export default connect(
	null,
	mapDispatchToProps
)(ManualBackupStep1);
