import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import Networks, {
	getAllNetworks,
	getBscAllNetworks,
	getPolygonAllNetworks,
	getArbAllNetworks,
	getOpAllNetworks,
	getTronAllNetworks,
	getHecoAllNetworks,
	getAvaxAllNetworks,
	BscNetworks,
	ArbNetworks,
	OpNetworks,
	PolygonNetworks,
	TronNetworks,
	HecoNetworks,
	AvaxNetworks
} from '../../../util/networks';
import checkIcon from '../../../images/network_check.png';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import { startNetworkChange, toggleTestnetVisible } from '../../../actions/settings';
import {
	ArbitrumMainnet,
	OptimismMainnet,
	BSCMAINNET,
	MAINNET,
	PolygonMainnet,
	TronMainnet,
	HecoMainnet,
	AvaxMainnet
} from '../../../constants/network';
import MStatusBar from '../../UI/MStatusBar';
import { ChainType, util } from 'gopocket-core';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-navigation';

const styles = {
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
		paddingLeft: 20,
		paddingRight: 20
	},
	flex: {
		flex: 1
	},
	switch: {
		transform: Device.isIos() ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : []
	},
	line: {
		backgroundColor: colors.$F0F0F0,
		height: 0.5,
		alignSelf: 'stretch',
		marginTop: 24,
		marginBottom: 24
	},
	switchLayout: {
		flexDirection: 'row',
		marginBottom: 5,
		marginTop: 24
	},
	titleHead: {
		fontSize: 16,
		marginBottom: 8,
		color: colors.$030319,
		...fontStyles.bold
	},
	switchDesc: {
		fontSize: 12,
		color: colors.$60657D
	},
	network: {
		borderColor: colors.$F0F0F0,
		flexDirection: 'row',
		paddingTop: 7,
		paddingBottom: 7,
		alignItems: 'center'
	},
	networkInfo: {
		flex: 1
	},
	networkLabel: {
		fontSize: 14,
		color: colors.$60657D,
		lineHeight: 18
	},
	bottomHeght: {
		height: 20
	},
	observerLayout: {
		paddingVertical: 24,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	topLine: {
		backgroundColor: colors.$F0F0F0,
		height: 0.5,
		alignSelf: 'stretch'
	},
	marginBottom0: {
		marginBottom: 0
	}
};

class DeveloperOptions extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		ethProvider: PropTypes.object,
		bscProvider: PropTypes.object,
		polygonProvider: PropTypes.object,
		arbProvider: PropTypes.object,
		opProvider: PropTypes.object,
		tronProvider: PropTypes.object,
		hecoProvider: PropTypes.object,
		avaxProvider: PropTypes.object,
		testnetVisible: PropTypes.bool,
		toggleTestnetVisible: PropTypes.func,
		startNetworkChange: PropTypes.func,
		etherNetworkChanging: PropTypes.string,
		bscNetworkChanging: PropTypes.string,
		polygonNetworkChanging: PropTypes.string,
		arbitrumNetworkChanging: PropTypes.string,
		optimismNetworkChanging: PropTypes.string,
		tronNetworkChanging: PropTypes.string,
		hecoNetworkChanging: PropTypes.string,
		avaxNetworkChanging: PropTypes.string
	};

	getEthNetworks = () => getAllNetworks();
	getBscNetworks = () => getBscAllNetworks();
	getPolygonNetworks = () => getPolygonAllNetworks();
	getArbNetworks = () => getArbAllNetworks();
	getOpNetworks = () => getOpAllNetworks();
	getTronNetworks = () => getTronAllNetworks();
	getHecoNetworks = () => getHecoAllNetworks();
	getAvaxNetworks = () => getAvaxAllNetworks();

	networkElement = (selected, onPress, shortName, color, i, network) => (
		<TouchableOpacity
			style={styles.network}
			key={`network-${shortName}-${i}`}
			onPress={() => onPress && onPress(network)} // eslint-disable-line
		>
			<View style={styles.networkInfo}>
				<Text style={styles.networkLabel}>{shortName}</Text>
			</View>
			<View>{selected}</View>
		</TouchableOpacity>
	);

	onEthNetworkChange = (type, force = false) => {
		if (!force && this.props.etherNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Ethereum, type);
		const { NetworkController } = Engine.context;
		NetworkController.setProviderType(type);
	};

	onBscNetworkChange = (type, force = false) => {
		if (!force && this.props.bscNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Bsc, type);
		const { BscNetworkController } = Engine.context;
		BscNetworkController.setProviderType(type);
	};

	onPolygonNetworkChange = (type, force = false) => {
		if (!force && this.props.polygonNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Polygon, type);
		const { PolygonNetworkController } = Engine.context;
		PolygonNetworkController.setProviderType(type);
	};

	onArbNetworkChange = (type, force = false) => {
		if (!force && this.props.arbitrumNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Arbitrum, type);
		const { ArbNetworkController } = Engine.context;
		ArbNetworkController.setProviderType(type);
	};

	onOpNetworkChange = (type, force = false) => {
		if (!force && this.props.optimismNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Optimism, type);
		const { OpNetworkController } = Engine.context;
		OpNetworkController.setProviderType(type);
	};

	onTronNetworkChange = (type, force = false) => {
		if (!force && this.props.tronNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Tron, type);
		const { TronNetworkController } = Engine.context;
		TronNetworkController.setProviderType(type);
	};

	onHecoNetworkChange = (type, force = false) => {
		if (!force && this.props.hecoNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Heco, type);
		const { HecoNetworkController } = Engine.context;
		HecoNetworkController.setProviderType(type);
	};

	onAvaxNetworkChange = (type, force = false) => {
		if (!force && this.props.avaxNetworkChanging) {
			return;
		}
		this.props.startNetworkChange(ChainType.Avax, type);
		const { AvaxNetworkController } = Engine.context;
		AvaxNetworkController.setProviderType(type);
	};

	renderEthNetworks = () => {
		const { ethProvider, etherNetworkChanging } = this.props;
		return this.getEthNetworks().map((network, i) => {
			const { color, shortName } = Networks[network];
			let selected;
			if (etherNetworkChanging) {
				selected =
					etherNetworkChanging === network ? <ActivityIndicator size="small" color={colors.$FE6E91} /> : null;
			} else {
				selected = ethProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onEthNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderBscNetworks = () => {
		const { bscProvider, bscNetworkChanging } = this.props;
		return this.getBscNetworks().map((network, i) => {
			const { color, shortName } = BscNetworks[network];
			let selected;
			if (bscNetworkChanging) {
				selected =
					bscNetworkChanging === network ? <ActivityIndicator size="small" color={colors.$FE6E91} /> : null;
			} else {
				selected = bscProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onBscNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderPolygonNetworks = () => {
		const { polygonProvider, polygonNetworkChanging } = this.props;
		return this.getPolygonNetworks().map((network, i) => {
			const { color, shortName } = PolygonNetworks[network];
			let selected;
			if (polygonNetworkChanging) {
				selected =
					polygonNetworkChanging === network ? (
						<ActivityIndicator size="small" color={colors.$FE6E91} />
					) : null;
			} else {
				selected = polygonProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onPolygonNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderArbNetworks = () => {
		const { arbProvider, arbitrumNetworkChanging } = this.props;
		return this.getArbNetworks().map((network, i) => {
			const { color, shortName } = ArbNetworks[network];
			let selected;
			if (arbitrumNetworkChanging) {
				selected =
					arbitrumNetworkChanging === network ? (
						<ActivityIndicator size="small" color={colors.$FE6E91} />
					) : null;
			} else {
				selected = arbProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onArbNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderOpNetworks = () => {
		const { opProvider, optimismNetworkChanging } = this.props;
		return this.getOpNetworks().map((network, i) => {
			const { color, shortName } = OpNetworks[network];
			let selected;
			if (optimismNetworkChanging) {
				selected =
					optimismNetworkChanging === network ? (
						<ActivityIndicator size="small" color={colors.$FE6E91} />
					) : null;
			} else {
				selected = opProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onOpNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderTronNetworks = () => {
		const { tronProvider, tronNetworkChanging } = this.props;
		return this.getTronNetworks().map((network, i) => {
			const { color, shortName } = TronNetworks[network];
			let selected;
			if (tronNetworkChanging) {
				selected =
					tronNetworkChanging === network ? <ActivityIndicator size="small" color={colors.$FE6E91} /> : null;
			} else {
				selected = tronProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onTronNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderHecoNetworks = () => {
		const { hecoProvider, hecoNetworkChanging } = this.props;
		return this.getHecoNetworks().map((network, i) => {
			const { color, shortName } = HecoNetworks[network];
			let selected;
			if (hecoNetworkChanging) {
				selected =
					hecoNetworkChanging === network ? <ActivityIndicator size="small" color={colors.$FE6E91} /> : null;
			} else {
				selected = hecoProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onHecoNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	renderAvaxNetworks = () => {
		const { avaxProvider, avaxNetworkChanging } = this.props;
		return this.getAvaxNetworks().map((network, i) => {
			const { color, shortName } = AvaxNetworks[network];
			let selected;
			if (avaxNetworkChanging) {
				selected =
					avaxNetworkChanging === network ? <ActivityIndicator size="small" color={colors.$FE6E91} /> : null;
			} else {
				selected = avaxProvider.type === network ? <Image source={checkIcon} /> : null;
			}
			return this.networkElement(
				selected,
				selected ? null : this.onAvaxNetworkChange,
				shortName,
				color,
				i,
				network
			);
		});
	};

	setDefaultNetwork = () => {
		const {
			ethProvider,
			bscProvider,
			polygonProvider,
			arbProvider,
			opProvider,
			tronProvider,
			hecoProvider,
			avaxProvider
		} = this.props;
		ethProvider.type !== MAINNET && this.onEthNetworkChange(MAINNET, true);
		bscProvider.type !== BSCMAINNET && this.onBscNetworkChange(BSCMAINNET, true);
		polygonProvider.type !== PolygonMainnet && this.onPolygonNetworkChange(PolygonMainnet, true);
		arbProvider.type !== ArbitrumMainnet && this.onArbNetworkChange(ArbitrumMainnet, true);
		opProvider.type !== OptimismMainnet && this.onOpNetworkChange(OptimismMainnet, true);
		if (util.TRON_ENABLED) {
			tronProvider.type !== TronMainnet && this.onTronNetworkChange(TronMainnet, true);
		}
		hecoProvider.type !== HecoMainnet && this.onHecoNetworkChange(HecoMainnet, true);
		avaxProvider.type !== AvaxMainnet && this.onAvaxNetworkChange(AvaxMainnet, true);
	};

	render() {
		return (
			<SafeAreaView style={baseStyles.flexGrow} testID={'wallet-screen'}>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={strings('app_settings.developer_options')}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<ScrollView style={styles.wrapper} keyboardShouldPersistTaps="handled">
					<View>
						<View style={styles.switchLayout}>
							<Text style={styles.titleHead}>{strings('developer_options.testnet_availability')}</Text>
							<View style={styles.flex} />
							<Switch
								style={styles.switch}
								onValueChange={switchOn => {
									this.props.toggleTestnetVisible();
									if (!switchOn) {
										this.setDefaultNetwork();
									}
								}}
								value={this.props.testnetVisible}
								trackColor={{ true: colors.$4CD964, false: colors.grey300 }}
								thumbColor={colors.white}
							/>
						</View>
						{!this.props.testnetVisible ? (
							<Text style={styles.switchDesc}>
								{strings('developer_options.all_networks_in_product_enviroment')}
							</Text>
						) : (
							<React.Fragment>
								<Text style={styles.switchDesc}>{strings('developer_options.switch_desc')}</Text>
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.ethereum_network')}</Text>
								{this.renderEthNetworks()}
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.bsc_network')}</Text>
								{this.renderBscNetworks()}
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.polygon_network')}</Text>
								{this.renderPolygonNetworks()}
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.arbitrum_network')}</Text>
								{this.renderArbNetworks()}
								{util.TRON_ENABLED && <View style={styles.line} />}
								{util.TRON_ENABLED && (
									<Text style={styles.titleHead}>{strings('developer_options.tron_network')}</Text>
								)}
								{util.TRON_ENABLED && this.renderTronNetworks()}
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.heco_network')}</Text>
								{this.renderHecoNetworks()}
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.optimism_network')}</Text>
								{this.renderOpNetworks()}
								<View style={styles.line} />
								<Text style={styles.titleHead}>{strings('developer_options.avax_network')}</Text>
								{this.renderAvaxNetworks()}
							</React.Fragment>
						)}
						<View style={styles.bottomHeght} />
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	bscProvider: state.engine.backgroundState.BscNetworkController.provider,
	ethProvider: state.engine.backgroundState.NetworkController.provider,
	polygonProvider: state.engine.backgroundState.PolygonNetworkController.provider,
	arbProvider: state.engine.backgroundState.ArbNetworkController.provider,
	opProvider: state.engine.backgroundState.OpNetworkController.provider,
	tronProvider: state.engine.backgroundState.TronNetworkController.provider,
	hecoProvider: state.engine.backgroundState.HecoNetworkController.provider,
	avaxProvider: state.engine.backgroundState.AvaxNetworkController.provider,
	testnetVisible: state.settings.testnetVisible,
	etherNetworkChanging: state.settings.etherNetworkChanging,
	bscNetworkChanging: state.settings.bscNetworkChanging,
	polygonNetworkChanging: state.settings.polygonNetworkChanging,
	arbitrumNetworkChanging: state.settings.arbitrumNetworkChanging,
	optimismNetworkChanging: state.settings.optimismNetworkChanging,
	tronNetworkChanging: state.settings.tronNetworkChanging,
	hecoNetworkChanging: state.settings.hecoNetworkChanging,
	avaxNetworkChanging: state.settings.avaxNetworkChanging
});

const mapDispatchToProps = dispatch => ({
	toggleTestnetVisible: () => dispatch(toggleTestnetVisible()),
	startNetworkChange: (chainType, change) => dispatch(startNetworkChange(chainType, change))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DeveloperOptions);
