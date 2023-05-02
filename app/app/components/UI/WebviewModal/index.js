import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import WebView from 'react-native-webview';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	flexOne: {
		flex: 1
	},
	titleBar: {
		width: '100%',
		height: 56,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white
	},
	gobackBtn: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: 56,
		height: 56,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

class WebViewModal extends PureComponent {
	static propTypes = {
		isVisible: PropTypes.bool,
		url: PropTypes.string,
		onDismiss: PropTypes.func,
		isLockScreen: PropTypes.bool
	};

	render() {
		const { isVisible, url, onDismiss, isLockScreen } = this.props;
		return (
			<Modal
				isVisible={isVisible && !isLockScreen}
				style={styles.bottomModal}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={onDismiss}
				onBackButtonPress={onDismiss}
			>
				<SafeAreaView style={styles.flexOne}>
					<View style={styles.titleBar}>
						<TouchableOpacity style={styles.gobackBtn} onPress={onDismiss}>
							<Image source={require('../../../images/back.png')} />
						</TouchableOpacity>
					</View>
					<WebView javaScriptEnabled setSupportMultipleWindows={false} source={{ uri: url }} />
				</SafeAreaView>
			</Modal>
		);
	}
}

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(WebViewModal);
