/* eslint-disable import/no-commonjs */
import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../styles/common';

const styles = {
	fixCenterIcon: {
		marginBottom: -3
	},
	image: {
		height: 24,
		width: 24
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
};

const iosFaceId = require('../../../images/FaceID.png');
const iosTouchId = require('../../../images/TouchID.png');
const biometrics = require('../../../images/biometrics.png');

const renderIcon = type => {
	if (Platform.OS === 'ios') {
		if (type === 'TouchID') return <ImageRN source={iosTouchId} />;
		if (type === 'FaceID') return <ImageRN source={iosFaceId} />;
	}

	if (Platform.OS === 'android') {
		return <ImageRN source={biometrics} />;
	}

	return <Ionicons color={colors.black} style={styles.fixCenterIcon} size={16} name="ios-finger-print" />;
};

const BiometryButton = ({ onPress, hidden, type, style }) => {
	if (hidden) return null;

	return (
		<TouchableOpacity style={style} hitSlop={styles.hitSlop} onPress={onPress}>
			{renderIcon(type)}
		</TouchableOpacity>
	);
};

BiometryButton.propTypes = {
	/**
	 * Callback for when the button is pressed
	 */
	onPress: PropTypes.func,
	/**
	 * If this button should not appear
	 */
	hidden: PropTypes.bool,
	/**
	 * Type of biometry icon
	 */
	type: PropTypes.string,

	style: PropTypes.object
};

export default BiometryButton;
