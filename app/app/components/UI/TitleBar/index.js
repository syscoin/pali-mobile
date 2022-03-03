import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import { colors, fontStyles } from '../../../styles/common';
import React from 'react';

const styles = StyleSheet.create({
	titleBar: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white
	},
	title: {
		fontSize: 18,
		color: colors.$202020,
		alignSelf: 'center',
		...fontStyles.semibold
	},
	back: {
		position: 'absolute',
		left: 0,
		top: 0,
		paddingHorizontal: 20,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center'
	},
	rightView: {
		position: 'absolute',
		right: 20,
		top: 0,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

const propTypes = {
	title: PropTypes.string,
	onBack: PropTypes.func,
	fullScreenOnAndroid: PropTypes.bool,
	rightView: PropTypes.object,
	titleStyle: PropTypes.object,
	baseStyle: PropTypes.any
};

const defaultProps = {
	onBack: null,
	fullScreenOnAndroid: false
};

const TitleBar = ({ title, onBack, fullScreenOnAndroid, rightView, titleStyle, baseStyle }) => {
	let height = 44;
	let paddingTop = 0;
	if (fullScreenOnAndroid) {
		height = Device.isAndroid() && StatusBar.currentHeight ? height + StatusBar.currentHeight : height;
		paddingTop = Device.isAndroid() && StatusBar.currentHeight ? StatusBar.currentHeight : 0;
	}

	return (
		<View style={[styles.titleBar, baseStyle, { height, paddingTop }]}>
			{onBack && (
				<TouchableOpacity style={[styles.back, { top: paddingTop }]} onPress={onBack}>
					<Image source={require('../../../images/back.png')} />
				</TouchableOpacity>
			)}
			<Text style={[styles.title, titleStyle]}>{title}</Text>
			{rightView && <View style={[styles.rightView, { top: paddingTop }]}>{rightView}</View>}
		</View>
	);
};

TitleBar.propTypes = propTypes;
TitleBar.defaultProps = defaultProps;

export default TitleBar;
