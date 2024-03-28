import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { colors, activeOpacity, baseStyles, fontStyles } from '../../../styles/common';
import { safeToChecksumAddress } from '../../../util/address';
import Clipboard from '@react-native-community/clipboard';
import iconPending from '../../../images/tx_pending.png';
import iconSuccess from '../../../images/ic_success.png';
import iconFail from '../../../images/ic_fail.png';
import iconCopy from '../../../images/tx_copy.png';
import iconBrowser from '../../../images/browser.png';
import iconFire from '../../../images/ic_fire.png';
import iconDefault from '../../../images/img_default.png';
import { strings } from '../../../../locales/i18n';
import { CrossChainType } from 'paliwallet-core';
import NFTImage from '../NFTImage';
import { useTheme } from '../../../theme/ThemeProvider';

const defaultAmountColor = '#34C738';
const pendingBgColor = '#FF7952';
const styles = StyleSheet.create({
	item: {
		paddingVertical: 12
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		lineHeight: 33
	},
	header2: {
		flexDirection: 'row',
		alignItems: 'center',
		lineHeight: 33
	},
	amount: {
		fontSize: 24,
		color: defaultAmountColor,
		...fontStyles.bold
	},
	gas: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	statusPending: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 14,
		borderRadius: 11,
		backgroundColor: pendingBgColor,
		height: 22
	},
	pendingImage: {
		marginRight: 5
	},
	pendingText: {
		fontSize: 12,
		color: colors.white
	},
	cancelText: {
		fontSize: 14,
		color: colors.$030319
	},
	migratedText: {
		fontSize: 14,
		color: colors.$FFA000
	},
	txTo: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	txHash: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	datetime: {
		fontSize: 12,
		color: colors.$8F92A1
	},
	dirTitle: {
		fontSize: 10,
		marginTop: 10,
		color: colors.$8F92A1
	},
	to: {
		fontSize: 12,
		marginTop: 4,
		color: colors.$8F92A1
	},
	hash: {
		fontSize: 12,
		marginTop: 4,
		color: colors.$8F92A1
	},
	symbol: {
		fontSize: 16,
		lineHeight: 22,
		marginLeft: 12,
		color: colors.$030319
	},
	hitSlop: {
		bottom: 6
	},
	txRow: {
		flexDirection: 'row'
	},
	tokenIcon: {
		width: 24,
		height: 24,
		borderRadius: 10
	},
	tokenSymbol: {
		fontSize: 20,
		lineHeight: 24,
		marginLeft: 8,
		color: colors.$030319
	}
});

const amountColor = ['#09C285', '#FC6564', colors.$FFA000];

const TxItem = ({ style, ...props }) => <View style={[styles.item, style]} {...props} />;
const TxItemHeader = ({ style, ...props }) => (
	<View style={[styles.header, style]}>
		<TxItemTokenInfo {...props} />
		<View style={styles.txRow}>
			<TxItemAmount {...props} />
			<TxItemStatus {...props} />
		</View>
	</View>
);
// eslint-disable-next-line react/prop-types
const TxItemHeaderAndSymbol = ({ style, ...props }) => (
	<View style={[styles.header2, style]}>
		<TxItemAmount2 {...props} />
		{/* eslint-disable-next-line react/prop-types */}
		{props.symbol && <Text style={styles.symbol}>{props.symbol}</Text>}
		<View style={baseStyles.flexGrow} />
		<TxItemStatus {...props} />
	</View>
);
const TxItemAmount = ({ style, ...props }) => {
	const { isToken, tx, selectedAddress, decimalValue, isETHClaim, gasValue } = props;
	const incoming = isETHClaim || safeToChecksumAddress(isToken ? tx.to : tx.transaction.to) === selectedAddress;
	const amount = !incoming ? '- ' + decimalValue : '+ ' + decimalValue;
	const amountColorIndex = incoming ? 0 : 1;

	const isGasItem = Boolean(tx.isGasItem);

	if (isGasItem) {
		return (
			<View style={[styles.gas, style]}>
				<Text style={[styles.amount, { color: amountColor[1] }, style]}>{'- ' + gasValue}</Text>
			</View>
		);
	}
	return <Text style={[styles.amount, { color: amountColor[amountColorIndex] }, style]}>{amount}</Text>;
};
TxItemAmount.propTypes = {
	isToken: PropTypes.bool,
	isETHClaim: PropTypes.bool,
	tx: PropTypes.object,
	selectedAddress: PropTypes.string,
	decimalValue: PropTypes.string,
	gasValue: PropTypes.string
};
const TxItemAmount2 = ({ style, ...props }) => {
	const { isToken, isMigrated, tx, selectedAddress, isClaim, decimalValue } = props;
	const incoming = isClaim || safeToChecksumAddress(isToken ? tx.to : tx.transaction.to) === selectedAddress;
	const amount = isMigrated ? decimalValue : !incoming ? '- ' + decimalValue : '+ ' + decimalValue;
	const amountColorIndex = isMigrated ? 2 : incoming ? 0 : 1;

	return <Text style={[styles.amount, { color: amountColor[amountColorIndex] }, style]}>{amount}</Text>;
};
TxItemAmount2.propTypes = {
	isToken: PropTypes.bool,
	isMigrated: PropTypes.bool,
	isClaim: PropTypes.bool,
	tx: PropTypes.object,
	selectedAddress: PropTypes.string,
	decimalValue: PropTypes.string
};
const TxItemTokenInfo = ({ ...props }) => {
	const isGasItem = props.tx.isGasItem;
	return (
		<View style={styles.txRow}>
			{isGasItem ? (
				<NFTImage style={styles.tokenIcon} imageUrl={props.logo} defaultImg={iconDefault} />
			) : (
				<Image style={styles.tokenIcon} source={iconFire} />
			)}
			{isGasItem ? (
				<Text style={styles.tokenSymbol}>{strings('other.gas_fee')}</Text>
			) : props.symbol ? (
				<Text style={styles.tokenSymbol}>{props.symbol}</Text>
			) : (
				<></>
			)}
		</View>
	);
};
TxItemTokenInfo.propTypes = {
	logo: PropTypes.string,
	tx: PropTypes.object,
	symbol: PropTypes.string
};
const TxItemStatus = ({ style, ...props }) => {
	const { isDarkMode } = useTheme();
	const status = props.tx.status;
	switch (status) {
		case 'submitted':
			return (
				<View style={[styles.statusPending, style]}>
					<Image style={styles.pendingImage} source={iconPending} />
					<Text style={styles.pendingText}>{strings('other.pending')}</Text>
				</View>
			);
		case 'confirmed':
			if (props.tx.extraInfo) {
				if (props.tx.extraInfo.crossChainType) {
					if (
						props.tx.extraInfo.crossChainType === CrossChainType.depositPolygon ||
						props.tx.extraInfo.crossChainType === CrossChainType.depositArb
					) {
						if (props.tx.extraInfo.crossChainDone) {
							if (props.tx.extraInfo.tryCancelHash) {
								return (
									<View style={[style]}>
										<Text style={styles.migratedText}>
											{strings('other.migrated_cancel_failed')}
										</Text>
									</View>
								);
							}
							return (
								<View style={[style]}>
									<Text style={styles.migratedText}>{strings('other.migrated_complete')}</Text>
								</View>
							);
						}
						return (
							<View style={[style]}>
								<Text style={styles.migratedText}>{strings('other.migrating')}</Text>
							</View>
						);
					}
				}
				if (props.tx.extraInfo.tryCancelHash) {
					return (
						<View style={[style]}>
							<Text style={[styles.cancelText, isDarkMode && baseStyles.textDark]}>
								{strings('other.tx_cancel_failed')}
							</Text>
						</View>
					);
				}
			}
			return (
				<View style={[styles.status, style]}>
					<Image source={iconSuccess} />
				</View>
			);
		case 'cancelled':
			return (
				<View style={[style]}>
					<Text style={[styles.cancelText, isDarkMode && baseStyles.textDark]}>
						{strings('transactions.cancelled')}
					</Text>
				</View>
			);
		case 'approved':
		case 'unapproved':
		case 'signed':
		case 'failed':
		case 'rejected':
			return (
				<View style={[styles.status, style]}>
					<Image source={iconFail} />
				</View>
			);

		default:
			return <></>;
	}
};
TxItemStatus.propTypes = {
	tx: PropTypes.object
};

const TxItemDateTime = ({ style, ...props }) => <Text style={[styles.datetime, style]} {...props} />;

const TxItemTo = ({ style, ...props }) => {
	const onPress = () => {
		Clipboard.setString(props.originAddr);
		props.showAlert();
	};

	return (
		<TouchableOpacity onPress={onPress} activeOpacity={activeOpacity} hitSlop={styles.hitSlop}>
			<Text style={styles.dirTitle}>{props.title || strings('other.to_to')}</Text>
			<View style={styles.txTo}>
				<Text style={[styles.to, style]} {...props}>
					{props.toAddr}
				</Text>
				<Image source={iconCopy} />
			</View>
		</TouchableOpacity>
	);
};
TxItemTo.propTypes = {
	originAddr: PropTypes.string,
	showAlert: PropTypes.func,
	toAddr: PropTypes.string,
	title: PropTypes.string
};
const TxItemHash = ({ style, ...props }) => {
	const onPress = () => {
		props.navToBrowser();
	};

	return (
		<TouchableOpacity onPress={onPress} activeOpacity={activeOpacity} hitSlop={styles.hitSlop}>
			<Text style={styles.dirTitle}>{strings('other.transaction_hash')}</Text>
			<View style={styles.txHash}>
				<Text style={[styles.hash, style]} {...props}>
					{props.txHash}
				</Text>
				<Image source={iconBrowser} />
			</View>
		</TouchableOpacity>
	);
};
TxItemHash.propTypes = {
	navToBrowser: PropTypes.func,
	txHash: PropTypes.string,
	originHash: PropTypes.string
};

TxItem.Header2 = TxItemHeaderAndSymbol;
TxItem.Header = TxItemHeader;
TxItem.Datetime = TxItemDateTime;
TxItem.To = TxItemTo;
TxItem.Hash = TxItemHash;
TxItem.TxItemStatus = TxItemStatus;

export default TxItem;

const stylePropType = PropTypes.oneOfType([PropTypes.object, PropTypes.array]);

TxItem.propTypes = {
	style: stylePropType
};
TxItemHeader.propTypes = {
	style: stylePropType
};
TxItemHeaderAndSymbol.prototype = {
	style: stylePropType
};
TxItemAmount.propTypes = {
	style: stylePropType
};
TxItemAmount2.propTypes = {
	style: stylePropType
};
TxItemStatus.propTypes = {
	style: stylePropType
};
TxItemDateTime.propTypes = {
	style: stylePropType
};
TxItemTo.propTypes = {
	style: stylePropType
};
TxItemHash.propTypes = {
	style: stylePropType
};
TxItemTokenInfo.propTypes = {
	style: stylePropType
};
