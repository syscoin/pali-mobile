import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import LottieView from 'lottie-react-native';
import { colors, fontStyles } from '../../../styles/common';
import { onEvent } from '../../../util/statistics';
import { toLowerCaseEquals } from '../../../util/general';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
	enableVibrateFallback: true,
	ignoreAndroidSystemSettings: false
};

const styles = StyleSheet.create({
	topContainer: {
		marginTop: 24,
		flexDirection: 'column',
		alignItems: 'center'
	},
	flexRow: {
		width: 320,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	flexRowStart: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	flexRowStart2: {
		marginTop: 8,
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	flexOne: {
		flex: 1,
		alignItems: 'center'
	},
	checkLayout: {
		width: 156,
		height: 56,
		marginTop: 20,
		backgroundColor: colors.white,
		borderRadius: 34,
		justifyContent: 'center',
		alignItems: 'center'
	},
	btnText: {
		fontSize: 16,
		color: colors.$514570,
		...fontStyles.bold
	},
	count: {
		fontSize: 40,
		marginBottom: -8,
		color: colors.white,
		...fontStyles.medium
	},
	countText: {
		fontSize: 15,
		color: colors.white,
		marginLeft: 5
	},
	count2: {
		fontSize: 34,
		marginBottom: -8,
		color: colors.white,
		...fontStyles.medium
	},
	countText2: {
		fontSize: 13,
		color: colors.white,
		marginLeft: 5
	},
	animation: {
		width: 18,
		height: 18
	},
	detectView: {
		color: colors.white,
		fontSize: 12,
		marginTop: 8
	}
});

class ApprovalTop extends Component {
	static propTypes = {
		selectedAddress: PropTypes.string,
		updateTime: PropTypes.number,
		allEvents: PropTypes.object
	};

	state = {
		checkLoading: false,
		tokenCount: 0,
		contractCount: 0
	};

	async componentDidMount() {
		const { updateTime } = this.props;
		if (Date.now() - updateTime > 3 * 60 * 1000) {
			const { selectedAddress } = this.props;
			await Engine.context.ApprovalEventsController.refreshAllowances(selectedAddress);
		}
		this.calculateCount();
	}

	calculateCount = () => {
		const { allEvents, selectedAddress } = this.props;
		const myTokens = allEvents[selectedAddress] || {};
		const tokenList = [];
		const chainIds = Object.keys(myTokens);
		for (let i = 0; i < chainIds.length; i++) {
			const chainId = chainIds[i];
			const singleChainTokens = myTokens[chainId] || {};
			const tokens = Object.keys(singleChainTokens);
			for (let j = 0; j < tokens.length; j++) {
				const tokenAddress = tokens[j];
				if (singleChainTokens[tokenAddress]) {
					const tokenGroup = { ...singleChainTokens[tokenAddress] };
					const tokenInfo = this.getTokenInfo(tokenGroup.token, tokenGroup.chainId);
					if (!tokenInfo) {
						continue;
					}
					tokenGroup.tokenInfo = tokenInfo;
					const approvalsMap = tokenGroup.approvals;
					tokenGroup.approvals = [];
					const spenders = Object.keys(approvalsMap);
					for (let k = 0; k < spenders.length; k++) {
						const spender = spenders[k];
						const event = approvalsMap[spender];
						if (event.allowance > 0) {
							tokenGroup.approvals.push(approvalsMap[spender]);
						}
					}
					if (tokenGroup.approvals.length === 0) {
						continue;
					}
					tokenList.push(tokenGroup);
				}
			}
		}
		const tokenCount = tokenList.length;
		let contractCount = 0;
		tokenList.forEach(v => (contractCount += v.approvals.length));
		this.setState({ tokenCount, contractCount });
	};

	getTokenInfo(token: string, chainId: string): Token | undefined {
		const { selectedAddress } = this.props;
		const { AssetsController } = Engine.context;
		const { allTokens, allIgnoredTokens } = AssetsController.state;
		const currChainTokens = allTokens?.[selectedAddress]?.[chainId] || [];
		const currChainIgnoredTokens = allIgnoredTokens?.[selectedAddress]?.[chainId] || [];
		const all = [...currChainTokens, ...currChainIgnoredTokens];
		for (const t of all) {
			if (toLowerCaseEquals(t.address, token)) {
				return t;
			}
		}
		return undefined;
	}

	toDateFormat = timestamp => {
		const dateObj = new Date(timestamp);
		let meridiem = 'AM';
		let hour = dateObj.getHours();
		if (hour > 12) {
			meridiem = 'PM';
			hour -= 12;
		}
		let min = dateObj.getMinutes();
		if (`${min}`.length === 1) min = `0${min}`;
		return `${hour}:${min}${meridiem}`;
	};

	doSafelyCheck = async () => {
		if (this.state.checkLoading) {
			return;
		}
		ReactNativeHapticFeedback.trigger('impactMedium', options);
		this.setState({ checkLoading: true });
		const { selectedAddress } = this.props;
		await Engine.context.ApprovalEventsController.refreshAllowances(selectedAddress);
		setTimeout(() => {
			this.setState({ checkLoading: false });
		}, 2000);
		onEvent('ApprovalSafetyDetection');
	};

	render() {
		const { updateTime } = this.props;
		const { checkLoading, tokenCount, contractCount } = this.state;
		return (
			<View style={styles.topContainer}>
				<View style={styles.flexRow}>
					<View style={styles.flexOne}>
						<View style={styles.flexRowStart}>
							<Text style={styles.count}>{tokenCount}</Text>
							<Text style={styles.countText}>
								{strings(tokenCount > 1 ? `security.approved_tokens` : `security.approved_token`)}
							</Text>
						</View>
						<View style={styles.flexRowStart2}>
							<Text style={styles.count2}>{contractCount}</Text>
							<Text style={styles.countText2}>
								{strings(
									contractCount > 1 ? `security.approved_contracts` : `security.approved_contract`
								)}
							</Text>
						</View>
					</View>
					<View style={styles.flexOne}>
						{checkLoading ? (
							<View style={styles.checkLayout}>
								<LottieView
									style={styles.animation}
									autoPlay
									loop
									source={require('../../../animations/security_loading.json')}
								/>
							</View>
						) : (
							<TouchableOpacity style={styles.checkLayout} onPress={this.doSafelyCheck}>
								<View>
									<Text style={styles.btnText}>{strings('security.safety_check')}</Text>
								</View>
							</TouchableOpacity>
						)}
						{
							<Text style={styles.detectView}>
								{updateTime && updateTime > 0
									? strings('security.auto_detected_at', { time: this.toDateFormat(updateTime) })
									: ''}
							</Text>
						}
					</View>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	updateTime: state.engine.backgroundState.ApprovalEventsController.updateTime,
	allEvents: state.engine.backgroundState.ApprovalEventsController.allEvents
});

export default connect(mapStateToProps)(ApprovalTop);
