import React, { PureComponent } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import LottieView from 'lottie-react-native';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	},
	nextButton: {
		height: 44,
		backgroundColor: colors.brandPink300,
		borderRadius: 10,
		alignSelf: 'stretch',
		justifyContent: 'center',
		alignItems: 'center'
	},
	nextLabel: {
		color: colors.white,
		fontSize: 16
	},
	animation: {
		width: 210,
		height: 348
	},
	flexThree: {
		flex: 3
	},
	forMoreSecure: {
		color: colors.$60657D,
		fontSize: 14,
		marginLeft: 2
	},
	secureLayout: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 30
	},
	baseView: {
		paddingHorizontal: 30,
		paddingBottom: 30,
		flex: 1
	},
	title: {
		fontSize: 28,
		color: colors.$030319,
		marginTop: 26,
		...fontStyles.semibold
	},
	baseText: {
		marginTop: 10,
		color: colors.$60657D,
		fontSize: 14,
		lineHeight: 20
	},
	formatText: {
		color: colors.$030319,
		...fontStyles.semibold
	}
});

export default class DrawingGuide extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		navigation: PropTypes.object
	};

	state = {
		fromWalletManager: this.props.navigation.getParam('fromWalletManager', false)
	};

	onBack = () => {
		this.props.navigation.pop();
	};

	render = () => {
		const { isDarkMode } = this.context;
		return (
			<SafeAreaView style={[styles.flexOne, isDarkMode && baseStyles.darkBackground]}>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={strings('drawing_board.create_wallet')}
					onBack={this.state.fromWalletManager ? this.onBack : null}
				/>
				<View style={styles.baseView}>
					<Text style={[styles.title, isDarkMode && baseStyles.textDark]}>
						{strings('drawing_board.true_random_number')}
					</Text>
					{strings('other.accept_language') === 'zh' ? (
						<Text style={[styles.baseText, isDarkMode && baseStyles.subTextDark]}>
							<Text style={[styles.formatText, isDarkMode && baseStyles.textDark]}>随机画</Text>
							一些线条，绘图的坐标将被用于
							<Text style={[styles.formatText, isDarkMode && baseStyles.textDark]}>真随机数发生器</Text>
							的一部分熵源，以生成助记词。
						</Text>
					) : strings('other.accept_language') === 'es' ? (
						<Text style={[styles.baseText, isDarkMode && baseStyles.subTextDark]}>
							Las coordenadas de tu{' '}
							<Text style={[styles.formatText, isDarkMode && baseStyles.textDark]}>dibujo aleatorio</Text>{' '}
							se utilizarán como parte de la{' '}
							<Text style={[styles.formatText, isDarkMode && baseStyles.textDark]}>
								entropía del Generador de Números Verdaderamente Aleatorios
							</Text>{' '}
							para la generación de la frase semilla.
						</Text>
					) : (
						<Text style={[styles.baseText, isDarkMode && baseStyles.subTextDark]}>
							Coordinates of your{' '}
							<Text style={[styles.formatText, isDarkMode && baseStyles.textDark]}>random drawing</Text>{' '}
							will be used as a part{' '}
							<Text style={[styles.formatText, isDarkMode && baseStyles.textDark]}>
								entropy of True Random Number Generator
							</Text>{' '}
							for seed phrase generation.
						</Text>
					)}
					<View style={styles.secureLayout}>
						<Image source={require('../../../images/ic_setting_Security.png')} />
						<Text style={[styles.forMoreSecure, isDarkMode && baseStyles.subTextDark]}>
							{strings('drawing_board.far_more_secure')}
						</Text>
					</View>

					<View style={styles.flexOne}>
						<View style={styles.flexOne} />
						<LottieView
							imageAssetsFolder={'lottie'}
							style={styles.animation}
							autoPlay
							loop
							source={require('../../../animations/draw_lines.json')}
						/>
						<View style={styles.flexThree} />
					</View>
					<TouchableOpacity
						style={styles.nextButton}
						activeOpacity={0.8}
						onPress={() => {
							if (this.state.fromWalletManager) {
								this.props.navigation.navigate('DrawingBoardView', {
									...this.props.navigation?.state?.params
								});
							} else {
								this.props.navigation.navigate('DrawingBoard', {
									...this.props.navigation?.state?.params
								});
							}
						}}
					>
						<Text style={styles.nextLabel}>{strings('drawing_board.start_random_drawing')}</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	};
}
