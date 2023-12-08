/* eslint-disable import/no-commonjs */
import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../styles/common';
import Icon from '../Icon';

const styles = {
	fixCenterIcon: {
		marginBottom: -3
	},
	image: {
		height: 20,
		width: 20
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	}
};

const renderIcon = type => {
	if (Platform.OS === 'ios') {
		if (type === 'TouchID') return <Ionicons color={colors.paliGrey200} size={20} name="ios-finger-print" />;
		if (type === 'FaceID') return <Icon color={colors.paliGrey200} name="faceId" style={styles.image} />;
	}

	if (Platform.OS === 'android') {
		return <Ionicons color={colors.paliGrey200} size={20} name="ios-finger-print" />;
	}

	return <Ionicons color={colors.paliGrey200} size={20} name="ios-finger-print" />;
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
