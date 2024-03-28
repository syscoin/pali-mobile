import React, { PureComponent } from 'react';
import {
	StyleSheet,
	Text,
	DeviceEventEmitter,
	TouchableOpacity,
	View,
	Animated,
	Platform,
	BackHandler,
	ActivityIndicator,
	Image
} from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import MStatusBar from '../../UI/MStatusBar';
import { getWords } from '../../../util/validators';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	},
	centerLabel: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	readyText: {
		color: colors.brandPink300,
		fontSize: 20,
		lineHeight: 28,
		...fontStyles.semibold,
		marginTop: 24
	},
	nextButton: {
		height: 44,
		backgroundColor: colors.brandPink300,
		borderRadius: 10,
		alignSelf: 'stretch',
		justifyContent: 'center',
		alignItems: 'center'
	},
	nextLabel: {
		color: colors.white,
		fontSize: 16
	},
	skipButton: {
		marginTop: 10,
		height: 44,
		backgroundColor: colors.transparent,
		alignSelf: 'stretch',
		justifyContent: 'center',
		alignItems: 'center'
	},
	skipLabel: {
		color: colors.$60657D,
		fontSize: 16
	},
	touchBase: {
		marginBottom: 30,
		paddingHorizontal: 30
	},
	panGestureBaseView: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: 50,
		bottom: 0,
		backgroundColor: colors.transparent,
		zIndex: 1005
	}
});

export default class CheckEnvGuide extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object
	};

	state = {
		type: this.props.navigation.getParam('playType', 2), //1.新建钱包  2：导入助记词
		touchOpacity: new Animated.Value(0),
		fromWalletManager: this.props.navigation.getParam('fromWalletManager', false),
		mnemonic: this.props.navigation.getParam('mnemonic', '')
	};

	componentDidMount = async () => {
		if (Platform.OS === 'android') {
			BackHandler.addEventListener('hardwareBackPress', this.onBackAndroid);
		}
		if (this.state.type === 2) {
			setTimeout(() => {
				this.props.navigation.navigate('Home');
				setTimeout(() => DeviceEventEmitter.emit('OnboardingTour'), 500);
			}, 3800);
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

	render = () => {
		const { navigation } = this.props;
		const { type, fromWalletManager, mnemonic } = this.state;
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[styles.flexOne, { backgroundColor: isDarkMode ? colors.brandBlue700 : colors.white }]}
			>
				<MStatusBar navigation={navigation} fixPadding={false} translucent />
				<View style={styles.panGestureBaseView}>
					<PanGestureHandler
						style={styles.flexOne}
						maxPointers={10}
						minDist={1}
						avgTouches={false}
						shouldCancelWhenOutside
					>
						<View style={styles.flexOne} />
					</PanGestureHandler>
				</View>
				<View style={styles.flexOne}>
					{type === 2 ? (
						<View style={styles.centerLabel}>
							<ActivityIndicator size="large" color={colors.brandPink300} />
						</View>
					) : (
						<>
							<View style={styles.centerLabel}>
								<Image source={require('../../../images/img_creatwallet.png')} />
								<Text style={styles.readyText}>{strings('manual_backup_step_1.wallet_is_ready')}</Text>
							</View>
							<Animated.View style={styles.operateLayout}>
								<View style={styles.touchBase}>
									<TouchableOpacity
										style={styles.nextButton}
										activeOpacity={0.8}
										onPress={() => {
											const words = getWords(mnemonic);
											if (fromWalletManager) {
												navigation.navigate('ManualBackupStep1View', {
													words,
													fromWalletManager
												});
											} else {
												navigation.navigate('ManualBackupStep1', {
													words,
													fromWalletManager
												});
											}
										}}
									>
										<Text style={styles.nextLabel}>
											{strings('manual_backup_step_1.wallet_backup')}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.skipButton}
										activeOpacity={0.5}
										onPress={() => {
											if (fromWalletManager) {
												navigation.navigate('WalletManagement');
											} else {
												navigation.navigate('Home');
												setTimeout(() => DeviceEventEmitter.emit('OnboardingTour'), 250);
											}
										}}
									>
										<Text style={[styles.skipLabel, isDarkMode && baseStyles.textDark]}>
											{strings('manual_backup_step_1.backup_later')}
										</Text>
									</TouchableOpacity>
								</View>
							</Animated.View>
						</>
					)}
				</View>
			</SafeAreaView>
		);
	};
}
