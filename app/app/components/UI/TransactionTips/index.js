// eslint-disable-next-line no-unused-vars
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { baseStyles, colors } from '../../../styles/common';
import Animated, { Easing } from 'react-native-reanimated';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import LottieView from 'lottie-react-native';
import { randomTransactionId } from '../../../util/number';
import Engine from '../../../core/Engine';
import { CrossChainType, TransactionStatus } from 'gopocket-core';
import { toggleOngoingTransactionsModal } from '../../../actions/modals';
import PropTypes from 'prop-types';
import { toggleShowHint } from '../../../actions/hint';
import {
	isTokenMethodApprove,
	isTokenMethodSafeTransferFrom,
	isTokenMethodTransferFrom
} from '../../../util/transactions';
import { store } from '../../../store';
import { isRpcChainId } from '../../../util/ControllerUtils';

const styles = StyleSheet.create({
	wrapper: {
		height: 44,
		minWidth: 44,
		position: 'absolute',
		bottom: 109,
		right: 20,
		backgroundColor: colors.white,
		...baseStyles.shadow,
		borderRadius: 22
	},
	submittedWrapper: {
		width: 0,
		height: 44,
		marginRight: 44,
		alignItems: 'center',
		justifyContent: 'center'
	},
	submittedText: {
		fontSize: 13,
		lineHeight: 16,
		color: colors.$60657D
	},
	waitWrapper: {
		width: 44,
		height: 44,
		position: 'absolute',
		right: 0,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 22
	},
	waitAnimation: {
		width: 44,
		height: 44,
		position: 'absolute',
		alignSelf: 'center'
	},
	waitText: {
		fontSize: 18,
		color: colors.$FE6E91
	},
	animation: {
		width: 44,
		height: 44
	},
	animationWrapper: {
		height: 44,
		minWidth: 44,
		position: 'absolute',
		bottom: 109,
		right: 20,
		backgroundColor: colors.transparent,
		...baseStyles.shadow,
		borderRadius: 22
	},
	animationHide: {
		borderRadius: 22,
		backgroundColor: colors.white
	}
});

class TransactionTips extends PureComponent {
	static propTypes = {
		toggleOngoingTransactionsModal: PropTypes.func,
		polygonDeposits: PropTypes.array,
		bscDeposits: PropTypes.array,
		chainId: PropTypes.string,
		arbChainId: PropTypes.string,
		bscChainId: PropTypes.string,
		polygonChainId: PropTypes.string,
		hecoChainId: PropTypes.string,
		opChainId: PropTypes.string,
		avaxChainId: PropTypes.string,
		toggleShowHint: PropTypes.func
	};

	state = {
		submittedIds: [],
		animateEnd: false
	};

	initTransactionData = false;
	calWidth = new Animated.Value(0);
	textOpacity = new Animated.Value(0);
	hideView = new Animated.Value(1);
	curShowId: number = 0;
	transactionListener;

	constructor(props) {
		super(props);
		this.transactionListener = this.onTransactionFinished.bind(this);
		Engine.context.TransactionController.hub.on('submittedTransaction', transactionMeta => {
			if (!this.exitChainId(transactionMeta.chainId)) {
				return;
			}
			this.showSubmitted(transactionMeta);
			this.state.submittedIds.unshift(transactionMeta.id);
			Engine.context.TransactionController.hub.once(`${transactionMeta.id}:finished`, this.transactionListener);
			Engine.context.TransactionController.hub.once(`${transactionMeta.id}:confirmed`, this.transactionListener);
			this.hideView = new Animated.Value(1);
			this.setState({ submittedIds: [...this.state.submittedIds], animateEnd: true });
		});
	}

	exitChainId = curChainId => {
		const { chainId, arbChainId, bscChainId, polygonChainId, hecoChainId, opChainId, avaxChainId } = this.props;
		return (
			curChainId === chainId ||
			curChainId === arbChainId ||
			curChainId === bscChainId ||
			curChainId === polygonChainId ||
			curChainId === hecoChainId ||
			curChainId === opChainId ||
			curChainId === avaxChainId ||
			isRpcChainId(curChainId)
		);
	};

	componentDidMount() {
		this.initSubmittedIds();
	}

	componentWillUnmount() {
		Engine.context.TransactionController.hub.removeAllListeners('submittedTransaction');
	}

	initSubmittedIds = () => {
		const { TransactionController } = Engine.context;
		const transactionMetas = TransactionController.state.transactionMetas;
		const submittedTransaction = transactionMetas.filter(meta => {
			if (!this.exitChainId(meta.chainId)) {
				return false;
			}
			if (
				(meta.status === TransactionStatus.submitted || meta.status === TransactionStatus.confirmed) &&
				meta.extraInfo &&
				meta.extraInfo.crossChainType
			) {
				if (!meta.extraInfo.crossChainDone) {
					this.fixCross(meta);
					return !this.findMigratedTransactionDone(meta);
				}
			}
			if (meta.status === TransactionStatus.submitted) {
				return true;
			}
			return false;
		});
		if (submittedTransaction.length > 0) {
			const submittedIds = submittedTransaction.map(meta => {
				Engine.context.TransactionController.hub.once(`${meta.id}:finished`, this.transactionListener);
				Engine.context.TransactionController.hub.once(`${meta.id}:confirmed`, this.transactionListener);
				return meta.id;
			});
			this.hideView = new Animated.Value(1);
			this.setState({ submittedIds: [...submittedIds], animateEnd: true });
		}
	};

	componentDidUpdate(prevProps) {
		this.onPropsUpdate();
		if (
			prevProps.chainId !== this.props.chainId ||
			prevProps.arbChainId !== this.props.arbChainId ||
			prevProps.bscChainId !== this.props.bscChainId ||
			prevProps.polygonChainId !== this.props.polygonChainId ||
			prevProps.hecoChainId !== this.props.hecoChainId ||
			prevProps.opChainId !== this.props.opChainId ||
			prevProps.avaxChainId !== this.props.avaxChainId
		) {
			this.onNetworkUpdate();
		}
	}

	async onPropsUpdate() {
		this.props.polygonDeposits.forEach(state => {
			if (state && state.done) {
				const { TransactionController } = Engine.context;
				const transactionMetas = TransactionController.state.transactionMetas;
				const transactionMeta = transactionMetas.find(({ transactionHash }) => transactionHash === state.tx);
				if (transactionMeta && transactionMeta.extraInfo && transactionMeta.extraInfo.crossChainType) {
					if (!transactionMeta.extraInfo.crossChainDone) {
						this.finishTransaction(transactionMeta);
						this.updateTransaction(transactionMeta);
					}
				}
			}
		});
		this.props.bscDeposits.forEach(state => {
			if (state && state.done) {
				const { TransactionController } = Engine.context;
				const transactionMetas = TransactionController.state.transactionMetas;
				const transactionMeta = transactionMetas.find(
					({ transactionHash }) => transactionHash === state.transactionHash
				);
				if (transactionMeta && transactionMeta.extraInfo && transactionMeta.extraInfo.crossChainType) {
					if (!transactionMeta.extraInfo.crossChainDone) {
						this.finishTransaction(transactionMeta);
						this.updateTransaction(transactionMeta);
					}
				}
			}
		});
	}

	async onNetworkUpdate() {
		this.state.submittedIds.forEach(id => {
			Engine.context.TransactionController.hub.removeListener(`${id}:finished`, this.transactionListener);
			Engine.context.TransactionController.hub.removeListener(`${id}:confirmed`, this.transactionListener);
		});
		this.setState({ submittedIds: [], animateEnd: false });
		this.initSubmittedIds();
	}

	onTransactionFinished(transactionMeta) {
		if (
			(transactionMeta.status === TransactionStatus.confirmed ||
				transactionMeta.status === TransactionStatus.submitted) &&
			transactionMeta.extraInfo &&
			transactionMeta.extraInfo.crossChainType &&
			!transactionMeta.extraInfo.crossChainDone
		) {
			if (this.findMigratedTransactionDone(transactionMeta)) {
				this.updateTransaction(transactionMeta);
				this.finishTransaction(transactionMeta);
			}
			return;
		}
		this.finishTransaction(transactionMeta);
	}

	finishTransaction(transactionMeta) {
		const index = this.state.submittedIds.findIndex(transactionId => transactionId === transactionMeta.id);
		if (index === -1) {
			return;
		}

		// eslint-disable-next-line react/no-direct-mutation-state
		this.state.submittedIds = this.state.submittedIds.filter(transactionId => transactionId !== transactionMeta.id);
		this.setState({ submittedIds: [...this.state.submittedIds] });

		if (transactionMeta.status === TransactionStatus.confirmed) {
			setTimeout(() => {
				const { TokenBalancesController } = Engine.context;
				const pollPromises = [];
				pollPromises.push(...[TokenBalancesController.poll()]);
				Promise.all(pollPromises);
			}, 2000);

			if (isTokenMethodApprove(transactionMeta?.transaction?.data)) {
				const approveInfo = store
					.getState()
					.settings.approveList?.find(info => info.metaID === transactionMeta.id);
				if (approveInfo) {
					this.props.toggleShowHint(strings('other.approve_token_complete', { token: approveInfo.symbol }));
				}
			}
		}
		setTimeout(() => {
			Engine.context.TransactionController.hub.removeAllListeners(`${transactionMeta.id}:finished`);
			Engine.context.TransactionController.hub.removeAllListeners(`${transactionMeta.id}:confirmed`);
		}, 3000);
	}

	findMigratedTransactionDone(transactionMeta) {
		if (transactionMeta.extraInfo.crossChainType === CrossChainType.depositPolygon) {
			const depositState = this.props.polygonDeposits.find(({ tx }) => tx === transactionMeta.transactionHash);
			return depositState && depositState.done;
		} else if (
			transactionMeta.extraInfo.crossChainType === CrossChainType.depositBsc ||
			transactionMeta.extraInfo.crossChainType === CrossChainType.withdrawBsc
		) {
			const swapState = this.props.bscDeposits.find(
				({ transactionHash }) => transactionHash === transactionMeta.transactionHash
			);
			return swapState && swapState.done;
		}
		return false;
	}

	fixCross(transactionMeta) {
		if (transactionMeta.extraInfo.crossChainType === CrossChainType.depositPolygon) {
			const depositState = this.props.polygonDeposits.find(({ tx }) => tx === transactionMeta.transactionHash);
			if (!depositState) {
				const { PolygonContractController } = Engine.context;
				PolygonContractController.addDepositTxHash(transactionMeta.transactionHash, transactionMeta.chainId);
			}
		} else if (
			transactionMeta.extraInfo.crossChainType === CrossChainType.withdrawBsc ||
			transactionMeta.extraInfo.crossChainType === CrossChainType.depositBsc
		) {
			const state = this.props.bscDeposits.find(
				({ transactionHash }) => transactionHash === transactionMeta.transactionHash
			);
			if (!state) {
				const { BscBridgeController } = Engine.context;
				BscBridgeController.addDepositId(transactionMeta.transactionHash, transactionMeta.transaction?.from);
			}
		}
	}

	updateTransaction(transactionMeta) {
		transactionMeta.extraInfo.crossChainDone = true;
		const { TransactionController } = Engine.context;
		TransactionController.updateTransaction(transactionMeta);
	}

	animatedShowSubmitted = toValue => {
		Animated.timing(this.calWidth, {
			toValue,
			duration: 300,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};

	animatedShowText = toValue => {
		Animated.timing(this.textOpacity, {
			toValue,
			duration: 100,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};

	animatedHideView = () => {
		Animated.timing(this.hideView, {
			toValue: 0,
			duration: 100,
			easing: Easing.linear,
			useNativeDriver: true
		}).start(() => {
			this.setState({ animateEnd: false });
		});
	};

	showSubmitted = transactionMeta => {
		this.curShowId = randomTransactionId();
		const showId = this.curShowId;
		setTimeout(() => {
			this.animatedShowSubmitted(168);
			setTimeout(() => {
				this.animatedShowText(1);
			}, 250);

			setTimeout(() => {
				if (this.curShowId !== showId) {
					return;
				}
				this.animatedShowText(0);
				this.animatedShowSubmitted(0);
				this.showToast(transactionMeta);
			}, 3000);
		}, 200);
	};

	showToast = transactionMeta => {
		const data = transactionMeta?.transaction?.data;
		if (data) {
			if (isTokenMethodTransferFrom(data) || isTokenMethodSafeTransferFrom(data)) {
				this.props.toggleShowHint(strings('other.send_nft_tips'));
			}
		}
	};

	onWaitPress = () => {
		this.props.toggleOngoingTransactionsModal(true);
	};

	onAnimationFinish = () => {
		this.animatedHideView();
	};

	render() {
		const { submittedIds, animateEnd } = this.state;
		if (submittedIds.length <= 0) {
			if (animateEnd) {
				return (
					<ElevatedView style={styles.animationWrapper} elevation={100}>
						<Animated.View style={[styles.animationHide, { opacity: this.hideView }]}>
							<LottieView
								style={styles.animation}
								autoPlay
								loop={false}
								source={require('../../../animations/ongoing_loading_success.json')}
								onAnimationFinish={this.onAnimationFinish}
							/>
						</Animated.View>
					</ElevatedView>
				);
			}
			return <></>;
		}
		return (
			<ElevatedView style={styles.wrapper} elevation={100}>
				<Animated.View style={[styles.submittedWrapper, { minWidth: this.calWidth }]}>
					<Animated.View style={[{ opacity: this.textOpacity }]}>
						<Text style={styles.submittedText} numberOfLines={1}>
							{strings('other.transaction_submitted')}
						</Text>
					</Animated.View>
				</Animated.View>
				<TouchableOpacity style={styles.waitWrapper} onPress={this.onWaitPress} activeOpacity={0.8}>
					<LottieView
						style={styles.waitAnimation}
						autoPlay
						loop
						source={require('../../../animations/ongoing_loading.json')}
					/>
					<Text style={styles.waitText}>{submittedIds.length}</Text>
				</TouchableOpacity>
			</ElevatedView>
		);
	}
}

const mapStateToProps = state => ({
	polygonDeposits: state.engine.backgroundState.PolygonContractController.deposits,
	bscDeposits: state.engine.backgroundState.BscBridgeController.deposits,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	arbChainId: state.engine.backgroundState.ArbNetworkController.provider.chainId,
	bscChainId: state.engine.backgroundState.BscNetworkController.provider.chainId,
	polygonChainId: state.engine.backgroundState.PolygonNetworkController.provider.chainId,
	hecoChainId: state.engine.backgroundState.HecoNetworkController.provider.chainId,
	opChainId: state.engine.backgroundState.OpNetworkController.provider.chainId,
	avaxChainId: state.engine.backgroundState.AvaxNetworkController.provider.chainId
});

const mapDispatchToProps = dispatch => ({
	toggleOngoingTransactionsModal: show => dispatch(toggleOngoingTransactionsModal(show)),
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionTips);
