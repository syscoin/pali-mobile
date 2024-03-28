import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, ScrollView, DeviceEventEmitter } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { TouchableOpacity } from 'react-native-gesture-handler';
import PropTypes from 'prop-types';
import Device from '../../../util/Device';
import checkIcon from '../../../images/network_check.png';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n, { setLocale } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { toggleTestnetVisible } from '../../../actions/settings';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = {
	wrapper: {
		backgroundColor: colors.$F9F9F9,
		marginLeft: 20,
		marginRight: 20,
		paddingHorizontal: 24,
		borderRadius: 20,
		paddingBottom: 20,
		marginTop: 24
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
	languageBase: {
		flexDirection: 'row',
		height: 50,
		alignItems: 'center'
	},
	languageInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	languageLabel: {
		fontSize: 14,
		color: colors.$030319,
		lineHeight: 18,
		marginLeft: 12
	},
	bottomHeght: {
		height: 20
	}
};

const languageArray = [
	{ name: 'English', locale: 'en' },
	{ name: 'Español', locale: 'es' },
	{ name: '中国人', locale: 'zh' }
];

class LanguageSelector extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object
	};
	static contextType = ThemeContext;

	constructor(props) {
		super(props);
		this.state = {
			locale: i18n.locale
		};
	}

	renderCurrencyItem = () => {
		const { isDarkMode } = this.context;
		return languageArray.map(language => {
			const selected = language.locale === i18n.locale ? <Image source={checkIcon} /> : null;
			return (
				<View key={language.name}>
					<TouchableOpacity
						style={styles.languageBase}
						onPress={() => {
							this.setState({ locale: language.locale });
							setLocale(language.locale);

							setTimeout(() => {
								DeviceEventEmitter.emit('languageUpdated');
							}, 30);
						}}
					>
						<View style={styles.languageInfo}>
							<Text style={[styles.languageLabel, isDarkMode && baseStyles.textDark]}>
								{language.name}
							</Text>
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
					title={strings('app_settings.language')}
					onBack={() => {
						this.props.navigation.pop();
					}}
					titleStyle={styles.txTitle}
					withBackground
				/>
				<View style={[styles.wrapper, isDarkMode && baseStyles.darkBackground600]}>
					{this.renderCurrencyItem()}
				</View>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	toggleTestnetVisible: () => dispatch(toggleTestnetVisible())
});

export default connect(
	null,
	mapDispatchToProps
)(LanguageSelector);
