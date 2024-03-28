import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	errorModal: {
		backgroundColor: colors.white,
		borderRadius: 10,
		width: 330,
		alignSelf: 'center',
		paddingHorizontal: 26,
		paddingTop: 27
	},
	errorTitle: {
		color: colors.$202020,
		...fontStyles.bold,
		fontSize: 18,
		textAlign: 'center'
	},
	errorText: {
		color: colors.$202020,
		...fontStyles.bold,
		fontSize: 11,
		marginTop: 9,
		textAlign: 'center'
	},
	errorButton: {
		backgroundColor: colors.brandPink300,
		height: 44,
		borderRadius: 10,
		marginTop: 22,
		marginBottom: 30,
		justifyContent: 'center',
		alignItems: 'center'
	},
	errorButtonText: {
		color: colors.white,
		fontSize: 16,
		...fontStyles.bold
	}
});

class PromptView extends PureComponent {
	static contextType = ThemeContext;

	static propTypes = {
		isVisible: PropTypes.bool,

		title: PropTypes.string,

		message: PropTypes.string,

		onRequestClose: PropTypes.func,

		buttonText: PropTypes.string,

		isLockScreen: PropTypes.bool
	};

	render() {
		const { isDarkMode } = this.context;
		const { isVisible, title, message, onRequestClose, buttonText, isLockScreen } = this.props;
		return (
			<Modal
				isVisible={isVisible && !isLockScreen}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={() => {
					onRequestClose();
				}}
				onBackButtonPress={() => {
					onRequestClose();
				}}
				swipeDirection={'down'}
			>
				<View style={[styles.errorModal, isDarkMode && baseStyles.darkModalBackground]}>
					{title && <Text style={[styles.errorTitle, isDarkMode && baseStyles.textDark]}>{title}</Text>}
					<Text style={[styles.errorText, isDarkMode && baseStyles.subTextDark]} numberOfLines={10}>
						{message}
					</Text>
					<TouchableOpacity
						style={styles.errorButton}
						onPress={() => {
							onRequestClose();
						}}
					>
						<Text style={styles.errorButtonText}>{buttonText || strings('navigation.ok')}</Text>
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
)(PromptView);
