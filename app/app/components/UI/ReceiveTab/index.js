import React, { PureComponent } from 'react';
import {
	TouchableOpacity,
	StyleSheet,
	View,
	Text,
	Image,
	ScrollView,
	ActivityIndicator,
	DeviceEventEmitter
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles, activeOpacity, baseStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-community/clipboard';
import Share from 'react-native-share';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import iconCopy from '../../../images/copy.png';
import iconShar from '../../../images/share.png';
import iconReceiveActive from '../../../images/receive_hl.png';
import { ChainType, util } from 'paiwallet-core';
import GlobalAlert from '../GlobalAlert';
import { getTokenName } from '../../../util/number';
import { getChainTypeName } from '../../../util/ChainTypeImages';

const darkBlack = '#030319';
const grey = '#60657D';
const lightGrey = '#8F92A1E5';
const tokenBg = '#FE6E9129';

const styles = StyleSheet.create({
	shareRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingTop: 5,
		paddingHorizontal: 20
	},
	iconShar: {
		width: 24,
		height: 24
	},
	bodyRow: {
		alignItems: 'center'
	},
	qrCode: {
		padding: 5,
		alignItems: 'center',
		justifyContent: 'center'
	},
	walletTitle: {
		fontSize: 18,
		lineHeight: 21,
		color: darkBlack,
		...fontStyles.semibold,
		marginTop: 14
	},
	addrWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 30
	},
	addrText: {
		marginRight: 13,
		fontSize: 12,
		lineHeight: 14,
		color: grey
	},
	iconCopy: {
		width: 14,
		height: 14
	},
	sendNotation: {
		marginTop: 18
	},
	sendNotationText: {
		fontSize: 13,
		lineHeight: 15,
		textAlign: 'center',
		color: lightGrey,
		...fontStyles.normal
	},
	tokenText: {
		fontSize: 13,
		lineHeight: 15,
		textAlign: 'center',
		color: colors.brandPink300,
		...fontStyles.medium,
		marginTop: 4,
		backgroundColor: tokenBg,
		paddingHorizontal: 10,
		paddingTop: 4,
		paddingBottom: 3
	},
	cancelButton: {
		height: 44,
		borderRadius: 10,
		borderColor: colors.brandPink300,
		borderWidth: 1,
		marginHorizontal: 48,
		marginBottom: 24,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelButtonText: {
		fontSize: 16,
		textAlign: 'center',
		color: colors.brandPink300
	},
	containStyle: {
		height: 590
	},
	wrapper: {
		maxHeight: '88%',
		backgroundColor: colors.white,
		borderRadius: 20,
		margin: 8
	},
	labelWrapper: {
		alignSelf: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 30
	},
	labelIcon: {
		width: 26,
		height: 26
	},
	labelText: {
		fontSize: 28,
		lineHeight: 34,
		marginLeft: 12,
		color: colors.$030319,
		...fontStyles.bold
	}
});

class ReceiveTab extends PureComponent {
	static propTypes = {
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,

		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,

		onCancel: PropTypes.func,
		asset: PropTypes.object
	};

	state = {
		shareLoading: false
	};

	onShare = () => {
		this.setState({ shareLoading: true });
		DeviceEventEmitter.once('onShareUri', uri => {
			Share.open({
				url: uri
			}).catch(err => {
				util.logError('Error while trying to share address', err);
			});
			this.setState({ shareLoading: false });
		});
		DeviceEventEmitter.emit('showShareView', this.props.asset.type);
	};

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		Clipboard.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') },
			flag: 'ReceiveTab'
		});
	};

	onCancel = () => {
		this.props.onCancel();
	};

	getAddrStr = () => {
		const { asset } = this.props;
		const type = asset.type ? asset.type : ChainType.Ethereum;
		if (asset.nativeCurrency) {
			return '';
		}
		const addr = getTokenName(type);
		return '(' + addr + ')';
	};

	render() {
		const { asset } = this.props;
		const { shareLoading } = this.state;

		return (
			<View style={styles.wrapper}>
				<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
					<TouchableOpacity activeOpacity={1} style={styles.containStyle}>
						<View style={styles.labelWrapper}>
							<Image style={styles.labelIcon} source={iconReceiveActive} />
							<Text style={styles.labelText}>{strings('other.receive')}</Text>
						</View>
						<TouchableOpacity style={styles.shareRow} onPress={this.onShare} disabled={shareLoading}>
							{shareLoading ? (
								<ActivityIndicator style={styles.iconShar} color={colors.brandPink300} />
							) : (
								<Image style={styles.iconShar} source={iconShar} />
							)}
						</TouchableOpacity>
						<View style={styles.bodyRow}>
							<View style={styles.qrCode}>
								<QRCode value={`ethereum:${this.props.selectedAddress}`} size={215} />
							</View>
							<Text style={styles.walletTitle}>{strings('other.my_wallet_address')}</Text>
							<TouchableOpacity style={styles.addrWrapper} onPress={this.copyAccountToClipboard}>
								<Text style={styles.addrText}>
									{this.props.selectedAddress.substring(0, 15) +
										'...' +
										this.props.selectedAddress.substring(24)}
								</Text>
								<Image source={iconCopy} style={styles.iconCopy} />
							</TouchableOpacity>
							<View style={styles.sendNotation}>
								<Text style={styles.sendNotationText}>{strings('other.only_send')}</Text>
								<Text style={styles.tokenText}>
									{strings('other.token_on_net', {
										symbol: asset.symbol,
										addr: this.getAddrStr(),
										chain: getChainTypeName(asset.type)
									})}
								</Text>
								<Text style={styles.sendNotationText}>{strings('other.to_this_address')}</Text>
							</View>
						</View>
						<View style={baseStyles.flexGrow} />
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={this.onCancel}
							activeOpacity={activeOpacity}
						>
							<Text style={styles.cancelButtonText}>{strings('other.cancel')}</Text>
						</TouchableOpacity>
					</TouchableOpacity>
				</ScrollView>
				<GlobalAlert currentFlag={'ReceiveTab'} />
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ReceiveTab);
