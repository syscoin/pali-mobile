import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { key2Warn, key2WarnDesc } from '../../../util/security';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	modalNoBorder: {
		justifyContent: 'flex-end'
	},
	detailModal: {
		width: 330,
		paddingTop: 28,
		paddingBottom: 20,
		paddingHorizontal: 20,
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		flexDirection: 'column'
	},
	detailTitle: {
		color: colors.$202020,
		...fontStyles.bold,
		fontSize: 18,
		textAlign: 'center'
	},
	titleRow: {
		marginHorizontal: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-start'
	},
	flexRow: {
		marginHorizontal: 12,
		marginTop: 10,
		marginBottom: 20,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-start'
	},
	securityFlag: {
		width: 22,
		height: 22,
		marginRight: 4
	},
	detailText: {
		color: colors.$60657D,
		...fontStyles.normal,
		fontSize: 13,
		lineHeight: 22,
		textAlign: 'left'
	}
});

class SecurityDesc extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		isVisible: PropTypes.bool,
		data: PropTypes.object,
		onDismiss: PropTypes.func,
		isLockScreen: PropTypes.bool
	};

	render() {
		const { isVisible, data, onDismiss, isLockScreen } = this.props;
		const { name, type } = data || {};
		const { isDarkMode } = this.context;
		return (
			<Modal
				isVisible={isVisible && !isLockScreen}
				actionContainerStyle={styles.modalNoBorder}
				onSwipeComplete={onDismiss}
				onBackButtonPress={onDismiss}
				onBackdropPress={onDismiss}
				backdropOpacity={0.7}
				animationIn="fadeIn"
				animationOut="fadeOut"
				useNativeDriver
			>
				<View style={[styles.detailModal, isDarkMode && baseStyles.darkBackground]}>
					<View style={styles.titleRow}>
						{type > 0 && (
							<Image
								style={styles.securityFlag}
								source={
									parseInt(type) === 1
										? require('../../../images/tag_safe.png')
										: parseInt(type) === 2
										? require('../../../images/tag_warning.png')
										: require('../../../images/tag_danger.png')
								}
							/>
						)}
						<Text style={[styles.detailTitle, isDarkMode && baseStyles.textDark]}>{key2Warn(name)}</Text>
					</View>
					<View style={styles.flexRow}>
						<Text style={[styles.detailText, isDarkMode && baseStyles.subTextDark]} numberOfLines={10}>
							{key2WarnDesc(name)}
						</Text>
					</View>
				</View>
			</Modal>
		);
	}
}

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(SecurityDesc);
