import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import AccountNetworkView from '../../Views/AccountNetworkView';
import WebsiteIcon from '../WebsiteIcon';
import { getHost } from '../../../util/browser';
import WalletConnect from '../../../core/WalletConnect';
import Engine from '../../../core/Engine';
import { getChainTypeByChainId } from '../../../util/number';
const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		minHeight: 200,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	intro: {
		...fontStyles.semibold,
		color: colors.$030319,
		fontSize: 20,
		marginTop: 30,
		marginBottom: 30
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		marginTop: 40,
		marginBottom: 30,
		marginHorizontal: 30
	},
	cancel: {
		flex: 1,
		marginRight: 8,
		height: 42
	},
	cancelText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	confirm: {
		flex: 1,
		marginLeft: 8,
		height: 42
	},
	confirmText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center',
		color: colors.brandPink300
	},
	domainLogo: {
		width: 58,
		height: 58,
		borderRadius: 10
	},
	assetLogo: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10
	},
	hostTitle: {
		marginTop: 10,
		fontSize: 13,
		...fontStyles.semibold,
		color: colors.$030319,
		alignSelf: 'center',
		marginHorizontal: 20
	},
	titleLeftIcon: {
		width: 24,
		height: 24
	},
	titleLayout: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	}
});

/**
 * Account access approval component
 */
class AccountApproval extends PureComponent {
	static propTypes = {
		/**
		 * Object containing current page title, url, and icon href
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * Callback triggered on account access approval
		 */
		onConfirm: PropTypes.func,
		/**
		 * Callback triggered on account access rejection
		 */
		onCancel: PropTypes.func
	};

	state = {
		selectedAddress: Engine.context.PreferencesController.state.selectedAddress,
		selectedChainType: getChainTypeByChainId(this.props.currentPageInformation?.chainId)
	};

	/**
	 * Calls onConfirm callback and analytics to track connect confirmed event
	 */
	onConfirm = () => {
		if (this.state.selectedAddress !== Engine.context.PreferencesController.state.selectedAddress) {
			WalletConnect.setSelectedAddress(this.props.currentPageInformation?.peerId, this.state.selectedAddress);
		}
		if (this.state.selectedChainType !== getChainTypeByChainId(this.props.currentPageInformation?.chainId)) {
			WalletConnect.setSelectedNetwork(this.props.currentPageInformation?.peerId, this.state.selectedChainType);
		}
		this.props.onConfirm();
	};

	/**
	 * Calls onConfirm callback and analytics to track connect canceled event
	 */
	onCancel = () => {
		this.props.onCancel();
	};

	render = () => {
		const { selectedAddress, selectedChainType } = this.state;
		const { currentPageInformation } = this.props;
		//{"autosign": false, "chainId": null, "peerId": "ea7bcad3-d0af-483b-a588-840ea258200c",
		// "peerMeta": {"description": "", "icons": ["https://example.walletconnect.org/favicon.ico"], "name": "WalletConnect Example", "url": "https://example.walletconnect.org"}}
		const meta = currentPageInformation.peerMeta || null;
		const url = meta && meta.url;
		const title = url && getHost(url);
		const icon = meta && meta.icons && meta.icons.length > 0 && meta.icons[0];
		return (
			<View style={styles.root}>
				<View style={styles.titleLayout}>
					<Image source={require('../../../images/ic_walletconnect.png')} style={styles.titleLeftIcon} />
					<Text style={styles.intro}> {strings('accountApproval.walletconnect_request')}</Text>
				</View>

				<WebsiteIcon style={styles.domainLogo} viewStyle={styles.assetLogo} url={url} icon={icon} />
				<Text style={styles.hostTitle}>{title}</Text>
				<AccountNetworkView
					selectedAddress={selectedAddress}
					selectedChainType={selectedChainType}
					setSelectedAddress={address => {
						this.setState({ selectedAddress: address });
					}}
					setSelectedChainType={chainType => {
						this.setState({ selectedChainType: chainType });
					}}
				/>
				<View style={styles.actionContainer}>
					<TouchableOpacity style={styles.cancel} onPress={this.onCancel}>
						<Text style={styles.cancelText}>{strings('accountApproval.cancel')}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.confirm} onPress={this.onConfirm}>
						<Text style={styles.confirmText}>{strings('accountApproval.connect')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};
}

export default connect()(AccountApproval);
