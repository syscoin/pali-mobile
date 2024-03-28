import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	ActivityIndicator,
	Text,
	View,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
	Keyboard,
	ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import { activeOpacity, colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
	failedSeedPhraseRequirements,
	getWords,
	isValidMnemonic,
	parseSeedPhrase,
	updateSeed
} from '../../../util/validators';
import { EXISTING_USER, TRUE } from '../../../constants/storage';
import PromptView from '../../UI/PromptView';
import { util, wordlists } from 'paliwallet-core';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import FlashMessage from 'react-native-flash-message';
import Device from '../../../util/Device';
import SafeArea from 'react-native-safe-area';
import { toggleShowHint } from '../../../actions/hint';
import { SafeAreaView } from 'react-native-safe-area-context';
import NativeThreads from '../../../threads/NativeThreads';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollableWrapper: {
		paddingHorizontal: 30,
		flex: 1
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
	importButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 30,
		width: 60,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	incompleteButtonWrapper: {
		backgroundColor: colors.$E6E6E6
	},
	importButtonText: {
		color: colors.white,
		fontSize: 14
	},
	incompleteButtonText: {
		color: colors.$A6A6A6
	},
	seedPhraseWrapper: {
		marginTop: 24,
		marginBottom: 50,
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
	wordInputWrapper: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		opacity: 1
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
	numberInputWrapper: {
		backgroundColor: colors.brandPink300
	},
	number: {
		fontSize: 10,
		color: colors.$666666,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	numberInput: {
		color: colors.white
	},
	word: {
		fontSize: 16,
		color: colors.$030319,
		lineHeight: 19,
		marginLeft: 10
	},
	inputWord: {
		width: 100,
		fontSize: 16,
		paddingVertical: 10,
		paddingHorizontal: 0,
		color: colors.brandPink300,
		marginLeft: 10
	},
	candidateWrapper: {
		width: '100%',
		backgroundColor: colors.$E1E3E8,
		flexDirection: 'row',
		alignItems: 'center',
		height: 38
	},
	candidateBtn: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 5
	},
	candidateWord: {
		color: colors.$030319,
		fontSize: 14,
		textAlign: 'center'
	},
	candidateDivider: {
		backgroundColor: colors.white,
		width: 0.5,
		height: 16
	},
	flashMessage: {
		alignItems: 'center'
	},
	padding: {
		height: 40
	}
});

/**
 * View where users can set restore their account
 * using a seed phrase
 */
class ImportFromSeed extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		toggleShowHint: PropTypes.func
	};

	state = {
		password: this.props.navigation.getParam('password', ''),
		fromWalletManager: this.props.navigation.getParam('fromWalletManager', false),
		seed: '',
		loading: false,
		error: null,
		errorTitle: null,
		onEditIndex: 0,
		inputWord: '',
		keyboardHeight: 0,
		iosBottomArea: 0,
		candidateWords: []
	};

	inputRef = React.createRef();

	localFlashMessage = React.createRef();
	scrollViewRef = React.createRef();

	showFlashMessage = false;

	keyboardDidShowListener = null;

	forwardInputWord = '';

	componentDidMount() {
		if (Device.isIos()) {
			this.initBottomArea();
			this.keyboardDidShowListener = this.keyboardDidShow.bind(this);
			Keyboard.addListener('keyboardDidShow', this.keyboardDidShowListener);
			Keyboard.addListener('keyboardDidHide', this.keyboardDidShowListener);
		}
		setTimeout(() => this.inputRef?.current?.focus(), 10);
	}

	async initBottomArea() {
		const area = await SafeArea.getSafeAreaInsetsForRootView();
		if (area?.safeAreaInsets?.bottom) {
			this.setState({ iosBottomArea: area.safeAreaInsets.bottom });
		}
	}

	componentWillUnmount() {
		this.keyboardDidShowListener && Keyboard.removeListener('keyboardDidShow', this.keyboardDidShowListener);
		this.keyboardDidShowListener && Keyboard.removeListener('keyboardDidHide', this.keyboardDidShowListener);
	}

	keyboardDidShow(e) {
		this.setState({ keyboardHeight: e.endCoordinates.height - this.state.iosBottomArea });
	}

	onPressImport = () => {
		this.setState({ loading: true });
		this.inputRef?.current?.blur();
		setTimeout(() => {
			this.doImport().then(() => {
				this.setState({ loading: false });
			});
		}, 1);
	};

	doImport = async () => {
		const { seed, password, fromWalletManager } = this.state;
		const parsedSeed = parseSeedPhrase(seed);

		if (failedSeedPhraseRequirements(parsedSeed) || !isValidMnemonic(parsedSeed)) {
			this.setState({
				error: strings('import_from_seed.wrong_seed_message'),
				errorTitle: strings('import_from_seed.wrong_seed')
			});
			return;
		}

		try {
			const { KeyringController, EnsController } = Engine.context;
			if (fromWalletManager) {
				await KeyringController.importAccountWithSeed(parsedSeed);

				//refresh ens names
				EnsController.refresh();

				this.props.navigation.pop();
				setTimeout(() => {
					this.props.toggleShowHint(strings('import_from_seed.seed_phrase_imported'));
				}, 300);
			} else {
				await KeyringController.createNewVaultAndRestore(password, parsedSeed);

				// mark the user as existing so it doesn't see the create password screen again
				await AsyncStorage.setItem(EXISTING_USER, TRUE);
				await NativeThreads.get().callEngineAsync('importAccounts');

				this.props.navigation.navigate('CheckEnvGuideView', { playType: 2, translate: 'forNoAnimation' });
			}
		} catch (error) {
			// Should we force people to enable passcode / biometrics?
			this.setState({
				error: error.toString(),
				errorTitle: 'Error'
			});
			util.logError('Error with seed phrase import', error);
		}
	};

	onBack = () => {
		this.props.navigation.pop();
	};

	// eslint-disable-next-line arrow-body-style
	isNormalWord = (word, index) => {
		// const words = getWords(this.state.seed);
		// if (words.find((nWord, nIndex) => nIndex !== index && word === nWord)) {
		// 	return false;
		// }
		return !!wordlists.EN.find(nWord => word === nWord);
	};

	filterWords = (fWord, fIndex) => {
		let candidateWords = wordlists.EN.filter(word => word.startsWith(fWord));
		if (candidateWords?.length > 0) {
			candidateWords = candidateWords.slice(0, 3);
			// let words = getWords(this.state.seed);
			// words = words.filter((word, index) => fIndex !== index);
			// candidateWords = candidateWords.filter(word => !words.includes(word));
		}
		return candidateWords;
	};

	exitWords = seed => {
		const words = getWords(seed);
		// words.forEach((word, index) => {
		// 	if (words.find((cWord, cIndex) => cIndex !== index && cWord === word)) {
		// 		return false;
		// 	}
		// });
		if (words.find(word => !wordlists.EN.find(key => key === word))) {
			return false;
		}
		return true;
	};

	onWordChange = word => {
		const oldWord = this.state.inputWord;
		this.setState({ inputWord: word });
		setTimeout(() => {
			this.doWordChange(word, oldWord);
		}, 20);
	};

	doWordChange = (word, oldWord) => {
		const lowerWord = word?.toLowerCase();
		if (lowerWord) {
			const trimWord = lowerWord.trim();
			if (!failedSeedPhraseRequirements(trimWord)) {
				if (this.state.onEditIndex === 0 && this.exitWords(trimWord)) {
					this.setState({ seed: trimWord, onEditIndex: -1, inputWord: '' }, () => {
						this.inputRef?.current?.blur();
						this.onInputWordChange();
					});
				} else {
					this.setState({ inputWord: '' }, this.onInputWordChange);
				}
				return;
			}
			if (lowerWord.endsWith(' ') || lowerWord.endsWith('\n')) {
				if (trimWord.length > 0) {
					if (this.onSubmitEditing(this.state.onEditIndex, trimWord, true)) {
						return;
					}
				}
			}
		}
		this.setState({ inputWord: word.trim() }, () => {
			const oldLength = oldWord.length;
			const nowLength = this.state.inputWord.length;
			this.onInputWordChange(nowLength > oldLength);
		});
	};

	onInputWordChange = (autoFill = false) => {
		const trimInputWord = this.state.inputWord?.trim()?.toLowerCase();
		this.forwardInputWord = trimInputWord;
		let candidateWords = trimInputWord && this.filterWords(trimInputWord, this.state.onEditIndex);
		if (trimInputWord && candidateWords.length <= 0) {
			this.showWrongMessage();
		} else {
			this.hideWrongMessage();
		}
		if (candidateWords?.length === 1 && autoFill) {
			this.onSelectWord(candidateWords[0]);
			candidateWords = [];
		}
		this.setState({ candidateWords });
	};

	onSubmitEditing = (index, word, canEmpty = true) => {
		const trimWord = word?.trim();
		if (!canEmpty && !trimWord) {
			return false;
		}
		if (!this.isNormalWord(trimWord, index)) {
			return false;
		}
		const seed = updateSeed(this.state.seed, index, trimWord);
		const length = getWords(trimWord)?.length || 1;
		let onEditIndex = index + length;
		let inputWord = '';
		if (onEditIndex < 24) {
			const words = getWords(seed);
			inputWord = words[onEditIndex] || '';
		} else {
			onEditIndex = -1;
		}

		this.setState({ seed, onEditIndex, inputWord }, () => {
			this.scrollViewRef?.current?.scrollTo({ x: 0, y: 1000, animated: true });
			this.inputRef?.current?.focus();
			this.onInputWordChange();
		});
		return true;
	};

	doChangeEditWord = index => {
		const { onEditIndex, inputWord } = this.state;
		if (onEditIndex === index) {
			return;
		}
		let tempSeed = this.state.seed;
		if (onEditIndex !== -1) {
			const trimWord = inputWord?.trim().toLowerCase();
			if (!trimWord || this.isNormalWord(trimWord, onEditIndex)) {
				tempSeed = updateSeed(tempSeed, onEditIndex, trimWord);
				this.setState({ seed: tempSeed });
			}
		}
		const words = getWords(tempSeed);
		const newInputWord = words[index] || '';
		this.setState({ onEditIndex: index, inputWord: newInputWord }, () => {
			this.inputRef?.current?.focus();
			this.onInputWordChange();
		});
	};

	onKeyPress = event => {
		if (event.nativeEvent.key === 'Backspace') {
			if (!this.forwardInputWord && this.state.onEditIndex > 0) {
				this.forwardInputWord = ' ';
				this.onChangeEditWord(this.state.onEditIndex - 1);
			}
		}
	};

	onInputBlur = index => {
		const { onEditIndex } = this.state;
		if (index === onEditIndex) {
			this.doChangeEditWord(-1);
		}
	};

	onChangeEditWord = index => {
		this.doChangeEditWord(index);
	};

	onSelectWord = word => {
		const { onEditIndex } = this.state;
		this.onSubmitEditing(onEditIndex, word);
	};

	hideWrongMessage = () => {
		if (!this.showFlashMessage) {
			return;
		}
		this.showFlashMessage = false;
		this.localFlashMessage.current?.hideMessage();
	};

	showWrongMessage = () => {
		if (this.showFlashMessage) {
			return;
		}
		this.showFlashMessage = true;
		this.localFlashMessage.current?.showMessage({
			message: strings('import_from_seed.wrong_word'),
			type: 'danger'
		});
	};

	renderSeedPhrase = () => {
		const { seed, onEditIndex, inputWord } = this.state;
		const words = getWords(seed);
		const wordsView = words.map((word, i) => this.renderWordView(i, word, onEditIndex, inputWord));
		if (onEditIndex === words.length) {
			wordsView.push(this.renderWordView(onEditIndex, '', onEditIndex, inputWord));
		}
		if (words.length < 24 && onEditIndex === -1 && words[words.length - 1]) {
			wordsView.push(this.renderWordView(words.length, '', onEditIndex, inputWord));
		}
		return wordsView;
	};

	renderWordView = (i, word, onEditIndex, inputWord) => {
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				key={`word_${i}`}
				style={[
					styles.wordWrapper,

					onEditIndex === i && styles.wordInputWrapper,
					isDarkMode && { borderColor: colors.$4CA1CF },
					isDarkMode && baseStyles.darkActionBackground
				]}
				activeOpacity={activeOpacity}
				disabled={onEditIndex === i}
				onPress={() => this.onChangeEditWord(i)}
			>
				<View
					style={[
						styles.numberWrapper,

						onEditIndex === i && styles.numberInputWrapper,
						isDarkMode && baseStyles.lightBlueBackground
					]}
				>
					<Text
						style={[
							styles.number,
							onEditIndex === i && styles.numberInput,
							isDarkMode && baseStyles.textDark
						]}
					>{`${i + 1}`}</Text>
				</View>
				{onEditIndex === i ? (
					<TextInput
						style={[styles.inputWord, isDarkMode && baseStyles.textDark]}
						ref={this.inputRef}
						value={inputWord}
						onChangeText={this.onWordChange}
						onSubmitEditing={() => {
							this.onSubmitEditing(i, inputWord, false);
						}}
						autoFocus
						autoCorrect={false}
						returnKeyType="next"
						autoCapitalize="none"
						onBlur={() => {
							this.onInputBlur(i);
						}}
						onKeyPress={this.onKeyPress}
					/>
				) : (
					<Text style={[styles.word, isDarkMode && baseStyles.textDark]}>{`${word}`}</Text>
				)}
			</TouchableOpacity>
		);
	};

	render() {
		const { seed, loading, candidateWords, onEditIndex, keyboardHeight } = this.state;
		const validSeed = !failedSeedPhraseRequirements(seed);
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView style={[styles.mainWrapper, isDarkMode && baseStyles.darkBackground]}>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={strings('onboarding.import_wallet')}
					onBack={this.onBack}
					rightView={
						<TouchableOpacity
							style={[
								styles.importButtonWrapper,
								isDarkMode && baseStyles.lightBlueBackground,
								!validSeed && styles.incompleteButtonWrapper
							]}
							onPress={this.onPressImport}
							disabled={!validSeed || loading}
							activeOpacity={activeOpacity}
						>
							{loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Text style={[styles.importButtonText, !validSeed && styles.incompleteButtonText]}>
									{strings('import_from_seed.import')}
								</Text>
							)}
						</TouchableOpacity>
					}
				/>
				<ScrollView
					ref={this.scrollViewRef}
					style={styles.scrollableWrapper}
					contentContainerStyle={styles.keyboardScrollableWrapper}
					resetScrollToCoords={{ x: 0, y: 0 }}
					keyboardShouldPersistTaps="handled"
					onScrollBeginDrag={dismissKeyboard}
					showsVerticalScrollIndicator={false}
				>
					<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
						{strings('import_from_seed.title')}
					</Text>
					<Text style={[styles.secondaryTitle, isDarkMode && baseStyles.subTextDark]}>
						{strings('import_from_seed.enter_seed_phrase_tips')}
					</Text>

					<View style={styles.seedPhraseWrapper}>{this.renderSeedPhrase()}</View>

					<View style={styles.padding} />
				</ScrollView>
				{onEditIndex !== -1 && (
					<View
						style={[
							styles.candidateWrapper,
							isDarkMode && baseStyles.darkBackground,
							{ marginBottom: keyboardHeight }
						]}
					>
						<TouchableOpacity
							style={styles.candidateBtn}
							activeOpacity={activeOpacity}
							onPress={() => this.onSelectWord(candidateWords[0])}
							disabled={!candidateWords[0]}
						>
							<Text style={[styles.candidateWord, isDarkMode && baseStyles.textDark]}>
								{candidateWords[0] || ''}
							</Text>
						</TouchableOpacity>
						<View style={styles.candidateDivider} />
						<TouchableOpacity
							style={styles.candidateBtn}
							activeOpacity={activeOpacity}
							onPress={() => this.onSelectWord(candidateWords[1])}
							disabled={!candidateWords[1]}
						>
							<Text style={[styles.candidateWord, isDarkMode && baseStyles.textDark]}>
								{candidateWords[1] || ''}
							</Text>
						</TouchableOpacity>
						<View style={styles.candidateDivider} />
						<TouchableOpacity
							style={styles.candidateBtn}
							activeOpacity={activeOpacity}
							onPress={() => this.onSelectWord(candidateWords[2])}
							disabled={!candidateWords[2]}
						>
							<Text style={[styles.candidateWord, isDarkMode && baseStyles.textDark]}>
								{candidateWords[2] || ''}
							</Text>
						</TouchableOpacity>
					</View>
				)}
				<PromptView
					isVisible={this.state.errorTitle != null && this.state.error != null}
					title={this.state.errorTitle}
					message={this.state.error}
					onRequestClose={() => {
						this.setState({ error: null, errorTitle: null });
					}}
				/>
				<FlashMessage
					style={[styles.flashMessage, Device.isAndroid() && { paddingTop: StatusBar.currentHeight }]}
					position="top"
					ref={this.localFlashMessage}
					autoHide={false}
				/>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	null,
	mapDispatchToProps
)(ImportFromSeed);
