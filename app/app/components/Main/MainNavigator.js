import React, { useEffect, useRef } from 'react';

import { createStackNavigator, StackViewStyleInterpolator } from 'react-navigation-stack';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import { TouchableOpacity, Animated } from 'react-native';

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
import { colors } from '../../styles/common';
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
import Icon from '../UI/Icon';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';

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

const GlobeIcon = ({ focused, onPress }) => {
	const scale = useRef(new Animated.Value(focused ? 1.2 : 1)).current;
	const color = focused ? '#D20058' : '#9B989B';

	useEffect(() => {
		Animated.parallel([
			Animated.timing(scale, {
				toValue: focused ? 1.15 : 1,
				duration: 300,
				useNativeDriver: true
			})
		]).start();
	}, [focused, scale]);

	return (
		<Animated.View
			style={{
				transform: [{ scale }]
			}}
			onPress={onPress}
		>
			<Icon width="22" height="22" color={color} name="globe" />
		</Animated.View>
	);
};

const WalletIcon = ({ focused, onPress }) => {
	const scale = useRef(new Animated.Value(focused ? 1.2 : 1)).current;
	const color = focused ? '#D20058' : '#9B989B';

	useEffect(() => {
		Animated.parallel([
			Animated.timing(scale, {
				toValue: focused ? 1.15 : 1,
				duration: 300,
				useNativeDriver: true
			})
		]).start();
	}, [focused, scale]);

	return (
		<Animated.View
			style={{
				transform: [{ scale }],
				marginTop: 5
			}}
			// eslint-disable-next-line react-native/no-inline-styles

			onPress={onPress}
		>
			<Icon width="23" height="21" color={color} name="wallet" />
		</Animated.View>
	);
};

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
							tabBarLabel: () => null,
							// eslint-disable-next-line react/prop-types,react/display-name
							tabBarIcon: ({ focused, onPress }) => <WalletIcon onPress={onPress} focused={focused} />
						}
					},
					BrowserTabHome: {
						screen: createStackNavigator({
							BrowserView: {
								screen: Browser,
								navigationOptions: {
									header: null,
									gesturesEnabled: false
								}
							}
						}),
						navigationOptions: {
							tabBarLabel: () => null,
							// eslint-disable-next-line react/prop-types,react/display-name
							tabBarIcon: ({ focused, onPress }) => <GlobeIcon onPress={onPress} focused={focused} />
						}
					}
				},
				{
					defaultNavigationOptions: () => ({
						tabBarVisible: true,
						tabBarOptions: {
							style: {
								backgroundColor: colors.white,
								height: 50,
								borderTopColor: colors.$F0F0F0
							},
							tabStyle: {
								height: 50
							}
						}
					})
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
