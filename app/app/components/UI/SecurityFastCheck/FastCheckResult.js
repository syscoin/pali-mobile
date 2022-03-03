/* eslint-disable react-native/no-inline-styles */
import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, TouchableOpacity, Text, View, Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	modalNoBorder: {
		justifyContent: 'flex-end'
	},
	detailModal: {
		width: 330,
		paddingVertical: 30,
		maxHeight: '80%',
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	resultIcon: {
		width: 52,
		height: 52,
		marginBottom: 12
	},
	resultTitle: {
		fontSize: 18,
		lineHeight: 25,
		marginHorizontal: 20,
		textAlign: 'center',
		color: colors.$202020,
		...fontStyles.bold
	},
	resultTips: {
		marginTop: 12,
		marginHorizontal: 30,
		fontSize: 12,
		lineHeight: 17,
		color: colors.$343434
	},
	okBtn: {
		width: '100%',
		height: 22,
		marginTop: 30,
		justifyContent: 'center',
		alignItems: 'center'
	},
	btnText: {
		fontSize: 16,
		lineHeight: 22,
		color: colors.$030319
	}
});

class FastCheckResult extends PureComponent {
	static propTypes = {
		isVisible: PropTypes.bool,
		succeed: PropTypes.bool,
		onDismiss: PropTypes.func,
		isLockScreen: PropTypes.bool,
		errorCode: PropTypes.number
	};

	renderSucceed() {
		const { isVisible, onDismiss, isLockScreen } = this.props;
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
				<View style={styles.detailModal}>
					<Image style={styles.resultIcon} source={require('../../../images/icon_submit_succeed.png')} />
					<Text style={styles.resultTitle}>{strings('security.submit_succeeded')}</Text>
					<Text style={styles.resultTips}>{strings('security.submit_succeeded_tips')}</Text>
					<TouchableOpacity style={styles.okBtn} onPress={onDismiss}>
						<Text style={styles.btnText}>{strings('navigation.ok')}</Text>
					</TouchableOpacity>
				</View>
			</Modal>
		);
	}

	renderFailed() {
		const { isVisible, errorCode, onDismiss, isLockScreen } = this.props;
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
				<View style={styles.detailModal}>
					<Image style={styles.resultIcon} source={require('../../../images/icon_submit_succeed.png')} />
					<Text style={styles.resultTitle}>
						{strings(
							errorCode === 4403
								? 'security.fast_check_submitted'
								: errorCode === 4402
								? 'security.fast_check_failed_4402'
								: 'security.fast_check_failed'
						)}
					</Text>
					<Text style={styles.resultTips}>
						{strings(
							errorCode === 4403
								? 'security.fast_check_submitted_hint'
								: errorCode === 4402
								? 'security.fast_check_hint_4402'
								: 'security.fast_check_failed_hint'
						)}
					</Text>
					<TouchableOpacity style={styles.okBtn} onPress={onDismiss}>
						<Text style={styles.btnText}>{strings('navigation.ok')}</Text>
					</TouchableOpacity>
				</View>
			</Modal>
		);
	}

	render() {
		const { succeed } = this.props;
		if (succeed) {
			return this.renderSucceed();
		}
		return this.renderFailed();
	}
}

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(FastCheckResult);
