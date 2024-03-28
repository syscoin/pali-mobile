import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import PromptView from '../PromptView';
import { strings } from '../../../../locales/i18n';
import { renderError } from '../../../util/error';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { baseStyles } from '../../../styles/common';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const styles = StyleSheet.create({
	messageWrapper: {
		marginBottom: 4
	}
});

/**
 * Component that supports eth_sign
 */
export default class MessageSign extends PureComponent {
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
		 * Personal message to be displayed to the user
		 */
		messageParams: PropTypes.object,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object
	};

	state = {
		truncateMessage: false,
		error: null
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, MessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const cleanMessageParams = await MessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signMessage(cleanMessageParams);
		await MessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = async () => {
		const { messageParams } = this.props;
		const { MessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		await MessageManager.rejectMessage(messageId);
	};

	cancelSignature = async () => {
		await this.rejectMessage();
		this.props.onCancel();
	};

	confirmSignature = async () => {
		try {
			ReactNativeHapticFeedback.trigger('notificationSuccess', options);
			await this.signMessage();
			this.props.onConfirm();
		} catch (error) {
			this.setState({ error: renderError(error) });
		}
	};

	renderMessageText = () => {
		const { messageParams } = this.props;
		const { truncateMessage } = this.state;

		return truncateMessage ? (
			<Text style={baseStyles.subTextDark} numberOfLines={5} ellipsizeMode={'tail'}>
				{messageParams.data}
			</Text>
		) : (
			<Text style={baseStyles.subTextDark} onTextLayout={this.shouldTruncateMessage}>
				{messageParams.data}
			</Text>
		);
	};

	shouldTruncateMessage = e => {
		if (e.nativeEvent.lines.length > 5) {
			this.setState({ truncateMessage: true });
			return;
		}
		this.setState({ truncateMessage: false });
	};

	render() {
		const { currentPageInformation } = this.props;
		return (
			<SignatureRequest
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				currentPageInformation={currentPageInformation}
				messageParams={this.props.messageParams}
				type="ethSign"
			>
				<View style={styles.messageWrapper}>{this.renderMessageText()}</View>
				<PromptView
					isVisible={this.state.error != null}
					title={strings('transactions.transaction_error')}
					message={this.state.error}
					onRequestClose={() => {
						this.setState({ error: null });
					}}
				/>
			</SignatureRequest>
		);
	}
}
