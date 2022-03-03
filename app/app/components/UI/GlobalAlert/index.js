import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import { StyleSheet, View, Text, Image } from 'react-native';
import { dismissAlert } from '../../../actions/alert';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import ElevatedView from 'react-native-elevated-view';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		width: '100%'
	},
	copyAlert: {
		width: 166,
		backgroundColor: colors.darkAlert,
		paddingBottom: 14,
		paddingTop: 6,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 8
	},
	copyAlertText: {
		textAlign: 'center',
		color: colors.white,
		fontSize: 14,
		...fontStyles.normal
	}
});

/**
 * Wrapper component for a global alert
 * connected to redux
 */
class GlobalAlert extends PureComponent {
	static propTypes = {
		/**
		 * Boolean that determines if the modal should be shown
		 */
		isVisible: PropTypes.bool.isRequired,
		/**
		 * Number that determines when it should be autodismissed (in miliseconds)
		 */
		autodismiss: PropTypes.number,
		/**
		 * Children component(s)
		 */
		content: PropTypes.any,
		/**
		 * Object with data required to render the content
		 */
		data: PropTypes.object,
		/**
		 * function that dismisses de modal
		 */
		dismissAlert: PropTypes.func,
		flag: PropTypes.string,
		currentFlag: PropTypes.string,
		isLockScreen: PropTypes.bool
	};

	onClose = () => {
		this.props.dismissAlert();
	};

	componentDidUpdate(prevProps) {
		if (this.props.autodismiss && !isNaN(this.props.autodismiss) && !prevProps.isVisible && this.props.isVisible) {
			setTimeout(() => {
				this.props.dismissAlert();
			}, this.props.autodismiss);
		}
	}

	getComponent(content) {
		switch (content) {
			case 'clipboard-alert':
				return this.renderClipboardAlert();
			default:
				return <View />;
		}
	}

	renderClipboardAlert = () => (
		<ElevatedView style={styles.copyAlert} elevation={0}>
			<Image source={require('../../../images/ic_copied.png')} />
			<Text style={styles.copyAlertText}>{this.props.data && this.props.data.msg}</Text>
		</ElevatedView>
	);

	render = () => {
		const { content, isVisible, flag, currentFlag, isLockScreen } = this.props;
		let visible = false;
		if (isVisible && flag === currentFlag) {
			visible = true;
		}

		return (
			<Modal
				style={styles.modal}
				isVisible={visible && !isLockScreen}
				onBackdropPress={this.onClose}
				onBackButtonPress={this.onClose}
				backdropOpacity={0}
				animationIn={'fadeIn'}
				animationOut={'fadeOut'}
				useNativeDriver
			>
				{this.getComponent(content)}
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	isVisible: state.alert.isVisible,
	autodismiss: state.alert.autodismiss,
	content: state.alert.content,
	data: state.alert.data,
	flag: state.alert.flag,
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	dismissAlert: () => dispatch(dismissAlert())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(GlobalAlert);
