import React, { PureComponent } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Image, ScrollView, DeviceEventEmitter } from 'react-native';
import PropTypes from 'prop-types';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 30
	},
	container: {
		flexGrow: 1
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
		backgroundColor: colors.$F0F0F0,
		borderRadius: 10,
		borderWidth: 0,
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
	currentNumber: {
		color: colors.white
	},
	confirmedNumber: {
		color: colors.$666666
	},
	currentNumberWrapper: {
		backgroundColor: colors.brandPink300
	},
	confirmedNumberWrapper: {
		backgroundColor: colors.white
	},
	word: {
		fontSize: 16,
		color: colors.$030319,
		textAlign: 'center',
		textAlignVertical: 'center',
		lineHeight: 19,
		marginLeft: 10
	},
	selectableWord: {
		marginRight: 19,
		marginBottom: 4,
		paddingVertical: 5,
		paddingHorizontal: 5
	},
	selectableWordText: {
		paddingVertical: 5,
		paddingRight: 5,
		textAlign: 'center',
		fontSize: 16,
		lineHeight: 14,
		color: colors.$030319,
		...fontStyles.bold
	},
	words: {
		marginTop: 35,
		flexDirection: 'row',
		flexWrap: 'wrap'
	},
	promptRow: {
		marginTop: 20,
		height: 38
	},
	successRow: {
		flexDirection: 'row',
		marginTop: 20,
		height: 38,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
		backgroundColor: colors.correctBg
	},
	successText: {
		fontSize: 14,
		color: colors.$01BF84,
		marginLeft: 10,
		...fontStyles.bold
	},
	wrongText: {
		fontSize: 14,
		color: colors.$FC6564,
		marginLeft: 10,
		...fontStyles.bold
	},
	tryAgain: {
		fontSize: 13,
		color: colors.$5092FF,
		...fontStyles.bold
	},
	selectedWordText: {
		color: colors.$A6A6A6
	},
	currentWord: {
		borderColor: colors.brandPink300,
		borderWidth: 1,
		backgroundColor: colors.white
	},
	confirmedWord: {
		backgroundColor: colors.brandPink30026
	},
	tryAgainWrapper: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	completeButtonWrapper: {
		backgroundColor: colors.brandPink300,
		borderColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 0,
		marginTop: 20,
		marginBottom: 30
	},
	incompleteButtonWrapper: {
		backgroundColor: colors.$E6E6E6,
		borderColor: colors.$DCDCDC,
		borderWidth: 0.5
	},
	completeButtonText: {
		color: colors.white,
		fontSize: 16,
		...fontStyles.normal
	},
	incompleteButtonText: {
		color: colors.$A6A6A6
	}
});

/**
 * View that's shown during the fifth step of
 * the backup seed phrase flow
 */
class ManualBackupStep2 extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	constructor(props) {
		super(props);
		const words = props.navigation.getParam('words');
		if (process.env.JEST_WORKER_ID === undefined) {
			this.words = [...words].sort(() => 0.5 - Math.random());
		} else {
			this.words = words;
		}
		this.steps = props.navigation.getParam('steps');
		this.fromWalletManager = props.navigation.getParam('fromWalletManager', false);
	}

	state = {
		confirmedWords: [],
		wordsDict: {},
		currentIndex: 0,
		seedPhraseReady: false,
		currentStep: 2
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		const words = navigation.getParam('words', []);
		this.setState(
			{
				confirmedWords: Array(words.length).fill({ word: undefined, originalPosition: undefined })
			},
			this.createWordsDictionary
		);
	};

	createWordsDictionary = () => {
		const dict = {};
		this.words.forEach((word, i) => {
			dict[`${word},${i}`] = { currentPosition: undefined };
		});
		this.setState({ wordsDict: dict });
	};

	findNextAvailableIndex = () => {
		const { confirmedWords } = this.state;
		return confirmedWords.findIndex(({ word }) => !word);
	};

	selectWord = (word, i) => {
		const { wordsDict, confirmedWords } = this.state;
		let currentIndex = this.state.currentIndex;
		if (wordsDict[`${word},${i}`].currentPosition !== undefined) {
			currentIndex = wordsDict[`${word},${i}`].currentPosition;
			wordsDict[`${word},${i}`].currentPosition = undefined;
			confirmedWords[currentIndex] = { word: undefined, originalPosition: undefined };
		} else {
			wordsDict[`${word},${i}`].currentPosition = currentIndex;
			confirmedWords[currentIndex] = { word, originalPosition: i };
			currentIndex = this.findNextAvailableIndex();
		}
		this.setState({
			currentIndex,
			wordsDict,
			confirmedWords,
			seedPhraseReady: this.findNextAvailableIndex() === -1
		});
	};

	clearConfirmedWordAt = i => {
		const { confirmedWords, wordsDict } = this.state;
		const { word, originalPosition } = confirmedWords[i];
		const currentIndex = i;
		if (word && (originalPosition || originalPosition === 0)) {
			wordsDict[[word, originalPosition]].currentPosition = undefined;
			confirmedWords[i] = { word: undefined, originalPosition: undefined };
		}
		this.setState({
			currentIndex,
			wordsDict,
			confirmedWords,
			seedPhraseReady: this.findNextAvailableIndex() === -1
		});
	};

	goBack = () => {
		this.props.navigation.pop();
	};

	goNext = () => {
		const { navigation } = this.props;
		if (this.validateWords()) {
			if (this.fromWalletManager) {
				navigation.navigate('WalletManagement');
			} else {
				navigation.navigate('HomeNav');
				setTimeout(() => DeviceEventEmitter.emit('OnboardingTour'), 250);
			}
		}
	};

	validateWords = () => {
		const words = this.props.navigation.getParam('words', []);
		const { confirmedWords: wordMap } = this.state;
		const confirmedWords = wordMap.map(confirmedWord => confirmedWord.word);
		if (words.join('') === confirmedWords.join('')) {
			return true;
		}
		return false;
	};

	renderWords = () => {
		const { wordsDict } = this.state;
		return (
			<View style={styles.words}>
				{Object.keys(wordsDict).map((key, i) => this.renderWordSelectableBox(key, i))}
			</View>
		);
	};

	renderSuccess = () => (
		<View style={styles.successRow}>
			<Image source={require('../../../images/ic_verify_success.png')} />
			<Text style={styles.successText}>{strings('manual_backup_step_2.success')}</Text>
		</View>
	);

	renderWrong = () => (
		<View style={[styles.successRow, { backgroundColor: colors.errorBg }]}>
			<Image source={require('../../../images/ic_verify_error.png')} />
			<Text style={styles.wrongText}>{strings('manual_backup_step_2.wrong')}</Text>
			<TouchableOpacity
				style={styles.tryAgainWrapper}
				onPress={() => {
					this.componentDidMount();
					this.setState({ seedPhraseReady: false, currentIndex: 0 });
				}}
				activeOpacity={activeOpacity}
			>
				<Text style={styles.tryAgain}>{strings('manual_backup_step_1.clear_try_again')}</Text>
			</TouchableOpacity>
		</View>
	);

	renderWordBox = (word, i) => {
		const { currentIndex, confirmedWords } = this.state;

		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				key={`word_${i}`}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => {
					this.clearConfirmedWordAt(i);
				}}
				style={[
					styles.wordWrapper,
					isDarkMode && baseStyles.darkActionBackground,
					i === currentIndex && styles.currentWord,
					confirmedWords[i].word && styles.confirmedWord,
					isDarkMode && { borderColor: colors.$4CA1CF },
					isDarkMode && baseStyles.darkCardBackground
				]}
				activeOpacity={activeOpacity}
			>
				<View
					style={[
						styles.numberWrapper,
						isDarkMode && baseStyles.lightBlueBackground,
						i === currentIndex && styles.currentNumberWrapper,
						isDarkMode && baseStyles.lightBlueBackground,
						confirmedWords[i].word && styles.confirmedNumberWrapper
					]}
				>
					<Text
						style={[
							styles.number,
							isDarkMode && baseStyles.textDark,
							i === currentIndex && styles.currentNumber,
							confirmedWords[i].word && styles.confirmedNumber
						]}
					>
						{i + 1}
					</Text>
				</View>
				<Text style={[styles.word, isDarkMode && baseStyles.textDark]}>{word}</Text>
			</TouchableOpacity>
		);
	};

	renderWordSelectableBox = (key, i) => {
		const { wordsDict } = this.state;
		const [word] = key.split(',');
		const selected = wordsDict[key].currentPosition !== undefined;
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => this.selectWord(word, i)}
				style={styles.selectableWord}
				key={`selectableWord_${i}`}
				activeOpacity={activeOpacity}
			>
				<Text
					style={[
						styles.selectableWordText,
						isDarkMode && baseStyles.textDark,
						selected && styles.selectedWordText
					]}
				>
					{word}
				</Text>
			</TouchableOpacity>
		);
	};

	render = () => {
		const { confirmedWords, seedPhraseReady } = this.state;
		const wordLength = confirmedWords.length;
		const complete = seedPhraseReady && this.validateWords();
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView style={[styles.mainWrapper, isDarkMode && baseStyles.darkBackground]}>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar title={strings('manual_backup_step_1.wallet_backup')} onBack={this.goBack} />
				<ScrollView
					style={styles.wrapper}
					contentContainerStyle={styles.container}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<Text style={[styles.action, isDarkMode && baseStyles.textDark]}>
						{strings('manual_backup_step_1.action')}
					</Text>
					<View style={styles.seedPhraseWrapper}>
						{confirmedWords.slice(0, wordLength).map(({ word }, i) => this.renderWordBox(word, i))}
					</View>
					{this.renderWords()}
					<View style={baseStyles.flexGrow} />
					{seedPhraseReady ? (
						this.validateWords() ? (
							this.renderSuccess()
						) : (
							this.renderWrong()
						)
					) : (
						<View style={styles.promptRow} />
					)}
					<TouchableOpacity
						style={[styles.completeButtonWrapper, !complete && styles.incompleteButtonWrapper]}
						onPress={this.goNext}
						activeOpacity={activeOpacity}
					>
						<Text style={[styles.completeButtonText, !complete && styles.incompleteButtonText]}>
							{strings('manual_backup_step_2.complete')}
						</Text>
					</TouchableOpacity>
				</ScrollView>
			</SafeAreaView>
		);
	};
}

const mapDispatchToProps = dispatch => ({});

export default connect(
	null,
	mapDispatchToProps
)(ManualBackupStep2);
