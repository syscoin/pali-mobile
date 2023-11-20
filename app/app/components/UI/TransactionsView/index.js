import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontStyles } from '../../../styles/common';
import Transactions from '../Transactions';
import { strings } from '../../../../locales/i18n';
import GlobalAlert from '../GlobalAlert';
import TransactionsSwitch from '../TransactionsSwitch';

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
		color: colors.$202020
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
		height: 70,
		width: '100%'
	},
	actionContainer: {
		flexDirection: 'row',
		paddingHorizontal: 15,
		height: 100
	},
	buttonContainer: {
		color: colors.brandPink300,
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
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: colors.brandPink300,
		borderRadius: 100,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 15,
		marginLeft: 10,
		paddingHorizontal: 15
	}
});

const AlertTag = 'TransactionsTab';

/**
 * View that renders a list of transactions for a specific asset
 */
class TransactionsView extends PureComponent {
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

	render = () => {
		const { navigation, selectedAddress } = this.props;
		const { txType } = this.state;
		const chainType = this.props.navigation.getParam('chainType', ChainType.All);
		const asset = this.props.navigation.getParam('asset');

		return (
			<SafeAreaView style={styles.wrapper}>
				<MStatusBar navigation={navigation} fixPadding={false} backgroundColor={colors.transparent} />
				<TitleBar
					title={strings('other.transactions')}
					titleStyle={styles.txTitle}
					onBack={this.goBack}
					rightView={
						<TransactionsSwitch
							style={styles.txSwitch}
							defaultType={txType}
							onChangeType={type => {
								this.setState({ txType: type });
							}}
						/>
					}
				/>
				<ScrollView
					style={styles.actionScroll}
					showsHorizontalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					horizontal
					contentContainerStyle={styles.actionContainer}
				>
					<View style={[styles.buttonView, { marginLeft: 0 }]}>
						<TouchableOpacity activeOpacity={activeOpacity}>
							<Text style={styles.buttonContainer}>{strings('other.send')}</Text>
						</TouchableOpacity>
					</View>

					<View style={[styles.buttonView, { minWidth: 85 }]}>
						<TouchableOpacity activeOpacity={activeOpacity}>
							<Text style={styles.buttonContainer}>{strings('other.bridge')}</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.buttonView}>
						<TouchableOpacity onPress={this.showReceiveModal} activeOpacity={activeOpacity}>
							<Text style={styles.buttonContainer}>{strings('other.receive')}</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>

				<View style={styles.container}>
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
