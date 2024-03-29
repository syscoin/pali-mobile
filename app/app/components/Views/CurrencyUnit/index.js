import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, ScrollView } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import checkIcon from '../../../images/network_check.png';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';
import { toggleTestnetVisible } from '../../../actions/settings';
import MStatusBar from '../../UI/MStatusBar';
import { CURRENCIES } from '../../../util/currencies';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';

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
		alignSelf: 'stretch'
	},
	switchLayout: {
		flexDirection: 'row',
		marginBottom: 5,
		marginTop: 26
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
	currencyBase: {
		flexDirection: 'row',
		height: 50,
		alignItems: 'center'
	},
	currencyInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	currencyLabel: {
		fontSize: 14,
		color: colors.$030319,
		lineHeight: 18,
		marginLeft: 12
	},
	bottomHeght: {
		height: 20
	}
};

const currencyArray = Object.keys(CURRENCIES);

class CurrencyUnit extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		currencyCode: PropTypes.string
	};

	renderCurrencyItem = () =>
		currencyArray.map((currency, i) => {
			const selected = currency === this.props.currencyCode ? <Image source={checkIcon} /> : null;
			return (
				<View key={`currency-${i}`}>
					<TouchableOpacity
						style={styles.currencyBase}
						onPress={() => {
							Engine.context.TokenRatesController.setCurrencyCode(currency);
						}}
					>
						<View style={styles.currencyInfo}>
							<Image source={CURRENCIES[currency].icon} />
							<Text style={styles.currencyLabel}>{currency}</Text>
						</View>
						<View>{selected}</View>
					</TouchableOpacity>
					<View style={styles.line} />
				</View>
			);
		});

	render() {
		return (
			<SafeAreaView style={baseStyles.flexGrow} testID={'wallet-screen'}>
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
				<TitleBar
					title={strings('app_settings.currency_unit')}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<ScrollView style={styles.wrapper} keyboardShouldPersistTaps="handled">
					<View>{this.renderCurrencyItem()}</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode
});

const mapDispatchToProps = dispatch => ({
	toggleTestnetVisible: () => dispatch(toggleTestnetVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(CurrencyUnit);
