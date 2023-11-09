import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import Icon from '../Icon';

const styles = StyleSheet.create({
	root: {
		marginHorizontal: 20,
		borderBottomColor: colors.$F0F0F0,
		borderBottomWidth: 1,
		flexDirection: 'row',
		height: 59,
		alignItems: 'center'
	},
	themeIcon: {
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 50
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
	},
	themeContainer: {
		flexDirection: 'row'
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

const SettingsDrawer = ({ image, title, iconStyle, onPress, titleStyle, hideLine, baseStyle, isTheme }) => (
	<TouchableOpacity onPress={onPress}>
		<View style={[styles.root, baseStyle, hideLine && styles.hideLineStyle]}>
			{image && <Image style={[styles.image, iconStyle]} source={image} />}
			<View style={styles.content}>
				<Text style={[styles.title, titleStyle]}>{title}</Text>
			</View>
			{isTheme ? (
				<View style={styles.themeContainer}>
					<View style={[styles.themeIcon, { backgroundColor: isTheme === 'dark' ? 'blue' : 'transparent' }]}>
						<Icon
							name={'moon'}
							color={isTheme === 'dark' ? colors.white : colors.black}
							width="19"
							height="19"
						/>
					</View>
					<View
						style={[styles.themeIcon, { backgroundColor: isTheme === 'light' ? 'orange' : 'transparent' }]}
					>
						<Icon
							name={'sun'}
							color={isTheme === 'dark' ? colors.white : colors.black}
							width="19"
							height="19"
						/>
					</View>
				</View>
			) : (
				<View style={styles.action}>
					<Image source={require('../../../images/angle_right.png')} />
				</View>
			)}
		</View>
	</TouchableOpacity>
);

SettingsDrawer.propTypes = propTypes;
SettingsDrawer.defaultProps = defaultProps;

export default SettingsDrawer;
