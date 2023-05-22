import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';

import { colors } from '../../../styles/common';
import { SvgUri } from 'react-native-svg';

import { strings } from '../../../../locales/i18n';

import { URL } from 'gopocket-core';

import { callSqlite } from '../../../util/ControllerUtils';

import AntIcon from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';

const styles = StyleSheet.create({
	animatedView: {
		width: '45%',
		padding: '3%',
		margin: '2.5%',
		borderRadius: 20,
		overflow: 'hidden'
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	innerRow: {
		flexDirection: 'row',
		flex: 1,
		paddingRight: 10
	},
	faviconContainer: {
		width: 22,
		height: 22,
		marginRight: 10,
		backgroundColor: 'white',
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center'
	},
	faviconImage: {
		width: 18,
		height: 18,
		borderRadius: 50
	},
	text: {
		flexShrink: 1
	},
	touchableOpacity: {
		borderColor: colors.brandPink500, // You have to replace 'colors.brandPink500' with an actual color code.
		borderWidth: 0,
		marginTop: 10
	},
	image: {
		width: '100%',
		height: 180,
		borderRadius: 20,
		backgroundColor: 'white'
	},
	flexOne: {
		flex: 1
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: '3%',
		backgroundColor: 'white',
		position: 'relative',
		zIndex: 999,
		alignItems: 'center'
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: colors.brandPink50, // replace with your color
		padding: 10,
		borderRadius: 50
	},
	addButtonText: {
		color: colors.brandPink300, // replace with your color
		marginLeft: 5
	},
	optionsButton: {
		width: 15,
		height: 30,
		marginRight: 10
	},
	optionsContainer: {
		position: 'absolute',
		right: 20,
		top: '100%',
		backgroundColor: '#fff',
		padding: 10,
		borderRadius: 12,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
		zIndex: 9999,
		width: 160,
		height: 40
	},
	closeTabsButton: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	closeTabsButtonText: {
		marginLeft: 10
	},
	scrollView: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		margin: '0.5%'
	}
});

const TabItem = ({ tab, isActive, activeTab, onPress, closeTab, index }) => {
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const [favicon, setFavicon] = useState(null);

	const handlePress = () => {
		Animated.timing(scaleAnim, {
			toValue: 1.05,
			duration: 150,
			useNativeDriver: true
		}).start(() => {
			onPress();
		});
	};

	useEffect(() => {
		const getFavicon = async () => {
			if (tab.url === 'gopocket://homepage') {
				return setFavicon(require('../../../images/ic_dapp_home.png'));
			}

			const hName = new URL(tab.url).hostname;
			//get favicon from browser history
			const history = await callSqlite('getBrowserHistory');
			for (const subHistory of history) {
				const hostName = new URL(subHistory.url).hostname;
				if (hostName === hName) {
					if (subHistory.icon) {
						return setFavicon({ uri: subHistory.icon });
					}
				}
			}

			//use website url to get the favicon.
			return setFavicon({ uri: 'https://' + new URL(tab.url).hostname + '/favicon.ico' });
		};
		if (tab.url) getFavicon();
	}, [tab.url]);

	return (
		<Animated.View
			style={[
				styles.animatedView,
				{ backgroundColor: isActive ? colors.brandPink500 : colors.grey100 },
				{ transform: [{ scale: scaleAnim }] }
			]}
		>
			<View style={styles.row}>
				<View style={styles.innerRow}>
					{favicon && (
						<View style={styles.faviconContainer}>
							{favicon.uri && favicon.uri.slice(-4) === '.svg' ? (
								<SvgUri width="18" height="18" uri={favicon.uri} />
							) : (
								<Image style={styles.faviconImage} source={favicon} />
							)}
						</View>
					)}
					<Text
						style={[styles.text, { color: index === activeTab ? 'white' : colors.black }]}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{tab.title}
					</Text>
				</View>
				<TouchableOpacity
					onPress={() => {
						closeTab(tab.id);
					}}
				>
					<AntIcon color={index === activeTab ? colors.white : colors.black} name="close" size={16} />
				</TouchableOpacity>
			</View>
			<TouchableOpacity activeOpacity={1} style={styles.touchableOpacity} onPress={handlePress}>
				<Image source={{ uri: tab.uri }} style={styles.image} />
			</TouchableOpacity>
		</Animated.View>
	);
};

const OpenedTabs = ({ tabs, newTab, activeTab, openOpenedTab, closeTab, closeAllTabs }) => {
	const [showOptions, setShowOptions] = useState(false);

	return (
		<View style={styles.flexOne}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.addButton} onPress={() => newTab()}>
					<Entypo color={colors.brandPink300} name="plus" size={22} />
					<Text style={styles.addButtonText}>{strings('browser.addTab')}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.optionsButton} onPress={() => setShowOptions(!showOptions)}>
					<Entypo color={colors.grey600} name="dots-three-vertical" size={24} />
				</TouchableOpacity>
				{showOptions && (
					<View style={styles.optionsContainer}>
						<TouchableOpacity
							style={styles.closeTabsButton}
							onPress={() => {
								closeAllTabs();
								setShowOptions(false);
							}}
						>
							<AntIcon color={colors.black} name="closecircleo" size={18} />
							<Text style={styles.closeTabsButtonText}>{strings('browser.closeAll')}</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
			<ScrollView contentContainerStyle={styles.scrollView}>
				{tabs.map((tab, index) => (
					<TabItem
						key={tab.id}
						tab={tab}
						closeTab={closeTab}
						onPress={() => openOpenedTab(index)}
						index={index}
						activeTab={activeTab}
						isActive={index === activeTab}
					/>
				))}
			</ScrollView>
		</View>
	);
};

export default OpenedTabs;
