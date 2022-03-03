import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import iconCopy from '../../../images/copy.png';
import iconBrowser from '../../../images/browser.png';
import { connect } from 'react-redux';
import { showAlert } from '../../../actions/alert';
import WebViewModal from '../WebviewModal';

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
	},
	infoPanel: {
		height: 48,
		width: '100%',
		paddingHorizontal: 18,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.$FAFAFA,
		borderWidth: 1,
		borderColor: colors.$E6E6E6,
		borderRadius: 6
	},
	infoName: {
		fontSize: 16,
		lineHeight: 22,
		color: colors.$030319,
		...fontStyles.medium
	},
	infoText: {
		flex: 1,
		marginHorizontal: 12,
		fontSize: 12,
		color: colors.$60657D,
		...fontStyles.medium
	},
	infoIcon: {
		width: 14,
		height: 14
	}
});

class SecurityDesc extends PureComponent {
	static propTypes = {
		isVisible: PropTypes.bool,
		data: PropTypes.object,
		asset: PropTypes.object,
		onDismiss: PropTypes.func,
		showAlert: PropTypes.func,
		isLockScreen: PropTypes.bool
	};

	state = {
		showWebsite: false
	};

	onContractClick = () => {
		const address = this.props.asset?.address;
		this.props.onDismiss && this.props.onDismiss();
		Clipboard.setString(address);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('other.contract_copied_clipboard') }
		});
	};

	onWebsiteClick = () => {
		this.setState({ showWebsite: true });
	};

	render() {
		const { showWebsite } = this.state;
		const { isVisible, data, asset, onDismiss, isLockScreen } = this.props;
		const { name, desc, o_type, type } = data || {};
		const { address, website } = asset?.securityData || {};
		// type "1":normal; "2":notice; "3":risk;
		// o_type "1":contract; "2": website;
		const hasWebsit = !!website;
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
						<Text style={styles.detailTitle}>{name}</Text>
					</View>
					<View style={styles.flexRow}>
						<Text style={styles.detailText} numberOfLines={10}>
							{desc}
						</Text>
					</View>
					{parseInt(o_type) === 1 && (
						<TouchableOpacity style={styles.infoPanel} onPress={this.onContractClick}>
							<Text style={styles.infoName}>{strings('security.contract')}</Text>
							<Text style={styles.infoText}>
								{address ? address.substr(0, 8) + '...' + address.substr(-8) : ''}
							</Text>
							<Image style={styles.infoIcon} source={iconCopy} />
						</TouchableOpacity>
					)}
					{parseInt(o_type) === 2 && hasWebsit && (
						<TouchableOpacity style={styles.infoPanel} onPress={this.onWebsiteClick}>
							<Text style={styles.infoName}>{strings('security.website')}</Text>
							<Text style={styles.infoText}>{website}</Text>
							<Image style={styles.infoIcon} source={iconBrowser} />
						</TouchableOpacity>
					)}
					<WebViewModal
						isVisible={showWebsite}
						url={website}
						onDismiss={() => this.setState({ showWebsite: false })}
					/>
				</View>
			</Modal>
		);
	}
}

const mapStateToProps = state => ({
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(SecurityDesc);
