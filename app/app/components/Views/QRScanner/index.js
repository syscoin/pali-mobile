'use strict';
import React, { PureComponent } from 'react';
import { Image, TouchableOpacity, View, StyleSheet, Animated, default as Easing, Dimensions } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { parse } from 'eth-url-parser';
import { strings } from '../../../../locales/i18n';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import { hideScanner } from '../../../actions/scanner';
import Device from '../../../util/Device';

const DEVICE_HEIGHT = Dimensions.get('window').height;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.black
	},
	preview: {
		flex: 1
	},
	innerView: {
		flex: 1,
		alignItems: 'center'
	},
	buttonView: {
		marginTop: 40,
		alignItems: 'center',
		width: '100%'
	},
	backButton: {
		position: 'absolute',
		left: 20
	},
	scanContainer: {
		width: '100%',
		height: '100%',
		marginTop: '40%'
	},
	border: {
		width: '90%',
		alignSelf: 'center'
	},
	scanImage: {
		width: '100%'
	}
});

/**
 * View that wraps the QR code scanner screen
 */
class QrScanner extends PureComponent {
	static propTypes = {
		hideScanner: PropTypes.func,
		onScanError: PropTypes.func,
		onScanSuccess: PropTypes.func
	};

	shouldReadBarCode = false;

	state = {
		moveAnim: new Animated.Value(0)
	};

	componentDidMount() {
		this.shouldReadBarCode = true;
		setTimeout(this.startAnimation, 300);
	}

	goBack = () => {
		this.props.hideScanner();
		if (this.props.onScanError) {
			this.props.onScanError('USER_CANCELLED');
		}
	};

	end = (data, content) => {
		this.props.hideScanner();
		this.props.onScanSuccess(data, content);
	};

	onBarCodeRead = async response => {
		if (!this.shouldReadBarCode) return false;
		const content = response.data;

		if (!content) return false;

		let data = {};

		const { KeyringController } = Engine.context;
		const isUnlocked = KeyringController.isUnlocked();

		if (!isUnlocked) {
			this.props.hideScanner();
			return;
		}

		// Let ethereum:address go forward
		if (content.split('ethereum:').length > 1 && !parse(content).function_name) {
			this.shouldReadBarCode = false;
			data = parse(content);
			const action = 'send-eth';
			data = { ...data, action };
			this.props.hideScanner();
			this.props.onScanSuccess(data, content);
			return;
		}

		// Checking if it can be handled like deeplinks
		const handledByDeeplink = SharedDeeplinkManager.parse(content, {
			origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
			onHandled: () => this.props.hideScanner()
		});

		if (handledByDeeplink) {
			return;
		}

		// I can't be handled by deeplinks, checking other options
		if (content.length === 64 || (content.substring(0, 2).toLowerCase() === '0x' && content.length === 66)) {
			this.shouldReadBarCode = false;
			data = { private_key: content.length === 64 ? content : content.substr(2) };
		} else if (content.substring(0, 2).toLowerCase() === '0x') {
			this.shouldReadBarCode = false;
			data = { target_address: content, action: 'send-eth' };
		} else if (content.split('wc:').length > 1) {
			this.shouldReadBarCode = false;
			data = { walletConnectURI: content };
		} else {
			// EIP-945 allows scanning arbitrary data
			data = content;
		}

		this.end(data, content);
	};

	onError = error => {
		this.props.hideScanner();
		if (this.props.onScanError && error) {
			this.props.onScanError(error.message);
		}
	};

	onStatusChange = event => {
		if (event.cameraStatus === 'NOT_AUTHORIZED') {
			this.props.hideScanner();
		}
	};

	startAnimation = () => {
		Animated.loop(
			Animated.timing(this.state.moveAnim, {
				toValue: DEVICE_HEIGHT * 0.4,
				duration: 2000,
				useNativeDriver: true,
				easing: Easing.linear
			})
		).start();
	};

	render = () => (
		<View style={styles.container}>
			<RNCamera
				onMountError={this.onError}
				captureAudio={false}
				style={styles.preview}
				type={RNCamera.Constants.Type.back}
				onBarCodeRead={this.onBarCodeRead}
				flashMode={RNCamera.Constants.FlashMode.auto}
				androidCameraPermissionOptions={{
					title: strings('qr_scanner.allow_camera_dialog_title'),
					message: strings('qr_scanner.allow_camera_dialog_message'),
					buttonPositive: strings('qr_scanner.ok'),
					buttonNegative: strings('qr_scanner.cancel')
				}}
				onStatusChange={this.onStatusChange}
			>
				<View style={styles.innerView}>
					<View style={styles.buttonView}>
						<TouchableOpacity onPress={this.goBack} style={styles.backButton}>
							<Image source={require('../../../images/ic_back_white.png')} />
						</TouchableOpacity>
						{!Device.isAndroid() && (
							<View>
								<TouchableOpacity onPress={this.goBack}>
									<Image source={require('../../../images/backwhite.png')} />
								</TouchableOpacity>
							</View>
						)}
					</View>

					<View style={styles.scanContainer}>
						<Animated.View style={[styles.border, { transform: [{ translateY: this.state.moveAnim }] }]}>
							<Image style={styles.scanImage} source={require('../../../images/scan_bar.png')} />
						</Animated.View>
					</View>
				</View>
			</RNCamera>
		</View>
	);
}

const mapStateToProps = state => ({
	onStartScan: state.scanner.onStartScan,
	onScanError: state.scanner.onScanError,
	onScanSuccess: state.scanner.onScanSuccess
});

const mapDispatchToProps = dispatch => ({
	hideScanner: () => dispatch(hideScanner())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(QrScanner);
