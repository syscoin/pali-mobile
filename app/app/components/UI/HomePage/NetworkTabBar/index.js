import React, { PureComponent } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../../styles/common';
import { EasingNode } from 'react-native-reanimated';
import { chainToChainType, getTabIcon } from '../../../../util/ChainTypeImages';
import { ThemeContext } from '../../../../theme/ThemeProvider';

import tabFavourites from '../../../../images/ic_tab_favourites.png';

const styles = StyleSheet.create({
	tab: {
		height: 30,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingRight: 20,
		borderRadius: 15
	},
	tabActive: {
		paddingRight: 14,
		paddingLeft: 14,
		marginRight: 20
	},
	tabs: {
		paddingTop: 30,
		paddingBottom: 10,
		flexDirection: 'row',
		marginHorizontal: 20
	},
	tabText: {
		fontSize: 14,
		lineHeight: 16,
		...fontStyles.normal
	},
	tabActiveText: {
		fontSize: 14,
		lineHeight: 16,
		...fontStyles.semibold
	},
	tabIcon: {
		marginRight: 4
	},
	hitSlop: {
		top: 10,
		bottom: 10
	}
});

class NetworkTabBar extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		goToPage: PropTypes.func,
		activeTab: PropTypes.any,
		tabs: PropTypes.array,
		backgroundColor: PropTypes.string
	};

	state = {};

	async componentDidMount() {
		this.props.tabs.forEach((name, page) => {
			const isTabActive = parseInt(this.props.activeTab) === page;
			const animated = new Animated.Value(isTabActive ? 1 : 0);
			this.setState({ [name]: animated });
		});
	}

	//fontWeight 400 - 700, fontSize 14 - 22, color: colors.$8F92A1  colors.brandPink300
	renderTab = (name, chain, page, isTabActive, animated, onPressHandler) => {
		const { isDarkMode } = this.context;
		const color = animated.interpolate({
			inputRange: [0, 1],
			outputRange: [isDarkMode ? colors.white : colors.$8F92A1, colors.brandPink500]
		});
		const backgroundColor = animated.interpolate({
			inputRange: [0, 1],
			outputRange: [colors.transparent, colors.brandPink50]
		});
		const scaleOpacity = animated.interpolate({
			inputRange: [0, 1],
			outputRange: [0, 1]
		});
		const icon = this.getIcon(chain);
		return (
			<TouchableOpacity
				activeOpacity={1}
				key={name}
				onPress={() => onPressHandler(page)}
				hitSlop={styles.hitSlop}
			>
				<Animated.View
					style={[
						isTabActive ? { backgroundColor } : { backgroundColor: colors.transparent },
						styles.tab,
						isTabActive && styles.tabActive
					]}
				>
					{isTabActive && (
						<Animated.Image
							style={[styles.tabIcon, { transform: [{ scale: scaleOpacity }] }]}
							source={icon}
						/>
					)}
					<Animated.Text style={[{ color }, isTabActive ? styles.tabActiveText : styles.tabText]}>
						{name}
					</Animated.Text>
				</Animated.View>
			</TouchableOpacity>
		);
	};

	getIcon(chain) {
		if (chain === -1) {
			return tabFavourites;
		}
		return getTabIcon(chainToChainType(chain));
	}

	onPressHandler(page) {
		// LayoutAnimation.easeInEaseOut();
		// LayoutAnimation.linear();
		// LayoutAnimation.spring();
		// LayoutAnimation.configureNext(
		// 	LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY)
		// );
		this.props.goToPage(page);
		this.props.tabs.forEach((name, index) => {
			const isTabActive = index === page;
			isTabActive ? this.startExpandAnimated(name) : this.startReduceAnimated(name);
		});
	}

	startReduceAnimated = name => {
		Animated.timing(this.state[name], {
			toValue: 0,
			duration: 300,
			easing: EasingNode.linear,
			useNativeDriver: false
		}).start();
	};

	startExpandAnimated = name => {
		Animated.timing(this.state[name], {
			toValue: 1,
			duration: 300,
			easing: EasingNode.linear,
			useNativeDriver: false
		}).start();
	};

	render() {
		return (
			<ScrollView showsHorizontalScrollIndicator={false} horizontal>
				<View style={[styles.tabs, { backgroundColor: this.props.backgroundColor }]}>
					{this.props.tabs.map((tabName, page) => {
						const arr = tabName.split(':');
						const name = arr[0];
						const chain = Number(arr[1]);
						const isTabActive = parseInt(this.props.activeTab) === page;
						const animated = this.state[tabName] || new Animated.Value(isTabActive ? 1 : 0);
						return this.renderTab(name, chain, page, isTabActive, animated, this.onPressHandler.bind(this));
					})}
				</View>
			</ScrollView>
		);
	}
}

export default NetworkTabBar;
