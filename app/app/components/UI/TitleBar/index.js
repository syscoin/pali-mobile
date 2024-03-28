import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import Icon from '../Icon';
import React from 'react';
import { useTheme } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	titleBar: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'transparent'
	},
	title: {
		fontSize: 18,
		color: colors.$202020,
		alignSelf: 'center',
		textTransform: 'uppercase',
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

const TitleBar = ({ title, onBack, fullScreenOnAndroid, rightView, titleStyle, baseStyle, withBackground }) => {
	let height = 44;
	let paddingTop = 0;
	const [dynamicFontSize, setDynamicFontSize] = React.useState(18); // default font size
	const { isDarkMode } = useTheme();

	React.useEffect(() => {
		// Reset the dynamic font size when the title changes
		setDynamicFontSize(18);
	}, [title]);

	const handleTextLayout = e => {
		const { width } = e.nativeEvent.layout;
		const containerWidth = 280; // Define or fetch the container width
		if (width > containerWidth) {
			// Reduce font size if text is too wide
			setDynamicFontSize(prevSize => prevSize * 0.9);
		}
	};

	if (fullScreenOnAndroid) {
		height = Device.isAndroid() && StatusBar.currentHeight ? height + StatusBar.currentHeight : height;
		paddingTop = Device.isAndroid() && StatusBar.currentHeight ? StatusBar.currentHeight : 0;
	}

	return (
		<View style={[styles.titleBar, baseStyle, { height, paddingTop }]}>
			{onBack && (
				<TouchableOpacity style={[styles.back, { top: paddingTop }]} onPress={onBack}>
					{isDarkMode || withBackground ? (
						<Icon name={'back'} color={colors.white} width="24" height="24" />
					) : (
						<Image source={require('../../../images/back.png')} />
					)}
				</TouchableOpacity>
			)}
			<Text
				style={[styles.title, titleStyle, isDarkMode && baseStyles.textDark, { fontSize: dynamicFontSize }]}
				onLayout={handleTextLayout}
			>
				{title}
			</Text>
			{rightView && <View style={[styles.rightView, { top: paddingTop }]}>{rightView}</View>}
		</View>
	);
};

TitleBar.propTypes = propTypes;
TitleBar.defaultProps = defaultProps;

export default TitleBar;
