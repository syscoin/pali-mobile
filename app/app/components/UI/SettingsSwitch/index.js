import React from 'react';
import { Text, View, StyleSheet, Image, Switch } from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, colors } from '../../../styles/common';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	root: {
		minHeight: 75,
		paddingHorizontal: 24
	},
	content: {
		flexDirection: 'row',
		marginTop: 11
	},
	image: {
		marginRight: 38,
		alignSelf: 'center'
	},
	title: {
		color: colors.$030319,
		fontSize: 16,
		alignSelf: 'center'
	},
	message: {
		color: colors.$8F92A1,
		fontSize: 12,
		lineHeight: 14,
		marginTop: 8,
		marginBottom: 11
	},
	switch: {
		width: 50,
		height: 30,
		transform: Device.isIos() ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : []
	}
});

const propTypes = {
	title: PropTypes.string,
	message: PropTypes.string,
	value: PropTypes.bool,
	onValueChange: PropTypes.func,
	image: PropTypes.number
};

const defaultProps = {
	onValueChange: undefined
};

const SettingsSwitch = ({ image, title, message, value, onValueChange, isDarkMode }) => (
	<View style={styles.root}>
		<View style={styles.content}>
			{image && <Image style={styles.image} source={image} />}
			<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>{title}</Text>
			<View style={baseStyles.flexGrow} />
			<View>
				<Switch
					onValueChange={onValueChange}
					value={value}
					style={styles.switch}
					trackColor={{ true: colors.$4CD964, false: colors.grey300 }}
					thumbColor={colors.white}
					ios_backgroundColor={colors.white}
				/>
			</View>
		</View>
		<Text style={styles.message}>{message}</Text>
	</View>
);

SettingsSwitch.propTypes = propTypes;
SettingsSwitch.defaultProps = defaultProps;

export default SettingsSwitch;
