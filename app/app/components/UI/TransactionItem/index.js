import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NFTImage from '../NFTImage';
import { strings } from '../../../../locales/i18n';
import React from 'react';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import TxItem from '../TxItem';
import { getTickerByType } from '../../../util/number';
import PropTypes from 'prop-types';
import { URL, util } from 'paliwallet-core';
import { getEtherscanBaseUrl, getEtherscanTransactionUrl } from '../../../util/etherscan';
import { toDateFormatSimple } from '../../../util/date';
import { useTheme } from '../../../theme/ThemeProvider';

import iconDefault from '../../../images/img_default.png';
import iconFire from '../../../images/ic_fire.png';
import imgFire from '../../../images/img_fire.png';
import iconCopy from '../../../images/ic_copy_gray.png';
import Clipboard from '@react-native-community/clipboard';
import { getRpcChainTypeByChainId, getRpcProviderExplorerUrl, isRpcChainId } from '../../../util/ControllerUtils';
import ImageCapInset from '../ImageCapInset';
import Device from '../../../util/Device';
import { getIcTagByChainType, getIcLogoByChainType } from '../../../util/ChainTypeImages';

const styles = StyleSheet.create({
	txRow: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	txBeginMargin: {
		marginTop: 20
	},
	txNormalMargin: {
		marginTop: 14
	},
	fireIcon: {
		width: 14,
		height: 14
	},
	tokenIcon: {
		width: 40,
		height: 40,
		borderRadius: 10
	},
	networkIcon: {
		position: 'absolute',
		left: 30,
		top: 20,
		width: 20,
		height: 20
	},
	tokenSymbolLayout: {
		flex: 1,
		justifyContent: 'center',
		marginRight: 10
	},
	incomingText: {
		color: colors.$09C285
	},
	expendText: {
		color: colors.$FC6564
	},
	tokenAmount: {
		flex: 1,
		...fontStyles.semibold,
		textAlign: 'right'
	},
	tokenMaxText: {
		fontSize: 20,
		lineHeight: 24
	},
	tokenMiddleText: {
		fontSize: 16,
		lineHeight: 19
	},
	tokenMinText: {
		fontSize: 11,
		lineHeight: 13
	},
	tokenSymbol: {
		fontSize: 20,
		lineHeight: 24,
		color: colors.$030319,
		...fontStyles.semibold,
		marginLeft: 20
	},
	addressLayout: {
		flexDirection: 'row',
		marginTop: 4
	},
	fromText: {
		...fontStyles.semibold,
		fontSize: 10,
		lineHeight: 12,
		color: colors.$60657D,
		marginLeft: 20
	},
	addressText: {
		flex: 4,
		fontSize: 10,
		lineHeight: 12,
		color: colors.$60657D,
		marginLeft: 4
	},
	stateWrapper: {
		alignSelf: 'center',
		width: 14,
		height: 14
	},
	txWrapper: {},
	hashText: {
		color: colors.$60657D,
		fontSize: 12,
		lineHeight: 14,
		textAlign: 'center',
		marginLeft: 10
	},
	copyWrapper: {
		marginLeft: 10
	},
	copyHashHitSlop: {
		left: 10,
		top: 10,
		bottom: 10,
		right: 10
	},
	txDatetime: {
		color: colors.$60657D,
		fontSize: 12,
		lineHeight: 14,
		textAlign: 'center'
	},
	timeWrapper: {
		marginTop: 20,
		marginHorizontal: 20,
		marginBottom: 14
	},
	timeText: {
		color: colors.$030319,
		fontSize: 18,
		lineHeight: 21,
		...fontStyles.medium
	},
	cardWrapper: {
		flex: 1,
		marginHorizontal: -2,
		marginTop: -22,
		marginBottom: -6
	},
	cardBody: {
		marginVertical: 42,
		marginHorizontal: 38
	}
});

const TransactionItem = props => {
	const { isDarkMode } = useTheme();
	const { style, showCopyAlert, item } = props;

	const textW = (Device.getDeviceWidth() - 88 - 28 - 10) / 2;

	const getAmountWeight = text => {
		let amountWeight = { style: styles.tokenMaxText, line: 1 };
		if (!text) {
			return amountWeight;
		}
		if (text.length * 11.5 >= textW) {
			amountWeight = { style: styles.tokenMiddleText, line: 2 };
			if ((text.length * 10.4) / 2 >= textW) {
				amountWeight = { style: styles.tokenMinText, line: 3 };
			}
		}
		return amountWeight;
	};

	const navToBrowser = () => {
		const { navigation, close } = props;
		const transactionHash = item.transactionHash;
		try {
			if (isRpcChainId(item.chainId)) {
				const type = getRpcChainTypeByChainId(item.chainId);
				if (!type) {
					return;
				}
				const rpcTarget = getRpcProviderExplorerUrl(type);
				if (!rpcTarget) {
					return;
				}
				const url = `${rpcTarget}/tx/${transactionHash}`;
				const title = new URL(rpcTarget).hostname;
				navigation.push('Webview', {
					url,
					title
				});
			} else {
				const url = getEtherscanTransactionUrl(item.chainId, transactionHash);
				const etherscan_url = getEtherscanBaseUrl(item.chainId).replace('https://', '');
				navigation.push('Webview', {
					url,
					title: etherscan_url
				});
			}
			close && close();
		} catch (e) {
			util.logError(e, { message: `can't get a block explorer link for network` });
		}
	};

	const copyHash = () => {
		Clipboard.setString(item.transactionHash);
		showCopyAlert && showCopyAlert(strings('account_details.hash_copied_to_clipboard'));
	};

	const copyAddress = addr => {
		if (!addr) {
			return;
		}
		Clipboard.setString(addr);
		showCopyAlert && showCopyAlert(strings('account_details.account_copied_to_clipboard'));
	};

	const formatText = text => {
		if (!text || text.length <= 8) {
			return text;
		}
		return text.substring(0, 4) + '...' + text.substring(text.length - 4, text.length);
	};

	const renderGasFee = () => (
		<ImageCapInset
			style={styles.cardWrapper}
			source={
				Device.isAndroid()
					? isDarkMode
						? { uri: 'default_card_dark' }
						: { uri: 'default_card' }
					: isDarkMode
					? require('../../../images/default_card_dark.png')
					: require('../../../images/default_card.png')
			}
			capInsets={baseStyles.capInsets}
		>
			<TouchableOpacity style={styles.cardBody} onPress={navToBrowser} activeOpacity={activeOpacity}>
				<View style={styles.txRow}>
					<Image style={styles.tokenIcon} source={imgFire} />
					<Text style={[styles.tokenSymbol, isDarkMode && baseStyles.textDark]}>
						{strings('other.gas_fee')}
					</Text>
					<View style={baseStyles.flexGrow} />
					<Text style={styles.expendText}>{'-' + item.gasValue + getTickerByType(item.type)}</Text>
					<Image
						style={styles.networkIcon}
						source={isDarkMode ? getIcLogoByChainType(item.type) : getIcTagByChainType(item.type)}
					/>
				</View>
				<View style={[styles.txRow, styles.txBeginMargin]}>
					<TxItem.TxItemStatus style={styles.stateWrapper} tx={item} />
					<Text style={[styles.hashText, isDarkMode && baseStyles.textDark]}>
						{formatText(item.transactionHash)}
					</Text>
					<TouchableOpacity
						onPress={copyHash}
						activeOpacity={activeOpacity}
						hitSlop={styles.copyHashHitSlop}
						style={styles.copyWrapper}
					>
						<Image source={iconCopy} />
					</TouchableOpacity>
					<View style={baseStyles.flexGrow} />
					<Text style={[styles.txDatetime, isDarkMode && baseStyles.textDark]}>
						{toDateFormatSimple(item.time).toUpperCase()}
					</Text>
				</View>
			</TouchableOpacity>
		</ImageCapInset>
	);

	const renderToken = (token, index) => {
		const weight = getAmountWeight(token.formatAmount);
		return (
			<View style={[styles.txRow, index >= 0 && styles.txBeginMargin]} key={index}>
				{!token.symbol ? (
					<Image style={styles.tokenIcon} source={require('../../../images/img_conrtact.png')} />
				) : (
					<NFTImage
						style={styles.tokenIcon}
						imageUrl={token.logo}
						defaultImg={iconDefault}
						resizeMode={'contain'}
					/>
				)}
				<View style={styles.tokenSymbolLayout}>
					<Text
						style={[styles.tokenSymbol, isDarkMode && baseStyles.textDark]}
						numberOfLines={1}
						ellipsizeMode={'tail'}
						allowFontScaling={false}
					>
						{token.isApproval
							? token.symbol + ' ' + strings('transactions.approval')
							: token.symbol || strings('transactions.contract_executed')}
					</Text>
					<TouchableOpacity
						style={styles.addressLayout}
						onPress={() =>
							copyAddress(
								token.isApproval
									? token.spender
									: !token.symbol
									? token.toContract
									: token.fromAddress === item.selectedAddress
									? token.toAddress
									: token.fromAddress
							)
						}
						activeOpacity={activeOpacity}
						hitSlop={styles.copyHashHitSlop}
					>
						<Text style={[styles.fromText, isDarkMode && baseStyles.textDark]}>
							{strings(
								token.isApproval
									? 'other.to'
									: !token.symbol
									? 'transactions.interacted_with'
									: token.fromAddress === item.selectedAddress
									? 'other.to'
									: 'other.from'
							)}
						</Text>
						<Text
							style={[styles.addressText, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							ellipsizeMode={'tail'}
						>
							{token.isApproval
								? formatText(token.spender)
								: !token.symbol
								? formatText(token.toContract) || strings('transaction.value_not_available')
								: token.fromAddress === item.selectedAddress
								? token.toEnsName || formatText(token.toAddress)
								: token.fromEnsName || formatText(token.fromAddress)}
						</Text>
					</TouchableOpacity>
				</View>
				<Text
					style={[styles.tokenAmount, token.incoming ? styles.incomingText : styles.expendText, weight.style]}
					numberOfLines={weight.line}
					ellipsizeMode={'tail'}
					allowFontScaling={false}
				>
					{token.showAmount ? token.formatAmount : ''}
				</Text>
				<Image
					style={styles.networkIcon}
					source={isDarkMode ? getIcLogoByChainType(item.type) : getIcTagByChainType(item.type)}
				/>
			</View>
		);
	};

	const renderNormalTx = () => {
		return (
			<ImageCapInset
				style={[styles.cardWrapper]}
				source={
					Device.isAndroid()
						? isDarkMode
							? { uri: 'default_card_dark' }
							: { uri: 'default_card' }
						: isDarkMode
						? require('../../../images/default_card_dark.png')
						: require('../../../images/default_card.png')
				}
				capInsets={baseStyles.capInsets}
			>
				<TouchableOpacity style={styles.cardBody} onPress={navToBrowser} activeOpacity={activeOpacity}>
					{renderToken(item, -1)}
					{item.tokenTxs?.map((token, index) => renderToken(token, index))}
					{!!item.transactionHash && (
						<View style={[styles.txRow, styles.txBeginMargin]}>
							<TxItem.TxItemStatus style={styles.stateWrapper} tx={item} />
							<Text style={[styles.hashText, isDarkMode && baseStyles.textDark]}>
								{formatText(item.transactionHash)}
							</Text>
							<TouchableOpacity
								onPress={copyHash}
								activeOpacity={activeOpacity}
								hitSlop={styles.copyHashHitSlop}
								style={styles.copyWrapper}
							>
								<Image source={iconCopy} />
							</TouchableOpacity>
							<View style={baseStyles.flexGrow} />
							{item.gasValue === '0' && (
								<Text style={[styles.txDatetime, isDarkMode && baseStyles.textDark]}>
									{toDateFormatSimple(item.time).toUpperCase()}
								</Text>
							)}
						</View>
					)}
					{item.gasValue !== '0' && (
						<View style={[styles.txRow, styles.txNormalMargin]}>
							<Image style={styles.fireIcon} source={iconFire} />
							<Text style={[styles.hashText, isDarkMode && baseStyles.textDark]}>
								{'-' + item.gasValue + getTickerByType(item.type)}
							</Text>
							<View style={baseStyles.flexGrow} />
							<Text style={[styles.txDatetime, isDarkMode && baseStyles.textDark]}>
								{toDateFormatSimple(item.time).toUpperCase()}
							</Text>
						</View>
					)}
				</TouchableOpacity>
			</ImageCapInset>
		);
	};

	const renderTime = () => (
		<View style={styles.timeWrapper}>
			<Text style={[styles.timeText, isDarkMode && baseStyles.textDark]}>{item.formatTime}</Text>
		</View>
	);

	return (
		<View style={[styles.txWrapper, style]}>
			{item.isTime ? renderTime() : item.isGasItem ? renderGasFee() : renderNormalTx()}
		</View>
	);
};

TransactionItem.propTypes = {
	style: PropTypes.object,
	navigation: PropTypes.object,
	close: PropTypes.func,
	showCopyAlert: PropTypes.func,
	item: PropTypes.object
};

export default TransactionItem;
