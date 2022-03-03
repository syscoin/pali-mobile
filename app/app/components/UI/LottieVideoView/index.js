import React, { PureComponent } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';
import { colors } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	},
	overBg: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		backgroundColor: colors.white,
		zIndex: 100
	},
	centerLayout: {
		justifyContent: 'center',
		alignSelf: 'center'
	}
});

export default class LottieVideoView extends PureComponent {
	static propTypes = {
		onPlayEnd: PropTypes.func,
		videoHeight: PropTypes.number,
		videoWidth: PropTypes.number,
		playType: PropTypes.number //1.第一步的视频  2.第二步的视频
	};

	state = {
		hideBg: false
	};

	render = () => {
		const { videoWidth, videoHeight, onPlayEnd, playType } = this.props;
		const { hideBg } = this.state;
		const vWidth = hideBg ? videoWidth || width - 90 : 1;
		const vHeight = hideBg ? videoHeight || height - 300 : 1;
		const type = playType || 1;
		let source =
			strings('other.accept_language') === 'zh'
				? require('../.././../animations/check_1_cn.mp4')
				: require('../.././../animations/check_1_en.mp4');
		if (type === 2) {
			source =
				strings('other.accept_language') === 'zh'
					? require('../.././../animations/check_2_cn.mp4')
					: require('../.././../animations/check_2_en.mp4');
		}
		return (
			<View style={styles.flexOne}>
				<Video
					muted
					onLoad={a => {
						if (Platform.OS === 'android') {
							setTimeout(() => {
								this.setState({ hideBg: true });
							}, 100);
						} else {
							this.setState({ hideBg: true });
						}
					}}
					source={source}
					style={[{ width: vWidth, height: vHeight }, styles.centerLayout]} //组件样式
					mixWithOthers={'mix'}
					useTextureView
					onEnd={() => {
						onPlayEnd && onPlayEnd();
					}}
					playWhenInactive
					playInBackground
					ignoreSilentSwitch="ignore"
					disableFocus
				/>
				{!this.state.hideBg && <View style={[styles.overBg, { height: vHeight }]} />}
			</View>
		);
	};
}
