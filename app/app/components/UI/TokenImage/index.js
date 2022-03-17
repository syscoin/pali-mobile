import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import { connect } from 'react-redux';
import NFTImage from '../NFTImage';

const styles = StyleSheet.create({
	itemLogoWrapper: {
		width: 50,
		height: 50
	},
	roundImage: {
		overflow: 'hidden',
		borderRadius: 25
	}
});

export function TokenImage({ asset, containerStyle, iconStyle, logoDefined, fadeIn }) {
	return (
		<View style={[styles.itemLogoWrapper, containerStyle, asset.logo ? {} : styles.roundImage]}>
			{asset.logo ? (
				typeof asset.logo !== 'string' ? (
					<AssetIcon logo_number={asset.logo} customStyle={iconStyle} fadeIn={fadeIn} />
				) : (
					<NFTImage
						style={iconStyle}
						imageUrl={asset.logo}
						defaultImg={require('../../../images/img_default.png')}
					/>
				)
			) : (
				<Identicon
					address={asset.l1Address ? asset.l1Address : asset.address} // 保证arb上的资产跟主链图标一致
					customStyle={iconStyle}
					noFadeIn={!fadeIn}
				/>
			)}
		</View>
	);
}

TokenImage.propTypes = {
	asset: PropTypes.object,
	containerStyle: PropTypes.object,
	iconStyle: PropTypes.object,
	logoDefined: PropTypes.bool,
	fadeIn: PropTypes.bool
};

TokenImage.defaultProps = {
	fadeIn: false
};

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(TokenImage);
