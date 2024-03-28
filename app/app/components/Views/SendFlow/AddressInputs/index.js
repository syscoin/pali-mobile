import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { renderShortAddress } from '../../../../util/address';
import { strings } from '../../../../../locales/i18n';
import { isValidAddress } from 'paliwallet-core';
import NFTImage from '../../../UI/NFTImage';
import { useTheme } from '../../../../theme/ThemeProvider';

const holderGrey = '#8F92A1';
const labelTextColor = '#030319';

const styles = StyleSheet.create({
	wrapper: {
		// marginHorizontal: 8
		// backgroundColor: colors.green100,
	},
	label: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	labelText: {
		fontSize: 18,
		color: labelTextColor,
		...fontStyles.semibold,
		lineHeight: 21
	},
	selectWrapper: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha
	},
	completeWrapper: {
		flexDirection: 'row',
		marginTop: 14,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha
	},
	input: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	ensIcon: {
		width: 20,
		height: 22,
		marginLeft: 2,
		marginEnd: 10,
		marginTop: -3,
		marginBottom: -5,
		borderRadius: 5
	},
	addressToInformation: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	textAddress: {
		maxWidth: '76%',
		...fontStyles.normal,
		color: colors.$030319,
		fontSize: 14,
		lineHeight: 16,
		padding: 0,
		textAlignVertical: 'center'
	},
	textInput: {
		fontSize: 14,
		lineHeight: 16,
		height: 42,
		color: colors.$030319,
		...fontStyles.normal,
		paddingTop: 14,
		paddingBottom: 4,
		paddingLeft: 0,
		paddingRight: 8,

		width: '100%'
	},
	scanIcon: {
		width: 16,
		height: 16,
		flexDirection: 'column',
		alignItems: 'center'
	},
	iconWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 10,
		paddingRight: 1
	},
	checkIconWrapper: {
		flexDirection: 'row',
		marginLeft: 6
	},
	inputActionContainer: {
		flexDirection: 'row',
		position: 'absolute',
		bottom: 0,
		right: 0,
		top: 14,
		paddingBottom: 12,
		paddingLeft: 12,
		alignItems: 'center'
	},
	touchPaste: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.06)',
		borderRadius: 100,
		height: 22,
		paddingTop: 2,
		paddingRight: 8,
		paddingBottom: 2,
		paddingLeft: 8
	},

	touchSelectDelete: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		top: 14,
		justifyContent: 'center',
		paddingBottom: 12,
		paddingLeft: 12
	},
	touchDelete: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		top: 0,
		justifyContent: 'center',
		paddingBottom: 12,
		paddingLeft: 12
	},
	pasteLabel: {
		color: colors.paliGrey300,
		fontSize: 11
	}
});

export const AddressTo = props => {
	const { isDarkMode } = useTheme();
	const {
		addressToReady,
		inputRef,
		toSelectedAddress,
		onToSelectedAddressChange,
		onScan,
		onClear,
		onInputFocus,
		onSubmit,
		onInputBlur,
		inputWidth,
		onClearAddress,
		onPastedAddress,
		title,
		ensAvatarUrl,
		placeholder
	} = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text style={[styles.labelText, isDarkMode && baseStyles.textDark]}>{title}</Text>
			</View>
			{!addressToReady ? (
				<View style={styles.selectWrapper}>
					<View style={styles.input}>
						<TextInput
							allowFontScaling={false}
							ref={inputRef}
							autoCapitalize="none"
							autoCorrect={false}
							onChangeText={onToSelectedAddressChange}
							placeholder={placeholder}
							placeholderTextColor={isDarkMode ? colors.paliGrey200 : holderGrey}
							spellCheck={false}
							style={[styles.textInput, inputWidth, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							onFocus={onInputFocus}
							onBlur={onInputBlur}
							onSubmitEditing={onSubmit}
							value={toSelectedAddress}
						/>
					</View>
					{toSelectedAddress && toSelectedAddress !== '' ? (
						<TouchableOpacity style={styles.touchSelectDelete} onPress={onClearAddress}>
							<Image source={require('../../../../images/search_clear.png')} />
						</TouchableOpacity>
					) : (
						<View style={styles.inputActionContainer}>
							<TouchableOpacity style={styles.touchPaste} onPress={onPastedAddress}>
								<Text style={[styles.pasteLabel, isDarkMode && baseStyles.subTextDark]}>
									{strings('other.paste')}
								</Text>
							</TouchableOpacity>
							{!!onScan && (
								<TouchableOpacity onPress={onScan} style={styles.iconWrapper}>
									<Image
										source={require('../../../../images/scan_icon_small.png')}
										style={styles.scanIcon}
									/>
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>
			) : (
				<View style={styles.completeWrapper}>
					<View style={styles.addressToInformation}>
						{!isValidAddress(toSelectedAddress) &&
							(ensAvatarUrl ? (
								<NFTImage
									style={styles.ensIcon}
									imageUrl={ensAvatarUrl}
									defaultImg={require('../../../../images/ic_ens.png')}
								/>
							) : (
								<Image style={styles.ensIcon} source={require('../../../../images/ic_ens.png')} />
							))}
						<Text
							style={[styles.textAddress, isDarkMode && baseStyles.textDark]}
							numberOfLines={1}
							allowFontScaling={false}
							ellipsizeMode={'middle'}
						>
							{isValidAddress(toSelectedAddress)
								? renderShortAddress(toSelectedAddress, 10)
								: toSelectedAddress}
						</Text>
						<View style={styles.checkIconWrapper}>
							<Image source={require('../../../../images/ic_correct.png')} />
						</View>
					</View>
					{!!onClear && (
						<TouchableOpacity onPress={onClear} style={styles.touchDelete}>
							<Image source={require('../../../../images/search_clear.png')} />
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	);
};

AddressTo.propTypes = {
	/**
	 * Whether is a valid Ethereum address to send to
	 */
	addressToReady: PropTypes.bool,
	/**
	 * Object to use as reference for input
	 */
	inputRef: PropTypes.object,
	/**
	 * Address of selected address as string
	 */
	toSelectedAddress: PropTypes.string,
	/**
	 * Callback called when to selected address changes
	 */
	onToSelectedAddressChange: PropTypes.func,
	/**
	 * Callback called when scan icon is pressed
	 */
	onScan: PropTypes.func,
	/**
	 * Callback called when close icon is pressed
	 */
	onClear: PropTypes.func,
	/**
	 * Callback called when input onFocus
	 */
	onInputFocus: PropTypes.func,
	/**
	 * Callback called when input is submitted
	 */
	onSubmit: PropTypes.func,
	/**
	 * Callback called when input onBlur
	 */
	onInputBlur: PropTypes.func,
	/**
	 * Input width to solve android paste bug
	 * https://github.com/facebook/react-native/issues/9958
	 */
	inputWidth: PropTypes.object,
	onPastedAddress: PropTypes.func,
	onClearAddress: PropTypes.func,
	title: PropTypes.string,
	ensAvatarUrl: PropTypes.string,
	placeholder: PropTypes.string
};
