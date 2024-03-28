import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { View, Text, Linking } from 'react-native';
import { baseStyles, colors } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toggleTestnetVisible } from '../../../actions/settings';
import MStatusBar from '../../UI/MStatusBar';
import { WebView } from 'react-native-webview';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import { getAppVersionCode } from '../../../util/ApiClient';
import { launchAppInGooglePlay, supportGooglePlay, jumpIosApp } from '../../../util/NativeUtils';
import Device from '../../../util/Device';
import { appendLanguage } from '../../../util/browser';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = {
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
		paddingLeft: 20,
		paddingRight: 20
	},
	flex: {
		flex: 1
	},
	line: {
		backgroundColor: colors.$F0F0F0,
		height: 0.5,
		alignSelf: 'stretch'
	},
	bottomView: {
		height: 129
	},
	bottomView2: {
		height: 78,
		justifyContent: 'center',
		paddingHorizontal: 20
	},
	bottomWarnText: {
		color: colors.$8F92A1,
		fontSize: 12,
		marginTop: 10
	},
	bottomBtnTouch: {
		width: '100%',
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomBtnText: {
		fontSize: 16,
		color: colors.white
	},
	bottomDisableBtnTouch: {
		width: '100%',
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.$E6E6E6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomDisableBtnText: {
		fontSize: 16,
		color: colors.$030319
	},
	bottomDetail: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 20
	},
	progressBarWrapper: {
		height: 3,
		width: '100%',
		left: 0,
		right: 0,
		top: 0,
		position: 'absolute',
		zIndex: 100
	}
};

class UpdateCheck extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object,
		updateConfig: PropTypes.object
	};

	state = {
		forceUpdate: false,
		updateUrl: ''
	};

	componentDidMount = () => {
		let forceUp = false;
		let detailUrl = this.props.updateConfig.update_url;
		const newVersionCode = this.props.updateConfig.latest_version_code;
		if (newVersionCode) {
			if (Number(newVersionCode) > Number(getAppVersionCode())) {
				forceUp = true;
			}
		}
		if (!detailUrl) {
			detailUrl = 'https://pali-mobile-changelog.vercel.app';
		}
		detailUrl = appendLanguage(detailUrl);
		this.setState({ forceUpdate: forceUp, updateUrl: detailUrl });
	};

	state = {
		progress: 0
	};

	renderProgressBar = () => (
		<View style={styles.progressBarWrapper}>
			<WebviewProgressBar progress={this.state.progress} />
		</View>
	);

	onLoadProgress = ({ nativeEvent: { progress } }) => {
		this.setState({ progress });
	};

	render() {
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[baseStyles.flexGrow, isDarkMode && baseStyles.darkBackground]}
				testID={'wallet-screen'}
			>
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
				<TitleBar
					withBackground={isDarkMode}
					titleStyle={{ color: isDarkMode && colors.white }}
					title={strings('app_settings.update_check')}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<View style={styles.flex}>
					<WebView
						source={{ uri: this.state.updateUrl }}
						style={styles.flex}
						onLoadProgress={this.onLoadProgress}
					/>
					{this.renderProgressBar()}
				</View>
				<View style={styles.line} />
				{this.state.forceUpdate ? (
					<View style={styles.bottomView}>
						<View style={styles.bottomDetail}>
							<TouchableOpacity
								style={styles.bottomBtnTouch}
								onPress={async () => {
									if (Device.isAndroid()) {
										const support = await supportGooglePlay();
										if (support) {
											launchAppInGooglePlay();
										} else {
											console.warn('We do not support download from other source');
											//Ignore this since we do not provide our APK for download
											// const downloadUrl = this.props.updateConfig.download_url;
											// if (downloadUrl) {
											// 	Linking.openURL(downloadUrl);
											// }
										}
									} else {
										jumpIosApp();
									}
								}}
							>
								<Text style={styles.bottomBtnText}>{strings('version_update.update_to_latest')}</Text>
							</TouchableOpacity>
							<Text style={styles.bottomWarnText}>{strings('version_update.upgrade_warn')}</Text>
						</View>
					</View>
				) : (
					<View style={styles.bottomView2}>
						<TouchableOpacity style={styles.bottomDisableBtnTouch} disabled>
							<Text style={styles.bottomDisableBtnText}>{strings('version_update.already_updated')}</Text>
						</TouchableOpacity>
					</View>
				)}
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	updateConfig: state.settings.updateConfig
});

const mapDispatchToProps = dispatch => ({
	toggleTestnetVisible: () => dispatch(toggleTestnetVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(UpdateCheck);
