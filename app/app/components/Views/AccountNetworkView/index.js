import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { activeOpacity, baseStyles, colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import { getIsRpc, getDefiIcon, getRpcName } from '../../../util/rpcUtil';
import { ChainTypeBgDefi, ChainTypes, getChainTypeName } from '../../../util/ChainTypeImages';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	dappNetLayout: {
		height: 120,
		justifyContent: 'center'
	},
	dappAccountLayout: {
		height: 120,
		justifyContent: 'center',
		marginTop: 14
	},
	dappNetScroll: {
		marginLeft: 6,
		marginTop: 14,
		marginRight: 20,
		flexDirection: 'row'
	},
	dappAccountScroll: {
		marginLeft: 6,
		marginTop: 14,
		marginRight: 20,
		flexDirection: 'row'
	},
	dappNetTouchItem: {
		width: 86,
		height: 68,
		borderRadius: 10,
		backgroundColor: colors.$F6F6F6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	dappNetTouchItemSeleted: {
		backgroundColor: colors.brandPink3001A,
		borderWidth: 1,
		borderColor: colors.brandPink300
	},
	dappAccountTouchItem: {
		width: 120,
		height: 68,
		borderRadius: 10,
		backgroundColor: colors.$F6F6F6,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 12
	},
	dappAccountTouchItemSeleted: {
		backgroundColor: colors.brandPink3001A,
		borderWidth: 1,
		borderColor: colors.brandPink300
	},
	dappNetName: {
		marginTop: 6,
		fontSize: 11,
		color: colors.$666666,
		marginHorizontal: 2
	},
	dappNetNameSeleted: {
		color: colors.$030319
	},
	dappAccountName: {
		fontSize: 13,
		color: colors.$666666
	},
	dappAccountNameSeleted: {
		color: colors.$030319
	},
	dappAccountAddress: {
		fontSize: 11,
		color: colors.$999999,
		marginTop: 4
	},
	dappAccountAddressSeleted: {
		color: colors.$333333
	},
	dappTitle: {
		fontSize: 14,
		color: colors.$202020,
		...fontStyles.bold,
		marginLeft: 20
	},
	itemSpace: {
		marginLeft: 14
	}
});

class AccountNetworkView extends PureComponent {
	static contextType = ThemeContext;
	static propTypes = {
		selectedAddress: PropTypes.string,

		identities: PropTypes.object,
		setSelectedAddress: PropTypes.func,

		allChains: PropTypes.array
	};

	state = {
		popMoreChains: []
	};

	accountScrollRef = React.createRef();
	networkScrollRef = React.createRef();

	render = () => {
		const { selectedAddress, identities, selectedChainsType } = this.props;

		let firstItem = 0;
		const contactEntrys = [];
		Object.values(identities).forEach((value, index) => {
			if (value.address.toLowerCase() === selectedAddress?.toLowerCase()) {
				firstItem = index;
				contactEntrys.push(value);
			}
		});
		const { isDarkMode } = this.context;

		return (
			<View>
				<View style={styles.dappAccountLayout}>
					<View>
						<Text style={[styles.dappTitle, isDarkMode && baseStyles.textDark]}>
							{strings('accountApproval.account')}
						</Text>
						<ScrollView
							ref={this.accountScrollRef}
							horizontal
							showsHorizontalScrollIndicator={false}
							onContentSizeChange={(contentWidth, contentHeight) => {
								const { current } = this.accountScrollRef;
								if (current) {
									const left = (contentWidth * firstItem) / contactEntrys.length;
									current.scrollTo({ x: left, animated: false });
								}
							}}
							keyboardShouldPersistTaps="handled"
						>
							<View style={styles.dappAccountScroll}>
								{contactEntrys.map((item, index) => (
									<TouchableOpacity
										activeOpacity={activeOpacity}
										key={'app-account-' + index}
										style={[
											styles.dappAccountTouchItem,
											styles.itemSpace,
											styles.dappAccountTouchItemSeleted,
											{
												backgroundColor: isDarkMode
													? colors.brandPink300Alpha3
													: colors.brandPink3001A
											}
										]}
									>
										<Text
											style={[
												styles.dappAccountName,

												styles.dappAccountNameSeleted,
												isDarkMode && baseStyles.textDark
											]}
											allowFontScaling={false}
											numberOfLines={1}
										>
											{item.name}
										</Text>
										<Text
											style={[
												styles.dappAccountAddress,
												styles.dappAccountAddressSeleted,
												isDarkMode && baseStyles.subTextDark
											]}
											allowFontScaling={false}
											numberOfLines={1}
											ellipsizeMode={'middle'}
										>
											{item.address}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</ScrollView>
					</View>
				</View>

				<View style={styles.dappNetLayout}>
					<View>
						<Text style={[styles.dappTitle, isDarkMode && baseStyles.textDark]}>
							{strings('accountApproval.network')}
						</Text>
						<ScrollView
							ref={this.networkScrollRef}
							horizontal
							showsHorizontalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
						>
							<View style={styles.dappNetScroll}>
								{selectedChainsType.map((item, index) => {
									const isRpc = getIsRpc(item);
									return (
										<TouchableOpacity
											key={'net-' + index}
											activeOpacity={activeOpacity}
											style={[
												styles.dappNetTouchItem,
												styles.itemSpace,
												styles.dappNetTouchItemSeleted,
												{
													backgroundColor: isDarkMode
														? colors.brandPink300Alpha3
														: colors.brandPink3001A
												}
											]}
										>
											{isRpc ? (
												getDefiIcon(item)
											) : (
												<Image source={ChainTypeBgDefi[ChainTypes.indexOf(item)]} />
											)}
											<Text
												allowFontScaling={false}
												numberOfLines={1}
												style={[
													styles.dappNetName,
													styles.dappNetNameSeleted,
													isDarkMode && baseStyles.textDark
												]}
											>
												{isRpc ? getRpcName(item) : getChainTypeName(item)}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</ScrollView>
					</View>
				</View>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	identities: state.engine.backgroundState.PreferencesController.identities,
	allChains: state.engine.backgroundState.PreferencesController.allChains || []
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AccountNetworkView);
