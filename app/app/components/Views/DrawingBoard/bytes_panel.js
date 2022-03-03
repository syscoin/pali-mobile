import React, { PureComponent } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
	baseView: {
		flex: 1,
		justifyContent: 'space-between',
		width,
		height: height - 130
	},
	rowView: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width
	},
	textView: {
		fontSize: 84,
		color: colors.$030319
	}
});

export default class BytesPanel extends PureComponent {
	static propTypes = {
		style: PropTypes.any
	};

	state = {
		byteArray: []
	};

	setByteArray = byteArrayParams => {
		if (byteArrayParams && byteArrayParams.length > 0) {
			const byteArray = [];
			let array = [];
			byteArrayParams.forEach((item, index) => {
				if (index % 8 === 0) {
					array = [];
					byteArray.push(array);
				}
				array.push(item);
			});
			this.setState({ byteArray });
		}
	};

	render = () => {
		const { byteArray } = this.state;
		return (
			<View style={[this.props.style, styles.baseView]}>
				{byteArray.map((items, index) => (
					<View style={styles.rowView} key={'base-' + index}>
						{items.map((item, index) => {
							const random = Math.random() * 0.5 + 0.3;
							return (
								<Text style={[styles.textView, { opacity: random / 10 }]} key={'child' + index}>
									{item}
								</Text>
							);
						})}
					</View>
				))}
			</View>
		);
	};
}
