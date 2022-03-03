import React, { Component } from 'react';
import { ImageBackground } from 'react-native';
import Device from '../../../util/Device';
// eslint-disable-next-line import/no-unresolved
import NinePatchView from 'react-native-9patch-image';

class ImageCapInset extends Component {
	render() {
		return Device.isAndroid() ? (
			<NinePatchView {...this.props} />
		) : (
			<ImageBackground {...this.props} resizeMode={'stretch'} />
		);
	}
}

export default ImageCapInset;
