import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	progressBg: {
		height: 12,
		alignSelf: 'stretch',
		marginHorizontal: 30,
		backgroundColor: colors.$FE6E91Alpha3,
		borderRadius: 7
	},
	progressIn: {
		height: 12,
		width: '0%',
		backgroundColor: colors.$FE6E91,
		borderRadius: 7
	}
});

export default class Progress extends PureComponent {
	static propTypes = {
		pathMaxNum: PropTypes.number
	};

	state = {
		progressWidth: '0%'
	};
	setProgress = progress => {
		const perNum = (progress * 100) / this.props.pathMaxNum;
		this.setState({ progressWidth: perNum + '%' });
	};

	render = () => (
		<View style={styles.progressBg}>
			<View style={[styles.progressIn, { width: this.state.progressWidth }]} />
		</View>
	);
}
