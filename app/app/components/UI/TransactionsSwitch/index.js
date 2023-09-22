import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { activeOpacity, colors, fontStyles } from '../../../styles/common';
import React, { useRef, useState } from 'react';

import iconSwitchClose from '../../../images/ic_tran_fold.png';
import iconSwitchOpen from '../../../images/ic_tran_unfold.png';
import Modal from 'react-native-modal';
import Popover from '../Popover';
import Device from '../../../util/Device';
import { strings } from '../../../../locales/i18n';
import PropTypes from 'prop-types';

const popPadding = 10;

const styles = StyleSheet.create({
	selectView: {
		height: 18,
		position: 'absolute',
		top: 4,
		bottom: 4,
		right: 0
	},
	btnWrapper: {
		alignItems: 'center',
		flexDirection: 'row'
	},
	selectText: {
		color: colors.$333333,
		fontSize: 14,
		lineHeight: 16
	},
	switchBtn: {
		marginLeft: 4
	},
	switchBtnHit: {
		top: 10,
		bottom: 10,
		right: 10,
		left: 10
	},
	switchPop: {
		margin: 0,
		marginHorizontal: popPadding
	},
	switchPopLayout: {
		marginVertical: 6
	},
	popItem: {
		width: 91,
		paddingLeft: 20
	},
	popItemText: {
		height: 30,
		color: colors.$666666,
		fontSize: 14,
		lineHeight: 30,
		...fontStyles.normal
	},
	popSelectText: {
		color: colors.$FF9E9E,
		...fontStyles.semibold
	}
});

const TransactionsSwitch = props => {
	const [txSwitch, setTxSwitch] = useState(false);
	const [buttonRect, setButtonRect] = useState(null);
	const buttonRef = useRef();

	const getTxTypeName = txType => {
		if (txType === 1) {
			return strings('transaction.receive');
		} else if (txType === 2) {
			return strings('transaction.send');
		} else if (txType === 3) {
			return strings('transaction.others');
		}
		return strings('transaction.all');
	};

	const closeTxSwitch = () => {
		setTxSwitch(false);
	};

	const showTxSwitch = () => {
		buttonRef?.current?.measure((ox, oy, width, height, px, py) => {
			const statusBarHeight = StatusBar.currentHeight;
			const dis = Device.isAndroid() ? statusBarHeight : 0;
			setButtonRect({ x: px - popPadding - width - 3, y: py - dis + 10, width: width * 2, height });
			setTxSwitch(true);
		});
	};

	const setTxType = type => {
		setTxSwitch(false);
		props.onChangeType && props.onChangeType(type);
	};

	const renderTxSwitchMenu = () => (
		<Modal style={styles.switchPop} transparent visible={txSwitch} onRequestClose={closeTxSwitch}>
			<Popover isVisible={txSwitch} fromRect={buttonRect} onClose={closeTxSwitch} disX={-23}>
				<View style={styles.switchPopLayout}>
					<TouchableOpacity style={styles.popItem} activeOpacity={activeOpacity} onPress={() => setTxType(0)}>
						<Text style={[styles.popItemText, props.defaultType === 0 && styles.popSelectText]}>
							{getTxTypeName(0)}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.popItem} activeOpacity={activeOpacity} onPress={() => setTxType(1)}>
						<Text style={[styles.popItemText, props.defaultType === 1 && styles.popSelectText]}>
							{getTxTypeName(1)}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.popItem} activeOpacity={activeOpacity} onPress={() => setTxType(2)}>
						<Text style={[styles.popItemText, props.defaultType === 2 && styles.popSelectText]}>
							{getTxTypeName(2)}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.popItem} activeOpacity={activeOpacity} onPress={() => setTxType(3)}>
						<Text style={[styles.popItemText, props.defaultType === 3 && styles.popSelectText]}>
							{getTxTypeName(3)}
						</Text>
					</TouchableOpacity>
				</View>
			</Popover>
		</Modal>
	);

	return (
		<View style={[styles.selectView, props.style]}>
			<TouchableOpacity
				style={styles.btnWrapper}
				activeOpacity={activeOpacity}
				hitSlop={styles.switchBtnHit}
				onPress={showTxSwitch}
			>
				<Text style={styles.selectText}>{getTxTypeName(props.defaultType)}</Text>
				<Image ref={buttonRef} style={styles.switchBtn} source={txSwitch ? iconSwitchClose : iconSwitchOpen} />
			</TouchableOpacity>
			{renderTxSwitchMenu()}
		</View>
	);
};

TransactionsSwitch.propTypes = {
	style: PropTypes.object,
	defaultType: PropTypes.number,
	onChangeType: PropTypes.func
};

export default TransactionsSwitch;
