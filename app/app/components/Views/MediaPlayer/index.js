import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, View, StyleSheet } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';

import Device from '../../../util/Device';
import Loader from './Loader';
import { colors } from '../../../styles/common';
import { isMp3File } from '../../../util/general';
import NFTImage from '../../UI/NFTImage';

const screenWidth = Device.getDeviceWidth();
const styles = StyleSheet.create({
	loaderContainer: {
		position: 'absolute',
		zIndex: 999,
		width: '100%',
		height: '100%',
		backgroundColor: colors.transparent
	},
	backgroudBlack: {
		backgroundColor: colors.black
	}
});

function MediaPlayer({ uri, videoThumbnail, style, onClose, textTracks, selectedTextTrack, posterUri }) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const onLoad = () => {
		setLoading(false);
	};

	const onError = () => {
		setError(true);
		setLoading(false);
	};

	// Conditional rendering based on the error state and device
	const renderPlayer = () => {
		if (error) {
			return (
				<NFTImage
					style={{ width: screenWidth - 40, height: screenWidth - 40, borderRadius: 10 }}
					imageUrl={videoThumbnail ? videoThumbnail : uri}
					isBlurBg
				/>
			);
		}

		if (Device.isAndroid() || isMp3File(uri)) {
			return (
				<AndroidMediaPlayer
					onLoad={onLoad}
					onError={onError}
					onClose={onClose}
					source={{ uri }}
					textTracks={textTracks}
					selectedTextTrack={selectedTextTrack}
					posterUri={posterUri}
				/>
			);
		}

		return (
			<Video
				onLoad={onLoad}
				onError={onError}
				style={style}
				muted
				source={{ uri }}
				controls
				textTracks={textTracks}
				selectedTextTrack={selectedTextTrack}
				ignoreSilentSwitch="ignore"
				repeat
				poster={posterUri}
				mixWithOthers={'mix'}
			/>
		);
	};

	return (
		<View style={[styles.backgroudBlack, style]}>
			{loading && (
				<View style={[styles.loaderContainer, style]}>
					<Loader onClose={onClose} />
				</View>
			)}
			{renderPlayer()}
		</View>
	);
}

MediaPlayer.propTypes = {
	/**
	 * Media URI
	 */
	uri: PropTypes.string,
	/**
	 * Custom style object
	 */
	style: ViewPropTypes.style,
	/**
	 * On close callback
	 */
	onClose: PropTypes.func,
	/**
	 * Array of possible text tracks to display
	 */
	textTracks: PropTypes.arrayOf(PropTypes.object),
	/**
	 * The selected text track to dispaly by id, language, title, index
	 */
	selectedTextTrack: PropTypes.object,

	posterUri: PropTypes.string
};

MediaPlayer.defaultProps = {
	onError: () => null
};

export default MediaPlayer;
