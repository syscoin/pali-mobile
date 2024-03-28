import React, { PureComponent } from 'react';
import {
	StyleSheet,
	Text,
	ScrollView,
	View,
	TouchableOpacity,
	Image,
	KeyboardAvoidingView,
	TextInput,
	ActivityIndicator,
	Dimensions,
	Linking
} from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import Modal from 'react-native-modal';
import { KeyringTypes, ChainType, isValidAddress, defaultEnabledChains, isZeroAddress, util } from 'paliwallet-core';
import Engine from '../../../core/Engine';
import LottieView from 'lottie-react-native';
import { toggleShowHint } from '../../../actions/hint';
import { renderAmount } from '../../../util/number';
import { CURRENCIES } from '../../../util/currencies';
import { ChainTypeBgWithoutShadows, ChainTypeIcons, ChainTypeNames, ChainTypes } from '../../../util/ChainTypeImages';
import MStatusBar from '../../UI/MStatusBar';
import TitleBar from '../../UI/TitleBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Device from '../../../util/Device';
import ImageCapInset from '../../UI/ImageCapInset';
import NFTImage from '../../UI/NFTImage';
import { onEvent } from '../../../util/statistics';

const cardMargin = 36;
const cardPadding = 0;
const { width } = Dimensions.get('window');
const cardWidth = width - cardMargin * 2 - cardPadding * 2;
const cardHeight = (cardWidth * 174) / 303;
const chainItemWidth = 40;

const styles = StyleSheet.create({
	flexOne: {
		flex: 1
	},
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	rowWrapper: {
		flex: 1
	},
	childLayout: {
		flex: 1,
		margin: cardMargin
	},
	accountName: {
		color: colors.$F7F7F7,
		fontSize: 14,
		...fontStyles.bold,
		marginLeft: 10
	},
	renameTouch: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 19,
		paddingBottom: 4,
		marginRight: 10,
		alignSelf: 'flex-start'
	},
	centerModal: {
		justifyContent: 'center',
		margin: 0
	},
	textInput: {
		height: 25,
		fontSize: 13,
		color: colors.$030319,
		lineHeight: 15,
		marginTop: 20,
		paddingVertical: 0,
		paddingBottom: 6
	},
	underline: {
		flex: 1,
		borderBottomWidth: 1,
		borderBottomColor: colors.$8F92A1Alpha
	},
	cancelButton: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.brandPink300,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelText: {
		fontSize: 14,
		color: colors.brandPink300
	},
	okButton: {
		flex: 1.5,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.brandPink300,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText: {
		fontSize: 14,
		color: colors.white
	},
	cancelButton2: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.transparent,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelText2: {
		fontSize: 16,
		color: colors.$030319
	},
	okButton2: {
		flex: 1,
		height: 44,
		borderRadius: 100,
		backgroundColor: colors.transparent,
		marginLeft: 19,
		alignItems: 'center',
		justifyContent: 'center'
	},
	okText2: {
		fontSize: 16,
		color: colors.$FC6564
	},
	modalRoot: {
		marginHorizontal: 23,
		borderRadius: 8,
		backgroundColor: colors.white
	},
	modalContainer: {
		margin: 30,
		marginHorizontal: 26
	},
	modalContainer2: {
		margin: 30,
		marginBottom: 20,
		marginHorizontal: 26
	},
	modalTitle: {
		fontSize: 18,
		color: colors.$1E1E1E,
		...fontStyles.bold,
		alignSelf: 'center'
	},
	modalButtons: {
		marginTop: 30,
		flexDirection: 'row'
	},
	modalButtons2: {
		marginTop: 20,
		flexDirection: 'row'
	},
	modalEg: {
		fontSize: 11,
		color: colors.$60657D,
		marginTop: 8
	},
	absoluteStart: {
		position: 'absolute',
		left: 0,
		top: 0,
		borderRadius: 10
	},
	deleteAccountStyle: {
		position: 'absolute',
		right: -14,
		top: -14,
		width: 30,
		height: 30,
		padding: 5
	},
	networkTouch: {
		paddingBottom: 12,
		paddingTop: 10,
		width: chainItemWidth + 6,
		alignItems: 'center',
		marginHorizontal: -3
	},
	networkNormal: {
		width: 24,
		height: 24,
		opacity: 0.6
	},
	networkSelected: {
		width: 24,
		height: 24,
		opacity: 1
	},
	chainName: {
		fontSize: 9,
		color: colors.$F7F7F7,
		alignSelf: 'center',
		marginTop: 3,
		height: 15
	},
	animation: {
		width: 60,
		height: 60
	},
	accountItem: {
		marginTop: 16,
		flex: 1
	},
	paddingLeft18: {
		paddingLeft: 18
	},
	chainTypeAmount: {
		color: colors.$FEFEFE,
		fontSize: 24,
		...fontStyles.semibold
	},
	accountAddress: {
		color: colors.$FEFEFE,
		fontSize: 12
	},
	accountAddressLayout: {
		flex: 1,
		justifyContent: 'center'
	},
	chainTypeBase: {
		flexDirection: 'row',
		marginLeft: -8
	},
	center: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	lottieBase: {
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		paddingHorizontal: 22
	},
	addAccountContent: {
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		paddingHorizontal: 22
	},
	addAccountInter: {
		flex: 1,
		marginLeft: 11
	},
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
	errorText: {
		color: colors.$FC6564
	},
	watchText: {
		color: colors.$030319,
		fontSize: 18,
		...fontStyles.semibold
	},
	imageCapInset: {
		flex: 1,
		margin: 0
	},
	famousTagLayout: {
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		flexDirection: 'row'
	},
	marginBottom18: {
		marginBottom: 18
	},
	famousName: {
		marginTop: 18,
		fontSize: 24,
		color: colors.white,
		...fontStyles.semibold
	},
	famousAddress: {
		marginTop: 10,
		color: colors.$F7F7F7,
		fontSize: 12
	},
	famousTwitter: {
		backgroundColor: colors.famousTagBg,
		paddingHorizontal: 8,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 4,
		marginRight: 14,
		marginTop: 8,
		justifyContent: 'center',
		paddingVertical: 1
	},
	twitterText: {
		color: colors.$5092FF,
		fontSize: 10
	},
	fomousTagText: {
		color: colors.white,
		fontSize: 10,
		marginRight: 14,
		backgroundColor: colors.famousTagBg,
		paddingHorizontal: 8,
		borderRadius: 4,
		marginTop: 8,
		paddingVertical: 1,
		overflow: 'hidden'
	},
	famousTwitterWatch: {
		backgroundColor: colors.watchFamousTwitterBg,
		paddingHorizontal: 8,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 4,
		marginRight: 14,
		marginTop: 8,
		justifyContent: 'center',
		paddingVertical: 1
	},
	fomousTagTextWatch: {
		color: colors.$8F92A1,
		fontSize: 10,
		marginRight: 14,
		backgroundColor: colors.$F6F6F6,
		paddingHorizontal: 8,
		borderRadius: 4,
		marginTop: 8,
		paddingVertical: 1,
		overflow: 'hidden'
	}
});

/**
 * View that displays private account information as private key or seed phrase
 */
class ObserveAccounts extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		currencyCode: PropTypes.string,
		identities: PropTypes.object,
		wealths: PropTypes.object,
		isLockScreen: PropTypes.bool,
		famousAccounts: PropTypes.array
	};

	state = {
		deleteAccountModalVisible: false,
		addAccountModalVisible: false,
		checkPasswordModalVisible: false,
		addressValue: '',
		walletSelectedIndex: -1,
		walletSelectedType: KeyringTypes.hd,
		walletSelectedCanRemove: true,
		addAccountLoading: false,
		renameAddressLoading: '',
		deleteAddressLoading: '',
		passwordValue: '',
		wrongPwVisible: false,
		currentDeleteAccount: false,
		deleteWalletModalVisible: false,
		createWalletLoading: false,
		faqModalVisible: false,
		currentChainTypes: {},
		headerPopModalVisible: false,
		isWalletPop: false,
		headerIconRect: {},
		addAccountError: '',
		renameAccountModalVisible: false,
		accountNameValue: 'Main Account'
	};
	headerButtonRef = React.createRef();

	currentModalAccount = {}; //ContactEntry

	componentDidMount = () => {
		onEvent('Enter_observe_page');
	};

	hideDeleteAccountModal = () => {
		this.setState({ deleteAccountModalVisible: false });
	};

	onDeleteCancal = () => {
		this.hideDeleteAccountModal();
	};

	deleteAccount = async () => {
		const { KeyringController } = Engine.context;
		this.setState({ deleteAddressLoading: this.currentModalAccount.address });
		await KeyringController.removeAccount(this.currentModalAccount.address);
		this.setState({ deleteAddressLoading: '' });

		let isFamous = false;
		if (this.props.famousAccounts && this.props.famousAccounts.length > 0) {
			Object.values(this.props.famousAccounts).forEach((value, index) => {
				if (value.address?.toLowerCase() === this.currentModalAccount.address?.toLowerCase()) {
					isFamous = true;
				}
			});
		}
		if (isFamous) {
			onEvent('Del_Famous_ObAcc');
		} else {
			onEvent('Del_Custom_ObAcc');
		}
	};

	onDeleteOk = async () => {
		this.setState({ deleteAccountModalVisible: false });
		this.deleteAccount();
	};

	renderDeleteAccount = () => {
		const { deleteAccountModalVisible } = this.state;
		const { isLockScreen } = this.props;
		return (
			<Modal
				isVisible={deleteAccountModalVisible && !isLockScreen}
				onBackdropPress={this.hideDeleteAccountModal}
				onBackButtonPress={this.hideDeleteAccountModal}
				onSwipeComplete={this.hideDeleteAccountModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
			>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View style={styles.modalContainer2}>
						<Text style={styles.modalTitle}>
							{strings('wallet_management.delete_account', {
								name: this.currentModalAccount?.name
							})}
						</Text>

						<View style={styles.modalButtons2}>
							<TouchableOpacity style={styles.cancelButton2} onPress={this.onDeleteCancal}>
								<Text style={styles.cancelText2}>{strings('other.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.okButton2} onPress={this.onDeleteOk}>
								<Text style={styles.okText2}>{strings('wallet_management.confirm_delete')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		);
	};

	showAddAccountModal = account => {
		this.setState({ addAccountModalVisible: true, addAccountError: '' });
	};

	hideAddAccountModal = () => {
		this.setState({
			addAccountModalVisible: false,
			addAccountLoading: false,
			addAccountError: '',
			addressValue: ''
		});
	};

	onAddCancal = () => {
		if (this.state.addAccountLoading) {
			return;
		}
		this.hideAddAccountModal();
	};

	onAddOk = async () => {
		const { addAccountLoading } = this.state;
		let { addressValue } = this.state;
		if (addAccountLoading) {
			return;
		}
		if (addressValue && addressValue.trim() !== '') {
			addressValue = addressValue.trim();
			this.setState({ addAccountLoading: true, addAccountError: '' });
			await new Promise(resolve => setTimeout(() => resolve(true), 100));
			let tempAddress = addressValue;
			let isValidTokenAddress = isValidAddress(tempAddress);
			if (!isValidTokenAddress) {
				tempAddress = await Engine.context.EnsController.getAddressForEnsName(addressValue.toLowerCase());
				if (tempAddress) {
					isValidTokenAddress = isValidAddress(tempAddress);
				}
			}
			isValidTokenAddress = isValidTokenAddress && !isZeroAddress(tempAddress);
			if (isValidTokenAddress) {
				const successful = await Engine.context.PreferencesController.addObserveAddress(tempAddress);
				if (successful) {
					this.setState({ addAccountModalVisible: false, addAccountLoading: false, addressValue: '' });
					onEvent('Added_Custom_ObAcc');
				} else {
					this.setState({ addAccountLoading: false, addAccountError: strings('observer.account_already') });
				}
			} else {
				this.setState({ addAccountLoading: false, addAccountError: strings('observer.wrong_address') });
			}
		}
	};

	onAccountAddressChange = value => {
		this.setState({ addressValue: value });
	};

	renderAddAccount = () => {
		const { addAccountModalVisible, addressValue, addAccountLoading } = this.state;
		const { isLockScreen } = this.props;
		return (
			<Modal
				isVisible={addAccountModalVisible && !isLockScreen}
				onBackdropPress={this.hideRenameAccountModal}
				onBackButtonPress={this.hideRenameAccountModal}
				onSwipeComplete={this.hideRenameAccountModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
			>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View style={styles.modalContainer}>
						<TextInput
							style={styles.textInput}
							value={addressValue}
							onChangeText={this.onAccountAddressChange}
							placeholder={strings('observer.enter_address_here')}
							placeholderTextColor={colors.$8F92A1}
						/>
						<View style={styles.underline} />
						<Text style={[styles.modalEg, this.state.addAccountError !== '' && styles.errorText]}>
							{this.state.addAccountError || strings('observer.only_support_evm_chain')}
						</Text>
						<View style={styles.modalButtons}>
							<TouchableOpacity style={styles.cancelButton} onPress={this.onAddCancal}>
								<Text style={styles.cancelText}>{strings('other.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.okButton} onPress={this.onAddOk}>
								{addAccountLoading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text style={styles.okText}>{strings('navigation.ok')}</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		);
	};

	showDeleteAccountModal = account => {
		this.currentModalAccount = account;
		this.setState({ deleteAccountModalVisible: true });
	};

	onRename = account => {
		this.currentModalAccount = account;
		this.setState({ renameAccountModalVisible: true, accountNameValue: account.name });
	};

	hideRenameAccountModal = () => {
		this.setState({ renameAccountModalVisible: false });
	};

	onRenameCancal = () => {
		this.hideRenameAccountModal();
	};

	onRenameOk = async () => {
		const { accountNameValue } = this.state;
		if (accountNameValue && accountNameValue !== '') {
			const { PreferencesController } = Engine.context;
			this.setState({
				renameAccountModalVisible: false,
				renameAddressLoading: this.currentModalAccount.address
			});
			await PreferencesController.setAccountLabel(this.currentModalAccount.address, accountNameValue);
			this.setState({ renameAddressLoading: '' });
		}
	};

	onAccountNameChange = value => {
		this.setState({ accountNameValue: value });
	};

	renderRenameAccount = () => {
		const { renameAccountModalVisible, accountNameValue } = this.state;
		const { isLockScreen } = this.props;
		return (
			<Modal
				isVisible={renameAccountModalVisible && !isLockScreen}
				onBackdropPress={this.hideRenameAccountModal}
				onBackButtonPress={this.hideRenameAccountModal}
				onSwipeComplete={this.hideRenameAccountModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
			>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>{strings('wallet_management.rename_account')}</Text>
						<TextInput
							style={styles.textInput}
							value={accountNameValue}
							onChangeText={this.onAccountNameChange}
						/>
						<View style={styles.underline} />
						<Text style={styles.modalEg}>{strings('wallet_management.rename_eg')}</Text>
						<View style={styles.modalButtons}>
							<TouchableOpacity style={styles.cancelButton} onPress={this.onRenameCancal}>
								<Text style={styles.cancelText}>{strings('other.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.okButton} onPress={this.onRenameOk}>
								<Text style={styles.okText}>{strings('wallet_management.rename')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		);
	};

	renderFamousItem = (account, index) => (
		<View style={styles.accountItem} key={'famous-account-element-' + index}>
			<Image
				source={require('../../../images/img_card_observe_nsd.png')}
				style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
			/>
			{!!account.bg && (
				<NFTImage
					style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
					imageUrl={account.bg}
				/>
			)}

			<TouchableOpacity
				onPress={async () => {
					await Engine.context.PreferencesController.addFamousObserveAddress(
						account.address,
						account.name,
						account.chains
					);
					onEvent('Added_Famous_ObAcc');
				}}
				style={styles.deleteAccountStyle}
			>
				<Image source={require('../../../images/ic_add_famous_account.png')} />
			</TouchableOpacity>

			<View style={[styles.paddingLeft18, { width: cardWidth, height: cardHeight }]}>
				<Text style={styles.famousName} allowFontScaling={false}>
					{account.name}
				</Text>

				<Text style={styles.famousAddress} allowFontScaling={false}>
					{account.address.substring(0, 8) + '...' + account.address.substring(account.address.length - 7)}
				</Text>
				<View style={styles.flexOne} />
				<View style={styles.marginBottom18}>
					<View style={styles.famousTagLayout}>
						{!!account.twitter && (
							<TouchableOpacity
								onPress={() => {
									Linking.openURL('https://twitter.com/' + account.twitter);
								}}
								style={styles.famousTwitter}
							>
								<Image source={require('../../../images/ic_twitter_tag.png')} />
								<Text style={styles.twitterText} allowFontScaling={false}>
									@{account.twitter}
								</Text>
							</TouchableOpacity>
						)}
						{!!account.tags &&
							account.tags.length > 0 &&
							account.tags.map((item, index) => (
								<Text
									key={'watch-tag-' + index}
									style={styles.fomousTagText}
									allowFontScaling={false}
									numberOfLines={1}
								>
									{item}
								</Text>
							))}
					</View>
				</View>
			</View>
		</View>
	);

	renderFamousList = famoutEntrys => (
		<ImageCapInset
			style={styles.imageCapInset}
			source={Device.isAndroid() ? { uri: 'default_card' } : require('../../../images/default_card.png')}
			capInsets={baseStyles.capInsets}
		>
			<View style={styles.childLayout}>
				<Text style={styles.watchText}>{strings('observer.famous_accounts')}</Text>
				{famoutEntrys.map((item, index) => this.renderFamousItem(item, index))}
			</View>
		</ImageCapInset>
	);

	renderAccountItem = (account, index) => {
		const { currencyCode, wealths } = this.props;
		const { renameAddressLoading, deleteAddressLoading, currentChainTypes } = this.state;
		const address = account.address;
		// const account = identities[address];
		if (!account) {
			return;
		}

		let favouriteChains = account?.enabledChains || defaultEnabledChains;
		favouriteChains = [ChainType.All, ...favouriteChains];

		const enableChain = checkChainType => favouriteChains.indexOf(checkChainType) !== -1;

		let currentTranslateIndex = util.isRpcChainType(favouriteChains[1])
			? ChainTypes.indexOf(ChainType.RPCBase)
			: ChainTypes.indexOf(favouriteChains[1]);
		if (currentChainTypes[address] !== undefined) {
			currentTranslateIndex = currentChainTypes[address];
		}

		const amountSymbol = CURRENCIES[currencyCode].symbol;

		let allAmount = 0;
		let chainTypeAmount = [];
		for (const chainType of ChainTypes) {
			if (chainType === ChainType.All) {
				continue;
			}
			const currencyAmount = wealths[address]?.tokenAmount?.[chainType] || 0;
			if (enableChain(chainType)) {
				allAmount += currencyAmount;
			}
			chainTypeAmount.push(currencyAmount.toFixed(2));
		}
		chainTypeAmount = [allAmount, ...chainTypeAmount];

		return (
			<View style={styles.accountItem} key={'account-element-' + index}>
				{account.famousBg ? (
					<NFTImage
						style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
						imageUrl={account.famousBg}
					/>
				) : (
					<Image
						source={
							account.isObserve
								? require('../../../images/img_card_observe_nsd.png')
								: ChainTypeBgWithoutShadows[currentTranslateIndex]
						}
						style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
					/>
				)}

				<TouchableOpacity
					onPress={() => {
						if (!deleteAddressLoading || deleteAddressLoading === '') {
							this.showDeleteAccountModal(account);
						}
					}}
					style={styles.deleteAccountStyle}
				>
					<Image source={require('../../../images/ic_account_delete.png')} />
				</TouchableOpacity>

				<View style={[styles.paddingLeft18, { width: cardWidth, height: cardHeight }]}>
					<TouchableOpacity
						style={styles.renameTouch}
						activeOpacity={1.0}
						onPress={() => {
							if (!renameAddressLoading || renameAddressLoading === '') {
								this.onRename(account);
							}
						}}
					>
						{renameAddressLoading === address ? (
							<ActivityIndicator size="small" color={colors.$F7F7F7} />
						) : (
							<Image source={require('../../../images/ic_account_rename.png')} />
						)}
						<Text style={styles.accountName} allowFontScaling={false}>
							{account.name}
						</Text>
					</TouchableOpacity>
					<Text style={styles.chainTypeAmount} allowFontScaling={false}>
						{amountSymbol +
							(chainTypeAmount[currentTranslateIndex]
								? renderAmount(chainTypeAmount[currentTranslateIndex])
								: '0.00')}
					</Text>
					<View style={styles.accountAddressLayout}>
						<Text style={styles.accountAddress} allowFontScaling={false}>
							{address.substring(0, 13) + '...' + address.substring(30)}
						</Text>
					</View>

					<View style={styles.chainTypeBase}>
						{favouriteChains.map((chainType, index) => {
							const translateIndex = util.isRpcChainType(chainType)
								? ChainTypes.indexOf(ChainType.RPCBase)
								: ChainTypes.indexOf(chainType);
							return (
								<TouchableOpacity
									style={styles.networkTouch}
									onPress={() => {
										if (currentTranslateIndex !== translateIndex) {
											currentChainTypes[address] = translateIndex;
											this.setState({ currentChainTypes });
											this.forceUpdate();
										}
									}}
									activeOpacity={1.0}
									key={'chain-type-' + index}
								>
									<Image
										style={
											currentTranslateIndex === translateIndex
												? styles.networkSelected
												: styles.networkNormal
										}
										source={ChainTypeIcons[translateIndex]}
									/>
									<Text style={styles.chainName} allowFontScaling={false}>
										{currentTranslateIndex === translateIndex ? ChainTypeNames[translateIndex] : ''}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>
				<View style={styles.famousTagLayout}>
					{!!account.twitter && (
						<TouchableOpacity
							onPress={() => {
								Linking.openURL('https://twitter.com/' + account.twitter);
							}}
							style={styles.famousTwitterWatch}
						>
							<Image source={require('../../../images/ic_twitter_tag.png')} />
							<Text style={styles.twitterText} allowFontScaling={false}>
								@{account.twitter}
							</Text>
						</TouchableOpacity>
					)}
					{!!account.famousTag &&
						account.famousTag.length > 0 &&
						account.famousTag.map((item, index) => (
							<Text
								key={'unwatch-tag-' + index}
								style={styles.fomousTagTextWatch}
								allowFontScaling={false}
								numberOfLines={1}
							>
								{item}
							</Text>
						))}
				</View>
			</View>
		);
	};

	renderWatchList = contactEntrys => {
		const { addAccountLoading } = this.state;

		return (
			<ImageCapInset
				style={styles.imageCapInset}
				source={Device.isAndroid() ? { uri: 'default_card' } : require('../../../images/default_card.png')}
				capInsets={baseStyles.capInsets}
			>
				<View style={styles.childLayout}>
					<Text style={styles.watchText}>{strings('observer.watch')}</Text>
					{contactEntrys.map((item, index) => this.renderAccountItem(item, index))}

					{addAccountLoading ? (
						<View style={styles.accountItem}>
							<Image
								source={require('../../../images/img_add_account_bg.png')}
								style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
							/>
							<View
								style={[
									styles.center,
									{
										width: cardWidth,
										height: cardHeight
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
					) : (
						<TouchableOpacity
							activeOpacity={1.0}
							onPress={() => {
								this.showAddAccountModal();
							}}
						>
							<View style={styles.accountItem}>
								<Image
									source={require('../../../images/img_add_account_bg.png')}
									style={[styles.absoluteStart, { width: cardWidth, height: cardHeight }]}
								/>
								<View
									style={[
										styles.center,
										{
											width: cardWidth,
											height: cardHeight
										}
									]}
								>
									<View style={styles.addAccountContent}>
										<Image source={require('../../../images/ic_add_account.png')} />
										<View style={styles.addAccountInter}>
											<Text style={styles.addAccountLabel}>
												{strings('observer.add_an_address')}
											</Text>
											<Text style={styles.addAccountDesc}>
												{strings('observer.add_acount_desc')}
											</Text>
										</View>
									</View>
								</View>
							</View>
						</TouchableOpacity>
					)}
				</View>
			</ImageCapInset>
		);
	};

	render = () => {
		const { identities, famousAccounts } = this.props;

		const contactEntrys = [];
		Object.values(identities).forEach((value, index) => {
			if (value.isObserve) {
				contactEntrys.push(value);
			}
		});
		const famoutEntrys = [];
		Object.values(famousAccounts).forEach((value, index) => {
			const findIndex = contactEntrys.findIndex(
				entry => entry.address?.toLowerCase() === value.address?.toLowerCase()
			);
			if (findIndex === -1) {
				famoutEntrys.push(value);
			} else {
				contactEntrys[findIndex] = {
					...contactEntrys[findIndex],
					isFamous: true,
					famousBg: value.bg,
					famousTag: value.tags,
					twitter: value.twitter
				};
			}
		});
		return (
			<SafeAreaView style={styles.wrapper} testID={'wallet-management-screen'}>
				<MStatusBar navigation={this.props.navigation} />
				<TitleBar
					title={strings('observer.observe_only_ccounts')}
					onBack={() => {
						this.props.navigation.pop();
					}}
				/>
				<View style={styles.flexOne}>
					<View style={styles.rowWrapper}>
						<ScrollView
							style={styles.flexOne}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							{this.renderWatchList(contactEntrys)}
							{famoutEntrys.length > 0 && this.renderFamousList(famoutEntrys)}
						</ScrollView>
					</View>
					{this.renderAddAccount()}
					{this.renderDeleteAccount()}
					{this.renderRenameAccount()}
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	currencyCode: state.engine.backgroundState.TokenRatesController.currencyCode,
	identities: state.engine.backgroundState.PreferencesController.identities,
	wealths: state.engine.backgroundState.AssetsDataModel.wealths || {},
	isLockScreen: state.settings.isLockScreen,
	famousAccounts: state.settings.famousAccounts
});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ObserveAccounts);
