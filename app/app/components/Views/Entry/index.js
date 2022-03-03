import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import { BACKUP_VAULT, BIOMETRY_CHOICE, BIOMETRY_CHOICE_DISABLED, EXISTING_USER } from '../../../constants/storage';
import { util } from 'gopocket-core';
import SplashScreen from 'react-native-splash-screen';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.white
	}
});

class Entry extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		 */
		navigation: PropTypes.object
	};

	animateAndGoTo = view => {
		let timeout = Date.now() - global.native_start_time;
		timeout = Math.max(2000 - timeout, 0);
		if (view === 'HomeNav') {
			timeout = 0;
		}
		setTimeout(() => {
			this.props.navigation.navigate(view);
			SplashScreen.hide();
		}, timeout);
	};

	clearRememberMe = async () => {
		if (Device.isAndroid()) {
			try {
				const biometryType = await SecureKeychain.getSupportedBiometryType();
				const disable = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
				const choice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
				if (biometryType && disable && !choice) {
					const pwd = await SecureKeychain.getGenericPassword();
					if (pwd) {
						await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
						await SecureKeychain.resetGenericPassword();
					}
				}
			} catch (e) {
				util.logError(`Entry clearRememberMe e:`, e);
			}
		}
	};

	backupVault = async () => {
		try {
			const backup = await AsyncStorage.getItem(BACKUP_VAULT);
			if (backup) {
				return;
			}
			const { KeyringController } = Engine.context;
			const vault = KeyringController.state.vault;
			vault && (await AsyncStorage.setItem(BACKUP_VAULT, vault));
			// eslint-disable-next-line no-empty
		} catch (e) {}
	};

	componentDidMount = async () => {
		const existingUser = await AsyncStorage.getItem(EXISTING_USER);
		if (!existingUser) {
			this.animateAndGoTo('OnboardingRootNav');
			return;
		}

		await this.clearRememberMe();
		await this.backupVault();
		try {
			const { KeyringController } = Engine.context;
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				await KeyringController.verifyPassword(credentials.password);
				setTimeout(() => {
					KeyringController.submitPassword(credentials.password);
				}, 10);
				this.animateAndGoTo('HomeNav');
			} else {
				this.animateAndGoTo('Login');
			}
		} catch (error) {
			util.logError(`Keychain couldn't be accessed`, error);
			this.animateAndGoTo('Login');
		}
	};

	render = () => <View style={styles.main} />;
}

const mapDispatchToProps = dispatch => ({});

const mapStateToProps = state => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Entry);
