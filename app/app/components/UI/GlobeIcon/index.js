import { Animated, DeviceEventEmitter, StyleSheet, View } from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '../Icon';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	globeContainer: {
		marginTop: 5,
		width: 28,
		height: 28,
		overflow: 'visible',
		alignItems: 'center',
		justifyContent: 'center'
	}
});

const GlobeIcon = ({ focused, onPress }) => {
	const scale = useRef(new Animated.Value(1)).current;
	const rotate = useRef(new Animated.Value(0)).current;
	const [animating, setAnimating] = useState(false);
	const color = focused ? colors.$D20058 : colors.$9B989B;

	useEffect(() => {
		const onWalletTabFocused = () => {
			scale.setValue(1);
			rotate.setValue(0);
		};

		DeviceEventEmitter.addListener('onWalletTabFocused', onWalletTabFocused);

		return () => {
			DeviceEventEmitter.removeAllListeners('onWalletTabFocused', onWalletTabFocused);
		};
	}, [scale, rotate]);

	useEffect(() => {
		const onBrowserTabFocused = () => {
			if (!animating) {
				startAnimation();
			}
		};

		DeviceEventEmitter.addListener('onBrowserTabFocused', onBrowserTabFocused);

		// return () => {
		// 	DeviceEventEmitter.removeAllListeners('onBrowserTabFocused', onBrowserTabFocused);
		// };
	}, [animating, startAnimation]);

	const startAnimation = useCallback(() => {
		setAnimating(true);
		rotate.setValue(0);
		Animated.parallel([
			Animated.timing(scale, {
				toValue: 1.15,
				duration: 300,
				useNativeDriver: true
			}),
			Animated.timing(rotate, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true
			})
		]).start(() => {
			setAnimating(false);
		});
	}, [scale, rotate, setAnimating]);

	const spin = rotate.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg']
	});

	const handlePress = useCallback(() => {
		if (focused) {
			DeviceEventEmitter.emit('onBrowserTabFocused');
		}
		onPress();
	}, [onPress, focused]);

	return (
		<View onPress={handlePress} style={styles.globeContainer}>
			<Animated.View
				style={{
					transform: [{ scale }, { rotate: spin }]
				}}
			>
				<Icon width="22" height="22" color={color} name="globe" />
			</Animated.View>
		</View>
	);
};

export default GlobeIcon;
