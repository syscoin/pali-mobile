import React, { PureComponent } from 'react';
import { StyleSheet, Animated, TouchableWithoutFeedback, View, Easing } from 'react-native';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	itemImageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	flexOne: {
		flex: 1
	}
});

export default class Block extends PureComponent {
	static propTypes = {
		style: PropTypes.array,
		onLayout: PropTypes.func,
		panHandlers: PropTypes.object,
		delayLongPress: PropTypes.number,
		inactive: PropTypes.bool,
		onLongPress: PropTypes.func,
		onPress: PropTypes.func,
		itemWrapperStyle: PropTypes.array,
		children: PropTypes.any,
		operationView: PropTypes.any,
		canDrag: PropTypes.bool,
		rpcCloseView: PropTypes.any
	};

	state = {
		rotateAnim: new Animated.Value(0)
	};

	isAnimimg = false;

	componentDidMount = () => {
		if (this.props.canDrag && this.props.inactive) {
			this.startAnimation();
		}
	};

	animationSlider = Animated.sequence([
		Animated.timing(this.state.rotateAnim, {
			toValue: -3,
			duration: 150,
			easing: Easing.linear,
			useNativeDriver: false
		}),
		Animated.timing(this.state.rotateAnim, {
			toValue: 3,
			duration: 150,
			easing: Easing.linear,
			useNativeDriver: false
		}),
		Animated.timing(this.state.rotateAnim, {
			toValue: 0,
			duration: 150,
			easing: Easing.linear,
			useNativeDriver: false
		})
	]);

	componentDidUpdate = prevProps => {
		if (prevProps.canDrag !== this.props.canDrag || prevProps.inactive !== this.props.inactive) {
			if (this.props.canDrag && this.props.inactive) {
				this.startAnimation();
			} else {
				this.stopAnimation();
			}
		}
	};

	startAnimation = () => {
		if (!this.isAnimimg) {
			this.isAnimimg = true;
			this.state.rotateAnim.setValue(0);
			Animated.loop(this.animationSlider).start();
		}
	};

	stopAnimation = () => {
		if (this.isAnimimg) {
			this.isAnimimg = false;
			this.state.rotateAnim.setValue(0);
			Animated.loop(this.animationSlider).stop();
		}
	};

	render = () => (
		<Animated.View
			style={[
				this.props.style,
				{
					transform: [
						{
							rotate: this.state.rotateAnim.interpolate({
								inputRange: [0, 360],
								outputRange: ['0deg', '360deg']
							})
						}
					]
				}
			]}
			onLayout={this.props.onLayout}
			{...this.props.panHandlers}
		>
			<TouchableWithoutFeedback
				style={styles.flexOne}
				delayLongPress={this.props.delayLongPress}
				onLongPress={() => this.props.onLongPress()}
				onPress={() => this.props.inactive || this.props.onPress()}
			>
				<View style={styles.itemImageContainer}>
					<View style={this.props.itemWrapperStyle}>{this.props.children}</View>
					{this.props.operationView}
					{this.props.rpcCloseView}
				</View>
			</TouchableWithoutFeedback>
		</Animated.View>
	);
}

Block.defaultProps = {
	canDrag: false
};
