import React, { PureComponent } from 'react';
import { Text, View, Animated, Easing, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import { toggleHideHint } from '../../../actions/hint';
import Icon from '../../UI/Icon';
import { connect } from 'react-redux';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { strings } from '../../../../locales/i18n';

const bgColor = '#00000094';

const styles = {
	hintTitle: {
		fontSize: 14,
		color: colors.white,
		textAlign: 'left',
		...fontStyles.bold
	},
	modalNoBorder: {
		justifyContent: 'flex-end'
	},
	modalContainer: {
		alignSelf: 'center',

		borderRadius: 10,
		flexDirection: 'row',
		paddingVertical: 12,
		paddingHorizontal: 23,

		height: 80
	},
	container: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: -10,
		flexDirection: 'row',
		justifyContent: 'center'
	}
};

const { height } = Dimensions.get('window');

class HintView extends PureComponent {
	static propTypes = {
		/**
		 * title string
		 */
		hintText: PropTypes.string,
		/**
		 * hide Hint func
		 */
		toggleHideHint: PropTypes.func
	};

	moveAnim = new Animated.Value(height / 12);
	opacityAnim = new Animated.Value(0);
	dismissHandler = null;

	componentDidMount() {
		Animated.timing(this.moveAnim, {
			toValue: height / 8,
			duration: 80,
			useNativeDriver: false,
			easing: Easing.ease
		}).start(this.timingDismiss);
		Animated.timing(this.opacityAnim, {
			toValue: 1,
			duration: 100,
			useNativeDriver: false,
			easing: Easing.linear
		}).start();
	}

	componentWillUnmount() {
		clearTimeout(this.dismissHandler);
	}

	timingDismiss = () => {
		this.dismissHandler = setTimeout(() => {
			this.dismiss();
		}, 3000);
	};

	dismiss = () => {
		Animated.timing(this.opacityAnim, {
			toValue: 0,
			duration: 100,
			useNativeDriver: false,
			easing: Easing.linear
		}).start(this.onDismiss);
	};

	onDismiss = () => {
		if (this.props.toggleHideHint) {
			this.props.toggleHideHint();
		}
	};

	render() {
		const { hintText } = this.props;
		return (
			<View style={styles.container} pointerEvents="none">
				<Animated.View style={[styles.modalContainer, { bottom: this.moveAnim, opacity: this.opacityAnim }]}>
					<View
						style={{
							width: '20%',
							backgroundColor: colors.greenModal200,
							alignItems: 'center',
							justifyContent: 'center',
							borderTopLeftRadius: 10,
							borderBottomLeftRadius: 10
						}}
					>
						{hintText === strings('other.not_migration') ? (
							<AntIcon color={colors.white} size={24} name={'infocirlceo'} />
						) : (
							<Icon width="24" height="24" color={colors.white} name="checkCircle" />
						)}
					</View>
					<View
						style={{
							width: '80%',
							backgroundColor: colors.greenModal100,
							alignItems: 'flex-start',
							paddingHorizontal: 10,
							justifyContent: 'center',
							borderTopRightRadius: 10,
							borderBottomRightRadius: 10
						}}
					>
						<Text style={styles.hintTitle}>{hintText}</Text>
					</View>
				</Animated.View>
			</View>
		);
	}
}

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({
	toggleHideHint: () => dispatch(toggleHideHint())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(HintView);
