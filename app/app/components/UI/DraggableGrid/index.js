import React, { PureComponent } from 'react';
import {
	PanResponder,
	Animated,
	StyleSheet,
	GestureResponderEvent,
	PanResponderGestureState,
	Platform,
	Vibration,
	TouchableOpacity,
	Image,
	View
} from 'react-native';
import Block from './block';
import { findKey, findIndex, differenceBy } from './utils';
import PropTypes from 'prop-types';
import { iosShake } from '../../../util/NativeUtils';

const styles = StyleSheet.create({
	draggableGrid: {
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap'
	}
});

export default class DraggableGrid extends PureComponent {
	static propTypes = {
		numColumns: PropTypes.number,
		data: PropTypes.array,
		renderItem: PropTypes.func,
		style: PropTypes.object,
		itemHeight: PropTypes.number,
		dragStartAnimation: PropTypes.object,
		onItemPress: PropTypes.func,
		onDragStart: PropTypes.func,
		onDragRelease: PropTypes.func,
		onDeletePress: PropTypes.func,
		inDragging: PropTypes.bool,
		onMovePos: PropTypes.func
	};

	state = {
		blockHeight: 0,
		blockWidth: 0,
		gridHeight: new Animated.Value(0),
		hadInitBlockSize: false,
		dragStartAnimatedValue: new Animated.Value(1),
		gridLayout: {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		}
	};

	panResponder = PanResponder.create({
		onStartShouldSetPanResponder: () => true,
		onStartShouldSetPanResponderCapture: () => false,
		onMoveShouldSetPanResponder: () => this.panResponderCapture,
		onMoveShouldSetPanResponderCapture: () => this.panResponderCapture,
		onShouldBlockNativeResponder: () => false,
		onPanResponderTerminationRequest: () => false,
		onPanResponderGrant: this.onStartDrag.bind(this),
		onPanResponderMove: this.onHandMove.bind(this),
		onPanResponderRelease: this.onHandRelease.bind(this)
	});
	panResponderCapture = false;
	orderMap = {};
	items = [];
	blockPositions = [];
	activeBlockOffset = { x: 0, y: 0 };
	moveOffsetY = 0;
	onDragging = false;

	resetGridHeight = () => {
		const { props } = this;
		const rowCount = Math.ceil(props.data.length / props.numColumns);
		this.state.gridHeight.setValue(rowCount * this.state.blockHeight);
	};

	UNSAFE_componentWillReceiveProps = nextProps => {
		if (!nextProps.inDragging || nextProps.data.length !== this.items.length) {
			nextProps.data.forEach((item, index) => {
				if (this.orderMap[item.key]) {
					if (this.orderMap[item.key].order !== index) {
						this.orderMap[item.key].order = index;
						this.moveBlockToBlockOrderPosition(item.key);
					}
					const currentItem = this.items.find(i => i.key === item.key);
					if (currentItem) {
						currentItem.itemData = item;
					}
				} else {
					this.addItem(item, index);
				}
			});
			const deleteItems = differenceBy(this.items, nextProps.data, 'key');
			deleteItems.forEach(item => {
				this.removeItem(item);
			});
		}
	};

	componentDidUpdate() {
		this.resetGridHeight();
	}

	addItem = (item, index: number) => {
		this.blockPositions.push(this.getBlockPositionByOrder(this.items.length));
		this.orderMap[item.key] = {
			order: index
		};
		this.items.push({
			key: item.key,
			itemData: item,
			currentPosition: new Animated.ValueXY(this.getBlockPositionByOrder(index))
		});
	};

	removeItem = item => {
		const itemIndex = findIndex(this.items, curItem => curItem.key === item.key);
		this.items.splice(itemIndex, 1);
		this.blockPositions.pop();
		delete this.orderMap[item.key];
	};

	UNSAFE_componentWillMount() {
		this.items = this.props.data.map((item, index) => {
			this.orderMap[item.key] = {
				order: index
			};
			return {
				key: item.key,
				itemData: item,
				currentPosition: new Animated.ValueXY()
			};
		});
	}

	getImageDeleteIconStyle = () => [
		{
			position: 'absolute',
			top: -9,
			left: (this.state.blockWidth - 46) / 2 + 24,
			padding: 10
		}
	];

	getDeleteView = itemData => (
		<TouchableOpacity
			onPress={() => {
				this.props.onDeletePress && this.props.onDeletePress(itemData);
			}}
			style={this.getImageDeleteIconStyle()}
		>
			<Image source={require('../../../images/ic_chain_delete.png')} />
		</TouchableOpacity>
	);

	render() {
		return (
			<Animated.View
				style={[
					styles.draggableGrid,
					this.props.style,
					{
						height: this.state.gridHeight
					}
				]}
				onLayout={this.assessGridSize}
			>
				{this.state.hadInitBlockSize &&
					this.items.map((item, itemIndex) => {
						if (item.key.endsWith('noMove')) {
							return (
								<Block
									onPress={this.onBlockPress.bind(this, itemIndex)}
									panHandlers={this.panResponder.panHandlers}
									style={this.getBlockStyle(itemIndex)}
									dragStartAnimationStyle={this.getDragStartAnimation(itemIndex)}
									key={item.key}
								>
									{this.props.renderItem(item.itemData, this.orderMap[item.key].order)}
								</Block>
							);
						}
						return (
							<Block
								onPress={this.onBlockPress.bind(this, itemIndex)}
								onPressOut={this.onBlockPressOut.bind(this, itemIndex)}
								onLongPress={this.setActiveBlock.bind(this, itemIndex)}
								panHandlers={this.panResponder.panHandlers}
								style={this.getBlockStyle(itemIndex)}
								dragStartAnimationStyle={this.getDragStartAnimation(itemIndex)}
								key={item.key}
							>
								<View>
									<View>{this.props.renderItem(item.itemData, this.orderMap[item.key].order)}</View>
									{this.props.inDragging && this.getDeleteView(item.itemData)}
								</View>
							</Block>
						);
					})}
			</Animated.View>
		);
	}

	onBlockPress(itemIndex: number) {
		if (this.props.inDragging) {
			return;
		}
		this.props.onItemPress && this.props.onItemPress(this.items[itemIndex].itemData);
	}

	onBlockPressOut(itemIndex: number) {
		if (!this.onDragging) {
			this.onHandRelease();
		}
	}

	getBlockStyle = (itemIndex: number) => [
		{
			justifyContent: 'center',
			alignItems: 'center'
		},
		this.state.hadInitBlockSize && {
			width: this.state.blockWidth,
			height: this.state.blockHeight,
			position: 'absolute',
			top: this.items[itemIndex].currentPosition.getLayout().top,
			left: this.items[itemIndex].currentPosition.getLayout().left
		}
	];

	setActiveBlock = (itemIndex: number) => {
		this.props.onDragStart && this.props.onDragStart();
		this.panResponderCapture = true;
		this.setState(
			{
				activeItemIndex: itemIndex
			},
			() => {
				this.startDragStartAnimation();
				if (Platform.OS === 'android') {
					Vibration.vibrate(10, false);
				} else {
					iosShake();
				}
			}
		);
	};

	getDragStartAnimation = (itemIndex: number) => {
		if (!this.props.inDragging) {
			return;
		}

		let dragStartAnimation;
		if (this.props.dragStartAnimation) {
			dragStartAnimation = this.props.dragStartAnimation;
		} else {
			dragStartAnimation = this.getDefaultDragStartAnimation();
		}
		return {
			zIndex: 3,
			...dragStartAnimation
		};
	};

	getDefaultDragStartAnimation = () => ({
		transform: [
			{
				scale: this.state.dragStartAnimatedValue
			}
		],
		shadowColor: '#000000',
		shadowOpacity: 0.2,
		shadowRadius: 6,
		shadowOffset: {
			width: 1,
			height: 1
		}
	});

	startDragStartAnimation = () => {
		if (!this.props.dragStartAnimation) {
			this.state.dragStartAnimatedValue.setValue(1);
			Animated.timing(this.state.dragStartAnimatedValue, {
				toValue: 1.1,
				duration: 100,
				useNativeDriver: false
			}).start();
		}
	};

	getBlockPositionByOrder = (order: number) => {
		if (this.blockPositions[order]) {
			return this.blockPositions[order];
		}
		const { blockWidth, blockHeight } = this.state;
		const columnOnRow = order % this.props.numColumns;
		const y = blockHeight * Math.floor(order / this.props.numColumns);
		const x = columnOnRow * blockWidth;
		return {
			x,
			y
		};
	};

	assessGridSize = event => {
		if (!this.state.hadInitBlockSize) {
			const blockWidth = event.nativeEvent.layout.width / this.props.numColumns;
			const blockHeight = this.props.itemHeight || blockWidth;
			this.setState(
				{
					blockWidth,
					blockHeight,
					gridLayout: event.nativeEvent.layout
				},
				() => {
					this.initBlockPositions();
					this.resetGridHeight();
				}
			);
		}
	};

	initBlockPositions = () => {
		this.items.forEach((item, index) => {
			this.blockPositions[index] = this.getBlockPositionByOrder(index);
		});
		this.items.forEach(item => {
			item.currentPosition.setOffset(this.blockPositions[this.orderMap[item.key].order]);
		});
		this.setState({ hadInitBlockSize: true });
	};

	getActiveItem = () => {
		if (this.state.activeItemIndex === undefined) return false;
		return this.items[this.state.activeItemIndex];
	};

	getDistance = (startOffset, endOffset) => {
		const xDistance = startOffset.x + this.activeBlockOffset.x - endOffset.x;
		const yDistance = startOffset.y + this.activeBlockOffset.y - endOffset.y;
		return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
	};

	onStartDrag(nativeEvent: GestureResponderEvent, gestureState: PanResponderGestureState) {
		const activeItem = this.getActiveItem();
		if (!activeItem) return false;
		this.onDragging = true;
		const { x0, y0, moveX, moveY } = gestureState;
		const activeOrigin = this.blockPositions[this.orderMap[activeItem.key].order];
		const x = activeOrigin.x - x0;
		const y = activeOrigin.y - y0;
		activeItem.currentPosition.setOffset({
			x,
			y
		});
		this.activeBlockOffset = {
			x,
			y
		};
		activeItem.currentPosition.setValue({
			x: moveX,
			y: moveY
		});
		this.moveOffsetY = 0;
	}

	onHandMove(nativeEvent: GestureResponderEvent, gestureState: PanResponderGestureState) {
		const activeItem = this.getActiveItem();
		if (!activeItem) return false;
		const { moveX, moveY } = gestureState;
		this.onHandMoveImpl(moveX, moveY);
	}

	setMoveOffset(offset, moveX, moveY) {
		this.moveOffsetY += offset;
		this.onHandMoveImpl(moveX, moveY);
	}

	onHandMoveImpl(moveX, moveY) {
		const activeItem = this.getActiveItem();
		if (!activeItem) return false;

		const xChokeAmount = Math.max(
			0,
			this.activeBlockOffset.x + moveX - (this.state.gridLayout.width - this.state.blockWidth)
		);
		const xMinChokeAmount = Math.min(0, this.activeBlockOffset.x + moveX);

		const dragPosition = {
			x: moveX - xChokeAmount - xMinChokeAmount,
			y: moveY - this.moveOffsetY
		};
		const originPosition = this.blockPositions[this.orderMap[activeItem.key].order];
		const dragPositionToActivePositionDistance = this.getDistance(dragPosition, originPosition);
		activeItem.currentPosition.setValue(dragPosition);

		let closetItemIndex = this.state.activeItemIndex;
		let closetDistance = dragPositionToActivePositionDistance;

		this.items.forEach((item, index) => {
			if (index !== this.state.activeItemIndex) {
				const dragPositionToItemPositionDistance = this.getDistance(
					dragPosition,
					this.blockPositions[this.orderMap[item.key].order]
				);
				if (
					dragPositionToItemPositionDistance < closetDistance &&
					dragPositionToItemPositionDistance < this.state.blockWidth
				) {
					closetItemIndex = index;
					closetDistance = dragPositionToItemPositionDistance;
				}
			}
		});
		if (this.state.activeItemIndex !== closetItemIndex) {
			const closetOrder = this.orderMap[this.items[closetItemIndex].key].order;
			this.resetBlockPositionByOrder(this.orderMap[activeItem.key].order, closetOrder);
			this.orderMap[activeItem.key].order = closetOrder;
		}
		this.props.onMovePos({
			x: moveX - xChokeAmount - xMinChokeAmount,
			y: moveY
		});
	}

	resetBlockPositionByOrder = (startOrder: number, endOrder: number) => {
		if (startOrder > endOrder) {
			for (let i = startOrder - 1; i >= endOrder; i--) {
				const key = this.getKeyByOrder(i);
				this.orderMap[key].order++;
				this.moveBlockToBlockOrderPosition(key);
			}
		} else {
			for (let i = startOrder + 1; i <= endOrder; i++) {
				const key = this.getKeyByOrder(i);
				this.orderMap[key].order--;
				this.moveBlockToBlockOrderPosition(key);
			}
		}
	};

	moveBlockToBlockOrderPosition = (itemKey: string) => {
		const itemIndex = findIndex(this.items, item => item.key === itemKey);
		this.items[itemIndex].currentPosition.flattenOffset();
		if (this.blockPositions[this.orderMap[itemKey].order]) {
			Animated.timing(this.items[itemIndex].currentPosition, {
				toValue: this.blockPositions[this.orderMap[itemKey].order],
				duration: 200,
				useNativeDriver: false
			}).start();
		}
	};

	getKeyByOrder = (order: number) => findKey(this.orderMap, item => item.order === order);

	onHandRelease() {
		this.onDragging = false;
		const activeItem = this.getActiveItem();
		if (!activeItem) return false;
		if (this.props.onDragRelease) {
			const dragReleaseResult = [];
			this.items.forEach(item => {
				dragReleaseResult[this.orderMap[item.key].order] = item.itemData;
			});
			this.props.onDragRelease(dragReleaseResult);
		}
		this.panResponderCapture = false;
		activeItem.currentPosition.flattenOffset();
		this.moveBlockToBlockOrderPosition(activeItem.key);
		this.setState({
			activeItemIndex: undefined
		});
	}
}
