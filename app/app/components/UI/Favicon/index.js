import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import NFTImage, { convertImageUrl } from '../NFTImage';
import { URL } from 'gopocket-core';
import { callSqlite } from '../../../util/ControllerUtils';

const styles = StyleSheet.create({
	absolutePos: {
		position: 'absolute'
	}
});

export default class Favicon extends PureComponent {
	static propTypes = {
		url: PropTypes.string,
		style: PropTypes.any,
		defaultImg: PropTypes.any
	};

	state = {
		loaded: false,
		loadError: false,
		newUrl: ''
	};

	componentDidMount = async () => {
		this.setImgUrl();
	};

	componentDidUpdate = async prevProps => {
		if (prevProps.url !== this.props.url) {
			this.setImgUrl();
		}
	};

	setImgUrl = async () => {
		const { url } = this.props;
		if (url) {
			const hName = new URL(url).hostname;
			const dapp = await callSqlite('getWhitelistDapp', url, hName);
			if (dapp?.img) {
				this.setState({ newUrl: dapp?.img });
				return;
			}
			const history = await callSqlite('getBrowserHistory');
			for (const subHistory of history) {
				const hostName = new URL(subHistory.url).hostname;
				if (hostName === hName) {
					if (subHistory.icon) {
						this.setState({ newUrl: subHistory.icon });
						return;
					}
				}
			}
			this.setState({ newUrl: convertImageUrl('https://' + new URL(url).hostname + '/favicon.ico') });
		}
	};

	render = () => {
		const { style, defaultImg } = this.props;
		const { newUrl } = this.state;

		return (
			<View style={style}>
				<NFTImage
					imageUrl={newUrl}
					defaultImg={defaultImg || require('../../../images/ic_defi_network.png')}
					style={[style, styles.absolutePos]}
				/>
			</View>
		);
	};
}
