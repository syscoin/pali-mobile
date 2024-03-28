import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, baseStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ThemeContext } from '../../../theme/ThemeProvider';

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
	static contextType = ThemeContext;

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
		const { isDarkMode } = this.context;
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
				<View style={[styles.errorModal, isDarkMode && baseStyles.darkModalBackground]}>
					<Text style={[styles.errorText, isDarkMode && baseStyles.textDark]} numberOfLines={10}>
						{message}
					</Text>
					<View style={[styles.divider, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
					<TouchableOpacity style={[styles.okButton, isDarkMode && { color: colors.$4CA1CF }]} onPress={onOk}>
						<Text style={[styles.buttonText, isDarkMode && baseStyles.darkConfirmText]}>
							{okText || strings('navigation.ok')}
						</Text>
					</TouchableOpacity>
					<View style={[styles.divider, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
					<TouchableOpacity
						style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
						onPress={onCancel}
					>
						<Text style={[styles.buttonText, isDarkMode && baseStyles.textDark]}>
							{cancelText || strings('navigation.back')}
						</Text>
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
