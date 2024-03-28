import React, { PureComponent } from 'react';
import {
	Dimensions,
	Image,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Animated,
	ActivityIndicator
} from 'react-native';
import { Draw } from '@benjeau/react-native-draw';
import { baseStyles, colors } from '../../../styles/common';
import Device from '../../../util/Device';
import MStatusBar from '../../UI/MStatusBar';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import BytesPanel from './bytes_panel';
import Progress from './progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXISTING_USER, TRUE } from '../../../constants/storage';
import { failedSeedPhraseRequirements, isValidMnemonic, parseSeedPhrase } from '../../../util/validators';
import { Mutex, util } from 'paliwallet-core';
import { SafeAreaView } from 'react-native-safe-area-context';
import NativeThreads from '../../../threads/NativeThreads';
import { ThemeContext } from '../../../theme/ThemeProvider';

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
	canvasStyle: {
		elevation: 0,
		backgroundColor: colors.transparent
	},
	flexOne: {
		flex: 1
	},
	operateLayout: {
		position: 'absolute',
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center'
	},
	drawText: {
		fontSize: 14,
		color: colors.$030319,
		marginTop: 20
	},
	seatLayout: {
		height: 44,
		marginHorizontal: 30,
		borderRadius: 10,
		marginTop: 20,
		marginBottom: Device.isAndroid() ? 30 : 20,
		width: 1
	},
	nextButton: {
		height: 44,
		marginHorizontal: 30,
		backgroundColor: colors.$E6E6E6,
		borderRadius: 10,
		marginTop: 20,
		marginBottom: Device.isAndroid() ? 30 : 20,
		alignSelf: 'stretch',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 100,
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0
	},
	nextLabel: {
		color: colors.$A6A6A6,
		fontSize: 16
	},
	nextButtonEnable: {
		backgroundColor: colors.brandPink300
	},
	nextLabelEnable: {
		color: colors.white
	},
	centerLayout: {
		justifyContent: 'center',
		alignItems: 'center'
	}
});

// const drawRef = useRef < DrawRef > null;
const pathMaxNum = Device.isAndroid() ? 200 : 220;

export default class DrawingBoard extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object
	};

	state = {
		drawComplete: false,
		progress: 0,
		canDraw: true,
		drawStart: false,
		bytesPanelOpacity: new Animated.Value(0),
		loading: false,
		mnemonic: '',
		password: this.props.navigation.getParam('password', ''),
		fromWalletManager: this.props.navigation.getParam('fromWalletManager', false)
	};

	mutex = new Mutex();
	trueRandomLength = 0;

	progressViewRef = React.createRef();
	bytesPanelRef = React.createRef();

	componentDidMount = () => {
		Engine.context.KeyringController.resetTRGenerator(pathMaxNum);
	};

	onPressImport = () => {
		this.setState({ loading: true });
		setTimeout(() => {
			this.doImport().then(() => {
				this.setState({ loading: false });
			});
		}, 50);
	};

	doImport = async () => {
		const { mnemonic, password, fromWalletManager } = this.state;
		const parsedSeed = parseSeedPhrase(mnemonic);

		if (failedSeedPhraseRequirements(parsedSeed) || !isValidMnemonic(parsedSeed)) {
			return;
		}

		try {
			const { KeyringController } = Engine.context;
			if (fromWalletManager) {
				//Passing that isImported is false
				await KeyringController.importAccountWithSeed(parsedSeed, false);
			} else {
				//Passing that isImported is false
				await KeyringController.createNewVaultAndRestore(password, parsedSeed, false);
				// mark the user as existing so it doesn't see the create password screen again
				await AsyncStorage.setItem(EXISTING_USER, TRUE);
				await NativeThreads.get().callEngineAsync('importAccounts');
			}
			if (fromWalletManager) {
				this.props.navigation.navigate('CheckEnvGuideView', {
					playType: 1,
					fromWalletManager,
					mnemonic
				});
			} else {
				this.props.navigation.navigate('CheckEnvGuideView', {
					playType: 1,
					fromWalletManager,
					mnemonic,
					translate: 'forNoAnimation'
				});
			}
		} catch (error) {
			util.logError('Error with seed phrase import', error);
		}
	};

	render = () => {
		const { drawComplete, canDraw, drawStart, loading } = this.state;
		const statusBarHeight = StatusBar.currentHeight;
		const spaceHeight = Device.isAndroid() ? statusBarHeight : 0;
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView style={[styles.flexOne, isDarkMode && baseStyles.darkBackground]}>
				<View style={styles.flexOne}>
					<MStatusBar navigation={this.props.navigation} fixPadding={false} translucent />
					<View style={styles.operateLayout}>
						<View style={styles.flexOne} />
						{!drawStart && (
							<View style={styles.centerLayout}>
								<Image source={require('../../../images/hand_touch.png')} />
								<Text style={[styles.drawText, isDarkMode && baseStyles.textDark]}>
									{strings('drawing_board.draw_random_lines')}
								</Text>
							</View>
						)}
						<View style={styles.flexOne} />
						<Progress pathMaxNum={pathMaxNum} ref={this.progressViewRef} />
						<View style={styles.seatLayout} />

						<Animated.View style={[styles.operateLayout, { opacity: this.state.bytesPanelOpacity }]}>
							<BytesPanel ref={this.bytesPanelRef} style={styles.operateLayout} />
						</Animated.View>
					</View>
					<Draw
						initialValues={{
							color: colors.brandPink300,
							thickness: 4,
							opacity: 1,
							paths: []
						}}
						height={height + spaceHeight}
						simplifyOptions={{
							simplifyPaths: false
						}}
						brushPreview="none"
						canvasStyle={styles.canvasStyle}
						onPathsChange={paths => {
							// paths.forEach(items => {
							// 	items.data.forEach(item => {
							// 		savePaths.push(item);
							// 	});
							// });
						}}
						onPathUpdate={path => {
							const appendToTRGenerator = async drawPath => {
								const releaseLock = await this.mutex.acquire();
								try {
									if (this.trueRandomLength >= pathMaxNum) {
										return;
									}
									const {
										count,
										true_random,
										mnemonic
									} = await Engine.context.KeyringController.appendToTRGenerator(
										drawPath[drawPath.length - 1][0],
										drawPath[drawPath.length - 1][1]
									);
									this.trueRandomLength = count;
									if (mnemonic) {
										this.setState({ drawComplete: true, canDraw: false, mnemonic });
									}

									if (count % 5 === 0) {
										this.bytesPanelRef.current.setByteArray(true_random);
									}
									this.progressViewRef.current.setProgress(this.trueRandomLength);
									if (this.trueRandomLength === 1) {
										this.setState({ drawStart: true });
										Animated.timing(this.state.bytesPanelOpacity, {
											toValue: 1.0,
											duration: 800,
											useNativeDriver: false
										}).start();
									}
								} finally {
									releaseLock();
								}
							};
							if (path.length > 0) {
								appendToTRGenerator(path);
							}
						}}
						hideBottom
						canDraw={canDraw}
					/>
					<TouchableOpacity
						style={[styles.nextButton, drawComplete && styles.nextButtonEnable]}
						disabled={!drawComplete || loading}
						activeOpacity={0.8}
						onPress={this.onPressImport}
					>
						{loading ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Text style={[styles.nextLabel, drawComplete && styles.nextLabelEnable]}>
								{strings('drawing_board.next')}
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	};
}
