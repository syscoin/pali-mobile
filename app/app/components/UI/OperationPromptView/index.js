import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	errorModal: {
		backgroundColor: colors.white,
		borderRadius: 8,
		width: 330,
		alignSelf: 'center',
		paddingTop: 30
	},
	errorText: {
		color: colors.$030319,
		fontSize: 16,
		lineHeight: 24,
		marginHorizontal: 26,
		marginBottom: 30
	},
	divider: {
		width: '100%',
		height: 1,
		backgroundColor: colors.$F0F0F0
	},
	okButton: {
		height: 49,
		justifyContent: 'center',
		alignItems: 'center'
	},
	cancelButton: {
		height: 50,
		justifyContent: 'center',
		alignItems: 'center'
	},
	buttonText: {
		fontSize: 16,
		color: colors.$030319,
		lineHeight: 19
	}
});

class OperationPromptView extends PureComponent {
	static propTypes = {
		isVisible: PropTypes.bool,

		message: PropTypes.string,

		onCancel: PropTypes.func,
		onOk: PropTypes.func,
		okText: PropTypes.string,
		cancelText: PropTypes.string,
		isLockScreen: PropTypes.bool
	};

	render() {
		const { isVisible, message, onCancel, onOk, okText, cancelText, isLockScreen } = this.props;
		return (
			<Modal
				isVisible={isVisible && !isLockScreen}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onBackButtonPress={() => {
					onCancel();
				}}
			>
				<View style={styles.errorModal}>
					<Text style={styles.errorText} numberOfLines={10}>
						{message}
					</Text>
					<View style={styles.divider} />
					<TouchableOpacity style={styles.okButton} onPress={onOk}>
						<Text style={styles.buttonText}>{okText || strings('navigation.ok')}</Text>
					</TouchableOpacity>
					<View style={styles.divider} />
					<TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
						<Text style={styles.buttonText}>{cancelText || strings('navigation.back')}</Text>
					</TouchableOpacity>
				</View>
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
)(OperationPromptView);
