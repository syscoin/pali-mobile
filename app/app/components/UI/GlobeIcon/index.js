import { Animated, DeviceEventEmitter, StyleSheet, InteractionManager } from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import Icon from '../Icon';

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
	const scale = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
	const rotate = useRef(new Animated.Value(0)).current;
	const [animating, setAnimating] = useState(false);
	const color = focused ? '#D20058' : '#9B989B';

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

		return () => {
			DeviceEventEmitter.removeAllListeners('onBrowserTabFocused', onBrowserTabFocused);
		};
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

	const stopAnimation = useCallback(() => {
		Animated.timing(rotate, {
			toValue: 0,
			duration: 0,
			useNativeDriver: true
		}).start(() => {
			setAnimating(false);
		});
	}, [rotate]);

	useEffect(() => {
		if (focused) {
			InteractionManager.runAfterInteractions(() => {
				startAnimation();
			});
		} else {
			InteractionManager.runAfterInteractions(() => {
				stopAnimation();
			});
		}
	}, [focused, startAnimation, stopAnimation]);

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
		<TouchableWithoutFeedback onPress={handlePress} style={styles.globeContainer}>
			<Animated.View
				style={{
					transform: [{ scale }, { rotate: spin }]
				}}
			>
				<Icon width="22" height="22" color={color} name="globe" />
			</Animated.View>
		</TouchableWithoutFeedback>
	);
};

export default GlobeIcon;
