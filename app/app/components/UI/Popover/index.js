import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Dimensions, Animated, TouchableWithoutFeedback, View } from 'react-native';
import { colors } from '../../../styles/common';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_ARROW_SIZE = new Size(10, 4);

function Point(x, y) {
	this.x = x;
	this.y = y;
}

function Size(width, height) {
	this.width = width;
	this.height = height;
}

function Rect(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}

const styles = StyleSheet.create({
	container: {
		opacity: 0,
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		position: 'absolute',
		backgroundColor: colors.transparent
	},

	containerVisible: {
		opacity: 1
	},

	background: {
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		position: 'absolute',
		backgroundColor: colors.transparent
	},

	popover: {
		backgroundColor: colors.white,
		position: 'absolute',
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.2,
		shadowRadius: 15,
		elevation: 15,
		borderRadius: 10
	},

	content: {
		borderRadius: 10,
		backgroundColor: colors.white
	},

	arrow: {
		position: 'absolute',
		borderTopColor: colors.transparent,
		borderRightColor: colors.transparent,
		borderBottomColor: colors.transparent,
		borderLeftColor: colors.transparent
	}
});

export default class Popover extends PureComponent {
	static propTypes = {
		isVisible: PropTypes.bool,
		onClose: PropTypes.func,
		displayArea: PropTypes.object,
		arrowSize: PropTypes.object,
		arrowBgColor: PropTypes.string,
		placement: PropTypes.string,
		fromRect: PropTypes.object,
		children: PropTypes.any,
		disX: PropTypes.number,
		disY: PropTypes.number
	};

	state = {
		contentSize: {},
		anchorPoint: { x: 0, y: 0 },
		popoverOrigin: { x: 0, y: 0 },
		placement: 'bottom',
		defaultAnimatedValues: {
			scale: new Animated.Value(0),
			translate: new Animated.ValueXY(),
			fade: new Animated.Value(0)
		}
	};

	measureContent = x => {
		const { width, height } = x.nativeEvent.layout;
		const contentSize = { width, height };
		const geom = this.computeGeometry({ contentSize });

		// eslint-disable-next-line no-empty-function
		this.setState(Object.assign(geom, { contentSize }), () => {});
	};

	computeGeometry = ({ contentSize, placement }) => {
		placement = placement || this.props.placement;

		const options = {
			displayArea: this.props.displayArea,
			fromRect: this.props.fromRect,
			arrowSize: this.getArrowSize(placement),
			contentSize
		};

		switch (placement) {
			case 'top':
				return this.computeTopGeometry(options);
			case 'bottom':
				return this.computeBottomGeometry(options);
			case 'left':
				return this.computeLeftGeometry(options);
			case 'right':
				return this.computeRightGeometry(options);
			default:
				return this.computeBottomGeometry(options);
		}
	};

	computeTopGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
		const popoverOrigin = new Point(
			Math.min(
				displayArea.x + displayArea.width - contentSize.width,
				Math.max(displayArea.x, fromRect.x + (fromRect.width - contentSize.width) / 2)
			) + this.props.disX,
			fromRect.y - contentSize.height - arrowSize.height + this.props.disY
		);
		const anchorPoint = new Point(fromRect.x + fromRect.width / 2.0, fromRect.y);

		return {
			popoverOrigin,
			anchorPoint,
			placement: 'top'
		};
	};

	computeBottomGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
		const popoverOrigin = new Point(
			Math.min(
				displayArea.x + displayArea.width - contentSize.width,
				Math.max(displayArea.x, fromRect.x + (fromRect.width - contentSize.width) / 2)
			) + this.props.disX,
			fromRect.y + fromRect.height + arrowSize.height + this.props.disY
		);
		const anchorPoint = new Point(fromRect.x + fromRect.width / 2.0, fromRect.y + fromRect.height);

		return {
			popoverOrigin,
			anchorPoint,
			placement: 'bottom'
		};
	};

	computeLeftGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
		const popoverOrigin = new Point(
			fromRect.x - contentSize.width - arrowSize.width + this.props.disX,
			Math.min(
				displayArea.y + displayArea.height - contentSize.height,
				Math.max(displayArea.y, fromRect.y + (fromRect.height - contentSize.height) / 2)
			) + this.props.disY
		);
		const anchorPoint = new Point(fromRect.x, fromRect.y + fromRect.height / 2.0);

		return {
			popoverOrigin,
			anchorPoint,
			placement: 'left'
		};
	};

	computeRightGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
		const popoverOrigin = new Point(
			fromRect.x + fromRect.width + arrowSize.width + this.props.disX,
			Math.min(
				displayArea.y + displayArea.height - contentSize.height,
				Math.max(displayArea.y, fromRect.y + (fromRect.height - contentSize.height) / 2)
			) + this.props.disY
		);
		const anchorPoint = new Point(fromRect.x + fromRect.width, fromRect.y + fromRect.height / 2.0);

		return {
			popoverOrigin,
			anchorPoint,
			placement: 'right'
		};
	};

	getArrowSize = placement => {
		const size = this.props.arrowSize;
		switch (placement) {
			case 'left':
			case 'right':
				return new Size(size.height, size.width);
			default:
				return size;
		}
	};

	getArrowColorStyle = color => ({ borderTopColor: color });

	getArrowRotation = placement => {
		switch (placement) {
			case 'bottom':
				return '180deg';
			case 'left':
				return '-90deg';
			case 'right':
				return '90deg';
			default:
				return '0deg';
		}
	};

	getArrowDynamicStyle = () => {
		const { anchorPoint, popoverOrigin } = this.state;
		const arrowSize = this.props.arrowSize;

		// Create the arrow from a rectangle with the appropriate borderXWidth set
		// A rotation is then applied dependending on the placement
		// Also make it slightly bigger
		// to fix a visual artifact when the popover is animated with a scale
		const width = arrowSize.width + 2;
		const height = arrowSize.height * 2 + 2;

		return {
			left: anchorPoint.x - popoverOrigin.x - width / 2,
			top: anchorPoint.y - popoverOrigin.y - height / 2,
			width,
			height,
			borderTopWidth: height / 2,
			borderRightWidth: width / 2,
			borderBottomWidth: height / 2,
			borderLeftWidth: width / 2
		};
	};

	render = () => {
		if (!this.props.isVisible) {
			return null;
		}

		const { popoverOrigin, placement } = this.state;

		const contentStyle = [styles.content];
		const arrowColor = this.props.arrowBgColor
			? this.props.arrowBgColor
			: StyleSheet.flatten(contentStyle).backgroundColor;
		const arrowColorStyle = this.getArrowColorStyle(arrowColor);
		const arrowDynamicStyle = this.getArrowDynamicStyle();
		const contentSizeAvailable = this.state.contentSize.width;
		let arrowStyle = [styles.arrow, arrowDynamicStyle, arrowColorStyle]; //, ...extendedStyles.arrow
		const arrowTransform = (StyleSheet.flatten(arrowStyle).transform || []).slice(0);
		arrowTransform.unshift({ rotate: this.getArrowRotation(placement) });
		arrowStyle = [...arrowStyle, { transform: arrowTransform }];

		return (
			<TouchableWithoutFeedback onPress={this.props.onClose}>
				<View style={[styles.container, contentSizeAvailable && styles.containerVisible]}>
					<Animated.View style={[styles.background]} />
					<Animated.View
						style={[
							styles.popover,
							{
								top: popoverOrigin.y,
								left: popoverOrigin.x
							}
						]}
					>
						<Animated.View style={arrowStyle} />
						<Animated.View onLayout={this.measureContent} style={contentStyle}>
							{this.props.children}
						</Animated.View>
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		);
	};
}

Popover.defaultProps = {
	isVisible: false,
	displayArea: new Rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT),
	arrowSize: DEFAULT_ARROW_SIZE,
	placement: 'bottom',
	disX: 0,
	disY: 0
};
