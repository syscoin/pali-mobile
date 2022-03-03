import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import LottieView from 'lottie-react-native';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		borderRadius: 10,
		backgroundColor: colors.loaderOverlay
	},
	content: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	item: {
		marginVertical: 5
	},
	text: {
		fontSize: 14,
		color: colors.white
	},
	lottieAnimation: {
		width: 52,
		height: 52
	}
});

function Loader({ error, onClose }) {
	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<View style={styles.item}>
					{!error && (
						<LottieView
							style={styles.lottieAnimation}
							autoPlay
							loop
							source={require('../../../animations/connect_loading.json')}
						/>
					)}
				</View>
				<View style={styles.item}>
					<Text style={styles.text}>{strings(`media_player.${error ? 'not_found' : 'loading'}`)}</Text>
				</View>
			</View>
		</View>
	);
}

Loader.propTypes = {
	error: PropTypes.bool,
	onClose: PropTypes.func
};

Loader.defaultProps = {
	onError: () => null
};

export default Loader;
