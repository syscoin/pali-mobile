import React, { PureComponent } from 'react';
import { StatusBar, View } from 'react-native';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';

class MStatusBar extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object.isRequired,
		barStyle: PropTypes.string,
		translucent: PropTypes.bool,
		backgroundColor: PropTypes.string,
		fixPadding: PropTypes.bool
	};

	static defaultProps = {
		barStyle: 'dark-content',
		translucent: true,
		backgroundColor: 'transparent',
		fixPadding: true
	};

	constructor(props) {
		super(props);
		this._navListener = props.navigation.addListener('didFocus', this.setStatusBar.bind(this));
	}

	setStatusBar = () => {
		setTimeout(() => {
			const { barStyle, translucent, backgroundColor } = this.props;
			StatusBar.setBarStyle(barStyle);
			if (Device.isAndroid()) {
				StatusBar.setTranslucent(translucent);
				StatusBar.setBackgroundColor(backgroundColor);
			}
		}, 180);
	};

	componentWillUnmount() {
		this._navListener.remove();
	}

	render() {
		const { barStyle, translucent, backgroundColor, fixPadding } = this.props;
		return (
			<>
				{fixPadding && Device.isAndroid() && StatusBar.currentHeight && (
					<View style={{ paddingTop: StatusBar.currentHeight }} />
				)}
				<StatusBar animated barStyle={barStyle} translucent={translucent} backgroundColor={backgroundColor} />
			</>
		);
	}
}

export default MStatusBar;
