import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Share from 'react-native-share';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import MStatusBar from '../../UI/MStatusBar';
import { util } from 'paliwallet-core';
import Device from '../../../util/Device';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	backIcon: {
		color: colors.black,
		marginTop: 4
	},
	shareIconIOS: {
		marginHorizontal: -5
	},
	centeredTitle: {
		fontSize: 20,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal,
		alignItems: 'center',
		flex: 1
	},
	backButton: {
		paddingLeft: Device.isAndroid() ? 22 : 18,
		paddingRight: Device.isAndroid() ? 22 : 18,
		marginTop: 5
	},
	titleLayout: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		height: 56
	}
});

export default class SimpleWebview extends PureComponent {
	static contextType = ThemeContext;

	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ dispatch: this.share });
	};

	share = () => {
		const { navigation } = this.props;
		const url = navigation && navigation.getParam('url', null);
		if (url) {
			Share.open({
				url
			}).catch(err => {
				util.logError('Error while trying to share simple web view', err);
			});
		}
	};

	render() {
		const { navigation } = this.props;
		const { isDarkMode } = this.context;
		const uri = navigation.getParam('url', null);
		const title = navigation.getParam('title', '');
		const share = navigation.getParam('dispatch', () => {
			'';
		});

		if (uri) {
			return (
				<SafeAreaView style={[baseStyles.flexGrow, isDarkMode && baseStyles.darkCardBackground]}>
					<MStatusBar navigation={this.props.navigation} fixPadding={false} />
					<View style={styles.titleLayout}>
						{Device.isAndroid() ? (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
								<EvilIcons
									name="close"
									size={24}
									style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
								/>
							</TouchableOpacity>
						) : (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
								<EvilIcons
									name="close"
									size={24}
									style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
								/>
							</TouchableOpacity>
						)}
						<Text style={[styles.centeredTitle, isDarkMode && baseStyles.textDark]}>{title}</Text>
						{Device.isAndroid() ? (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => share()} style={styles.backButton}>
								<EvilIcons
									name="share-apple"
									size={32}
									style={[styles.backIcon, isDarkMode && baseStyles.textDark]}
								/>
							</TouchableOpacity>
						) : (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => share()} style={styles.backButton}>
								<EvilIcons
									name="share-apple"
									size={32}
									style={[styles.backIcon, styles.shareIconIOS, isDarkMode && baseStyles.textDark]}
								/>
							</TouchableOpacity>
						)}
					</View>
					<WebView source={{ uri }} />
				</SafeAreaView>
			);
		}
	}
}
