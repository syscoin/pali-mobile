import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import AccountNetworkView from '../../Views/AccountNetworkView';
import WebsiteIcon from '../WebsiteIcon';
import { getHost } from '../../../util/browser';
import WalletConnect from '../../../core/WalletConnect';
import Engine from '../../../core/Engine';
import DashSecondLine from '../../Views/DashSecondLine';
import { getChainIdByType, getChainTypeByChainId } from '../../../util/number';

const styles = StyleSheet.create({
	root: {
		minHeight: 200,
		paddingBottom: Device.isIphoneX() ? 20 : 0
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
	lineView: {
		backgroundColor: colors.$F0F0F0,
		height: 1,
		maxHeight: 1,
		marginVertical: 24,
		width: '100%'
	},
	dashline: {
		height: 1,
		marginLeft: 20,
		marginBottom: 30
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	titleLayout: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 20,
		marginTop: 30
	},
	titleLeft: {
		marginLeft: 16
	},
	titleLabel: {
		fontSize: 16,
		color: colors.$666666,
		lineHeight: 20
	},
	titleDesc: {
		fontSize: 24,
		color: colors.$030319,
		marginTop: 1,
		...fontStyles.semibold,
		lineHeight: 28
	},
	itemView: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
		marginHorizontal: 20
	},
	itemContent: {
		marginLeft: 14,
		flex: 1
	},
	itemTitleLabel: {
		fontSize: 16,
		color: colors.$030319,
		...fontStyles.semibold
	},
	disconnectBtn: {
		height: 26,
		backgroundColor: colors.$FC6564,
		paddingHorizontal: 13,
		marginTop: 8,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 26,
		alignSelf: 'flex-start',
		minWidth: 84
	},
	disconnectLabel: {
		fontSize: 12,
		color: colors.white
	},
	bottomHeight: {
		height: 30
	},
	scrollView: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	}
});

const screenWidth = Device.getDeviceWidth();

/**
 * Account access approval component
 */
class WalletConnectList extends PureComponent {
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
		onCancel: PropTypes.func,

		allSession: PropTypes.array
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
		const { allSession } = this.props;
		if (!allSession || allSession.length === 0) {
			return <View />;
		}
		return (
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				<View style={styles.root}>
					<View style={styles.titleLayout}>
						<Image source={require('../../../images/ic_walletconnect.png')} />
						<View style={styles.titleLeft}>
							<Text style={styles.titleLabel}>{strings('accountApproval.dapps_connected_with')}</Text>
							<Text style={styles.titleDesc}>{strings('accountApproval.walletconnect')}</Text>
						</View>
					</View>
					<View style={styles.lineView} />

					{allSession.map((item, index) => {
						// console.log('====item = ', item);
						const selectedAddress = item.accounts && item.accounts.length > 0 && item.accounts[0];
						const selectedChainType = getChainTypeByChainId(item.chainId);
						//{"autosign": false, "chainId": null, "peerId": "ea7bcad3-d0af-483b-a588-840ea258200c",
						// "peerMeta": {"description": "", "icons": ["https://example.walletconnect.org/favicon.ico"], "name": "WalletConnect Example", "url": "https://example.walletconnect.org"}}
						const meta = item.peerMeta || null;
						const url = meta && meta.url;
						const title = url && getHost(url);
						const icon = meta && meta.icons && meta.icons.length > 0 && meta.icons[0];

						return (
							<TouchableWithoutFeedback key={'session-index-' + index}>
								<View>
									<View style={styles.itemView}>
										<WebsiteIcon
											style={styles.domainLogo}
											viewStyle={styles.assetLogo}
											url={url}
											icon={icon}
										/>
										<View style={styles.itemContent}>
											<Text style={styles.itemTitleLabel}>{title}</Text>
											<TouchableOpacity
												style={styles.disconnectBtn}
												hitSlop={styles.hitSlop}
												onPress={() => {
													WalletConnect.killSessionAndUpdate(item.peerId);
												}}
											>
												<Text style={styles.disconnectLabel} allowFontScaling={false}>
													{strings('notifications.disconnect')}
												</Text>
											</TouchableOpacity>
										</View>
									</View>

									<AccountNetworkView
										selectedAddress={selectedAddress}
										selectedChainType={selectedChainType}
										setSelectedAddress={address => {
											WalletConnect.setSingleAccountChange(item.peerId, address);
										}}
										setSelectedChainType={chainType => {
											WalletConnect.setSingleNetworkChange(
												item.peerId,
												getChainIdByType(chainType)
											);
										}}
									/>

									<View style={styles.bottomHeight} />
									{allSession.length > index + 1 && (
										<DashSecondLine lineWidth={screenWidth - 20} style={styles.dashline} />
									)}
								</View>
							</TouchableWithoutFeedback>
						);
					})}
				</View>
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(WalletConnectList);
