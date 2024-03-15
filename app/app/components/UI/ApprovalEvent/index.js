import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	StyleSheet,
	Image,
	View,
	Text,
	TouchableOpacity,
	Dimensions,
	ActivityIndicator,
	DeviceEventEmitter
} from 'react-native';
import { connect } from 'react-redux';
import { withNavigation } from 'react-navigation';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { getEtherscanAddressUrl } from '../../../util/etherscan';
import Engine from '../../../core/Engine';
import { getChainTypeByChainId } from '../../../util/number';
import { toLowerCaseEquals } from '../../../util/general';
import { strings } from '../../../../locales/i18n';
import { ChainType, TransactionStatus, util } from 'paliwallet-core';
import TransactionTypes from '../../../core/TransactionTypes';
import { onEvent } from '../../../util/statistics';
import { chainToChainType } from '../../../util/ChainTypeImages';
import { ThemeContext } from '../../../theme/ThemeProvider';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
	container: {
		width: '100%',
		paddingHorizontal: 20,
		paddingVertical: 16
	},
	bottomDivider: {
		position: 'absolute',
		bottom: 0,
		width: width - 80,
		height: 1,
		alignSelf: 'center',
		backgroundColor: colors.$F0F0F0
	},
	titleLine: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	safeIcon: {
		width: 22,
		height: 22,
		marginRight: 4
	},
	title: {
		fontSize: 15,
		lineHeight: 21,
		...fontStyles.medium
	},
	nameValueLine: {
		height: 28,
		flexDirection: 'row',
		alignItems: 'center'
	},
	name: {
		width: 60,
		fontSize: 12,
		marginRight: 6,
		color: colors.$030319,
		...fontStyles.medium
	},
	value: {
		fontSize: 12,
		color: colors.$60657D,
		...fontStyles.normal
	},
	icon: {
		marginLeft: 6
	},
	approveBtn: {
		position: 'absolute',
		right: 16,
		bottom: 24,
		height: 32,
		width: 72,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.brandPink300,
		borderRadius: 5
	},
	approveBtnText: {
		...fontStyles.medium,
		fontSize: 12,
		color: colors.white
	}
});

class ApprovalEvent extends Component {
	static contextType = ThemeContext;
	static propTypes = {
		event: PropTypes.object,
		chainId: PropTypes.string,
		selectedAddress: PropTypes.string,
		navigation: PropTypes.object,
		tokenInfo: PropTypes.object,
		showInfiniteDesc: PropTypes.func,
		contractList: PropTypes.array,
		hideDivider: PropTypes.bool
	};

	state = {
		loading: false
	};

	shouldComponentUpdate(nextProps, nextState) {
		if (this.props.event !== nextProps.event) {
			this.setState({ loading: false });
		}
		return true;
	}

	openEtherscan = spender => {
		const { chainId } = this.props;
		const url = getEtherscanAddressUrl(chainId, spender);
		this.props.navigation.navigate('BrowserView', {
			newTabUrl: url
		});
	};

	formatDate = timestamp => {
		const dateObj = new Date(parseInt(timestamp));
		let min = dateObj.getMinutes();
		if (min < 10) min = '0' + min;
		let hour = dateObj.getHours();
		if (hour < 10) hour = '0' + hour;
		let date = dateObj.getDate();
		if (date < 10) date = '0' + date;
		let month = dateObj.getMonth() + 1;
		if (month < 10) month = '0' + month;
		const year = dateObj.getFullYear();
		return `${year}.${month}.${date} ${hour}:${min}`;
	};

	cancelApproval = async () => {
		if (this.state.loading) {
			return;
		}
		this.setState({ loading: true });
		try {
			const { chainId, tokenInfo, event, selectedAddress } = this.props;
			const tokenAddress = tokenInfo.address;
			const spender = event.spender;
			const transactionTypes = TransactionTypes.ORIGIN_CANCEL_APPROVAL;
			const myAddress = selectedAddress;
			this.addApprovalListener();
			const chainType = getChainTypeByChainId(chainId);
			if (chainType === ChainType.RPCBase) {
				if (await Engine.networks[ChainType.RPCBase].isRpcChainId(chainId)) {
					const type = await Engine.networks[ChainType.RPCBase].getChainTypeByChainId(chainId);
					await Engine.contracts[ChainType.RPCBase].callContract(
						type,
						'callApprove',
						tokenAddress,
						spender,
						'0',
						myAddress,
						transactionTypes
					);
				}
			} else {
				if (chainId === Engine.networks[chainType]?.state.provider.chainId) {
					await Engine.contracts[chainType]?.callApprove(
						tokenAddress,
						spender,
						'0',
						myAddress,
						transactionTypes
					);
				}
			}
			onEvent('revoke_approval');
		} catch (error) {
			util.logDebug('cancelApproval --> ', error);
			this.setState({ loading: false });
		}
	};

	addApprovalListener = () => {
		const { TransactionController, ApprovalEventsController } = Engine.context;
		const { chainId, selectedAddress } = this.props;

		const onApproveListener = DeviceEventEmitter.addListener('OnApprove', approveId => {
			TransactionController.hub.once(`${approveId}:confirmed`, transactionMeta => {
				if (transactionMeta.status === TransactionStatus.confirmed) {
					ApprovalEventsController.refreshOneChainAllowances(selectedAddress, chainId);
				} else {
					this.setState({ loading: false });
				}
			});
			// Remove the DeviceEventEmitter listener after it has been invoked
			onApproveListener.remove();
		});
	};

	render() {
		/**
		 *  export interface Event {
			spender: string;
			spenderInfo: Contract | undefined;
			initAllowance: string;
			allowance: number;
			timestamp: string;
		}
		 */
		const { event, showInfiniteDesc, tokenInfo, contractList, chainId, hideDivider } = this.props;
		const { loading } = this.state;
		const spender = event.spender;
		const allowance = event.allowance / 10 ** tokenInfo.decimals;
		const type = getChainTypeByChainId(chainId);
		const spenderInfo = contractList?.find(
			contract => chainToChainType(contract.chain) === type && toLowerCaseEquals(contract.address, spender)
		);
		const { isDarkMode } = this.context;
		return (
			<View style={styles.container}>
				<View style={styles.titleLine}>
					{spenderInfo && spenderInfo.status === 1 && (
						<Image style={styles.safeIcon} source={require('../../../images/tag_safe.png')} />
					)}
					<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
						{spenderInfo
							? strings('approval_management.spender_name', { name: spenderInfo.name })
							: strings('approval_management.spender_unknown')}
					</Text>
				</View>
				<View style={styles.nameValueLine}>
					<Text style={[styles.name, isDarkMode && baseStyles.textDark]}>
						{strings('approval_management.contract')}
					</Text>
					<Text style={[styles.value, isDarkMode && baseStyles.subTextDark]}>
						{spender.substr(0, 11) + '...' + spender.substr(-11)}
					</Text>
					<TouchableOpacity onPress={this.openEtherscan.bind(this, spender)}>
						<Image style={styles.icon} source={require('../../../images/browser.png')} />
					</TouchableOpacity>
				</View>
				<View style={styles.nameValueLine}>
					<Text style={[styles.name, isDarkMode && baseStyles.textDark]}>
						{strings('approval_management.limit')}
					</Text>
					<Text style={[styles.value, isDarkMode && baseStyles.subTextDark]}>
						{allowance > 1e40 ? strings('approval_management.infinite') : allowance}
					</Text>
					{allowance > 1e40 && (
						<TouchableOpacity onPress={showInfiniteDesc}>
							<Image style={styles.icon} source={require('../../../images/ic_explain.png')} />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.nameValueLine}>
					<Text style={[styles.name, isDarkMode && baseStyles.textDark]}>
						{strings('approval_management.time')}
					</Text>
					<Text style={[styles.value, isDarkMode && baseStyles.subTextDark]}>
						{this.formatDate(event.timestamp)}
					</Text>
				</View>
				<TouchableOpacity style={styles.approveBtn} activeOpacity={0.6} onPress={this.cancelApproval}>
					{loading ? (
						<ActivityIndicator size="small" color={colors.white} />
					) : (
						<Text style={styles.approveBtnText}>{strings('approval_management.revoke_approval')}</Text>
					)}
				</TouchableOpacity>
				{!hideDivider && (
					<View style={[styles.bottomDivider, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	contractList: state.settings.contractList
});

export default connect(mapStateToProps)(withNavigation(ApprovalEvent));
