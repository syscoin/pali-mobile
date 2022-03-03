import React, { PureComponent } from 'react';
import { Animated, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	blockContainer: {
		alignItems: 'center'
	}
});

export default class Block extends PureComponent {
	static propTypes = {
		style: PropTypes.array,
		dragStartAnimationStyle: PropTypes.object,
		onPress: PropTypes.func,
		onPressOut: PropTypes.func,
		onLongPress: PropTypes.func,
		panHandlers: PropTypes.object
	};

	render() {
		return (
			<Animated.View
				style={[styles.blockContainer, this.props.style, this.props.dragStartAnimationStyle]}
				{...this.props.panHandlers}
			>
				<Animated.View>
					<TouchableWithoutFeedback
						onPress={this.props.onPress}
						onLongPress={this.props.onLongPress}
						onPressOut={this.props.onPressOut}
					>
						{/* eslint-disable-next-line react/prop-types */}
						{this.props.children}
					</TouchableWithoutFeedback>
				</Animated.View>
			</Animated.View>
		);
	}
}
