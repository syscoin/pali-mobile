import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fontStyles, colors, baseStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import MoveIndicator from '../MoveIndicator';
import imgShadow from '../../../images/shadow.png';
import imgClock from '../../../images/clock.png';
import imgFinished from '../../../images/img_finished.png';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import PromptView from '../PromptView';
import { strings } from '../../../../locales/i18n';
import { setSelectedAsset } from '../../../actions/transaction';
import { ChainType, LockType, OutgoingMessageState, util, NetworkConfig } from 'paliwallet-core';
import { renderError } from '../../../util/error';
import { getChainTypeName } from '../../../util/ChainTypeImages';
import { getNetworkConfig } from '../../../util/ControllerUtils';
import { ThemeContext } from '../../../theme/ThemeProvider';

const activeOpacity = 0.8;
const headerColor = '#1E1F20';
const black = '#333333';
const grey = '#1E1F20';

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 30,
		marginHorizontal: 25,
		backgroundColor: colors.white
	},
	scrollView: {
		alignItems: 'center'
	},
	headerText: {
		fontSize: 20,
		lineHeight: 26,
		color: headerColor,
		...fontStyles.bold,
		textAlign: 'center'
	},
	timeText: {
		marginTop: 8,
		fontSize: 13,
		lineHeight: 18,
		color: black
	},
	shadowImage: {
		marginTop: 45
	},
	bottomArea: {
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 30
	},
	inLock: {
		fontSize: 20,
		lineHeight: 26,
		color: grey,
		...fontStyles.semibold
	},
	imgClock: {
		marginTop: 33
	},
	clainHour: {
		fontSize: 20,
		lineHeight: 24,
		color: black,
		...fontStyles.semibold,
		marginTop: 11
	},
	remainTitle: {
		fontSize: 14,
		lineHeight: 17,
		color: grey,
		marginTop: 16
	},
	remainText: {
		marginTop: 16,
		marginBottom: 30,
		fontSize: 20,
		lineHeight: 24,
		color: black,
		...fontStyles.semibold
	},
	claimNow: {
		width: 220,
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.brandPink300,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 30,
		marginBottom: 30
	},
	claimNowText: {
		color: colors.white,
		fontSize: 16,
		...fontStyles.semibold
	}
});

class Locked extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		asset: PropTypes.object,
		onClose: PropTypes.func,
		setSelectedAsset: PropTypes.func,
		selectedAddress: PropTypes.string
	};

	state = {
		error: null,
		loading: false
	};

	claimNow = async () => {
		const { asset, onClose, setSelectedAsset, selectedAddress } = this.props;
		const ArbContract = Engine.contracts[ChainType.Arbitrum];
		const PolygonContract = Engine.contracts[ChainType.Polygon];
		this.setState({ loading: true });

		try {
			setSelectedAsset(asset);
			if (asset.lockType === LockType.LockPolygon) {
				util.logDebug('PPYang claimPolygon asset.tx:', asset);
				const result = await PolygonContract.exitERC20(asset.tx, selectedAddress, true);
				util.logDebug('PPYang exitERC20 result:', result);
				if (result) {
					await PolygonContract.addClaimTxHash(asset.tx);
					setTimeout(() => PolygonContract.poll(), 10000);
				}
			} else {
				const batchNumber = asset.batchNumber;
				const indexInBatch = asset.indexInBatch;
				util.logDebug('claimNow', batchNumber, indexInBatch, asset);
				if (!asset.done) {
					if (
						(await ArbContract.getOutGoingMessageState(batchNumber, indexInBatch)) !==
						OutgoingMessageState.CONFIRMED
					) {
						throw new Error(strings('claim.not_allowed_claim'));
					}
				}
				const result = await ArbContract.triggerL2ToL1Transaction(batchNumber, indexInBatch, true);
				if (result) {
					await ArbContract.addClaimTxHash(asset.tx);
					setTimeout(() => ArbContract.poll(), 10000);
				}
			}

			onClose();
		} catch (error) {
			util.logWarn('claimNow', error && error.message);
			const curError = renderError(error);
			if (curError !== 'User rejected the transaction') {
				this.setState({ error: renderError(error) });
			}
		}
		this.setState({ loading: false });
	};

	getClaimInfo = () => {
		const { asset } = this.props;
		if (asset.lockType === LockType.LockPolygon) {
			return { type: ChainType.Polygon, canClaim: asset.done, waitDay: 0 };
		} else if (asset.lockType === LockType.LockArb) {
			const { confirmIntervalInSecond } = getNetworkConfig(ChainType.Arbitrum, asset.chainId);
			const oneDay = 24 * 60 * 60;
			const waitDay = Math.ceil(confirmIntervalInSecond / oneDay);
			return { type: ChainType.Arbitrum, canClaim: asset.done, waitDay };
		}
		return {};
	};

	renderAction = () => {
		const { loading } = this.state;
		const { type, canClaim, waitDay } = this.getClaimInfo();
		const { isDarkMode } = this.context;
		if (canClaim) {
			return (
				<View style={styles.bottomArea}>
					<Text style={[styles.inLock, isDarkMode && baseStyles.textDark]}>
						{strings('claim.lock_finished')}
					</Text>
					<Image style={styles.imgClock} source={imgFinished} />
					<Text style={[styles.remainTitle, isDarkMode && baseStyles.textDark]}>
						{strings('claim.time_remaining')}
					</Text>
					<Text style={[styles.clainHour, isDarkMode && baseStyles.textDark]}>
						{type === ChainType.Polygon ? strings('claim.claim_minutes') : strings('claim.claim_days')}
					</Text>
					<TouchableOpacity
						style={styles.claimNow}
						activeOpacity={activeOpacity}
						onPress={this.claimNow}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Text style={[styles.claimNowText, isDarkMode && baseStyles.textDark]}>
								{strings('claim.claim_now')}
							</Text>
						)}
					</TouchableOpacity>
				</View>
			);
		}

		return (
			<View style={styles.bottomArea}>
				<Text style={[styles.inLock, isDarkMode && baseStyles.textDark]}>{strings('claim.still_lock')}</Text>
				<Image style={styles.imgClock} source={imgClock} />
				{type === ChainType.Polygon ? (
					<Text style={[styles.remainText, isDarkMode && baseStyles.textDark]}>
						{strings('claim.claim_polygon')}
					</Text>
				) : (
					<Text style={[styles.remainText, isDarkMode && baseStyles.textDark]}>
						{strings('claim.claim_wait_day', { waitDay })}
					</Text>
				)}
			</View>
		);
	};

	getNetwork(chainId) {
		const {
			state: {
				provider: { chainId: polygonChainId }
			}
		} = Engine.networks[ChainType.Polygon];
		if (chainId === polygonChainId) {
			return getChainTypeName(ChainType.Polygon);
		}
		return getChainTypeName(ChainType.Arbitrum);
	}

	render = () => {
		const {
			asset,
			asset: { timestamp, chainId }
		} = this.props;
		const { error } = this.state;
		const oldDate = timestamp && new Date(Number(timestamp) * 1000);
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.wrapper, isDarkMode && baseStyles.darkInputBackground]}>
				<TouchableOpacity style={styles.scrollView} activeOpacity={1} keyboardShouldPersistTaps="handled">
					<Text style={[styles.headerText, isDarkMode && baseStyles.textDark]}>
						{strings('claim.migrated_to_l1', { network: this.getNetwork(chainId) })}
					</Text>
					{timestamp && (
						<Text style={[styles.timeText, isDarkMode && baseStyles.textDark]}>
							{oldDate.toLocaleString()}
						</Text>
					)}
					<MoveIndicator asset={asset} />
					<Image style={styles.shadowImage} source={imgShadow} />

					{this.renderAction()}
				</TouchableOpacity>
				<PromptView
					isVisible={error != null}
					title={strings('transactions.transaction_error')}
					message={error}
					onRequestClose={() => {
						this.setState({ error: null });
					}}
				/>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	setSelectedAsset: asset => dispatch(setSelectedAsset(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Locked);
