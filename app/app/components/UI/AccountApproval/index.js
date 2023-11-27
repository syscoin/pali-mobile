import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import WebsiteIcon from '../WebsiteIcon';
import Engine from '../../../core/Engine';
import { getChainTypeByChainId } from '../../../util/number';
const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 50,
		borderTopRightRadius: 50,
		minHeight: 200,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		marginTop: 40,
		marginBottom: 30,
		marginHorizontal: 30
	},
	cancel: {
		flex: 1,
		marginRight: 8,
		height: 42
	},
	cancelText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	confirm: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.brandPink300,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	confirmText: {
		flex: 1,
		textAlign: 'center',
		textAlignVertical: 'center',
		color: colors.white
	},
	domainLogo: {
		width: 58,
		height: 58,
		borderRadius: 10,
		marginTop: 20
	},
	assetLogo: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10
	},
	hostTitle: {
		marginTop: 10,
		fontSize: 13,
		...fontStyles.semibold,
		color: colors.$030319,
		alignSelf: 'center',
		marginHorizontal: 20
	},
	hostDescription: {
		marginTop: 15,
		fontSize: 9,
		...fontStyles.normal,
		color: colors.$030319,
		alignSelf: 'center',
		marginHorizontal: 20
	},
	titleLeftIcon: {
		width: 24,
		height: 24
	},
	titleLayout: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.blackAlpha200,
		borderTopLeftRadius: 50,
		borderTopRightRadius: 50
	},
	intro: {
		...fontStyles.semibold,
		color: colors.$030319,
		fontSize: 18,
		marginTop: 20,
		marginBottom: 20
	},
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelText: {
		fontSize: 14,
		color: colors.brandPink300
	},
	okButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.brandPink300,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 14,
		color: colors.white
	}
});

/**
 * Account access approval component
 */
class AccountApproval extends PureComponent {
	static propTypes = {
		/**
		 * Object containing current page title, url, and icon href
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * Callback triggered on account access approval
		 */
		onConfirm: PropTypes.func,
		/**
		 * Callback triggered on account access rejection
		 */
		onCancel: PropTypes.func
	};

	state = {
		selectedAddress: Engine.context.PreferencesController.state.selectedAddress,
		selectedChainType: getChainTypeByChainId(this.props.currentPageInformation?.chainId)
	};

	/**
	 * Calls onConfirm callback and analytics to track connect confirmed event
	 */
	onConfirm = () => {
		this.props.onConfirm();
	};

	/**
	 * Calls onConfirm callback and analytics to track connect canceled event
	 */
	onCancel = () => {
		this.props.onCancel();
	};

	render = () => {
		const { currentPageInformation } = this.props;

		const meta =
			(currentPageInformation &&
				currentPageInformation.currentPageInformation &&
				currentPageInformation.currentPageInformation.metadata) ||
			null;
		const url = meta && meta.url;
		const title = meta && meta.name;
		const icon = meta && meta.icons && meta.icons.length > 0 && meta.icons[0];
		const description = meta && meta.description;

		return (
			<View style={styles.root}>
				<View style={styles.titleLayout}>
					<Text style={styles.intro}> {strings('accountApproval.walletconnect_request')}</Text>
				</View>

				<WebsiteIcon
					style={styles.domainLogo}
					viewStyle={styles.assetLogo}
					url={url}
					icon={typeof icon === 'string' ? icon : ''}
				/>
				<Text style={styles.hostTitle}>{title}</Text>
				<Text style={styles.hostDescription}>{description}</Text>

				<View style={styles.actionContainer}>
					<TouchableOpacity style={styles.cancelButton} onPress={this.onCancel}>
						<Text style={styles.cancelText}>{strings('accountApproval.cancel')}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.okButton} onPress={this.onConfirm}>
						<Text style={styles.okText}>{strings('accountApproval.connect')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};
}

export default connect()(AccountApproval);
