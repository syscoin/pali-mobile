import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import ImageCapInset from '../ImageCapInset';
import Device from '../../../util/Device';
import { ThemeContext } from '../../../theme/ThemeProvider';
import { baseStyles, colors } from '../../../styles/common';

const styles = StyleSheet.create({
	itemWrapper: {
		flex: 1,
		flexDirection: 'row'
	},
	shadowDark: {
		shadowColor: colors.paliBlue100,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.02,
		shadowRadius: 1,
		elevation: 4
	},
	capInsetWrapper: {
		flex: 1,
		height: 102,
		marginVertical: -7
	},
	capInsetWrapper2: {
		flex: 1,
		height: 109,
		marginTop: -7
	},
	childrenWrapper: {
		flex: 1,
		flexDirection: 'row',
		paddingHorizontal: 18,
		paddingVertical: 16,
		marginRight: 20,
		marginTop: 8,
		marginLeft: 20,
		marginBottom: 8,
		height: 72
	}
});

/**
 * Customizable view to render assets in lists
 */
export default class AssetElement extends PureComponent {
	static propTypes = {
		/**
		 * Content to display in the list element
		 */
		children: PropTypes.node,
		/**
		 * Object being rendered
		 */
		asset: PropTypes.object,
		/**
		 * Callback triggered on long press
		 */
		onPress: PropTypes.func,

		indexKey: PropTypes.number,

		isEnd: PropTypes.bool
	};

	static contextType = ThemeContext;

	static defaultProps = {
		canSwipeout: false
	};

	handleOnPress = () => {
		const { onPress, asset } = this.props;
		onPress && onPress(asset);
	};

	render = () => {
		const { isDarkMode } = this.context;
		const { children, indexKey, isEnd } = this.props;
		return (
			<View style={[styles.itemWrapper, isDarkMode && styles.shadowDark]} key={'element' + indexKey}>
				<ImageCapInset
					style={isEnd ? styles.capInsetWrapper2 : styles.capInsetWrapper}
					source={
						Device.isAndroid()
							? isDarkMode
								? { uri: 'card_dark' }
								: { uri: 'card' }
							: isDarkMode
							? require('../../../images/card_dark.png')
							: require('../../../images/card.png')
					}
					capInsets={{ top: 30, left: 30, bottom: 30, right: 30 }}
				>
					<TouchableWithoutFeedback onPress={this.handleOnPress}>
						<View style={styles.childrenWrapper}>{children}</View>
					</TouchableWithoutFeedback>
				</ImageCapInset>
			</View>
		);
	};
}
