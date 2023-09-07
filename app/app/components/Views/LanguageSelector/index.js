import React, { PureComponent } from 'react';
import { strings } from '../../../../locales/i18n';
import { Image, View, Text, ScrollView } from 'react-native';
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

	constructor(props) {
		super(props);
		this.state = {
			locale: i18n.locale
		};
	}

	renderCurrencyItem = () =>
		languageArray.map(language => {
			const selected = language.locale === i18n.locale ? <Image source={checkIcon} /> : null;
			return (
				<View key={language.name}>
					<TouchableOpacity
						style={styles.languageBase}
						onPress={() => {
							this.setState({ locale: language.locale });
							setLocale(language.locale);
							setTimeout(() => {
								this.props.navigation.pop();
								this.props.navigation.pop();
							}, 30);
						}}
					>
						<View style={styles.languageInfo}>
							<Text style={styles.languageLabel}>{language.name}</Text>
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
					title={strings('app_settings.language')}
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

const mapDispatchToProps = dispatch => ({
	toggleTestnetVisible: () => dispatch(toggleTestnetVisible())
});

export default connect(
	null,
	mapDispatchToProps
)(LanguageSelector);
