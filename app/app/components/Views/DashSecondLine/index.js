import React, { PureComponent } from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	dashLine: {
		flexDirection: 'row',
		flex: 1
	},
	dashItem: {
		height: 1,
		flex: 1,
		marginRight: 2,
		backgroundColor: colors.$E6E6E6
	}
});

export default class DashSecondLine extends PureComponent {
	static contextType = ThemeContext;

	static propTypes = {
		lineWidth: PropTypes.number,
		style: PropTypes.any
	};

	render = () => {
		const { isDarkMode } = this.context;

		const len = this.props.lineWidth / 6;
		const arr = [];
		for (let i = 0; i < len; i++) {
			arr.push(i);
		}
		return (
			<View style={[styles.dashLine, this.props.style]}>
				{arr.map((item, index) => (
					<View
						style={[styles.dashItem, isDarkMode && { backgroundColor: '#FFFFFF29' }]}
						key={'dash' + index}
					/>
				))}
			</View>
		);
	};
}
