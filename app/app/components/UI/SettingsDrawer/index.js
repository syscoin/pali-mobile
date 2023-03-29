import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	root: {
		marginHorizontal: 20,
		borderBottomColor: colors.$F0F0F0,
		borderBottomWidth: 1,
		flexDirection: 'row',
		height: 59,
		alignItems: 'center'
	},
	content: {
		flex: 1
	},
	image: {
		marginRight: 14
	},
	title: {
		color: colors.$030319,
		fontSize: 14
	},
	action: {
		flex: 0
	},
	hideLineStyle: {
		borderBottomWidth: 0
	}
});

const propTypes = {
	title: PropTypes.string,
	/**
	 * Handler called when this drawer is pressed
	 */
	onPress: PropTypes.func,
	/**
	 * Display SettingsNotification
	 */
	image: PropTypes.number,
	titleStyle: PropTypes.object,
	hideLine: PropTypes.bool,
	baseStyle: PropTypes.any
};

const defaultProps = {
	onPress: undefined,
	titleStyle: undefined
};

const SettingsDrawer = ({ image, title, iconStyle, onPress, titleStyle, hideLine, baseStyle }) => (
	<TouchableOpacity onPress={onPress}>
		<View style={[styles.root, baseStyle, hideLine && styles.hideLineStyle]}>
			{image && <Image style={[styles.image, iconStyle]} source={image} />}
			<View style={styles.content}>
				<Text style={[styles.title, titleStyle]}>{title}</Text>
			</View>
			<View style={styles.action}>
				<Image source={require('../../../images/angle_right.png')} />
			</View>
		</View>
	</TouchableOpacity>
);

SettingsDrawer.propTypes = propTypes;
SettingsDrawer.defaultProps = defaultProps;

export default SettingsDrawer;
