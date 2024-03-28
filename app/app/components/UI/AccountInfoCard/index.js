import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { renderFullAddress } from '../../../util/address';
import Device from '../../../util/Device';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	accountInformation: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		borderColor: colors.grey200,
		borderRadius: 10
	},
	accountInfoRow: {
		flexGrow: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'flex-start'
	},
	accountNameAndAddress: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'flex-start'
	},
	view1: {
		flexGrow: 1
	},
	accountName: {
		maxWidth: Device.isMediumDevice() ? '35%' : '45%',
		...fontStyles.bold,
		fontSize: 16,
		marginRight: 2,
		color: colors.black
	},
	accountAddress: {
		width: '50%',
		fontSize: 12,
		color: colors.$60657D
	}
});

class AccountInfoCard extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string
	};

	render() {
		const { isDarkMode } = this.context;
		const { selectedAddress } = this.props;
		const address = renderFullAddress(selectedAddress);
		return (
			<View style={styles.accountInformation}>
				<View style={styles.accountInfoRow}>
					<View style={styles.accountNameAndAddress}>
						<Text numberOfLines={1} style={[styles.accountName, isDarkMode && baseStyles.textDark]}>
							Account
						</Text>
						<View style={styles.view1} />
						<Text
							numberOfLines={1}
							ellipsizeMode="middle"
							style={[styles.accountAddress, isDarkMode && baseStyles.subTextDark]}
						>
							{address}
						</Text>
					</View>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountInfoCard);
