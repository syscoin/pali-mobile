import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	circle: {
		overflow: 'hidden',
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.$E9ECF1
	},
	leftWrap: {
		overflow: 'hidden',
		position: 'absolute',
		top: 0
	},
	loader: {
		position: 'absolute',
		left: 0,
		top: 0,
		borderRadius: 1000
	},
	innerCircle: {
		overflow: 'hidden',
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center'
	}
});

class PercentageCircle extends PureComponent {
	static propTypes = {
		color: PropTypes.string,
		bgcolor: PropTypes.string,
		innerColor: PropTypes.string,
		radius: PropTypes.number,
		percent: PropTypes.number,
		borderWidth: PropTypes.number,
		children: PropTypes.any
	};

	constructor(props) {
		super(props);
		const percent = this.props.percent;
		let leftTransformerDegree = '0deg';
		let rightTransformerDegree = '0deg';
		if (percent >= 50) {
			rightTransformerDegree = '180deg';
			leftTransformerDegree = (percent - 50) * 3.6 + 'deg';
		} else {
			rightTransformerDegree = percent * 3.6 + 'deg';
			leftTransformerDegree = '0deg';
		}

		this.state = {
			percent: this.props.percent,
			borderWidth: this.props.borderWidth < 2 || !this.props.borderWidth ? 2 : this.props.borderWidth,
			leftTransformerDegree,
			rightTransformerDegree
		};
	}

	UNSAFE_componentWillReceiveProps(nextProps) {
		const percent = nextProps.percent;
		let leftTransformerDegree = '0deg';
		let rightTransformerDegree = '0deg';
		if (percent >= 50) {
			rightTransformerDegree = '180deg';
			leftTransformerDegree = (percent - 50) * 3.6 + 'deg';
		} else {
			rightTransformerDegree = percent * 3.6 + 'deg';
		}
		this.setState({
			percent: this.props.percent,
			borderWidth: this.props.borderWidth < 2 || !this.props.borderWidth ? 2 : this.props.borderWidth,
			leftTransformerDegree,
			rightTransformerDegree
		});
	}

	render() {
		return (
			<View
				style={[
					styles.circle,
					{
						width: this.props.radius * 2,
						height: this.props.radius * 2,
						borderRadius: this.props.radius,
						backgroundColor: this.props.bgcolor
					}
				]}
			>
				<View
					style={[
						styles.leftWrap,
						// eslint-disable-next-line react-native/no-inline-styles
						{
							width: this.props.radius,
							height: this.props.radius * 2,
							left: 0
						}
					]}
				>
					<View
						style={[
							styles.loader,
							// eslint-disable-next-line react-native/no-inline-styles
							{
								left: this.props.radius,
								width: this.props.radius,
								height: this.props.radius * 2,
								borderTopLeftRadius: 0,
								borderBottomLeftRadius: 0,
								backgroundColor: this.props.color,
								transform: [
									{ translateX: -this.props.radius / 2 },
									{ rotate: this.state.leftTransformerDegree },
									{ translateX: this.props.radius / 2 }
								]
							}
						]}
					/>
				</View>
				<View
					style={[
						styles.leftWrap,
						{
							left: this.props.radius,
							width: this.props.radius,
							height: this.props.radius * 2
						}
					]}
				>
					<View
						style={[
							styles.loader,
							// eslint-disable-next-line react-native/no-inline-styles
							{
								left: -this.props.radius,
								width: this.props.radius,
								height: this.props.radius * 2,
								borderTopRightRadius: 0,
								borderBottomRightRadius: 0,
								backgroundColor: this.props.color,
								transform: [
									{ translateX: this.props.radius / 2 },
									{ rotate: this.state.rightTransformerDegree },
									{ translateX: -this.props.radius / 2 }
								]
							}
						]}
					/>
				</View>
				{this.props.children && (
					<View
						style={[
							styles.innerCircle,
							{
								width: (this.props.radius - this.state.borderWidth) * 2,
								height: (this.props.radius - this.state.borderWidth) * 2,
								borderRadius: this.props.radius - this.state.borderWidth,
								backgroundColor: this.props.innerColor
							}
						]}
					>
						{this.props.children}
					</View>
				)}
			</View>
		);
	}
}

PercentageCircle.defaultProps = {
	bgcolor: colors.$E9ECF1,
	innerColor: colors.white
};

export default PercentageCircle;
