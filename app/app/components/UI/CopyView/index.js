import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	modal: {
		backgroundColor: colors.white,
		borderRadius: 10,
		width: 330,
		alignSelf: 'center',
		paddingHorizontal: 26,
		paddingTop: 27
	},
	title: {
		color: colors.$202020,
		...fontStyles.bold,
		fontSize: 16,
		textAlign: 'center'
	},
	cancelButton: {
		backgroundColor: colors.transparent,
		height: 22,
		justifyContent: 'center',
		alignItems: 'center'
	},
	cancelButtonText: {
		color: colors.$202020,
		fontSize: 16,
		...fontStyles.bold
	},
	okButton: {
		backgroundColor: colors.transparent,
		height: 22,
		justifyContent: 'center',
		alignItems: 'center'
	},
	okButtonText: {
		color: colors.brandPink300,
		fontSize: 16,
		...fontStyles.bold
	},
	buttonWrapper: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 38,
		marginTop: 40,
		marginBottom: 30
	}
});

class CopyView extends PureComponent {
	static contextType = ThemeContext;

	static propTypes = {
		isVisible: PropTypes.bool,

		title: PropTypes.string,

		onCancel: PropTypes.func,

		onOK: PropTypes.func,

		isLockScreen: PropTypes.bool
	};

	render() {
		const { isVisible, title, onCancel, onOK, isLockScreen } = this.props;
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={isVisible && !isLockScreen}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={() => {
					onCancel();
				}}
				onBackButtonPress={() => {
					onCancel();
				}}
				swipeDirection={'down'}
			>
				<View style={styles.modal}>
					{title && <Text style={styles.title}>{title}</Text>}
					<View style={styles.buttonWrapper}>
						<TouchableOpacity
							style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
							onPress={() => {
								onCancel();
							}}
						>
							<Text style={[styles.cancelButtonText, isDarkMode && baseStyles.textDark]}>
								{strings('other.cancel')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.okButton, isDarkMode && baseStyles.darkConfirmButton]}
							onPress={() => {
								onOK();
							}}
						>
							<Text style={[styles.okButtonText, isDarkMode && baseStyles.darkConfirmText]}>
								{strings('other.copy')}
							</Text>
						</TouchableOpacity>
					</View>
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
)(CopyView);
