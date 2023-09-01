import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { ViewPropTypes } from 'deprecated-react-native-prop-types';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/Device';
import Loader from './Loader';
import { colors } from '../../../styles/common';
import { isMp3File } from '../../../util/general';

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

function MediaPlayer({ uri, style, onClose, textTracks, selectedTextTrack, posterUri }) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const onLoad = () => setLoading(false);

	const onError = () => setError(true);

	return (
		<View style={[styles.backgroudBlack, style]}>
			{loading && (
				<View style={[styles.loaderContainer, style]}>
					<Loader error={error} onClose={onClose} />
				</View>
			)}
			{Device.isAndroid() || isMp3File(uri) ? (
				<AndroidMediaPlayer
					onLoad={onLoad}
					onError={onError}
					onClose={onClose}
					source={{ uri }}
					textTracks={textTracks}
					selectedTextTrack={selectedTextTrack}
					posterUri={posterUri}
				/>
			) : (
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
			)}
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
