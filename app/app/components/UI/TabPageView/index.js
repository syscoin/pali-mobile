import React, { PureComponent } from 'react';
import { StyleSheet, Animated, Platform, ScrollView, View } from 'react-native';
import PropTypes from 'prop-types';

import PagerView from 'react-native-pager-view';

const AnimatedViewPagerAndroid = Animated.createAnimatedComponent(PagerView);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	}
});

export default class TabPageView extends PureComponent {
	static propTypes = {
		children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
		locked: PropTypes.bool,
		initialPage: PropTypes.number,
		onScroll: PropTypes.func,
		spaceSize: PropTypes.number,
		onChangeTab: PropTypes.func,
		isIos: PropTypes.bool
	};

	static defaultProps = {
		initialPage: 0,
		spaceSize: 0,
		isIos: Platform.OS === 'ios'
	};

	state = {
		scrollXIOS: new Animated.Value(0),
		containerWidth: 0,
		ready: false
	};

	activePage = 0;
	scrollRef = React.createRef();

	componentDidUpdate = prevProps => {
		if (prevProps.initialPage !== this.props.initialPage && this.props.isIos) {
			this.state.scrollXIOS.setValue(0);
		}
	};

	refScrollto = x => {
		if (this.props.isIos) {
			this.scrollRef.current.scrollTo({
				x: this.state.containerWidth * x,
				y: 0,
				animated: false
			});
		}
	};

	goToPage = (page, animated = true, callback = true) => {
		this.activePage = page;
		if (this.props.isIos) {
			this.scrollRef.current.scrollTo({
				x: this.state.containerWidth * page,
				y: 0,
				animated
			});
		} else {
			this.scrollRef.current.setPage(page);
		}

		if (callback) {
			this.props.onChangeTab && this.props.onChangeTab(page);
		}
	};

	_onMomentumScrollBeginAndEnd = e => {
		const offsetX = e.nativeEvent.contentOffset.x;
		const page = Math.round(offsetX / this.state.containerWidth);

		if (this.activePage !== page) {
			this.activePage = page;
			this.props.onChangeTab && this.props.onChangeTab(page);
		}
	};

	_onScroll = e => {
		if (this.props.isIos) {
			const offsetX = e.nativeEvent.contentOffset.x;
			if (offsetX === 0 && !this.scrollOnMountCalled) {
				this.scrollOnMountCalled = true;
			} else {
				this.props.onScroll && this.props.onScroll(offsetX / this.state.containerWidth);
			}
		} else {
			const { position, offset } = e.nativeEvent;
			this.props.onScroll && this.props.onScroll(position + offset);
		}
	};

	handleLayout = e => {
		const { width } = e.nativeEvent.layout;
		if (!width || width <= 0 || Math.round(width) === Math.round(this.state.containerWidth)) {
			return;
		}
		if (this.props.isIos) {
			this.setState({
				containerWidth: width + this.props.spaceSize,
				ready: true
			});
		} else {
			this.setState({ containerWidth: width + this.props.spaceSize, ready: true });
		}

		this.activePage = this.props.initialPage;
		requestAnimationFrame(() => {
			if (!this.props.isIos) {
				this.scrollRef.current.setPageWithoutAnimation(this.props.initialPage);
			} else {
				this.goToPage(this.props.initialPage, false, false);
			}
		});
	};

	renderScrollableContentAndroid = () => {
		const { children } = this.props;
		return (
			<AnimatedViewPagerAndroid
				style={styles.flexOne}
				keyboardDismissMode="on-drag"
				scrollEnabled={!this.props.locked}
				ref={this.scrollRef}
				onPageSelected={e => {
					this.activePage = e.nativeEvent.position;
					this.props.onChangeTab && this.props.onChangeTab(e.nativeEvent.position);
				}}
				onPageScroll={Animated.event(
					[
						{
							nativeEvent: {
								// position: this.state.positionAndroid
								// offset: this.state.offsetAndroid
							}
						}
					],
					{
						useNativeDriver: true,
						listener: this._onScroll
					}
				)}
			>
				{this.state.ready ? children.map((child, index) => child) : null}
			</AnimatedViewPagerAndroid>
		);
	};

	renderScrollableContentIOS = () => {
		const { children } = this.props;
		return (
			<AnimatedScrollView
				ref={this.scrollRef}
				onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: this.state.scrollXIOS } } }], {
					useNativeDriver: true,
					listener: this._onScroll
				})}
				contentOffset={{
					x: this.props.initialPage * this.state.containerWidth
				}}
				horizontal
				pagingEnabled
				automaticallyAdjustContentInsets={false}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				directionalLockEnabled
				scrollsToTop={false}
				onMomentumScrollBegin={this._onMomentumScrollBeginAndEnd}
				onMomentumScrollEnd={this._onMomentumScrollBeginAndEnd}
				scrollEventThrottle={16}
				scrollEnabled={!this.props.locked}
				alwaysBounceVertical={false}
				keyboardDismissMode="on-drag"
				style={styles.flexOne}
				keyboardShouldPersistTaps="always"
			>
				{this.state.ready ? children.map((child, index) => child) : null}
			</AnimatedScrollView>
		);
	};

	render() {
		return (
			<View style={styles.flexOne} onLayout={this.handleLayout}>
				{this.props.isIos ? this.renderScrollableContentIOS() : this.renderScrollableContentAndroid()}
			</View>
		);
	}
}
