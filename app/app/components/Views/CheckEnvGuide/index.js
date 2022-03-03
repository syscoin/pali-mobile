import React, { PureComponent } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Platform, BackHandler, StatusBar } from 'react-native';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import MStatusBar from '../../UI/MStatusBar';
import LottieVideoView from '../../UI/LottieVideoView';
import { getWords } from '../../../util/validators';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Device from '../../../util/Device';
import { SafeAreaView } from 'react-navigation';

const statusBarHeight = Device.isAndroid() ? StatusBar.currentHeight : 0;

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	},
	videoBase: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: statusBarHeight + 60
	},
	nextButton: {
		height: 44,
		backgroundColor: colors.$FE6E91,
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
	static propTypes = {
		navigation: PropTypes.object
	};

	state = {
		type: this.props.navigation.getParam('playType', 2), //1.新建钱包  2：导入助记词
		touchOpacity: new Animated.Value(0),
		fromWalletManager: this.props.navigation.getParam('fromWalletManager', false),
		mnemonic: this.props.navigation.getParam('mnemonic', ''),
		videoPlayEnd: false
	};

	componentDidMount = async () => {
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

	render = () => {
		const { navigation } = this.props;
		const { type, fromWalletManager, mnemonic, videoPlayEnd } = this.state;
		return (
			<SafeAreaView style={[styles.flexOne, { backgroundColor: colors.white }]}>
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
					<View style={styles.videoBase}>
						<LottieVideoView
							playType={type}
							onPlayEnd={() => {
								this.setState({ videoPlayEnd: true });
								Animated.timing(this.state.touchOpacity, {
									toValue: 1.0,
									duration: 200,
									useNativeDriver: false
								}).start();
							}}
						/>
					</View>
					<Animated.View style={[styles.operateLayout, { opacity: this.state.touchOpacity }]}>
						<View style={styles.touchBase}>
							{type === 2 ? (
								<TouchableOpacity
									disabled={!videoPlayEnd}
									style={styles.nextButton}
									activeOpacity={0.8}
									onPress={() => {
										navigation.navigate('Home');
									}}
								>
									<Text style={styles.nextLabel}>{strings('manual_backup_step_1.enter_wallet')}</Text>
								</TouchableOpacity>
							) : (
								<View>
									<TouchableOpacity
										disabled={!videoPlayEnd}
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
										disabled={!videoPlayEnd}
										style={styles.skipButton}
										activeOpacity={0.5}
										onPress={() => {
											if (fromWalletManager) {
												navigation.navigate('WalletManagement');
											} else {
												navigation.navigate('Home');
											}
										}}
									>
										<Text style={styles.skipLabel}>
											{strings('manual_backup_step_1.backup_later')}
										</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</Animated.View>
				</View>
			</SafeAreaView>
		);
	};
}
