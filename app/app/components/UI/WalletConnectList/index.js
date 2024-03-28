import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import AccountNetworkView from '../../Views/AccountNetworkView';
import WebsiteIcon from '../WebsiteIcon';
import { getHost } from '../../../util/browser';
import Engine from '../../../core/Engine';
import DashSecondLine from '../../Views/DashSecondLine';
import { getChainTypeByChainId } from '../../../util/number';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import { ThemeContext } from '../../../theme/ThemeProvider';

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
	static contextType = ThemeContext;
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

		allSession: PropTypes.object
	};

	state = {
		selectedAddress: Engine.context.PreferencesController.state.selectedAddress,
		selectedChainType: getChainTypeByChainId(this.props.currentPageInformation?.chainId)
	};

	render = () => {
		const { allSession } = this.props;
		if (!allSession || allSession.length === 0) {
			return <View />;
		}

		const AllWCSessions = Object.values(allSession);
		const { isDarkMode } = this.context;
		return (
			<ScrollView
				style={[styles.scrollView, isDarkMode && baseStyles.darkModalBackground]}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.root, isDarkMode && baseStyles.darkModalBackground]}>
					<View style={[styles.titleLayout]}>
						<Image source={require('../../../images/ic_walletconnect.png')} />
						<View style={styles.titleLeft}>
							<Text style={[styles.titleLabel, isDarkMode && baseStyles.subTextDark]}>
								{strings('accountApproval.dapps_connected_with')}
							</Text>
							<Text style={[styles.titleDesc, isDarkMode && baseStyles.textDark]}>
								{strings('accountApproval.walletconnect')}
							</Text>
						</View>
					</View>
					<View style={[styles.lineView, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />

					{AllWCSessions.map((item, index) => {
						const selectedAddress =
							item.namespaces &&
							item.namespaces.eip155 &&
							item.namespaces.eip155.accounts.length > 0 &&
							item.namespaces.eip155.accounts[0].split(':')[2];

						const selectedChainsType =
							item.namespaces &&
							item.namespaces.eip155 &&
							item.namespaces.eip155.accounts.length > 0 &&
							item.namespaces.eip155.accounts.map(account => {
								return getChainTypeByChainId(account.split(':')[1]);
							});

						const meta = item.peer.metadata || null;
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
											icon={typeof icon === 'string' ? icon : ''}
										/>
										<View style={styles.itemContent}>
											<Text style={[styles.itemTitleLabel, isDarkMode && baseStyles.textDark]}>
												{title}
											</Text>
											<TouchableOpacity
												style={styles.disconnectBtn}
												hitSlop={styles.hitSlop}
												onPress={() => {
													WC2Manager.getInstance()
														.then(instance => {
															return instance.removeSession(item.topic);
														})
														.catch(err => {
															console.warn(`Remove wallet session Failed`, err);
														});
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
										selectedChainsType={selectedChainsType}
									/>

									<View style={styles.bottomHeight} />
									{allSession.length > index + 1 && (
										<DashSecondLine lineWidth={screenWidth - 20} style={[styles.dashline]} />
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
