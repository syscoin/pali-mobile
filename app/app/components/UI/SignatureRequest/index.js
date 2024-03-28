import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import AccountInfoCard from '../AccountInfoCard';
import TransactionHeader from '../TransactionHeader';
import Device from '../../../util/Device';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		paddingTop: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	messageColumn: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'flex-start'
	},
	stub: {
		flexGrow: 1
	},
	view2: {
		width: '50%'
	},
	signText: {
		...fontStyles.bold,
		fontSize: 20,
		paddingTop: 20,
		color: colors.$030319,
		textAlign: 'center'
	},
	messageLabelText: {
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 4,
		color: colors.black
	},
	actionViewChild: {
		marginTop: 26,
		paddingHorizontal: 40
	},
	accountInfoCardWrapper: {
		marginBottom: 12,
		width: '100%'
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		marginTop: 60,
		marginBottom: 40,
		marginHorizontal: 40
	},
	cancel: {
		flex: 1,
		marginRight: 8,
		height: 42
	},
	cancelText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	confirm: {
		flex: 1,
		marginLeft: 8,
		height: 42
	},
	confirmText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center',
		color: colors.brandPink300
	}
});

/**
 * PureComponent that renders scrollable content inside signature request user interface
 */
class SignatureRequest extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * Callback triggered when this message signature is rejected
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this message signature is approved
		 */
		onConfirm: PropTypes.func,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * String representing signature type
		 */
		type: PropTypes.string,
		/**
		 * Content to display above the action buttons
		 */
		children: PropTypes.node
	};

	/**
	 * Calls trackCancelSignature and onCancel callback
	 */
	onCancel = () => {
		this.props.onCancel();
	};

	/**
	 * Calls trackConfirmSignature and onConfirm callback
	 */
	onConfirm = () => {
		this.props.onConfirm();
	};

	renderActionViewChildren = () => {
		const { children } = this.props;
		const { isDarkMode } = this.context;
		return (
			<View style={styles.actionViewChild}>
				<View style={styles.accountInfoCardWrapper}>
					<AccountInfoCard operation="signing" />
				</View>
				<View style={styles.messageColumn}>
					<Text style={[styles.messageLabelText, isDarkMode && baseStyles.textDark]}>
						{strings('signature_request.message')}
					</Text>
					<View style={styles.stub} />
					<View style={styles.view2}>{children}</View>
				</View>
			</View>
		);
	};

	render() {
		const { currentPageInformation, type } = this.props;
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.root, isDarkMode && baseStyles.darkModalBackground]}>
				<View>
					<Text style={[styles.signText, isDarkMode && baseStyles.textDark]}>
						{strings('signature_request.signing')}
					</Text>
					<TransactionHeader currentPageInformation={currentPageInformation} type={type} />
					{this.renderActionViewChildren()}
				</View>

				<View style={styles.actionContainer}>
					<TouchableOpacity
						style={[styles.cancel, isDarkMode && baseStyles.darkCancelButton]}
						onPress={this.onCancel}
					>
						<Text style={[styles.cancelText, isDarkMode && baseStyles.textDark]}>
							{strings('transaction.reject')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.confirm]} onPress={this.onConfirm}>
						<Text style={[styles.confirmText]}>{strings('transaction.confirm')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}

export default SignatureRequest;
