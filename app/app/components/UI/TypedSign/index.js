import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import PromptView from '../PromptView';
import { strings } from '../../../../locales/i18n';
import { renderError } from '../../../util/error';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const styles = StyleSheet.create({
	messageText: {
		color: colors.black,
		...fontStyles.normal
	},
	message: {
		marginLeft: 0
	},
	messageWrapper: {
		minHeight: '20%',
		maxHeight: '50%'
	},
	msgKey: {
		...fontStyles.bold
	}
});

/**
 * Component that supports eth_signTypedData and eth_signTypedData_v3
 */
export default class TypedSign extends PureComponent {
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
		 * Typed message to be displayed to the user
		 */
		messageParams: PropTypes.object,
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object
	};

	state = {
		error: null
	};

	signMessage = async () => {
		const { messageParams } = this.props;
		const { KeyringController, TypedMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		const version = messageParams.version;
		const cleanMessageParams = await TypedMessageManager.approveMessage(messageParams);
		const rawSig = await KeyringController.signTypedMessage(cleanMessageParams, version);
		await TypedMessageManager.setMessageStatusSigned(messageId, rawSig);
	};

	rejectMessage = async () => {
		const { messageParams } = this.props;
		const { TypedMessageManager } = Engine.context;
		const messageId = messageParams.metamaskId;
		await TypedMessageManager.rejectMessage(messageId);
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

	renderTypedMessageV3 = obj =>
		Object.keys(obj).map(key => (
			<View style={styles.message} key={key}>
				{obj[key] && typeof obj[key] === 'object' ? (
					<View>
						<Text style={[styles.messageText, styles.msgKey, baseStyles.subTextDark]}>{key}:</Text>
						<View>{this.renderTypedMessageV3(obj[key])}</View>
					</View>
				) : (
					<Text style={[styles.messageText, baseStyles.subTextDark]}>
						<Text style={[styles.msgKey, baseStyles.subTextDark]}>{key}:</Text>
						{obj[key].length > 20
							? obj[key].substring(0, 5) + '...' + obj[key].substring(obj[key].length - 5)
							: obj[key]}
					</Text>
				)}
			</View>
		));

	renderTypedMessage = () => {
		const { messageParams } = this.props;
		if (messageParams.version === 'V1') {
			return (
				<View style={styles.message}>
					{messageParams.data.map((obj, i) => (
						<View key={`${obj.name}_${i}`}>
							<Text style={[styles.messageText, styles.msgKey, baseStyles.subTextDark]}>{obj.name}:</Text>
							<Text style={[styles.messageText, baseStyles.subTextDark]} key={obj.name}>
								{` ${obj.value}`}
							</Text>
						</View>
					))}
				</View>
			);
		}
		if (messageParams.version === 'V3' || messageParams.version === 'V4') {
			const { message } = JSON.parse(messageParams.data);
			return this.renderTypedMessageV3(message);
		}
	};

	render() {
		const { currentPageInformation } = this.props;
		return (
			<SignatureRequest
				onCancel={this.cancelSignature}
				onConfirm={this.confirmSignature}
				currentPageInformation={currentPageInformation}
				messageParams={this.props.messageParams}
				type="typedSign"
			>
				<View style={styles.messageWrapper}>{this.renderTypedMessage()}</View>
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
