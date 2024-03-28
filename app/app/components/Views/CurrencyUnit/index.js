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
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = {
	wrapper: {
		flex: 1,
		backgroundColor: colors.$F9F9F9,
		marginLeft: 20,
		marginRight: 20,
		paddingHorizontal: 24,
		borderRadius: 20
	},
	txTitle: {
		fontSize: 20,
		lineHeight: 24,
		...fontStyles.semibold,
		color: colors.white
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
	static contextType = ThemeContext;

	static propTypes = {
		navigation: PropTypes.object,
		currencyCode: PropTypes.string
	};

	renderCurrencyItem = () => {
		const { isDarkMode } = this.context;
		return currencyArray.map((currency, i) => {
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
							<Text style={[styles.currencyLabel, isDarkMode && baseStyles.textDark]}>{currency}</Text>
						</View>
						<View>{selected}</View>
					</TouchableOpacity>
					<View style={[styles.line, isDarkMode && { backgroundColor: '#FFFFFF29' }]} />
				</View>
			);
		});
	};

	render() {
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView
				style={[baseStyles.flexGrow, isDarkMode && baseStyles.darkBackground]}
				testID={'wallet-screen'}
			>
				<Image source={require('../../../images/pali_background.png')} style={styles.backgroundImage} />
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
				<TitleBar
					title={strings('app_settings.currency_unit')}
					onBack={() => {
						this.props.navigation.pop();
					}}
					titleStyle={styles.txTitle}
					withBackground
				/>
				<ScrollView
					style={[styles.wrapper, isDarkMode && baseStyles.darkBackground600]}
					keyboardShouldPersistTaps="handled"
				>
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
