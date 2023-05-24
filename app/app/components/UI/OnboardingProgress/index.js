import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StepIndicator from 'react-native-step-indicator';

const strokeWidth = 1;

export default class OnboardingProgress extends PureComponent {
	static defaultProps = {
		currentStep: 0
	};

	static propTypes = {
		/**
		 * int specifying the currently selected step
		 */
		currentStep: PropTypes.number,
		/**
		 * array of text strings representing each step
		 */
		steps: PropTypes.array.isRequired
	};

	customStyles = {
		stepIndicatorSize: 20,
		currentStepIndicatorSize: 20,
		separatorStrokeWidth: strokeWidth,
		separatorFinishedColor: colors.brandPink300,
		separatorUnFinishedColor: colors.$BEBEBE,
		currentStepStrokeWidth: strokeWidth,
		stepStrokeCurrentColor: colors.brandPink300,
		stepStrokeWidth: strokeWidth,
		stepStrokeFinishedColor: colors.brandPink300,
		stepStrokeUnFinishedColor: colors.$BEBEBE,
		stepIndicatorFinishedColor: colors.brandPink300,
		stepIndicatorUnFinishedColor: colors.$F5F5F5,
		stepIndicatorCurrentColor: colors.brandPink300,
		stepIndicatorLabelFontSize: 12,
		currentStepIndicatorLabelFontSize: 12,
		stepIndicatorLabelCurrentColor: colors.white,
		stepIndicatorLabelFinishedColor: colors.white,
		stepIndicatorLabelUnFinishedColor: colors.$888888,
		labelColor: colors.$888888,
		stepIndicatorLabelFontFamily: fontStyles.normal.fontFamily,
		labelFontFamily: fontStyles.normal.fontFamily,
		labelSize: 11,
		currentStepLabelColor: colors.$030319,
		finishedStepLabelColor: colors.$030319
	};

	render() {
		const { currentStep, steps } = this.props;
		return (
			<StepIndicator
				customStyles={this.customStyles}
				currentPosition={currentStep}
				labels={steps}
				stepCount={steps.length}
			/>
		);
	}
}
