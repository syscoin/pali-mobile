import React from 'react';
import { baseStyles, colors, fontStyles } from '../../../styles/common';

import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center'
	}
});

export const CancelButton = ({ text, onPress, buttonStyle, textStyle, disabled, allowFontScaling }) => {
	const { isDarkMode } = useTheme();
	return (
		<TouchableOpacity
			disabled={disabled}
			style={[...buttonStyle, styles.cancelButton, isDarkMode && baseStyles.darkConfirmButton]}
			onPress={onPress}
		>
			<Text
				allowFontScaling={allowFontScaling}
				style={[...textStyle, styles.cancelText, isDarkMode && baseStyles.darkConfirmText]}
			>
				{text}
			</Text>
		</TouchableOpacity>
	);
};
