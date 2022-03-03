import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import MStatusBar from '../../UI/MStatusBar';
import { util } from 'gopocket-core';
import Device from '../../../util/Device';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { SafeAreaView } from 'react-navigation';

const styles = StyleSheet.create({
	backIcon: {
		color: colors.black
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
		justifyContent: 'space-between'
	}
});

export default class SimpleWebview extends PureComponent {
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
		const uri = navigation.getParam('url', null);
		const title = navigation.getParam('title', '');
		const share = navigation.getParam('dispatch', () => {
			'';
		});

		let height = 56;
		let paddingTop = 0;
		height = Device.isAndroid() && StatusBar.currentHeight ? height + StatusBar.currentHeight : height;
		paddingTop = Device.isAndroid() && StatusBar.currentHeight ? StatusBar.currentHeight : 0;

		if (uri) {
			return (
				<SafeAreaView style={baseStyles.flexGrow}>
					<MStatusBar navigation={this.props.navigation} fixPadding={false} />
					<View style={[styles.titleLayout, { height, paddingTop }]}>
						{Device.isAndroid() ? (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
								<Image source={require('../../../images/back.png')} />
							</TouchableOpacity>
						) : (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => navigation.pop()} style={styles.backButton}>
								<Image source={require('../../../images/defi_close.png')} />
							</TouchableOpacity>
						)}
						<Text style={styles.centeredTitle}>{title}</Text>
						{Device.isAndroid() ? (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => share()} style={styles.backButton}>
								<Image source={require('../../../images/share.png')} />
							</TouchableOpacity>
						) : (
							// eslint-disable-next-line react/jsx-no-bind
							<TouchableOpacity onPress={() => share()} style={styles.backButton}>
								<EvilIcons
									name="share-apple"
									size={32}
									style={[styles.backIcon, styles.shareIconIOS]}
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
