import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, ScrollView, View, Animated, StatusBar, NativeModules } from 'react-native';
import SettingsDrawer from '../../UI/SettingsDrawer';
import { ThemeContext } from '../../../theme/ThemeProvider';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import MStatusBar from '../../UI/MStatusBar';
import { getInviteUrl } from '../../../util/ApiClient';
import TitleBar from '../../UI/TitleBar';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.$F6F6F6,
		flex: 1,
		paddingHorizontal: 20,
		zIndex: 99999999999999
	},
	title: {
		color: colors.$202020,
		backgroundColor: colors.$F6F6F6,
		fontSize: 22,
		textAlign: 'center',
		...fontStyles.bold
	},
	cardItem: {
		backgroundColor: colors.white,
		borderRadius: 10,
		marginTop: 20
	},
	headerStyle: {
		flexDirection: 'row',
		backgroundColor: colors.$F6F6F6,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cardItemTop: {
		backgroundColor: colors.white,
		borderRadius: 10,
		marginTop: 14
	}
});

export default class Settings extends PureComponent {
	fadeAnim = new Animated.Value(1);
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};
	static contextType = ThemeContext;

	state = {
		IOSStatusBarHeight: 0
	};

	onWalletManagement = () => {
		this.props.navigation.navigate('WalletManagement');
	};

	onObserveAccounts = () => {
		this.props.navigation.navigate('ObserveAccounts');
	};

	onSecuritySettings = () => {
		this.props.navigation.navigate('SecuritySettings');
	};

	onAbout = () => {
		this.props.navigation.navigate('AboutView');
	};

	onInvite = () => {
		this.props.navigation.navigate('BrowserTabHome');
		this.props.navigation.navigate('BrowserView', {
			newTabUrl: `${getInviteUrl()}?locale=${strings('other.accept_language')}`
		});
	};

	onSelectDeveloperOptions = () => {
		this.props.navigation.navigate('DeveloperOptions');
	};

	onCurrencyUnit = () => {
		this.props.navigation.navigate('CurrencyUnit');
	};

	onLanguageSelector = () => {
		this.props.navigation.navigate('LanguageSelector');
	};

	onUpdateCheck = () => {
		this.props.navigation.navigate('UpdateCheck');
	};

	onOnboarding = () => {
		this.props.navigation.navigate('WalletView', { onboard: true });
	};

	onSwitchTheme = () => {
		const { setTheme } = this.context;

		Animated.timing(this.fadeAnim, {
			toValue: 0,
			duration: 125,
			useNativeDriver: true
		}).start(() => {
			setTheme(theme => (theme === 'light' ? 'dark' : 'light'));

			Animated.timing(this.fadeAnim, {
				toValue: 1,
				duration: 125,
				useNativeDriver: true
			}).start();
		});
	};

	componentDidMount = () => {
		if (Device.isIos()) {
			const { StatusBarManager } = NativeModules;
			StatusBarManager.getHeight(statusBarHeight => {
				statusBarHeight && this.setState({ IOSStatusBarHeight: statusBarHeight.height });
			});
		}
	};

	render = () => {
		let barHeight = 0;
		if (Device.isAndroid()) {
			barHeight = StatusBar.currentHeight;
		} else if (Device.isIos()) {
			barHeight = this.state.IOSStatusBarHeight;
		}
		const { theme } = this.context;

		return (
			<Animated.View style={[baseStyles.flexGrow, { opacity: this.fadeAnim }]} testID={'wallet-screen'}>
				<MStatusBar
					navigation={this.props.navigation}
					fixPadding={false}
					backgroundColor={colors.transparent}
				/>
				<View style={{ height: barHeight, backgroundColor: colors.$F6F6F6 }} />
				<View style={styles.headerStyle}>
					<TitleBar
						baseStyle={{ backgroundColor: colors.$F6F6F6 }}
						titleStyle={styles.title}
						title={strings('app_settings.title')}
						onBack={() => {
							this.props.navigation.pop();
						}}
					/>
				</View>

				<ScrollView style={styles.wrapper} keyboardShouldPersistTaps="handled">
					<View style={styles.cardItemTop}>
						<SettingsDrawer
							onPress={this.onWalletManagement}
							image={require('../../../images/ic_setting_wallet.png')}
							title={strings('app_settings.wallet_management')}
						/>
						{/* <SettingsDrawer
							onPress={this.onObserveAccounts}
							image={require('../../../images/ic_setting_observe.png')}
							title={strings('observer.observe_only_ccounts')}
							hideLine
						/> */}
					</View>
					<View style={styles.cardItem}>
						<SettingsDrawer
							onPress={this.onSecuritySettings}
							image={require('../../../images/ic_setting_Security.png')}
							title={strings('app_settings.security_settings')}
						/>
						<SettingsDrawer
							onPress={this.onSelectDeveloperOptions}
							image={require('../../../images/developer_options.png')}
							title={strings('app_settings.developer_options')}
						/>
						<SettingsDrawer
							onPress={this.onCurrencyUnit}
							image={require('../../../images/ic_setting_currency.png')}
							title={strings('app_settings.currency_unit')}
						/>
						<SettingsDrawer
							onPress={this.onLanguageSelector}
							image={require('../../../images/ic_setting_language.png')}
							title={strings('app_settings.language')}
							iconStyle={{ height: 26, width: 26 }}
							hideLine
						/>
					</View>
					<View style={styles.cardItem}>
						<SettingsDrawer
							onPress={this.onSwitchTheme}
							image={require('../../../images/ic_setting_theme.png')}
							title={'Theme'}
							isTheme={theme}
						/>
						<SettingsDrawer
							onPress={this.onOnboarding}
							image={require('../../../images/ic_setting_idea.png')}
							title={strings('app_settings.idea')}
						/>
						<SettingsDrawer
							onPress={this.onUpdateCheck}
							image={require('../../../images/ic_setting_update.png')}
							title={strings('app_settings.update_check')}
						/>

						{/* {TODO: Update the onInvite to Pali one instead of Pali Wallet
							and probably update to send for the download page, or invite rewards page, idk}
						{/* <SettingsDrawer
							onPress={this.onInvite}
							image={require('../../../images/ic_setting_invite.png')}
							title={strings('app_settings.invite')}
						/> */}
						<SettingsDrawer
							onPress={this.onAbout}
							image={require('../../../images/pali.png')}
							iconStyle={{ width: 24, height: 26, marginRight: 16 }}
							title={strings('app_settings.about')}
							hideLine
						/>
					</View>
				</ScrollView>
			</Animated.View>
		);
	};
}
