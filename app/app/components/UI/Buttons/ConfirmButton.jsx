import React from 'react';
import { baseStyles, colors, fontStyles } from '../../../styles/common';

import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	okButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.brandPink300,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 14,
		color: colors.white
	}
});

export const ConfirmButton = ({ text, onPress, buttonStyle, textStyle, disabled, allowFontScaling }) => {
	const { isDarkMode } = useTheme();
	return (
		<TouchableOpacity
			disabled={disabled}
			style={[...buttonStyle, styles.okButton, isDarkMode && baseStyles.darkConfirmButton]}
			onPress={onPress}
		>
			<Text
				allowFontScaling={allowFontScaling}
				style={[...textStyle, styles.okText, isDarkMode && baseStyles.darkConfirmText]}
			>
				{text}
			</Text>
		</TouchableOpacity>
	);
};
