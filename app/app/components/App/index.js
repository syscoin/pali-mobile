import React, { PureComponent } from 'react';
import { Linking, View } from 'react-native';
import { createAppContainer, createSwitchNavigator, NavigationActions } from 'react-navigation';
import codePush from 'react-native-code-push';
import { setCustomText } from 'react-native-global-props';
import { createStackNavigator } from 'react-navigation-stack';

import Login from '../Views/Login';
import Onboarding from '../Views/Onboarding';
import ChoosePassword from '../Views/ChoosePassword';
import ImportFromSeed from '../Views/ImportFromSeed';
import Entry from '../Views/Entry';
import Main from '../Main';
import SharedDeeplinkManager from '../../core/DeeplinkManager';
import { initApiClient } from '../../util/ApiClient';
import { ThemeContext } from '../../theme/ThemeProvider';
import AppConstants from '../../core/AppConstants';
import BiometricSecurity from '../Views/BiometricSecurity';
import ImportPrivateKey from '../Views/ImportPrivateKey';
import ManualBackupStep1 from '../Views/ManualBackupStep1';
import ManualBackupStep2 from '../Views/ManualBackupStep2';
import DrawingBoard from '../Views/DrawingBoard';
import DrawingGuide from '../Views/DrawingGuide';
import NativeThreads from '../../threads/NativeThreads';
import WC2Manager, { isWC2Enabled } from '../../../app/core/WalletConnect/WalletConnectV2';

const OnboardingView = createSwitchNavigator(
	{
		ChoosePassword: {
			screen: ChoosePassword
		},
		BiometricSecurity: {
			screen: BiometricSecurity
		},
		ImportFromSeed: {
			screen: ImportFromSeed
		},
		ImportPrivateKey: {
			screen: ImportPrivateKey
		},
		DrawingBoard: {
			screen: DrawingBoard
		},
		DrawingGuide: {
			screen: DrawingGuide
		}
	},
	{
		mode: 'card',

		navigationOptions: {
			gesturesEnabled: false
		}
	}
);

/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet, Import from Seed and Sync
 */
const OnboardingNav = createStackNavigator(
	{
		Onboarding: {
			screen: Onboarding,
			navigationOptions: {
				header: null
			}
		},
		OnboardingView: {
			screen: OnboardingView,
			navigationOptions: {
				header: null
			}
		},
		ManualBackupStep1: {
			screen: ManualBackupStep1,
			navigationOptions: {
				header: null,
				gesturesEnabled: false
			}
		},
		ManualBackupStep2: {
			screen: ManualBackupStep2,
			navigationOptions: {
				header: null
			}
		}
	},
	{
		mode: 'card',
		initialRouteName: 'Onboarding'
	}
);

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
const OnboardingRootNav = createStackNavigator(
	{
		OnboardingNav: {
			screen: OnboardingNav,
			navigationOptions: {
				header: null
			}
		}
	},
	{
		mode: 'modal'
	}
);

/**
 * Main app navigator which handles all the screens
 * after the user is already onboarded
 */
const HomeNav = createSwitchNavigator({
	Main: {
		screen: Main
	}
});
/**
 * Top level switch navigator which decides
 * which top level view to show
 */
const AppNavigator = createSwitchNavigator(
	{
		Entry,
		HomeNav,
		OnboardingRootNav,
		Login
	},
	{
		initialRouteName: 'Entry'
	}
);

const AppContainer = createAppContainer(AppNavigator);

class App extends PureComponent {
	static contextType = ThemeContext;

	componentDidMount = async () => {
		SharedDeeplinkManager.init({
			navigate: (routeName, opts) => {
				this.navigator.dispatch(NavigationActions.navigate({ routeName, params: opts }));
			}
		});
		if (isWC2Enabled) {
			WC2Manager.init().catch(err => {
				console.error(`Cannot initialize WalletConnect Manager.`, err);
			});
		}

		//Sets Default Font Family
		const customTextProps = {
			style: {
				fontFamily: 'Poppins'
			}
		};

		setCustomText(customTextProps);

		initApiClient();

		Linking.addEventListener('url', this.handleDeepLinkEvent);

		const url = await Linking.getInitialURL();
		if (url) {
			setTimeout(() => {
				this.handleDeepLinkEvent({ url });
			}, 4000);
		}
	};

	componentWillUnmount = () => {
		Linking.removeEventListener('url', this.handleDeepLinkEvent);
		NativeThreads.terminate();
	};

	handleDeepLinkEvent = event => {
		SharedDeeplinkManager.parse(event.url, {
			origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
		});
	};

	render() {
		const { theme } = this.context;

		return (
			<AppContainer
				theme={theme}
				ref={nav => {
					this.navigator = nav;
				}}
			/>
		);
	}
}
export default codePush(App);
