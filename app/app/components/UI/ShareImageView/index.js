import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { DeviceEventEmitter, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import QRCode from 'react-native-qrcode-svg';

import shareBackground from '../../../images/img_share_bg.png';
import shareLogo from '../../../images/img_share_logo.png';
import { captureRef } from 'react-native-view-shot';
import { util } from 'gopocket-core';
import { getChainTypeName, getShareImage } from '../../../util/ChainTypeImages';

const styles = StyleSheet.create({
	background: {
		width: 375
	},
	wrapper: {
		margin: 16,
		backgroundColor: colors.white,
		borderRadius: 16,
		paddingHorizontal: 20
	},
	title: {
		alignSelf: 'center',
		fontSize: 27,
		...fontStyles.bold,
		lineHeight: 34,
		color: colors.$030319
	},
	qrcode: {
		width: 260,
		height: 260,
		padding: 10,
		marginTop: 16,
		alignSelf: 'center'
	},
	address: {
		fontSize: 15,
		...fontStyles.semibold,
		lineHeight: 19,
		color: colors.$030319,
		marginTop: 16
	},
	addressText: {
		fontSize: 11,
		lineHeight: 14,
		color: colors.$60657D,
		marginTop: 9
	},
	tipsText: {
		fontSize: 11,
		lineHeight: 14,
		color: colors.$60657D,
		marginTop: 24
	},
	bottomLogo: {
		alignSelf: 'center',
		marginTop: 35,
		marginBottom: 16,
		width: 210,
		height: 52
	},
	directionRow: {
		marginTop: 22,
		flexDirection: 'row',
		alignSelf: 'center'
	},
	titleImage: {
		alignSelf: 'center',
		marginRight: 10
	}
});

export default class ShareImageView extends PureComponent {
	static propTypes = {
		selectedAddress: PropTypes.string,
		chainType: PropTypes.number,
		close: PropTypes.func
	};

	imageRef = React.createRef();

	componentDidMount() {
		setTimeout(() => {
			captureRef(this.imageRef.current, { format: 'png', quality: 1 })
				.then(uri => {
					DeviceEventEmitter.emit('onShareUri', uri);
				})
				.catch(error => {
					util.logError('PPYang takeSnapshot error:', error);
				})
				.finally(() => this.props.close());
		}, 3000);
	}

	render() {
		return (
			<View ref={this.imageRef} collapsable={false}>
				<ImageBackground style={styles.background} source={shareBackground} resizeMode={'stretch'}>
					<View style={styles.wrapper}>
						<View style={styles.directionRow}>
							<Image style={styles.titleImage} source={getShareImage(this.props.chainType)} />
							<Text style={styles.title}>
								{strings('other.crypto_receiving', { network: getChainTypeName(this.props.chainType) })}
							</Text>
						</View>

						<View style={styles.qrcode}>
							<QRCode value={`ethereum:${this.props.selectedAddress}`} size={250} />
						</View>
						<Text style={styles.address}>{strings('other.address')}</Text>
						<Text style={styles.addressText}>{this.props.selectedAddress}</Text>
						<Text style={styles.tipsText}>
							{strings('other.all_tokens', { network: getChainTypeName(this.props.chainType) })}
						</Text>
						<Image style={styles.bottomLogo} source={shareLogo} />
					</View>
				</ImageBackground>
			</View>
		);
	}
}
