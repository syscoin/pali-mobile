import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';

import Engine from '../../../core/Engine';
import { renderError } from '../../../util/error';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';

import PromptView from '../PromptView';

const { width } = Dimensions.get('window');

const cardWidth = width;
const cardHeight = (cardWidth * 250) / 375;

const styles = StyleSheet.create({
	addAccountLabel: {
		fontSize: 20,
		color: colors.$030319,
		...fontStyles.semibold
	},
	addAccountDesc: {
		fontSize: 9,
		color: colors.$60657D,
		marginTop: 6
	},
	absoluteStart: {
		position: 'absolute',
		left: 0,
		top: 0
	},
	accountItem: {
		position: 'relative'
	},
	parentView: {
		width,
		height: cardHeight,
		overflow: 'scroll',
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 18
	},
	lottieBase: {
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		paddingHorizontal: 22
	},
	animation: {
		width: 60,
		height: 60
	},
	center: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addAccountInter: {
		flex: 1,
		marginLeft: 11
	},
	addAccountContent: {
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		paddingHorizontal: 22
	}
});

export default function CreateAccountCard({ walletSelectedIndex }) {
	const [addAccountLoading, setAddAccountLoading] = useState(false);
	const [error, setError] = useState(null);

	const onAddAccount = async keyringIndex => {
		setAddAccountLoading(true);
		await new Promise(resolve => setTimeout(() => resolve(true), 1));
		try {
			const { KeyringController } = Engine.context;
			await KeyringController.addNewAccount(keyringIndex);
		} catch (e) {
			setError(renderError(e));
		}
		setAddAccountLoading(false);
	};

	return (
		<>
			{addAccountLoading ? (
				<View style={styles.parentView}>
					<View style={styles.accountItem}>
						<Image
							source={require('../../../images/img_add_account_bg.png')}
							style={[styles.absoluteStart, { width: cardWidth * 0.9, height: 205 }]}
						/>
						<View
							style={[
								styles.center,
								{
									width: cardWidth * 0.9,
									height: 205
								}
							]}
						>
							<View style={styles.lottieBase}>
								<LottieView
									style={styles.animation}
									autoPlay
									loop
									source={require('../../../animations/tokens_loading.json')}
								/>
							</View>
						</View>
					</View>
				</View>
			) : (
				<TouchableOpacity
					style={styles.parentView}
					activeOpacity={1.0}
					onPress={() => {
						if (!addAccountLoading) {
							console.log('criou', walletSelectedIndex);
							//TODO the logic of selected wallet to create a new account is missing
							//We need to wait for a better solution to implement this feature since
							// the current system does not have a way to select a wallet, since
							// it aggregates all the wallets in one section.
							// onAddAccount(walletSelectedIndex,);
						}
					}}
				>
					<View style={styles.accountItem}>
						<Image
							source={require('../../../images/img_add_account_bg.png')}
							style={[styles.absoluteStart, { width: cardWidth * 0.9, height: 205 }]}
						/>
						<View
							style={[
								styles.center,
								{
									width: cardWidth * 0.9,
									height: 205
								}
							]}
						>
							<View style={styles.addAccountContent}>
								<Image source={require('../../../images/ic_add_account.png')} />
								<View style={styles.addAccountInter}>
									<Text style={styles.addAccountLabel}>
										{strings('wallet_management.add_new_account')}
									</Text>
									<Text style={styles.addAccountDesc}>
										{strings('wallet_management.add_new_account_desc')}
									</Text>
								</View>
							</View>
						</View>
					</View>
				</TouchableOpacity>
			)}
			<PromptView
				isVisible={error != null}
				title={strings('transactions.transaction_error')}
				message={error}
				onRequestClose={() => {
					setError(null);
				}}
			/>
		</>
	);
}
