import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, ScrollView, View, TouchableOpacity, Text, LayoutAnimation, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import Transactions from '../Transactions';
import { strings } from '../../../../locales/i18n';
import GlobalAlert from '../GlobalAlert';
import TransactionsSwitch from '../TransactionsSwitch';
import Device from '../../../util/Device';
import { ThemeContext } from '../../../theme/ThemeProvider';

import MStatusBar from '../MStatusBar';

import { connect } from 'react-redux';
import TitleBar from '../TitleBar';
import { ChainType } from 'paliwallet-core';

const activeOpacity = 0.8;
const styles = StyleSheet.create({
	txTitle: {
		fontSize: 20,
		lineHeight: 24,
		...fontStyles.semibold,
		color: colors.white
	},
	txSwitch: {
		top: 15
	},
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	container: {
		flex: 1
	},
	actionScroll: {
		width: '100%',
		height: 70
	},
	actionContainer: {
		flexDirection: 'row',
		paddingHorizontal: 15,
		alignSelf: 'center',
		justifyContent: 'center',
		height: 70
	},
	buttonContainer: {
		color: colors.white,
		fontSize: 16,
		lineHeight: 24,
		...fontStyles.semibold
	},
	actionView: {
		marginHorizontal: -7,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	buttonView: {
		minWidth: 70,
		height: 40,
		borderWidth: 2,
		borderColor: colors.white,
		borderRadius: 100,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 15,
		marginLeft: 10,
		paddingHorizontal: 15
	},
	buttonSelected: {
		backgroundColor: colors.white
	},
	selectedText: {
		color: colors.$4D76B8
	}
});

const AlertTag = 'TransactionsTab';

/**
 * View that renders a list of transactions for a specific asset
 */
class TransactionsView extends PureComponent {
	static contextType = ThemeContext;

	static propTypes = {
		navigation: PropTypes.object,
		selectedAddress: PropTypes.string
	};

	state = {
		txType: 0
	};

	buttonRef = React.createRef();

	goBack = () => {
		this.props.navigation.goBack();
	};

	calculateBackgroundHeight = () => {
		const deviceHeight = Device.getDeviceHeight();
		// Define breakpoints and corresponding heights in an array
		const heightBreakpoints = [
			{ breakpoint: 750, height: 140 },
			{ breakpoint: 820, height: 150 },
			{ breakpoint: 850, height: 170 },
			{ breakpoint: 1000, height: 180 }
		];

		const matchingBreakpoint = heightBreakpoints.find(bp => deviceHeight < bp.breakpoint);

		return matchingBreakpoint ? matchingBreakpoint.height : 230;
	};

	render = () => {
		const { navigation, selectedAddress } = this.props;
		const { isDarkMode } = this.context;
		const { txType } = this.state;
		const chainType = this.props.navigation.getParam('chainType', ChainType.All);
		const asset = this.props.navigation.getParam('asset');

		const onChangeType = type => {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			this.setState({ txType: type });
		};
		const backgroundHeight = this.calculateBackgroundHeight();

		return (
			<SafeAreaView style={[styles.wrapper, isDarkMode && baseStyles.darkBackground]}>
				<Image
					source={require('../../../images/pali_background.png')}
					style={{
						width: '100%',
						height: backgroundHeight,
						zIndex: -1,
						position: 'absolute',
						borderBottomRightRadius: 20,
						borderBottomLeftRadius: 20
					}}
				/>
				<MStatusBar navigation={navigation} fixPadding={false} backgroundColor={colors.transparent} />
				<TitleBar
					withBackground
					title={strings('other.transactions')}
					titleStyle={styles.txTitle}
					onBack={this.goBack}
				/>

				<View>
					<ScrollView
						style={styles.actionScroll}
						showsHorizontalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						horizontal
						contentContainerStyle={styles.actionContainer}
					>
						<View
							style={[
								styles.buttonView,
								txType === 0 && styles.buttonSelected,
								{
									marginLeft: 0
								}
							]}
						>
							<TouchableOpacity onPress={() => onChangeType(0)} activeOpacity={activeOpacity}>
								<Text style={[styles.buttonContainer, txType === 0 && styles.selectedText]}>All</Text>
							</TouchableOpacity>
						</View>

						<View style={[styles.buttonView, txType === 1 && styles.buttonSelected]}>
							<TouchableOpacity onPress={() => onChangeType(1)} activeOpacity={activeOpacity}>
								<Text style={[styles.buttonContainer, txType === 1 && styles.selectedText]}>
									{strings('other.receive')}
								</Text>
							</TouchableOpacity>
						</View>
						<View style={[styles.buttonView, txType === 2 && styles.buttonSelected, { minWidth: 85 }]}>
							<TouchableOpacity onPress={() => onChangeType(2)} activeOpacity={activeOpacity}>
								<Text style={[styles.buttonContainer, txType === 2 && styles.selectedText]}>
									{strings('other.send')}
								</Text>
							</TouchableOpacity>
						</View>
						<View style={[styles.buttonView, txType === 3 && styles.buttonSelected, { minWidth: 85 }]}>
							<TouchableOpacity onPress={() => onChangeType(3)} activeOpacity={activeOpacity}>
								<Text style={[styles.buttonContainer, txType === 3 && styles.selectedText]}>
									Others
								</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</View>

				<View style={[styles.container, { zIndex: -99 }]}>
					<Transactions
						navigation={navigation}
						selectedAddress={selectedAddress}
						txType={txType}
						asset={asset}
						alertTag={AlertTag}
						selectChainType={chainType}
					/>
				</View>
				<GlobalAlert currentFlag={AlertTag} />
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(TransactionsView);
