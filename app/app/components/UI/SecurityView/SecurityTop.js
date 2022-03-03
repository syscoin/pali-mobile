import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { onEvent } from 'react-native-mumeng';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { encryptString } from '../../../util/CryptUtils';
import { util } from 'gopocket-core';
import LottieView from 'lottie-react-native';
import { colors, fontStyles } from '../../../styles/common';
import { isRpcChainId } from '../../../util/ControllerUtils';

const statUrl = 'https://go.morpheuscommunity.net/api/v2/open/event/handle';
const statUrlForTesting = 'https://go.libsss.com/api/v2/open/event/handle';

const styles = StyleSheet.create({
	topContainer: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	flexRow: {
		width: 320,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	flexCol: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	flexRowStart: {
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
		color: colors.$3EC6FF,
		...fontStyles.bold
	},
	animation: {
		width: 18,
		height: 18
	},
	detectView: {
		color: colors.white,
		fontSize: 12,
		marginTop: 8
	},
	rowTags: {
		height: 34,
		width: '100%',
		marginTop: 20,
		paddingRight: 32,
		justifyContent: 'space-between',
		alignItems: 'center',
		flexDirection: 'row'
	},
	riskCount: {
		fontSize: 40,
		marginTop: 24,
		marginBottom: -8,
		marginRight: 4,
		color: colors.white,
		...fontStyles.medium
	},
	tagNum: {
		fontSize: 14,
		color: colors.white,
		marginBottom: 2
	}
});

class SecurityTop extends Component {
	static propTypes = {
		chainId: PropTypes.string,
		bscChainId: PropTypes.string,
		polygonChainId: PropTypes.string,
		arbChainId: PropTypes.string,
		hecoChainId: PropTypes.string,
		opChainId: PropTypes.string,
		avaxChainId: PropTypes.string,
		tokens: PropTypes.array,
		securityTokens: PropTypes.array,
		updateTime: PropTypes.number
	};

	state = {
		checkLoading: false
	};

	doSafelyCheck = () => {
		if (this.state.checkLoading) {
			return;
		}
		this.setState({ checkLoading: true });
		Engine.fetchAssetsSafety(true);
		setTimeout(() => {
			this.setState({ checkLoading: false });
		}, 2000);
		onEvent('SafetyDetection');
		this.statDetect();
	};

	statDetect = async () => {
		const {
			KeyringController,
			NetworkController,
			BscNetworkController,
			PolygonNetworkController,
			TokenBalancesController
		} = Engine.context;
		const { contractBalances, bscContractBalances, polygonContractBalances } = TokenBalancesController.state;
		const wallet_address = [];
		if (await NetworkController.ismainnet()) {
			try {
				for (const addressKey in contractBalances) {
					let has_balances = false;
					for (const tokenKey in contractBalances[addressKey]) {
						const amountBN = contractBalances[addressKey]?.[tokenKey];
						if (amountBN && amountBN.gtn(0)) {
							has_balances = true;
							break;
						}
					}
					if (has_balances) {
						if (!wallet_address.includes(addressKey)) {
							wallet_address.push(addressKey);
						}
					}
				}
			} catch (e) {
				util.logDebug(e);
			}
		}
		if (await BscNetworkController.ismainnet()) {
			try {
				for (const addressKey in bscContractBalances) {
					let has_balances = false;
					for (const tokenKey in bscContractBalances[addressKey]) {
						const amountBN = bscContractBalances[addressKey]?.[tokenKey];
						if (amountBN && amountBN.gtn(0)) {
							has_balances = true;
							break;
						}
					}
					if (has_balances) {
						if (!wallet_address.includes(addressKey)) {
							wallet_address.push(addressKey);
						}
					}
				}
			} catch (e) {
				util.logDebug(e);
			}
		}
		if (await PolygonNetworkController.ismainnet()) {
			try {
				for (const addressKey in polygonContractBalances) {
					let has_balances = false;
					for (const tokenKey in polygonContractBalances[addressKey]) {
						const amountBN = polygonContractBalances[addressKey]?.[tokenKey];
						if (amountBN && amountBN.gtn(0)) {
							has_balances = true;
							break;
						}
					}
					if (has_balances) {
						if (!wallet_address.includes(addressKey)) {
							wallet_address.push(addressKey);
						}
					}
				}
			} catch (e) {
				util.logDebug(e);
			}
		}
		if (wallet_address.length === 0) {
			util.logDebug('leon.w@ user has not balances at all.');
			return;
		}
		const accounts = await KeyringController.getAccounts();
		const body = JSON.stringify({
			address: accounts[0],
			event: 'detect',
			wallet_address
		});
		const encrypted_body = await encryptString(body);
		util.handleFetch(util.useTestServer() ? statUrlForTesting : statUrl, {
			method: 'POST',
			body: JSON.stringify({ content: encrypted_body }),
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'Accept-Language': strings('other.accept_language')
			}
		});
	};

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

	getTokensCount = () => {
		const {
			tokens,
			securityTokens,
			chainId,
			bscChainId,
			polygonChainId,
			arbChainId,
			hecoChainId,
			opChainId,
			avaxChainId
		} = this.props;
		let normalCount = 0;
		let noticeCount = 0;
		let riskCount = 0;
		tokens.forEach((asset, index) => {
			if (asset.nativeCurrency) {
				normalCount += 1;
			} else {
				const securityData = securityTokens.filter(
					token =>
						token.address.toLowerCase() === asset.address.toLowerCase() &&
						(token.chainId === chainId ||
							token.chainId === bscChainId ||
							token.chainId === polygonChainId ||
							token.chainId === arbChainId ||
							token.chainId === hecoChainId ||
							token.chainId === avaxChainId ||
							token.chainId === opChainId ||
							isRpcChainId(token.chainId))
				);
				if (securityData && securityData.length > 0) {
					const { notice, risk } = securityData[0];
					if (risk && risk.length > 0) {
						riskCount += 1;
					} else if (notice && notice.length > 0) {
						noticeCount += 1;
					} else {
						normalCount += 1;
					}
				}
			}
		});
		return { normalCount, noticeCount, riskCount };
	};

	render() {
		const { updateTime } = this.props;
		const { checkLoading } = this.state;
		const { normalCount, noticeCount, riskCount } = this.getTokensCount();
		return (
			<View style={styles.topContainer}>
				<View style={styles.flexRow}>
					<View style={styles.flexOne}>
						<View style={styles.flexRowStart}>
							<Text style={styles.riskCount}>{riskCount}</Text>
							<Text style={styles.tagNum}>
								{strings(riskCount > 1 ? `security.risk_tokens` : `security.risk_token`)}
							</Text>
						</View>
						<View style={styles.rowTags}>
							<View style={styles.flexCol}>
								<Text style={styles.tagNum}>{normalCount}</Text>
								<Image source={require('../../../images/tag_safe.png')} />
							</View>
							<View style={styles.flexCol}>
								<Text style={styles.tagNum}>{noticeCount}</Text>
								<Image source={require('../../../images/tag_warning.png')} />
							</View>
							<View style={styles.flexCol}>
								<Text style={styles.tagNum}>{riskCount}</Text>
								<Image source={require('../../../images/tag_danger.png')} />
							</View>
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
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	bscChainId: state.engine.backgroundState.BscNetworkController.provider.chainId,
	polygonChainId: state.engine.backgroundState.PolygonNetworkController.provider.chainId,
	arbChainId: state.engine.backgroundState.ArbNetworkController.provider.chainId,
	hecoChainId: state.engine.backgroundState.HecoNetworkController.provider.chainId,
	opChainId: state.engine.backgroundState.OpNetworkController.provider.chainId,
	avaxChainId: state.engine.backgroundState.AvaxNetworkController.provider.chainId,
	securityTokens: state.engine.backgroundState.SecurityController.securityTokens,
	updateTime: state.engine.backgroundState.SecurityController.updateTime
});

export default connect(mapStateToProps)(SecurityTop);
