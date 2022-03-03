import React from 'react';
import { StyleSheet } from 'react-native';
import RemoteImage from '../RemoteImage';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	logo: {
		width: 50,
		height: 50
	}
});

/**
 * PureComponent that provides an asset icon dependent on OS.
 */
// eslint-disable-next-line react/display-name
const AssetIcon = React.memo(props => {
	if (!props.logo && !props.logo_number) return null;
	const uri = props.logo;
	const style = [styles.logo, props.customStyle];
	if (props.logo_number) {
		return (
			<RemoteImage
				fadeIn={props.fadeIn}
				placeholderStyle={{ backgroundColor: colors.white }}
				source={props.logo_number}
				style={style}
				resizeMode={'contain'}
			/>
		);
	}
	return (
		<RemoteImage
			fadeIn={props.fadeIn}
			placeholderStyle={{ backgroundColor: colors.white }}
			source={{ uri }}
			style={style}
			resizeMode={'contain'}
		/>
	);
});

AssetIcon.propTypes = {
	/**
	 * String of the asset icon to be searched in contractMap
	 */
	logo: PropTypes.string,
	logo_number: PropTypes.number,
	/**
	 * Custom style to apply to image
	 */
	customStyle: PropTypes.object,
	fadeIn: PropTypes.bool
};

AssetIcon.defaultProps = {
	fadeIn: true
};

export default AssetIcon;
