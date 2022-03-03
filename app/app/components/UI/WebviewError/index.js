import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Image, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { fontStyles, colors, activeOpacity } from '../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 99999999999999
	},
	foxWrapper: {
		backgroundColor: colors.white,
		marginTop: -100,
		width: 110,
		marginBottom: 20,
		height: 60
	},
	textWrapper: {
		width: 300,
		justifyContent: 'center',
		alignItems: 'center'
	},
	image: {
		alignSelf: 'center',
		width: 110,
		height: 110
	},
	errorTitle: {
		color: colors.fontPrimary,
		...fontStyles.bold,
		fontSize: 18,
		marginBottom: 15
	},
	errorMessage: {
		textAlign: 'center',
		color: colors.fontSecondary,
		...fontStyles.normal,
		fontSize: 14,
		marginBottom: 10
	},
	errorInfo: {
		color: colors.fontTertiary,
		...fontStyles.normal,
		fontSize: 12
	},
	button: {
		width: 120,
		height: 40,
		marginTop: 30,
		borderRadius: 20,
		backgroundColor: colors.$FE6E91,
		alignItems: 'center',
		justifyContent: 'center'
	},
	buttonText: {
		fontSize: 14,
		color: colors.white
	}
});

/**
 * View that renders custom error page for the browser
 */
export default class WebviewError extends PureComponent {
	static propTypes = {
		/**
		 * error info
		 */
		error: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
		/**
		 * Function that reloads the page
		 */
		onReload: PropTypes.func
	};

	static defaultProps = {
		error: false
	};

	onReload = () => {
		this.props.onReload();
	};

	render() {
		const { error } = this.props;
		return error ? (
			<View style={styles.wrapper}>
				<View style={styles.foxWrapper}>
					<Image style={styles.image} resizeMethod={'auto'} />
				</View>
				<View style={styles.textWrapper}>
					<Text style={styles.errorTitle}>{strings('webview_error.title')}</Text>
					<Text style={styles.errorMessage}>{strings('webview_error.message')}</Text>
					{error.description ? (
						<Text style={styles.errorInfo}>{`${strings('webview_error.reason')}: ${
							error.description
						}`}</Text>
					) : null}
				</View>
				<TouchableOpacity onPress={this.onReload} style={styles.button} activeOpacity={activeOpacity}>
					<Text style={styles.buttonText}>{strings('webview_error.try_again')}</Text>
				</TouchableOpacity>
			</View>
		) : null;
	}
}
