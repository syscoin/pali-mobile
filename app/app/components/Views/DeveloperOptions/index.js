import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PropTypes from 'prop-types';
import { ThemeContext } from '../../../theme/ThemeProvider';
import Device from '../../../util/Device';
import checkIcon from '../../../images/network_check.png';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import { startNetworkChange, toggleTestnetVisible } from '../../../actions/settings';
import MStatusBar from '../../UI/MStatusBar';
import { NetworkConfig } from 'paliwallet-core';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllProvider } from '../../../util/ControllerUtils';
import { getDeveloperTitle } from '../../../util/ChainTypeImages';
import { ChainType } from 'paliwallet-core';

const styles = {
	wrapper: {
		flex: 1,

		paddingLeft: 20,
		paddingRight: 20
	},
	container: { backgroundColor: colors.paliGrey100, paddingHorizontal: 24, borderRadius: 20, marginTop: 10 },
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
		marginTop: 12
	},
	switchLayout: {
		flexDirection: 'row',
		marginBottom: 5,
		marginTop: 24,
		backgroundColor: colors.paliGrey100
	},
	titleHead: {
		marginTop: 16,
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
		backgroundColor: colors.white,
		borderRadius: 5,
		paddingHorizontal: 8,
		flexDirection: 'row',
		paddingTop: 7,
		paddingBottom: 7,
		alignItems: 'center',
		height: 33
	},
	networkInfo: {
		flex: 1
	},
	networkLabel: {
		fontSize: 14,
		color: colors.$60657D,
		lineHeight: 18
	},
	backgroundImage: {
		width: '100%',
		height: 240,
		zIndex: -1,
		position: 'absolute',
		top: 0,
		borderBottomRightRadius: 20,
		borderBottomLeftRadius: 20
	},
	txTitle: {
		fontSize: 20,
		lineHeight: 24,
		...fontStyles.semibold,
		color: colors.white
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
	marginTop5: {
		marginTop: 5
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
	static contextType = ThemeContext;

	networkElement = (selected, onPress, shortName, i, network, chainType) => {
		const { isDarkMode } = this.context;
		return (
			<TouchableOpacity
				style={[
					styles.network,
					i === 1 ? styles.marginTop5 : null,
					isDarkMode && { backgroundColor: '#2539546f' }
				]}
				key={`network-${shortName}-${i}`}
				onPress={() => onPress && onPress(network, chainType)}
			>
				<View style={styles.networkInfo}>
					<Text style={[styles.networkLabel, isDarkMode && baseStyles.subTextDark]}>{shortName}</Text>
				</View>
				<View>{selected}</View>
			</TouchableOpacity>
		);
	};

	onNetworkChange = (type, chainType, force = false) => {
		if (!force && this.props.allNetworkChanging[chainType]) {
			return;
		}
		this.props.startNetworkChange(chainType, type);
		Engine.networks[chainType].setProviderType(type);
	};

	renderNetworks = () => {
		const { isDarkMode } = this.context;
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

			elementMap.push(
				<Text key={`title${type}`} style={[styles.titleHead, isDarkMode && baseStyles.textDark]}>
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
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[baseStyles.flexGrow, isDarkMode && baseStyles.darkBackground]}
				testID={'wallet-screen'}
			>
				<Image source={require('../../../images/pali_background.png')} style={styles.backgroundImage} />
				<MStatusBar
					navigation={this.props.navigation}
					fixPadding={false}
					backgroundColor={colors.transparent}
				/>
				<TitleBar
					title={strings('app_settings.developer_options')}
					onBack={() => {
						this.props.navigation.pop();
					}}
					titleStyle={styles.txTitle}
					withBackground
				/>
				<ScrollView style={styles.wrapper} keyboardShouldPersistTaps="handled">
					<View style={[styles.container, isDarkMode && baseStyles.darkBackground600]}>
						<View style={[styles.switchLayout, isDarkMode && baseStyles.darkBackground600]}>
							<Text style={[styles.titleHead, isDarkMode && baseStyles.textDark]}>
								{strings('developer_options.testnet_availability')}
							</Text>
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
								trackColor={{ true: colors.$4CA1CF, false: colors.grey300 }}
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
