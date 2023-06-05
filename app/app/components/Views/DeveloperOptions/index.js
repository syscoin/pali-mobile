import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import checkIcon from '../../../images/network_check.png';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import { startNetworkChange, toggleTestnetVisible } from '../../../actions/settings';
import MStatusBar from '../../UI/MStatusBar';
import { NetworkConfig } from 'gopocket-core';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllProvider } from '../../../util/ControllerUtils';
import { getDeveloperTitle } from '../../../util/ChainTypeImages';
import { ChainType } from 'gopocket-core';

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
		allProvider: PropTypes.object,
		testnetVisible: PropTypes.bool,
		toggleTestnetVisible: PropTypes.func,
		startNetworkChange: PropTypes.func,
		allNetworkChanging: PropTypes.object
	};

	networkElement = (selected, onPress, shortName, i, network, chainType) => (
		<TouchableOpacity
			style={styles.network}
			key={`network-${shortName}-${i}`}
			onPress={() => onPress && onPress(network, chainType)}
		>
			<View style={styles.networkInfo}>
				<Text style={styles.networkLabel}>{shortName}</Text>
			</View>
			<View>{selected}</View>
		</TouchableOpacity>
	);

	onNetworkChange = (type, chainType, force = false) => {
		if (!force && this.props.allNetworkChanging[chainType]) {
			return;
		}
		this.props.startNetworkChange(chainType, type);
		Engine.networks[chainType].setProviderType(type);
	};

	renderNetworks = () => {
		const { allProvider, allNetworkChanging } = this.props;
		const elementMap = [];

		const chainOrder = [
			ChainType.Rollux,
			ChainType.Syscoin,
			ChainType.Ethereum,
			ChainType.Arbitrum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Optimism,
			ChainType.Avax
		];

		for (const type of chainOrder) {
			const chainType = Number(type);
			if (NetworkConfig[type].Disabled) {
				continue;
			}
			elementMap.push(<View key={`line${type}`} style={styles.line} />);
			elementMap.push(
				<Text key={`title${type}`} style={styles.titleHead}>
					{getDeveloperTitle(chainType)}
				</Text>
			);
			const Networks = NetworkConfig[type].Networks;
			let i = 0;
			for (const name in Networks) {
				let selected;
				if (allNetworkChanging[chainType]) {
					selected =
						allNetworkChanging[chainType] === name ? (
							<ActivityIndicator size="small" color={colors.brandPink300} />
						) : null;
				} else {
					selected =
						allProvider[chainType].chainId === Networks[name].provider.chainId ? (
							<Image source={checkIcon} />
						) : null;
				}
				const element = this.networkElement(
					selected,
					selected ? null : this.onNetworkChange,
					name,
					i,
					name,
					chainType
				);
				elementMap.push(element);
				i++;
			}
		}
		return elementMap;
	};

	setDefaultNetwork = () => {
		const { allProvider } = this.props;
		for (const type in allProvider) {
			const chainType = Number(type);
			const config = NetworkConfig[chainType];
			if (allProvider[type].chainId !== config.MainChainId) {
				let type;
				for (const key in config.Networks) {
					if (config.Networks[key].provider.chainId === config.MainChainId) {
						type = key;
						break;
					}
				}
				this.onNetworkChange(type, chainType, true);
			}
		}
	};

	render() {
		return (
			<SafeAreaView style={baseStyles.flexGrow} testID={'wallet-screen'}>
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
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
								{this.renderNetworks()}
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
	allProvider: getAllProvider(state),
	testnetVisible: state.settings.testnetVisible,
	allNetworkChanging: state.settings.allNetworkChanging
});

const mapDispatchToProps = dispatch => ({
	toggleTestnetVisible: () => dispatch(toggleTestnetVisible()),
	startNetworkChange: (chainType, change) => dispatch(startNetworkChange(chainType, change))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DeveloperOptions);
