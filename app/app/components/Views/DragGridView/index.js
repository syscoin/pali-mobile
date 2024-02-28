import React, { PureComponent } from 'react';
import {
	StyleSheet,
	Animated,
	PanResponder,
	Image,
	TouchableOpacity,
	Vibration,
	Platform,
	View,
	Text
} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Block from './block';
import { iosShake } from '../../../../app/util/NativeUtils';
import { getIsRpc, getRpcName } from '../../../util/rpcUtil';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import Modal from 'react-native-modal';
import { strings } from '../../../../locales/i18n';
import { ThemeContext } from '../../../theme/ThemeProvider';

const ITEMS_PER_ROW = 4;
const DRAG_ACTIVATION_TRESHOLD = 100; // 激活item的时间
const BLOCK_TRANSITION_DURATION = 200; // 每个item移动的时间
const ACTIVE_BLOCK_CENTERING_DURATION = 100; // 最后一个返回去的时间

const styles = StyleSheet.create({
	sortableGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap'
	},

	modalRoot: {
		marginHorizontal: 40,
		borderRadius: 8,
		backgroundColor: colors.white
	},
	modalContainer2: {
		margin: 30,
		marginBottom: 20,
		marginHorizontal: 26
	},
	modalTitle: {
		fontSize: 18,
		color: colors.$1E1E1E,
		...fontStyles.bold,
		alignSelf: 'center'
	},
	modalButtons: {
		marginTop: 20,
		flexDirection: 'row'
	},
	cancelText: {
		fontSize: 16,
		color: colors.$030319
	},
	okButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.transparent,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 16,
		color: colors.$FC6564
	},
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.transparent,
		alignItems: 'center',
		justifyContent: 'center'
	},
	centerModal: {
		justifyContent: 'center',
		margin: 0
	}
});

export default class DragGridView extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		itemWidth: PropTypes.number,
		itemHeight: PropTypes.number,
		animStyle: PropTypes.object,
		onDragRelease: PropTypes.func,
		onDragStart: PropTypes.func,
		onOperateItem: PropTypes.func,
		operateTag: PropTypes.number, //0:不操作  1.删除  2.添加
		canDrag: PropTypes.bool,
		onRpcCloseItem: PropTypes.func,
		onItemPress: PropTypes.func,
		inactive: PropTypes.bool,
		canDeleteAll: PropTypes.bool
	};

	static defaultProps = {
		inactive: true,
		canDeleteAll: false
	};

	state = {
		gridLayout: null,
		blockPositions: [],
		activeBlock: null,
		blockWidth: null,
		blockHeight: null,
		gridHeight: new Animated.Value(0),
		blockPositionsSetCount: 0,
		deleteBlock: null,
		deleteBlockOpacity: new Animated.Value(1),
		tempDeleteBlock: null,
		showDeleteNetwork: false
	};

	constructor() {
		super();
		this.blockTransitionDuration = BLOCK_TRANSITION_DURATION;
		this.activeBlockCenteringDuration = ACTIVE_BLOCK_CENTERING_DURATION;
		this.itemsPerRow = ITEMS_PER_ROW;
		this.dragActivationTreshold = DRAG_ACTIVATION_TRESHOLD;

		this.rows = null;
		this.dragPosition = null;
		this.activeBlockOffset = null;
		this.blockWidth = null;
		this.blockHeight = null;
		this.gridHeightTarget = null;
		this.ghostBlocks = [];
		this.itemOrder = [];
		this.panCapture = false;
		this.items = [];
		this.initialLayoutDone = false;
		this.createTouchHandlers();
	}

	componentDidMount = () => this.handleNewProps(this.props);

	handleNewProps = properties => {
		this.assignReceivedPropertiesIntoThis(properties);
		this.saveItemOrder(properties.children);
		this.removeDisappearedChildren(properties.children);
	};

	updateChildren = () => {
		this.handleNewProps(this.props);
	};

	assignReceivedPropertiesIntoThis(properties) {
		Object.keys(properties).forEach(property => {
			if (this[property]) this[property] = properties[property];
		});
	}

	removeDisappearedChildren = items => {
		const deleteBlockIndices = [];
		_.cloneDeep(this.itemOrder).forEach((item, index) => {
			if (!_.findKey(items, oldItem => oldItem.key === item.key)) {
				deleteBlockIndices.push(index);
			}
		});
		if (deleteBlockIndices.length > 0) {
			this.deleteBlocks(deleteBlockIndices);
		}
	};

	onStartDrag = (evt, gestureState) => {
		if (this.state.activeBlock !== null) {
			const activeBlockPosition = this.getActiveBlock().origin;
			const x = activeBlockPosition.x - gestureState.x0;
			const y = activeBlockPosition.y - gestureState.y0;
			this.activeBlockOffset = { x, y };
			this.getActiveBlock().currentPosition.setOffset({ x, y });
			this.getActiveBlock().currentPosition.setValue({ x: gestureState.moveX, y: gestureState.moveY });
		}
	};

	onMoveBlock = (evt, { moveX, moveY, dx, dy }) => {
		if (this.state.activeBlock !== null && this.blockPositionsSet()) {
			const yChokeAmount = Math.max(
				0,
				this.activeBlockOffset.y + moveY - (this.state.gridLayout.height - this.blockHeight)
			);
			const xChokeAmount = Math.max(
				0,
				this.activeBlockOffset.x + moveX - (this.state.gridLayout.width - this.blockWidth)
			);
			const yMinChokeAmount = Math.min(0, this.activeBlockOffset.y + moveY);
			const xMinChokeAmount = Math.min(0, this.activeBlockOffset.x + moveX);

			const dragPosition = {
				x: moveX - xChokeAmount - xMinChokeAmount,
				y: moveY - yChokeAmount - yMinChokeAmount
			};

			// console.log('=== dragPosition= ', dragPosition);
			this.dragPosition = dragPosition;
			const originalPosition = this.getActiveBlock().origin;
			const distanceToOrigin = this.getDistanceTo(originalPosition);
			// console.log('====this._getActiveBlock()  = ', this.getActiveBlock());
			this.getActiveBlock().currentPosition.setValue(dragPosition);

			let closest = this.state.activeBlock;
			let closestDistance = distanceToOrigin;
			this.state.blockPositions.forEach((block, index) => {
				if (index !== this.state.activeBlock && block.origin) {
					const blockPosition = block.origin;
					const distance = this.getDistanceTo(blockPosition);

					if (distance < closestDistance && distance < this.state.blockWidth) {
						closest = index;
						closestDistance = distance;
					}
				}
			});

			this.ghostBlocks.forEach(ghostBlockPosition => {
				const distance = this.getDistanceTo(ghostBlockPosition);
				if (distance < closestDistance) {
					closest = this.state.activeBlock;
					closestDistance = distance;
				}
			});
			// console.log('=== closest = ', closest, ';  this.state.activeBlock= ', this.state.activeBlock);
			if (closest !== this.state.activeBlock) {
				Animated.timing(this.getBlock(closest).currentPosition, {
					toValue: this.getActiveBlock().origin,
					duration: this.blockTransitionDuration,
					useNativeDriver: false
				}).start();
				const blockPositions = this.state.blockPositions;
				this.getActiveBlock().origin = blockPositions[closest].origin;
				blockPositions[closest].origin = originalPosition;
				this.setState({ blockPositions });

				const tempOrderIndex = this.itemOrder[this.state.activeBlock].order;
				this.itemOrder[this.state.activeBlock].order = this.itemOrder[closest].order;
				this.itemOrder[closest].order = tempOrderIndex;
			} else {
				// this.forceUpdate();
			}
		}
	};

	onReleaseBlock = (evt, gestureState) => {
		this.returnBlockToOriginalPosition();
		this.afterDragRelease();
	};

	deleteBlock = key => {
		this.setState({ deleteBlock: key });
		this.blockAnimateFadeOut().then(() => {
			const activeBlock = key;
			this.setState({ activeBlock: null, deleteBlock: null }, () => {
				this.props.onOperateItem && this.props.onOperateItem({ item: this.itemOrder[activeBlock] });
				this.deleteBlocks([activeBlock]);
			});
		});
	};

	rpcCloseBlock = key => {
		this.setState({ deleteBlock: key });
		this.blockAnimateFadeOut().then(() => {
			const activeBlock = key;
			this.setState({ activeBlock: null, deleteBlock: null }, () => {
				this.props.onRpcCloseItem && this.props.onRpcCloseItem({ item: this.itemOrder[activeBlock] });
				this.deleteBlocks([activeBlock]);
			});
		});
	};

	blockAnimateFadeOut = () => {
		this.state.deleteBlockOpacity.setValue(1);
		return new Promise((resolve, reject) => {
			Animated.timing(this.state.deleteBlockOpacity, {
				toValue: 0,
				duration: 2 * this.activeBlockCenteringDuration,
				useNativeDriver: false
			}).start(resolve);
		});
	};

	animateBlockMove = (blockIndex, position) => {
		Animated.timing(this.getBlock(blockIndex).currentPosition, {
			toValue: position,
			duration: this.blockTransitionDuration,
			useNativeDriver: false
		}).start();
	};

	returnBlockToOriginalPosition = () => {
		const activeBlockCurrentPosition = this.getActiveBlock().currentPosition;
		activeBlockCurrentPosition.flattenOffset();
		Animated.timing(activeBlockCurrentPosition, {
			toValue: this.getActiveBlock().origin,
			duration: this.activeBlockCenteringDuration,
			useNativeDriver: false
		}).start();
	};

	afterDragRelease = () => {
		const itemOrder = _.sortBy(this.itemOrder, item => item.order);
		this.props.onDragRelease && this.props.onDragRelease({ itemOrder });
		this.setState({ activeBlock: null });
		this.panCapture = false;
	};

	assessGridSize = ({ nativeEvent }) => {
		if (this.props.itemWidth && this.props.itemWidth < nativeEvent.layout.width) {
			this.itemsPerRow = Math.floor(nativeEvent.layout.width / this.props.itemWidth);
			this.blockWidth = nativeEvent.layout.width / this.itemsPerRow;
			this.blockHeight = this.props.itemHeight || this.blockWidth;
		} else {
			this.blockWidth = nativeEvent.layout.width / this.itemsPerRow;
			this.blockHeight = this.blockWidth;
		}
		if (this.state.gridLayout !== nativeEvent.layout) {
			this.setState({
				gridLayout: nativeEvent.layout,
				blockWidth: this.blockWidth,
				blockHeight: this.blockHeight
			});
		}
	};

	reAssessGridRows = () => {
		const oldRows = this.rows;
		this.rows = Math.ceil(this.items.length / this.itemsPerRow);
		if (this.state.blockWidth && oldRows !== this.rows) {
			this.animateGridHeight();
		}
	};

	saveBlockPositions = key => ({ nativeEvent }) => {
		const blockPositions = this.state.blockPositions;
		if (!blockPositions[key]) {
			// eslint-disable-next-line react/no-direct-mutation-state
			const blockPositionsSetCount = ++this.state.blockPositionsSetCount;
			const thisPosition = {
				x: nativeEvent.layout.x,
				y: nativeEvent.layout.y
			};

			blockPositions[key] = {
				currentPosition: new Animated.ValueXY(thisPosition),
				origin: thisPosition
			};
			this.setState({ blockPositions, blockPositionsSetCount });

			if (this.blockPositionsSet()) {
				this.setGhostPositions();
				this.initialLayoutDone = true;
			}
		}
	};

	getNextBlockCoordinates = () => {
		const blockWidth = this.state.blockWidth;
		const blockHeight = this.state.blockHeight;
		const placeOnRow = this.items.length % this.itemsPerRow;
		const y = blockHeight * Math.floor(this.items.length / this.itemsPerRow);
		const x = placeOnRow * blockWidth;
		return { x, y };
	};

	setGhostPositions = () => {
		this.ghostBlocks = [];
		this.reAssessGridRows();
		const blockWidth = this.state.blockWidth;
		const blockHeight = this.state.blockHeight;
		const fullGridItemCount = this.rows * this.itemsPerRow;
		const ghostBlockCount = fullGridItemCount - this.items.length;
		const y = blockHeight * (this.rows - 1);
		const initialX = blockWidth * (this.itemsPerRow - ghostBlockCount);

		for (let i = 0; i < ghostBlockCount; ++i) {
			const x = initialX + blockWidth * i;
			this.ghostBlocks.push({ x, y });
		}
	};

	activateDrag = key => () => {
		if (!this.props.canDrag) {
			return;
		}
		this.props.onDragStart && this.props.onDragStart(this.itemOrder[key]);
		if (Platform.OS === 'android') {
			Vibration.vibrate(10, false);
		} else {
			iosShake();
		}

		setTimeout(() => {
			this.panCapture = true;
			this.setState({ activeBlock: key });
		}, 10);
	};

	getActiveBlock = () => this.state.blockPositions[this.state.activeBlock];

	getBlock = blockIndex => this.state.blockPositions[blockIndex];

	blockPositionsSet = () => this.state.blockPositionsSetCount === this.items.length;

	saveItemOrder = items => {
		items.forEach((item, index) => {
			const foundKey = _.findKey(this.itemOrder, oldItem => oldItem.key === item.key);
			if (foundKey) {
				this.items[foundKey] = item;
			} else {
				this.itemOrder.push({ key: item.key, ref: item.ref, order: this.items.length });
				if (!this.initialLayoutDone) {
					this.items.push(item);
				} else {
					const blockPositions = this.state.blockPositions;
					const blockPositionsSetCount = this.state.blockPositionsSetCount + 1;
					const thisPosition = this.getNextBlockCoordinates();
					blockPositions.push({
						currentPosition: new Animated.ValueXY(thisPosition),
						origin: thisPosition
					});
					this.items.push(item);
					this.setState({ blockPositions, blockPositionsSetCount });
					this.setGhostPositions();
				}
			}
		});
	};

	deleteBlocks = deleteBlockIndices => {
		const blockPositions = this.state.blockPositions;
		let blockPositionsSetCount = this.state.blockPositionsSetCount;
		_.sortBy(deleteBlockIndices, index => -index).forEach(index => {
			--blockPositionsSetCount;
			// const order = this.itemOrder[index].order;
			blockPositions.splice(index, 1);
			this.fixItemOrderOnDeletion(this.itemOrder[index]);
			this.itemOrder.splice(index, 1);
			this.items.splice(index, 1);
		});
		this.setState({ blockPositions, blockPositionsSetCount }, () => {
			this.items.forEach((item, order) => {
				const blockIndex = _.findIndex(this.itemOrder, item => item.order === order);
				const x = (order * this.state.blockWidth) % (this.itemsPerRow * this.state.blockWidth);
				const y = Math.floor(order / this.itemsPerRow) * this.state.blockHeight;
				// eslint-disable-next-line react/no-direct-mutation-state
				this.state.blockPositions[blockIndex].origin = { x, y };
				this.animateBlockMove(blockIndex, { x, y });
			});
			this.setGhostPositions();
		});
	};

	fixItemOrderOnDeletion = orderItem => {
		if (!orderItem) return false;
		orderItem.order--;
		this.fixItemOrderOnDeletion(_.find(this.itemOrder, item => item.order === orderItem.order + 2));
	};

	animateGridHeight = () => {
		this.gridHeightTarget = this.rows * this.state.blockHeight;
		if (this.gridHeightTarget === this.state.gridLayout.height || this.state.gridLayout.height === 0) {
			this.state.gridHeight.setValue(this.gridHeightTarget);
		} else if (this.state.gridHeight._value !== this.gridHeightTarget) {
			Animated.timing(this.state.gridHeight, {
				toValue: this.gridHeightTarget,
				duration: this.blockTransitionDuration,
				useNativeDriver: false
			}).start();
		}
	};

	getDistanceTo = point => {
		const xDistance = this.dragPosition.x + this.activeBlockOffset.x - point.x;
		const yDistance = this.dragPosition.y + this.activeBlockOffset.y - point.y;
		return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
	};

	createTouchHandlers = () =>
		(this._panResponder = PanResponder.create({
			// eslint-disable-next-line no-empty-function
			onPanResponderTerminate: (evt, gestureState) => {},
			onStartShouldSetPanResponder: (evt, gestureState) => true,
			onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
			onMoveShouldSetPanResponder: (evt, gestureState) => this.panCapture,
			onMoveShouldSetPanResponderCapture: (evt, gestureState) => this.panCapture,
			onShouldBlockNativeResponder: (evt, gestureState) => false,
			onPanResponderTerminationRequest: (evt, gestureState) => false,
			onPanResponderGrant: this.onActiveBlockIsSet(this.onStartDrag),
			onPanResponderMove: this.onActiveBlockIsSet(this.onMoveBlock),
			onPanResponderRelease: this.onActiveBlockIsSet(this.onReleaseBlock)
		}));

	onActiveBlockIsSet = fn => (evt, gestureState) => {
		if (this.state.activeBlock !== null) fn(evt, gestureState);
	};

	getGridStyle = () => [
		styles.sortableGrid,
		this.props.animStyle,
		this.blockPositionsSet() && { height: this.state.gridHeight }
	];

	getOperationView = key => (
		<TouchableOpacity
			onPress={() => {
				this.deleteBlock(key);
			}}
			style={this.getImageDeleteIconStyle(key)}
		>
			{this.props.operateTag === 1 && (this.props.canDeleteAll || this.itemOrder.length > 1) && (
				<Image source={require('../../../images/ic_chain_delete.png')} />
			)}
			{this.props.operateTag === 2 && <Image source={require('../../../images/ic_chain_add.png')} />}
		</TouchableOpacity>
	);

	handlePress = key => {
		this.props.onItemPress && this.props.onItemPress({ item: this.itemOrder[key] });
	};

	getItemWrapperStyle = key => [{ flex: 1 }];

	getImageDeleteIconStyle = key => [
		{
			position: 'absolute',
			top: -9,
			left: (this.state.blockWidth - 46) / 2 + 24,
			padding: 10
		}
	];

	getRpcCloseIconStyle = key => [
		{
			position: 'absolute',
			top: -9,
			left: (this.state.blockWidth - 46) / 2 - 18,
			padding: 10
		}
	];

	getRpcCloseView = key => (
		<TouchableOpacity
			onPress={() => {
				this.setState({ tempDeleteBlock: key, showDeleteNetwork: true });
			}}
			style={this.getRpcCloseIconStyle(key)}
		>
			{this.props.operateTag === 2 &&
				this.itemOrder &&
				this.itemOrder.length > 0 &&
				getIsRpc(this.itemOrder[key]?.key) && (
					<Image source={require('../../../images/letter/ic_card_rpc_delete.png')} />
				)}
		</TouchableOpacity>
	);

	getBlockStyle = key => [
		{ width: this.state.blockWidth, height: this.state.blockHeight, justifyContent: 'center' },
		this.blockPositionsSet() && {
			position: 'absolute',
			top: this.getBlock(key).currentPosition.getLayout().top,
			left: this.getBlock(key).currentPosition.getLayout().left
		},
		this.state.activeBlock === key && { zIndex: 1 },
		this.state.deleteBlock === key && { opacity: this.state.deleteBlockOpacity }
	];

	hideDeleteNetworkModal = () => {
		this.setState({ tempDeleteBlock: null, showDeleteNetwork: false });
	};

	renderDeleteNetworkModal = () => {
		const chainType = this.itemOrder[this.state.tempDeleteBlock]?.key;
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible
				onBackdropPress={this.hideDeleteNetworkModal}
				onBackButtonPress={this.hideDeleteNetworkModal}
				onSwipeComplete={this.hideDeleteNetworkModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
				statusBarTranslucent
			>
				<View style={styles.modalRoot}>
					<View style={styles.modalContainer2}>
						<Text style={styles.modalTitle}>
							{strings('chainSetting.delete_rpc', {
								networkName: getRpcName(chainType)
							})}
						</Text>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.cancelButton, isDarkMode && baseStyles.darkCancelButton]}
								onPress={this.hideDeleteNetworkModal}
							>
								<Text style={[styles.cancelText, isDarkMode && baseStyles.textDark]}>
									{strings('other.cancel')}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.okButton, isDarkMode && baseStyles.darkConfirmButton]}
								onPress={() => {
									this.hideDeleteNetworkModal();
									this.rpcCloseBlock(this.state.tempDeleteBlock);
								}}
							>
								<Text style={[styles.okText, isDarkMode && baseStyles.darkConfirmText]}>
									{strings('wallet_management.confirm_delete')}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		);
	};

	render = () => (
		<Animated.View style={this.getGridStyle()} onLayout={this.assessGridSize}>
			{this.state.gridLayout &&
				this.items.map((item, key) => (
					<Block
						key={key}
						style={this.getBlockStyle(key)}
						onLayout={this.saveBlockPositions(key)}
						panHandlers={this._panResponder.panHandlers}
						delayLongPress={this.dragActivationTreshold}
						onLongPress={this.activateDrag(key)}
						onPress={() => this.handlePress(key)}
						itemWrapperStyle={this.getItemWrapperStyle(key)}
						operationView={this.props.inactive && this.getOperationView(key)}
						rpcCloseView={
							this.props.operateTag === 2 && getIsRpc(item?.key) ? this.getRpcCloseView(key) : null
						}
						inactive={this.props.inactive}
						canDrag={this.props.canDrag}
					>
						{item}
					</Block>
				))}
			{this.state.showDeleteNetwork && this.renderDeleteNetworkModal()}
		</Animated.View>
	);
}
