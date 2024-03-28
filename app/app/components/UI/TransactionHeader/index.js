import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { getHost } from '../../../util/browser';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import { renderShortAddress } from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { useTheme } from '../../../theme/ThemeProvider';
import img_approve from '../../../images/img_approve.png';
import img_claim from '../../../images/imtoken.png';
import TransactionTypes from '../../../core/TransactionTypes';
import { strings } from '../../../../locales/i18n';
import { callSqlite } from '../../../util/ControllerUtils';

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

const styles = StyleSheet.create({
	transactionHeader: {
		marginTop: 32,
		justifyContent: 'center',
		alignItems: 'center'
	},
	domainLogo: {
		width: 56,
		height: 56,
		borderRadius: 10
	},
	assetLogo: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10
	},
	domanUrlContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginTop: 16
	},
	domainUrl: {
		...fontStyles.bold,
		textAlign: 'center',
		fontSize: 13,
		color: colors.$202020
	},
	deeplinkIconContainer: {
		borderWidth: 1,
		borderColor: colors.$888888,
		width: 56,
		height: 56,
		borderRadius: 10
	},
	deeplinkIcon: {
		alignSelf: 'center',
		lineHeight: 56
	}
});

/**
 * PureComponent that renders the transaction header used for signing, granting permissions and sending
 */
const TransactionHeader = props => {
	const { isDarkMode } = useTheme();
	const originIsDeeplink =
		props.currentPageInformation.origin === ORIGIN_DEEPLINK ||
		props.currentPageInformation.origin === ORIGIN_QR_CODE;
	const originIsMoveToL2 =
		props.currentPageInformation.origin === TransactionTypes.ORIGIN_MOVE_TO_L2 ||
		props.currentPageInformation.origin === TransactionTypes.ORIGIN_CANCEL_APPROVAL;
	const originIsClaim = props.currentPageInformation.origin === TransactionTypes.ORIGIN_CLAIM;
	const originIsWalletConnect = props.currentPageInformation.origin?.includes(WALLET_CONNECT_ORIGIN);

	const [dappImg, setDappImg] = useState(null);

	const initDappImg = async url => {
		if (!url) {
			return;
		}
		const dapp = await callSqlite('getWhitelistDapp', getHost(url)?.toLowerCase());
		if (dapp?.img) {
			setDappImg(dapp?.img);
		}
	};

	const renderTopIcon = () => {
		const { currentEnsName, icon, origin } = props.currentPageInformation;
		let url = props.currentPageInformation.url;
		if (originIsMoveToL2 || originIsClaim) {
			const img = originIsMoveToL2 ? img_approve : img_claim;
			return (
				<View style={styles.domainLogo}>
					<Image source={img} />
				</View>
			);
		}
		if (originIsDeeplink) {
			return (
				<View style={styles.deeplinkIconContainer}>
					<FontAwesome
						style={styles.deeplinkIcon}
						name={origin === ORIGIN_DEEPLINK ? 'link' : 'qrcode'}
						size={32}
						color={colors.brandPink300}
					/>
				</View>
			);
		}
		let iconTitle = getHost(currentEnsName || url);
		if (originIsWalletConnect) {
			url = origin.split(WALLET_CONNECT_ORIGIN)[1];
			iconTitle = getHost(url);
		}
		initDappImg(url);
		return (
			<WebsiteIcon
				style={styles.domainLogo}
				viewStyle={styles.assetLogo}
				title={iconTitle}
				url={currentEnsName || url}
				icon={dappImg || icon}
			/>
		);
	};

	const renderTitle = () => {
		const { url, currentEnsName, spenderAddress, origin } = props.currentPageInformation;
		let title = '';
		if (originIsDeeplink) {
			title = renderShortAddress(spenderAddress);
		} else if (originIsMoveToL2 || originIsClaim) {
			title = origin;
		} else if (originIsWalletConnect) {
			title = getHost(origin.split(WALLET_CONNECT_ORIGIN)[1]);
		} else {
			title = getHost(currentEnsName || url || origin);
		}
		if (title === TransactionTypes.ORIGIN_CLAIM) {
			title = strings('other.claim');
		} else if (title === TransactionTypes.ORIGIN_CANCEL_APPROVAL) {
			title = strings('approval_management.cancel_approval');
		} else if (title === TransactionTypes.ORIGIN_MOVE_TO_L2) {
			title = strings('other.move_to_l2');
		}

		return <Text style={[styles.domainUrl, isDarkMode && baseStyles.textDark]}>{title}</Text>;
	};

	return (
		<View style={styles.transactionHeader}>
			{renderTopIcon()}
			<View style={styles.domanUrlContainer}>{renderTitle()}</View>
		</View>
	);
};

TransactionHeader.propTypes = {
	/**
	 * Object containing current page title and url
	 */
	currentPageInformation: PropTypes.object
};

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(TransactionHeader);
