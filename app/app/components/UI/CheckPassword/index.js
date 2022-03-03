import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import {
	ActivityIndicator,
	Keyboard,
	KeyboardAvoidingView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import React, { useEffect, useRef, useState } from 'react';
import Engine from '../../../core/Engine';
import Device from '../../../util/Device';
import SecureKeychain from '../../../core/SecureKeychain';
import AsyncStorage from '@react-native-community/async-storage';
import { BIOMETRY_CHOICE_DISABLED, TRUE } from '../../../constants/storage';
import { util } from 'gopocket-core';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	centerModal: {
		justifyContent: 'center',
		margin: 0
	},
	modalRoot: {
		marginHorizontal: 23,
		borderRadius: 8,
		backgroundColor: colors.white
	},
	modalContainer: {
		margin: 30,
		marginHorizontal: 26
	},
	modalTitle: {
		fontSize: 18,
		color: colors.$1E1E1E,
		...fontStyles.bold,
		alignSelf: 'center'
	},
	pwInput: {
		marginTop: 20,
		height: 42,
		fontSize: 14,
		paddingTop: 11,
		paddingBottom: 11,
		paddingHorizontal: 20,
		borderWidth: 1,
		borderRadius: 5,
		borderColor: colors.$DCDCDC,
		backgroundColor: colors.$F5F5F5,
		color: colors.$404040
	},
	wrongPw: {
		fontSize: 11,
		color: colors.$FC6564,
		marginTop: 8,
		opacity: 0
	},
	wrongPwShowing: {
		opacity: 1
	},
	pwModalButtons: {
		marginTop: 20,
		flexDirection: 'row'
	},
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.$FE6E91,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelText: {
		fontSize: 14,
		color: colors.$FE6E91
	},
	okButton: {
		flex: 1.5,
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.$FE6E91,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 14,
		color: colors.white
	}
});

const propTypes = {
	checkResult: PropTypes.func,
	needDelay: PropTypes.bool,
	onlyCheckInputPwd: PropTypes.bool,
	isLockScreen: PropTypes.bool
};

const defaultProps = {
	checkResult: null,
	needDelay: true,
	onlyCheckInputPwd: false
};

const CheckPassword = ({ checkResult, needDelay, onlyCheckInputPwd, isLockScreen }) => {
	const [passwordValue, setPasswordValue] = useState('');
	const [wrongPwVisible, setwrongPwVisible] = useState(false);
	const [visible, setVisible] = useState(false);
	const [loading, setLoading] = useState(false);
	const fieldRef = useRef();

	const hideCheckView = () => {
		checkResult(false);
	};

	const onConfirmPw = async () => {
		setLoading(true);
		fieldRef?.current?.blur();
		Keyboard.dismiss();
		const success = passwordValue === (await Engine.context.KeyringController.getPassword());
		if (!success) {
			setwrongPwVisible(true);
			setLoading(false);
			return;
		}
		//wait keyboard dismiss
		setTimeout(async () => {
			await checkResult(true);
			setLoading(false);
		}, 500);
	};

	const tryBiometric = async () => {
		try {
			const credentials = await SecureKeychain.getGenericPassword();
			if (!credentials) return false;
		} catch (error) {
			return false;
		}
		return true;
	};

	const checkBiometric = async () => {
		let hasCredentials = false;
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			let enabled = true;
			const previouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
			if (previouslyDisabled && previouslyDisabled === TRUE) {
				enabled = false;
			}
			try {
				if (enabled && !previouslyDisabled) {
					hasCredentials = await tryBiometric();
				}
			} catch (e) {
				util.logWarn('Login componentDidMount', e);
			}
		}
		return hasCredentials;
	};

	const startCheck = async () => {
		let hasCredentials = false;
		if (!onlyCheckInputPwd) {
			hasCredentials = await checkBiometric();
		}
		if (hasCredentials) {
			checkResult(true);
		} else if (Device.isAndroid() || !needDelay) {
			setVisible(true);
		} else {
			setTimeout(() => setVisible(true), 1000);
		}
	};

	useEffect(() => {
		startCheck();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Modal
			isVisible={visible && !isLockScreen}
			onBackdropPress={hideCheckView}
			onBackButtonPress={hideCheckView}
			onSwipeComplete={hideCheckView}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.centerModal}
		>
			<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
				<View style={styles.modalContainer}>
					<Text style={styles.modalTitle}>
						{strings(
							onlyCheckInputPwd
								? 'wallet_management.confirm_password'
								: 'wallet_management.enter_password_first'
						)}
					</Text>
					<TextInput
						ref={fieldRef}
						style={styles.pwInput}
						value={passwordValue}
						onChangeText={setPasswordValue}
						secureTextEntry
						placeholder={strings('wallet_management.password')}
						placeholderTextColor={colors.$8F92A1}
						onSubmitEditing={onConfirmPw}
						returnKeyType={'done'}
						autoCapitalize="none"
						autoFocus
						onFocus={() => {
							setwrongPwVisible(false);
						}}
					/>
					<Text style={[styles.wrongPw, wrongPwVisible && styles.wrongPwShowing]} Visible={false}>
						{strings('wallet_management.wrong_password')}
					</Text>
					<View style={styles.pwModalButtons}>
						<TouchableOpacity style={styles.cancelButton} onPress={hideCheckView}>
							<Text style={styles.cancelText}>{strings('action_view.cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.okButton} onPress={onConfirmPw} disabled={loading}>
							{loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Text style={styles.okText}>{strings('action_view.confirm')}</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

CheckPassword.propTypes = propTypes;
CheckPassword.defaultProps = defaultProps;

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(CheckPassword);
