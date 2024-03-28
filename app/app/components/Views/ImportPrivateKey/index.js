import React, { PureComponent } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import { strings } from '../../../../locales/i18n';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import { importAccountFromPrivateKey, parsePrivateKey } from '../../../util/address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../../../theme/ThemeProvider';
import { EXISTING_USER, TRUE } from '../../../constants/storage';
import { util } from 'paliwallet-core';
import { toggleShowHint } from '../../../actions/hint';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1
	},
	scrollableWrapper: {
		flex: 1,
		paddingHorizontal: 30
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
	hintLabel: {
		fontSize: 18,
		lineHeight: 21,
		color: colors.$030319,
		...fontStyles.semibold
	},
	newPwdContent: {
		marginTop: 40
	},
	input: {
		marginTop: 2,
		fontSize: 13,
		paddingVertical: 12,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderColor: colors.$F0F0F0,
		color: colors.$030319
	},
	passwordStrengthLabel: {
		marginTop: 8,
		height: 16,
		fontSize: 11,
		color: colors.$FC6564,
		textAlign: 'left',
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 30,
		marginBottom: 30
	},
	createButtonWrapper: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	createButtonText: {
		color: colors.white,
		fontSize: 16
	},
	incompleteButtonWrapper: {
		backgroundColor: colors.$E6E6E6,
		borderColor: colors.$DCDCDC,
		borderWidth: 0.5
	},
	incompleteButtonText: {
		color: colors.$A6A6A6
	}
});

class ImportPrivateKey extends PureComponent {
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
		privateKey: '',
		loading: false,
		wrongPrivateKey: false
	};

	onPrivateKeyChange = value => {
		this.setState({ privateKey: value, wrongPrivateKey: false });
	};

	onImport = () => {
		this.setState({ loading: true });
		setTimeout(() => {
			this.doImport().then(() => {
				this.setState({ loading: false });
			});
		}, 1);
	};

	doImport = async () => {
		const { password, privateKey, fromWalletManager } = this.state;
		const { KeyringController } = Engine.context;

		const parsedPrivateKey = parsePrivateKey(privateKey);

		if (!parsedPrivateKey || parsedPrivateKey === '') {
			this.setState({ wrongPrivateKey: true });
			return;
		}

		try {
			const { EnsController } = Engine.context;
			if (fromWalletManager) {
				await importAccountFromPrivateKey(parsedPrivateKey);

				//refresh ens names
				EnsController.refresh();

				this.props.navigation.pop();
				setTimeout(() => {
					this.props.toggleShowHint(strings('import_from_private_key.private_key_imported'));
				}, 300);
			} else {
				await KeyringController.createVaultByPrivateKey(password, parsedPrivateKey);

				await AsyncStorage.setItem(EXISTING_USER, TRUE);

				this.props.navigation.navigate('CheckEnvGuideView', { playType: 2, translate: 'forNoAnimation' });
			}
		} catch (error) {
			util.logWarn('PPYang ImportPrivateKey doImport error:', error);
			this.setState({ wrongPrivateKey: true });
		}
	};

	onBack = () => {
		this.props.navigation.pop();
	};

	render() {
		const { privateKey, loading, wrongPrivateKey } = this.state;
		const canSubmit = privateKey && privateKey.length > 0;
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView style={[styles.mainWrapper, isDarkMode && baseStyles.darkBackground]}>
				<View style={styles.wrapper}>
					<MStatusBar navigation={this.props.navigation} />
					<TitleBar title={strings('onboarding.import_wallet')} onBack={this.onBack} />
					<KeyboardAwareScrollView
						style={styles.scrollableWrapper}
						contentContainerStyle={styles.keyboardScrollableWrapper}
						resetScrollToCoords={{ x: 0, y: 0 }}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
							{strings('import_from_private_key.enter_private_key')}
						</Text>
						<Text style={[styles.secondaryTitle, isDarkMode && baseStyles.subTextDark]}>
							{strings('import_from_private_key.enter_private_key_tips')}
						</Text>
						<View style={styles.newPwdContent}>
							<Text style={[styles.hintLabel, isDarkMode && baseStyles.textDark]}>
								{strings('import_from_private_key.private_key')}
							</Text>
							<TextInput
								style={[styles.input, isDarkMode && baseStyles.textDark]}
								value={privateKey}
								onChangeText={this.onPrivateKeyChange}
								placeholder={strings('import_from_private_key.private_key_placeholder')}
								placeholderTextColor={colors.$8F92A1}
								onSubmitEditing={this.onImport}
								returnKeyType="next"
								autoCapitalize="none"
							/>
							<Text style={styles.passwordStrengthLabel}>
								{wrongPrivateKey ? strings('import_from_private_key.wrong_private_key') : ''}
							</Text>
						</View>
						<View style={baseStyles.flexGrow} />
						<View style={styles.ctaWrapper}>
							<TouchableOpacity
								style={[styles.createButtonWrapper, !canSubmit && styles.incompleteButtonWrapper]}
								onPress={this.onImport}
								disabled={!canSubmit || loading}
								activeOpacity={activeOpacity}
							>
								{loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text style={[styles.createButtonText, !canSubmit && styles.incompleteButtonText]}>
										{strings('import_from_seed.import')}
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</KeyboardAwareScrollView>
				</View>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ImportPrivateKey);
