import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontStyles } from '../../../styles/common';

import { OTC_ONBOARDING_TOUR, TRUE } from '../../../constants/storage';

import { strings } from '../../../../locales/i18n';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';

const styles = StyleSheet.create({
	bottomBar: {
		marginTop: 20,
		flexDirection: 'column',
		width: 200,
		height: 100,
		maxHeight: 100
	},
	stepContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: 200
	},
	stepButton: {
		backgroundColor: colors.paliBlue100,
		width: 90,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 4
	},
	skipButton: {
		borderWidth: 1,
		borderColor: colors.paliBlue400,
		borderStyle: 'solid',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 5,
		marginTop: 20,
		height: 40
	},
	skipText: {
		color: colors.paliBlue400,
		...fontStyles.bold,
		fontSize: 14
	},
	stepNumber: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderRadius: 14,
		borderColor: '#FFFFFF',
		backgroundColor: colors.paliBlue400
	},
	stepNumberText: {
		fontSize: 12,
		backgroundColor: 'transparent',
		color: '#FFFFFF'
	},
	tooltipText: {
		fontSize: 14
	},
	tooltipContainer: {
		width: 200
	}
});

export const StepNumber = ({ currentStepNumber }) => (
	<View style={styles.stepNumber}>
		<Text style={[styles.stepNumberText]}>{currentStepNumber}</Text>
	</View>
);

export const Tooltip = ({ isFirstStep, isLastStep, handleNext, handlePrev, handleStop, currentStep }) => (
	<View>
		<View style={styles.tooltipContainer}>
			<Text testID="stepDescription" style={styles.tooltipText}>
				{currentStep.text}
			</Text>
		</View>
		<View style={[styles.bottomBar]}>
			<View style={styles.stepContainer}>
				<TouchableOpacity
					disabled={isFirstStep}
					style={[styles.stepButton, { opacity: isFirstStep ? 0.5 : 1 }]}
					onPress={handlePrev}
				>
					<SimpleLineIcons color={'#4D76B8'} size={16} name="arrow-left" />
				</TouchableOpacity>

				<TouchableOpacity
					disabled={isLastStep}
					style={[styles.stepButton, { opacity: isLastStep ? 0.5 : 1 }]}
					onPress={handleNext}
				>
					<SimpleLineIcons color={'#4D76B8'} size={16} name="arrow-right" />
				</TouchableOpacity>
			</View>
			{!isLastStep ? (
				<TouchableOpacity
					style={styles.skipButton}
					onPress={() => {
						handleStop();
						AsyncStorage.setItem(OTC_ONBOARDING_TOUR, TRUE);
					}}
				>
					<Text style={styles.skipText}>{strings('onboarding_wallet.skip_tour')}</Text>
				</TouchableOpacity>
			) : (
				<TouchableOpacity
					style={styles.skipButton}
					onPress={() => {
						handleStop();
						AsyncStorage.setItem(OTC_ONBOARDING_TOUR, TRUE);
					}}
				>
					<Text style={styles.skipText}>{strings('onboarding_wallet.finish')}</Text>
				</TouchableOpacity>
			)}
		</View>
	</View>
);
