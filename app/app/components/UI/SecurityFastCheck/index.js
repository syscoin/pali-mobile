/* eslint-disable react-native/no-inline-styles */
import React, { PureComponent } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, Text, ActivityIndicator, TouchableOpacity, View, Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import TAG_SAFE from '../../../images/tag_safe.png';
import TAG_WARNING from '../../../images/tag_warning.png';
import TAG_DANGER from '../../../images/tag_danger.png';
import TAG_WAITING from '../../../images/tag_waiting.png';
import FastCheckResult from './FastCheckResult';
import { getChainIdByType } from '../../../util/number';
import { ChainType, util } from 'gopocket-core';
import Engine from '../../../core/Engine';
import { toggleShowHint } from '../../../actions/hint';
import { chainTypeTochain } from '../../../util/walletconnect';
import { onEvent } from 'react-native-mumeng';
import SecurityDesc from '../SecurityDesc';

const styles = StyleSheet.create({
	modalNoBorder: {
		justifyContent: 'flex-end'
	},
	detailModal: {
		width: 330,
		maxHeight: '90%',
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 10,
		flexDirection: 'column',
		overflow: 'hidden'
	},
	loaingHeader: {
		height: 230,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.$F8F8F8
	},
	ripple: {
		width: 138,
		height: 138,
		marginBottom: 4
	},
	loadingTitle: {
		fontSize: 18,
		lineHeight: 25,
		color: colors.$202020,
		...fontStyles.bold
	},
	loadingContent: {
		width: '100%',
		padding: 30,
		backgroundColor: colors.white
	},
	itemView: {
		height: 30,
		flexDirection: 'row',
		alignItems: 'center'
	},
	itemIcon: {
		width: 24,
		height: 24,
		marginRight: 6
	},
	projIcon: {
		marginRight: 6
	},
	itemText: {
		fontSize: 13,
		lineHeight: 20,
		...fontStyles.medium,
		color: colors.$3C3D40
	},
	textHint: {
		marginTop: 12,
		fontSize: 12,
		lineHeight: 18,
		color: colors.$202020
	},
	resultContent: {
		width: '100%',
		paddingHorizontal: 30,
		paddingTop: 30,
		paddingBottom: 24,
		backgroundColor: colors.white
	},
	resultTitle: {
		fontSize: 28,
		color: colors.$343434,
		...fontStyles.bold,
		lineHeight: 40
	},
	resultTips: {
		marginBottom: 24,
		fontSize: 13,
		color: colors.$343434
	},
	resultFlag: {
		position: 'absolute',
		right: 35,
		top: 30,
		width: 54,
		height: 54
	},
	divider: {
		width: '100%',
		marginTop: 16,
		marginBottom: 4
	},
	okBtn: {
		width: '100%',
		height: 22,
		marginTop: 16,
		justifyContent: 'center',
		alignItems: 'center'
	},
	btnText: {
		fontSize: 16,
		lineHeight: 22,
		color: colors.$030319
	}
});

const TAG_MAP = {
	normal: TAG_SAFE,
	notice: TAG_WARNING,
	risk: TAG_DANGER
};

const RESULT_KEYS = [
	{ name: 'security.item_open_source', key: 'openSource', trueStatus: 'normal', falseStatus: 'risk' },
	{ name: 'security.item_in_dex', key: 'inDex', trueStatus: 'normal', falseStatus: 'notice' },
	{ name: 'security.item_proxy_contract', key: 'delegated', trueStatus: 'notice', falseStatus: 'normal' },
	{ name: 'security.item_trading_slippage', key: 'dangerSlippage', trueStatus: 'notice', falseStatus: 'normal' },
	{ name: 'security.item_mintable', key: 'addable', trueStatus: 'notice', falseStatus: 'normal' },
	{ name: 'security.item_blacklisk', key: '', trueStatus: 'notice', falseStatus: 'normal' },
	{ name: 'security.item_cannot_sold', key: '', trueStatus: 'risk', falseStatus: 'normal' }
];

class SecurityFastCheck extends PureComponent {
	static propTypes = {
		isVisible: PropTypes.bool,
		asset: PropTypes.object,
		selectedAddress: PropTypes.string,
		onDismiss: PropTypes.func,
		toggleShowHint: PropTypes.func,
		isLockScreen: PropTypes.bool
	};

	state = {
		isArb: false,
		loading: true,
		showResultDialog: false,
		loadingStep: 0,
		fastCheckResult: {}
	};

	componentDidMount() {
		const { address, type } = this.props.asset;
		if (type === ChainType.Arbitrum) {
			this.setState({ isArb: true, submitSucceed: false });
			this.doSubmit(address, type);
		} else {
			this.doFastCheck(address, type);
		}
	}

	doSubmit = async (address, type) => {
		const { SecurityController } = Engine.context;
		const { selectedAddress } = this.props;
		const chain = chainTypeTochain(type);
		try {
			onEvent('SubmitToken');
			const ret = await SecurityController.submitToken(selectedAddress, address, chain);
			if (ret === 200) {
				this.setState({ isArb: true, showResultDialog: true, submitSucceed: true });
			} else {
				this.props.toggleShowHint(strings('security.submit_failed'));
				this.props.onDismiss();
			}
			util.logDebug('onSubmitClick ret -> ', ret, address, chain);
		} catch (error) {
			this.props.toggleShowHint(strings('security.submit_failed'));
			this.props.onDismiss();
			util.logDebug('submitToken error --> ', error);
		}
	};

	intervalId = -1;
	doFastCheck = async (address, type) => {
		const { SecurityController } = Engine.context;
		const chain = chainTypeTochain(type);
		const chainId = getChainIdByType(type);
		try {
			const ret = await SecurityController.fastCheck(chain, chainId, address);
			if (ret.code !== 200) {
				this.setState({ isFailed: true, errorCode: ret.code, showResultDialog: true });
				return;
			}
			this.setState({ fastCheckResult: ret.data });
			const isOpenSource = ret?.data?.res?.openSource;
			this.intervalId = setInterval(() => {
				const currentStep = this.state.loadingStep;
				this.setState({ loadingStep: currentStep + 1 });
				if (isOpenSource ? currentStep === 3 : currentStep === 1) {
					clearInterval(this.intervalId);
					setTimeout(() => {
						this.setState({ loading: false, loadingStep: 100 });
						this.updateAssetSecurityData(ret.data);
					}, 300);
				}
			}, 3000);
		} catch (error) {
			this.setState({ isFailed: true, showResultDialog: true });
		}
	};

	updateAssetSecurityData = data => {
		if (!data) {
			return;
		}
		const { normal, notice, risk } = data;
		const { asset } = this.props;
		asset.securityData = {
			chainId: getChainIdByType(asset.type),
			address: asset.address,
			normal,
			normalLength: normal?.length || 0,
			notice,
			noticeLength: notice?.length || 0,
			risk,
			riskLength: risk?.length || 0,
			website: '',
			disclaimer: '',
			isRobotDetected: true
		};
	};

	renderInfoItem = (icon, text) => (
		<View style={styles.itemView}>
			<Image style={styles.projIcon} source={icon} />
			<Text style={styles.itemText}>{text}</Text>
		</View>
	);

	onItemClick = data => {
		if (this.state.loading) {
			return;
		}
		this.setState({ descModalVisible: true, activeItem: data });
	};

	hideDescModal = () => {
		this.setState({ descModalVisible: false, activeItem: false });
	};

	renderItem = (loadingStep, data) => {
		const { index, name, status } = data;
		return (
			<TouchableOpacity style={styles.itemView} key={index} onPress={this.onItemClick.bind(this, data)}>
				{loadingStep > index && <Image style={styles.itemIcon} source={TAG_MAP[status]} />}
				{loadingStep === index && <ActivityIndicator style={styles.itemIcon} color="#8cb0ff" />}
				{loadingStep < index && <Image style={styles.itemIcon} source={TAG_WAITING} />}
				<Text style={styles.itemText}>{name}</Text>
			</TouchableOpacity>
		);
	};

	findItemResult = key => {
		const { fastCheckResult } = this.state;
		if (!fastCheckResult) {
			return undefined;
		}
		const { normal, notice, risk } = fastCheckResult;
		if (normal && normal.length > 0) {
			const ret = normal.find(v => v.key === key);
			if (ret) {
				return { item: ret, status: 'normal' };
			}
		}
		if (notice && notice.length > 0) {
			const ret = notice.find(v => v.key === key);
			if (ret) {
				return { item: ret, status: 'notice' };
			}
		}
		if (risk && risk.length > 0) {
			const ret = risk.find(v => v.key === key);
			if (ret) {
				return { item: ret, status: 'risk' };
			}
		}
		return undefined;
	};

	buildList = () => {
		const { loading, loadingStep, fastCheckResult } = this.state;
		const ret = fastCheckResult?.res || {};
		let keyList = [...RESULT_KEYS];
		if (loading) {
			keyList = keyList.slice(0, 4);
		}
		const itemList = [];
		keyList.forEach((v, i, a) => {
			const findRet = this.findItemResult(v.key);
			let obj;
			if (findRet && loadingStep > i) {
				const { item, status } = findRet;
				obj = { index: i, name: item.name, status, ...item };
			} else {
				obj = { index: i, name: strings(v.name), status: ret[v.key] ? v.trueStatus : v.falseStatus };
			}
			if (i < 4 || obj.status !== 'normal') {
				itemList.push(obj);
			}
		});
		if (!loading && !ret.openSource) {
			return itemList.slice(0, 2);
		}
		return itemList;
	};

	renderLoadingState() {
		const { loadingStep } = this.state;
		const { isVisible, onDismiss, isLockScreen } = this.props;
		const itemList = this.buildList();
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
					<View style={styles.loaingHeader}>
						<Image style={styles.ripple} source={require('../../../images/ripple.gif')} />
						<Text style={styles.loadingTitle}>{strings('security.fast_check_loading')}</Text>
					</View>
					<View style={styles.loadingContent}>
						{itemList.map((v, i) => this.renderItem(loadingStep, v))}
						<Text style={styles.textHint}>{strings('security.fast_check_hint')}</Text>
					</View>
				</View>
			</Modal>
		);
	}

	renderResult() {
		const { isVisible, asset, onDismiss, isLockScreen } = this.props;
		const { loadingStep, fastCheckResult, descModalVisible, activeItem } = this.state;
		const { notice, risk } = fastCheckResult || {};
		const noticeNum = notice && notice.length ? notice.length : 0;
		const riskNum = risk && risk.length ? risk.length : 0;
		let riskText = strings('security.security_risk_unknown');
		let riskImg = require('../../../images/img_defi_unknown.png');
		if (risk && riskNum === 0 && (notice && noticeNum === 0)) {
			riskText = strings('security.security_risk_low');
			riskImg = require('../../../images/img_defi_safe.png');
		} else if (riskNum > 0) {
			riskText = strings('security.security_risk_high');
			riskImg = require('../../../images/img_defi_danger.png');
		} else if (noticeNum > 0) {
			riskText = strings('security.security_risk_medium');
			riskImg = require('../../../images/img_defi_warning.png');
		}
		const itemList = this.buildList();
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
					<View style={styles.resultContent}>
						<Text style={styles.resultTitle}>{riskText}</Text>
						<Text style={styles.resultTips}>{strings('security.preliminary_results')}</Text>
						<Image style={styles.resultFlag} source={riskImg} />
						{itemList.map((v, i) => this.renderItem(loadingStep, v))}
						<Image style={styles.divider} source={require('../../../images/dashed.png')} />
						<Text style={styles.textHint}>{strings('security.preliminary_results_hint')}</Text>
						<Text style={[styles.itemText, { marginTop: 6, marginBottom: 14 }]}>
							{strings('security.detail_include')}
						</Text>
						{this.renderInfoItem(
							require('../../../images/ic_project_security.png'),
							strings('security.proj_security')
						)}
						{this.renderInfoItem(
							require('../../../images/ic_contract_security.png'),
							strings('security.contract_security')
						)}
						{this.renderInfoItem(
							require('../../../images/ic_trade_security.png'),
							strings('security.transaction_security')
						)}
						<TouchableOpacity style={styles.okBtn} onPress={onDismiss}>
							<Text style={styles.btnText}>{strings('navigation.ok')}</Text>
						</TouchableOpacity>
					</View>
				</View>
				<SecurityDesc
					isVisible={descModalVisible}
					data={activeItem}
					asset={asset}
					onDismiss={this.hideDescModal}
				/>
			</Modal>
		);
	}

	hideResultDialog = () => {
		this.setState({ showResultDialog: false });
		this.props.onDismiss();
	};

	render() {
		const { loading, isArb, isFailed, errorCode, showResultDialog } = this.state;
		if (isArb) {
			return <FastCheckResult succeed isVisible={showResultDialog} onDismiss={this.hideResultDialog} />;
		}
		if (isFailed) {
			return (
				<FastCheckResult
					succeed={false}
					errorCode={errorCode}
					isVisible={showResultDialog}
					onDismiss={this.hideResultDialog}
				/>
			);
		}
		if (loading) {
			return this.renderLoadingState();
		}
		return this.renderResult();
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(SecurityFastCheck);
