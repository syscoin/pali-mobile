import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';
import LottieView from 'lottie-react-native';

const styles = StyleSheet.create({
	defaultFlashFloating: {
		backgroundColor: colors.$ECE4FF,
		padding: 16,
		marginHorizontal: 16,
		flexDirection: 'row',
		borderRadius: 8
	},
	flashLabel: {
		flex: 1,
		flexDirection: 'column'
	},
	flashText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 18,
		color: colors.$8F92A1
	},
	flashTitle: {
		flex: 1,
		fontSize: 14,
		marginBottom: 2,
		lineHeight: 18,
		color: colors.$030319,
		...fontStyles.bold
	},
	flashIcon: {
		marginRight: 15,
		alignItems: 'center',
		justifyContent: 'center'
	},
	closeTouchable: {
		flex: 0.1,
		flexDirection: 'column',
		alignItems: 'flex-end'
	},
	closeIcon: {
		flex: 1,
		color: colors.white,
		alignItems: 'flex-start',
		marginTop: -8
	},
	animation: {
		width: 30,
		height: 30,
		alignSelf: 'center'
	}
});

const getIcon = status => {
	switch (status) {
		case 'pending':
		case 'pending_withdrawal':
		case 'pending_deposit':
		case 'speedup':
			return (
				<LottieView
					style={styles.animation}
					autoPlay
					loop
					source={require('../../../../animations/loading.json')}
				/>
			);
		case 'success_deposit':
		case 'success_withdrawal':
		case 'success':
		case 'received':
		case 'received_payment':
			return (
				<LottieView
					style={styles.animation}
					autoPlay
					loop={false}
					source={require('../../../../animations/success.json')}
				/>
			);
		case 'cancelled':
		case 'error':
			return <MaterialIcon color={colors.red} size={36} name="alert-circle-outline" style={styles.checkIcon} />;
		case 'simple_notification_rejected':
			return <AntIcon color={colors.red} size={36} name="closecircleo" style={styles.checkIcon} />;
		case 'simple_notification':
			return <AntIcon color={colors.green500} size={36} name="checkcircleo" style={styles.checkIcon} />;
	}
};

const getTitle = (status, { nonce, amount, symbol }) => {
	switch (status) {
		case 'pending':
			return strings('notifications.pending_title');
		case 'pending_deposit':
			return strings('notifications.pending_deposit_title');
		case 'pending_withdrawal':
			return strings('notifications.pending_withdrawal_title');
		case 'success':
			return strings('notifications.success_title', { nonce: parseInt(nonce) });
		case 'success_deposit':
			return strings('notifications.success_deposit_title');
		case 'success_withdrawal':
			return strings('notifications.success_withdrawal_title');
		case 'received':
			return strings('notifications.received_title', {
				amount,
				assetType: symbol
			});
		case 'speedup':
			return strings('notifications.speedup_title', { nonce: parseInt(nonce) });
		case 'received_payment':
			return strings('notifications.received_payment_title');
		case 'cancelled':
			return strings('notifications.cancelled_title');
		case 'error':
			return strings('notifications.error_title');
	}
};

const getDescription = status => {
	switch (status) {
		case 'pending':
			return strings('notifications.pending_message');
		case 'pending_deposit':
			return strings('notifications.pending_deposit_message');
		case 'pending_withdrawal':
			return strings('notifications.pending_withdrawal_message');
		case 'speedup':
			return strings('notifications.speedup_message');
		case 'success_deposit':
			return strings('notifications.success_deposit_message');
		case 'success_withdrawal':
			return strings('notifications.success_withdrawal_message');
	}
	return null;
};

/**
 * BaseNotification component used to render in-app notifications
 */
const BaseNotification = ({
	status,
	data = null,
	data: { description = null, title = null },
	onPress,
	onHide,
	autoDismiss
}) => (
	<View style={baseStyles.flexGrow}>
		<TouchableOpacity
			style={styles.defaultFlashFloating}
			testID={'press-notification-button'}
			onPress={onPress}
			activeOpacity={0.8}
			disabled={!onPress}
		>
			<View style={styles.flashIcon}>{getIcon(status)}</View>
			<View style={styles.flashLabel}>
				<Text style={styles.flashTitle} testID={'notification-title'}>
					{!title ? getTitle(status, data) : title}
				</Text>
				<Text style={styles.flashText}>{!description ? getDescription(status) : description}</Text>
			</View>
			<View>
				{autoDismiss && (
					<TouchableOpacity style={styles.closeTouchable} onPress={onHide}>
						<IonicIcon name="ios-close" size={36} style={styles.closeIcon} />
					</TouchableOpacity>
				)}
			</View>
		</TouchableOpacity>
	</View>
);

BaseNotification.propTypes = {
	status: PropTypes.string,
	data: PropTypes.object,
	onPress: PropTypes.func,
	onHide: PropTypes.func,
	autoDismiss: PropTypes.bool
};

BaseNotification.defaultProps = {
	autoDismiss: false
};

export default BaseNotification;
