import React from 'react';
import { createStackNavigator, StackViewStyleInterpolator } from 'react-navigation-stack';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import { Text, DeviceEventEmitter, Vibration } from 'react-native';

import { strings } from '../../../locales/i18n';
import SimpleWebview from '../Views/SimpleWebview';
import Settings from '../Views/Settings';
import Wallet from '../Views/Wallet';
import Asset from '../Views/Asset';
import RevealPrivateCredential from '../Views/RevealPrivateCredential';
import VerifySeedPhrase from '../Views/VerifySeedPhrase';
import ResetPassword from '../Views/ResetPassword';
import SecuritySettings from '../Views/SecuritySettings';
import AboutView from '../Views/AboutView';
import DeveloperOptions from '../Views/DeveloperOptions';
import CurrencyUnit from '../Views/CurrencyUnit';
import UpdateCheck from '../Views/UpdateCheck';
import { colors, fontStyles } from '../../styles/common';
import WalletManagement from '../Views/WalletManagement';
import ObserveAccounts from '../Views/ObserveAccounts';
import NftView from '../Views/NftView';
import Login from '../Views/Login';
import Security from '../UI/SecurityView';
import DrawingBoard from '../Views/DrawingBoard';
import DrawingGuide from '../Views/DrawingGuide';
import CheckEnvGuide from '../Views/CheckEnvGuide';
import ManualBackupStep1 from '../Views/ManualBackupStep1';
import ManualBackupStep2 from '../Views/ManualBackupStep2';
import ImportFromSeed from '../Views/ImportFromSeed';
import ImportPrivateKey from '../Views/ImportPrivateKey';
import Browser from '../Views/Browser';
import TransactionsView from '../UI/TransactionsView';
import GlobeIcon from '../UI/GlobeIcon';
import WalletIcon from '../UI/WalletIcon';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LanguageSelector from '../Views/LanguageSelector';
import { ThemeContext } from '../../theme/ThemeProvider';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const SlideFromLeft = (index, position, width) => {
	const inputRange = [index - 1, index, index + 1];
	const translateX = position.interpolate({
		inputRange,
		outputRange: [-width, 0, 0]
	});

	return {
		transform: [{ translateX }]
	};
};

const contextType = ThemeContext;

export default createStackNavigator(
	{
		Home: {
			screen: createBottomTabNavigator(
				{
					WalletTabHome: {
						screen: createStackNavigator(
							{
								WalletView: {
									screen: Wallet,
									navigationOptions: {
										header: null
									}
								},
								AssetView: {
									screen: Asset,
									navigationOptions: {
										header: null
									}
								},
								SecurityView: {
									screen: Security,
									navigationOptions: {
										header: null
									}
								},
								NftView: {
									screen: NftView,
									navigationOptions: {
										header: null
									}
								},
								TransactionsView: {
									screen: TransactionsView,
									navigationOptions: {
										header: null
									}
								},
								SettingsView: {
									screen: Settings,
									navigationOptions: {
										header: null
									}
								}
							},
							{
								transitionConfig: transitionProps => {
									const { scene, scenes } = transitionProps;
									const { route } = scene;

									// apply animation for SettingsView screen and when navigating to/from it
									if (
										route.routeName === 'SettingsView' ||
										scenes[1]?.route.routeName === 'SettingsView'
									) {
										return {
											screenInterpolator: sceneProps => {
												const { layout, position, scene } = sceneProps;
												const { index } = scene;

												return SlideFromLeft(index, position, layout.initWidth);
											}
										};
									}

									// use the default screen transition for other screens
									return {
										screenInterpolator: sceneProps => {
											const translate = sceneProps?.scenes?.[1]?.route?.params?.translate;
											if (translate) {
												const translateFunc = StackViewStyleInterpolator[translate];
												if (translateFunc) {
													return translateFunc(sceneProps);
												}
											}
											return StackViewStyleInterpolator.forHorizontal(sceneProps);
										}
									};
								}
							}
						),
						navigationOptions: {
							tabBarLabel: props => (
								<Text
									style={[
										// eslint-disable-next-line react-native/no-inline-styles
										{
											color: props.tintColor,
											textAlign: 'center',
											fontSize: 11,
											...fontStyles.bold
										},
										// eslint-disable-next-line react-native/no-inline-styles
										{ marginBottom: 5 }
									]}
								>
									{strings('other.wallet')}
								</Text>
							),
							tabBarIcon: ({ focused }) => <WalletIcon focused={focused} />,
							tabBarOnPress: ({ defaultHandler }) => {
								ReactNativeHapticFeedback.trigger('impactLight', options);
								defaultHandler();
								DeviceEventEmitter.emit('onWalletTabFocused');
							}
						}
					},
					BrowserTabHome: {
						screen: createStackNavigator({
							BrowserView: {
								screen: Browser,
								navigationOptions: {
									header: null,
									gesturesEnabled: false,
									animationEnabled: true
								}
							}
						}),
						navigationOptions: {
							tabBarLabel: props => (
								<Text
									style={[
										// eslint-disable-next-line react-native/no-inline-styles
										{
											color: props.tintColor,
											textAlign: 'center',
											fontSize: 11,
											...fontStyles.bold
										},
										// eslint-disable-next-line react-native/no-inline-styles
										{ marginBottom: 5 }
									]}
								>
									{strings('other.browser')}
								</Text>
							),
							tabBarIcon: ({ focused }) => <GlobeIcon focused={focused} />,
							tabBarOnPress: ({ defaultHandler }) => {
								ReactNativeHapticFeedback.trigger('impactLight', options);
								defaultHandler();
								DeviceEventEmitter.emit('onBrowserTabFocused');
							}
						}
					}
				},
				{
					defaultNavigationOptions: props => {
						return {
							tabBarVisible: true,
							animationEnabled: true,

							tabBarOptions: {
								activeTintColor: props.theme === 'light' ? colors.paliGrey300 : colors.white,
								inactiveTintColor: props.theme === 'light' ? colors.paliGrey300 : colors.white,
								tabStyle: {
									height: 50
								},
								style: {
									backgroundColor: props.theme === 'light' ? colors.white : colors.brandBlue500,
									height: 50,
									borderTopColor: 'rgba(0, 0, 0, 0.1)',
									borderLeftColor: 'rgba(0, 0, 0, 0.1)',
									borderRightColor: 'rgba(0, 0, 0, 0.1)',
									borderBottomColor: 'transparent',
									borderWidth: 1
								}
							}
						};
					}
				}
			)
		},
		Webview: {
			screen: createStackNavigator(
				{
					SimpleWebview: {
						screen: SimpleWebview,
						navigationOptions: {
							header: null
						}
					}
				},
				{
					mode: 'card'
				}
			)
		},
		WalletManagementView: {
			screen: createStackNavigator({
				WalletManagement: {
					screen: WalletManagement,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		ObserveAccountsView: {
			screen: createStackNavigator({
				ObserveAccounts: {
					screen: ObserveAccounts,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		RevealPrivateCredentialView: {
			screen: createStackNavigator({
				RevealPrivateCredential: {
					screen: RevealPrivateCredential,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		VerifySeedPhraseView: {
			screen: createStackNavigator({
				VerifySeedPhrase: {
					screen: VerifySeedPhrase,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		ResetPasswordView: {
			screen: createStackNavigator({
				ResetPassword: {
					screen: ResetPassword,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		SecuritySettingsView: {
			screen: createStackNavigator({
				SecuritySettings: {
					screen: SecuritySettings,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		SettingsAboutView: {
			screen: createStackNavigator({
				AboutView: {
					screen: AboutView,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		DeveloperOptionsView: {
			screen: createStackNavigator({
				DeveloperOptions: {
					screen: DeveloperOptions,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		CurrencyUnitView: {
			screen: createStackNavigator({
				CurrencyUnit: {
					screen: CurrencyUnit,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		UpdateCheckView: {
			screen: createStackNavigator({
				UpdateCheck: {
					screen: UpdateCheck,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		LoginView: {
			screen: createStackNavigator({
				LoginView: {
					screen: Login,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		DrawingBoardView: {
			screen: createStackNavigator({
				DrawingBoardView: {
					screen: DrawingBoard,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		DrawingGuideView: {
			screen: createStackNavigator({
				DrawingGuideView: {
					screen: DrawingGuide,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		CheckEnvGuideView: {
			screen: createStackNavigator({
				CheckEnvGuideView: {
					screen: CheckEnvGuide,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		ManualBackupStep1View: {
			screen: createStackNavigator({
				ManualBackupStep1View: {
					screen: ManualBackupStep1,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		ManualBackupStep2View: {
			screen: createStackNavigator({
				ManualBackupStep2View: {
					screen: ManualBackupStep2,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		ImportFromSeedView: {
			screen: createStackNavigator({
				ImportFromSeedView: {
					screen: ImportFromSeed,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		ImportPrivateKeyView: {
			screen: createStackNavigator({
				ImportPrivateKeyView: {
					screen: ImportPrivateKey,
					navigationOptions: {
						header: null
					}
				}
			})
		},
		LanguageSelectorView: {
			screen: createStackNavigator({
				LanguageSelector: {
					screen: LanguageSelector,
					navigationOptions: {
						header: null
					}
				}
			})
		}
	},
	{
		mode: 'card',

		headerMode: 'none',
		lazy: true,
		transitionConfig: () => ({
			screenInterpolator: sceneProps => {
				const translate = sceneProps?.scenes?.[1]?.route?.params?.translate;
				// console.log('PPYang translate:', translate, JSON.stringify(sceneProps));
				if (translate) {
					const translateFunc = StackViewStyleInterpolator[translate];
					if (translateFunc) {
						return translateFunc(sceneProps);
					}
				}
				return StackViewStyleInterpolator.forHorizontal(sceneProps);
			}
		})
	}
);
