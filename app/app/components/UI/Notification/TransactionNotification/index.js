import React, { useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import { baseStyles, colors } from '../../../../styles/common';
import BaseNotification from './../BaseNotification';
import Device from '../../../../util/Device';
import ElevatedView from 'react-native-elevated-view';

const styles = StyleSheet.create({
	modalTypeView: {
		position: 'absolute',
		bottom: 0,
		paddingBottom: Device.isIphoneX() ? 20 : 10,
		left: 0,
		right: 0,
		backgroundColor: colors.transparent,
		...baseStyles.shadow
	},
	modalTypeViewBrowser: {
		bottom: Device.isIphoneX() ? 70 : 60
	},
	notificationContainer: {
		flex: 0.1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	}
});

function TransactionNotification(props) {
	const { currentNotification, isInBrowserView, notificationAnimated, onClose } = props;

	const onCloseNotification = useCallback(() => {
		setTimeout(() => onClose(), 1000);
	}, [onClose]);

	useEffect(() => onCloseNotification(), [onCloseNotification]);

	return (
		<ElevatedView style={[styles.modalTypeView, isInBrowserView && styles.modalTypeViewBrowser]} elevation={100}>
			<Animated.View
				style={[styles.notificationContainer, { transform: [{ translateY: notificationAnimated }] }]}
			>
				<BaseNotification
					status={currentNotification.status}
					data={{
						...currentNotification.transaction
					}}
					onHide={onCloseNotification}
				/>
			</Animated.View>
		</ElevatedView>
	);
}

TransactionNotification.propTypes = {
	isInBrowserView: PropTypes.bool,
	notificationAnimated: PropTypes.object,
	onClose: PropTypes.func,
	currentNotification: PropTypes.object
};

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(TransactionNotification);
