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
	StatusBar,
	Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import MStatusBar from '../../UI/MStatusBar';
import Device from '../../../util/Device';
import Modal from 'react-native-modal';
import { KeyringTypes, util, ChainType, defaultEnabledChains } from 'gopocket-core';
import Engine from '../../../core/Engine';
import { passwordRequirementsMet } from '../../../util/password';
import SecureKeychain from '../../../core/SecureKeychain';
import AsyncStorage from '@react-native-community/async-storage';
import { BIOMETRY_CHOICE_DISABLED, EXISTING_USER, TRUE } from '../../../constants/storage';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import Popover from '../../UI/Popover';
import { toggleShowHint } from '../../../actions/hint';
import { renderAmount } from '../../../util/number';
import { CURRENCIES } from '../../../util/currencies';
import { ChainTypeBgWithoutShadows, ChainTypeIcons, ChainTypeNames, ChainTypes } from '../../../util/ChainTypeImages';
import { tryVerifyPassword } from '../../../core/Vault';
import ImageCapInset from '../../UI/ImageCapInset';
import WalletConnect from '../../../core/WalletConnect';
import PromptView from '../../UI/PromptView';
import { renderError } from '../../../util/error';
import Icon from '../../UI/Icon';

const cardMargin = 20;
const cardPadding = 18;
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
	cardWrapper: {
		flex: 1,
		marginHorizontal: 20,
		marginBottom: 25,
		borderRadius: 8,
		backgroundColor: colors.white,
		shadowOffset: {
			width: 0,
			height: 2
		},
		shadowOpacity: 0.25,
		shadowRadius: 2.5,
		elevation: 10
	},
	childrenWrapper: {
		flex: 1,
		marginHorizontal: 16,
		marginVertical: 16,
		backgroundColor: colors.white
	},
	rowFlex: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	rowFlex2: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	walletTitle: {
		color: colors.$1A1A1A,
		fontSize: 18,
		flexShrink: 1,
		...fontStyles.bold
	},
	importedText: {
		fontSize: 12,
		color: colors.brandPink500
	},
	importedView: {
		backgroundColor: colors.brandPink50,
		borderRadius: 15,
		paddingHorizontal: 10,
		paddingVertical: 5,
		marginLeft: 10
	},
	scrollViewContent: {
		flex: 1,
		paddingVertical: 16
	},
	importPhraseButton: {
		height: 40,
		paddingHorizontal: 20,
		justifyContent: 'center',
		marginTop: 8
	},
	importPhraseButtonText: {
		fontSize: 14,
		color: colors.$1A1A1A
	},
	importPrivateKeyButton: {
		height: 40,
		paddingHorizontal: 20,
		justifyContent: 'center'
	},
	importPrivateKeyButtonText: {
		fontSize: 14,
		color: colors.$1A1A1A
	},
	createWalletButton: {
		height: 40,
		paddingLeft: 20,
		justifyContent: 'center',
		marginBottom: 6
	},
	createWalletButtonText: {
		fontSize: 14,
		color: colors.$1A1A1A
	},
	askButton: {
		paddingLeft: 10,
		paddingRight: 20,
		paddingVertical: 8
	},
	askBaseLayout: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	accountName: {
		color: colors.$F7F7F7,
		fontSize: 14,
		flexShrink: 1,
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
		color: colors.$1A1A1A,
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
		borderRadius: 10,
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
		borderRadius: 10,
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
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.transparent,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cancelText2: {
		fontSize: 16,
		color: colors.$1A1A1A
	},
	okButton2: {
		flex: 1,
		height: 44,
		borderRadius: 10,
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
	modalWarn: {
		fontSize: 13,
		color: colors.$60657D,
		marginTop: 20,
		lineHeight: 20
	},
	pwInput: {
		marginTop: 20,
		height: 42,
		fontSize: 14,
		paddingTop: 11,
		paddingBottom: 11,
		paddingHorizontal: 20,
		borderWidth: 1,
		borderRadius: 5,
		borderColor: colors.$DCDCDC,
		backgroundColor: colors.$F5F5F5,
		color: colors.$404040
	},
	wrongPw: {
		fontSize: 11,
		color: colors.$FC6564,
		marginTop: 8,
		opacity: 0
	},
	wrongPwShowing: {
		opacity: 1
	},
	pwModalButtons: {
		marginTop: 20,
		flexDirection: 'row'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	faqWrapper: {
		minHeight: 400,
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	},
	faqContainer: {
		margin: 30,
		marginBottom: 20,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	faqTitle: {
		...fontStyles.bold,
		fontSize: 20,
		color: colors.$1A1A1A
	},
	faqDesc: {
		fontSize: 14,
		color: colors.$60657D,
		marginTop: 14,
		marginBottom: 20
	},
	headerLabelStyle: {
		fontSize: 18,
		flex: 1,
		textAlign: 'center',
		color: colors.$202020,
		...fontStyles.bold
	},
	headerStyle: {
		flexDirection: 'row',
		shadowColor: colors.transparent,
		elevation: 0,
		backgroundColor: colors.white,
		borderBottomWidth: 0,
		alignItems: 'center'
	},
	backButton: {
		paddingLeft: Device.isAndroid() ? 22 : 18,
		paddingRight: Device.isAndroid() ? 22 : 18,
		paddingVertical: 10
	},
	absoluteStart: {
		position: 'absolute',
		left: 0,
		top: 0
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
	margin0: {
		margin: 0,
		marginHorizontal: 0
	},
	walletPopItemButton: {
		height: 40,
		paddingHorizontal: 20,
		alignItems: 'center',
		flexDirection: 'row'
	},
	walletPopItemText: {
		fontSize: 14,
		color: colors.$1A1A1A,
		marginLeft: 12
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
	chainTypeBaseWrap: {
		height: 55
	},
	paddingVertical7: {
		paddingVertical: 7
	},
	walletMoreTouch: {
		paddingLeft: 10,
		paddingRight: 18,
		marginRight: -18,
		paddingTop: 16,
		marginTop: -16
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
	addButton: {
		width: 60,
		height: 60
	},
	addAccountInter: {
		flex: 1,
		marginLeft: 11
	},
	addAccountLabel: {
		fontSize: 20,
		color: colors.$1A1A1A,
		...fontStyles.semibold
	},
	addAccountDesc: {
		fontSize: 9,
		color: colors.$60657D,
		marginTop: 6
	}
});

/**
 * View that displays private account information as private key or seed phrase
 */
class WalletManagement extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		keyrings: PropTypes.array,
		toggleShowHint: PropTypes.func,
		currencyCode: PropTypes.string,
		identities: PropTypes.object,
		wealths: PropTypes.object,
		isLockScreen: PropTypes.bool
	};

	state = {
		deleteAccountModalVisible: false,
		renameAccountModalVisible: false,
		renameWalletModalVisible: false,
		checkPasswordModalVisible: false,
		accountNameValue: 'Main Account',
		walletNameValue: 'Wallet',
		walletSelectedIndex: -1,
		walletMainAddress: '',
		walletSelectedType: KeyringTypes.hd,
		walletSelectedName: '',
		walletSelectedCanRemove: true,
		addAccountLoadingIndex: -1,
		renameAddressLoading: '',
		renameWalletLoading: '',
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
		error: null
	};
	headerButtonRef = React.createRef();

	currentModalAccount = {}; //ContactEntry
	currentModalWallet = {}; //ContactEntry

	onAddAccount = async keyringIndex => {
		this.setState({ addAccountLoadingIndex: keyringIndex });
		await new Promise(resolve => setTimeout(() => resolve(true), 1));
		try {
			const { KeyringController } = Engine.context;
			await KeyringController.addNewAccount(keyringIndex);
		} catch (e) {
			this.setState({ error: renderError(e) });
		}
		this.setState({ addAccountLoadingIndex: -1 });
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
		WalletConnect.removeAccounts([this.currentModalAccount.address]);
	};

	onDeleteOk = async () => {
		this.setState({ deleteAccountModalVisible: false });
		const hasCredentials = await this.checkBiometric();
		if (hasCredentials) {
			this.deleteAccount();
		} else if (Device.isAndroid()) {
			this.setState({
				checkPasswordModalVisible: true,
				wrongPwVisible: false,
				passwordValue: '',
				currentDeleteAccount: true
			});
		} else {
			setTimeout(
				() =>
					this.setState({
						checkPasswordModalVisible: true,
						wrongPwVisible: false,
						passwordValue: '',
						currentDeleteAccount: true
					}),
				1000
			);
		}
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

						<Text style={styles.modalWarn}>{strings('wallet_management.delete_warn')}</Text>
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

	hideRenameAccountModal = () => {
		this.setState({ renameAccountModalVisible: false });
	};

	hideRenameWalletModal = () => {
		this.setState({ renameWalletModalVisible: false });
	};

	onRenameCancal = () => {
		this.hideRenameAccountModal();
	};

	onRenameWalletCancel = () => {
		this.hideRenameWalletModal();
	};

	onRenameWalletOk = async () => {
		const { walletNameValue } = this.state;

		if (walletNameValue && walletNameValue !== '') {
			const { PreferencesController } = Engine.context;
			this.setState({
				renameWalletModalVisible: false,
				renameWalletLoading: this.currentModalWallet.address
			});
			await PreferencesController.setAccountLabel(this.currentModalWallet.address, walletNameValue, 'walletName');
			this.setState({ renameWalletLoading: '' });
		}
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

	onWalletNameChange = value => {
		this.setState({ walletNameValue: value });
	};
	onAccountNameChange = value => {
		this.setState({ accountNameValue: value });
	};

	renderRenameWallet = () => {
		const { renameWalletModalVisible, walletNameValue } = this.state;

		const { isLockScreen } = this.props;

		return (
			<Modal
				isVisible={renameWalletModalVisible && !isLockScreen}
				onBackdropPress={this.hideRenameWalletModal}
				onBackButtonPress={this.hideRenameWalletModal}
				onSwipeComplete={this.hideRenameWalletModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
			>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>{strings('wallet_management.rename_account')}</Text>
						<TextInput
							style={styles.textInput}
							value={walletNameValue}
							onChangeText={this.onWalletNameChange}
						/>
						<View style={styles.underline} />
						<Text style={styles.modalEg}>{strings('wallet_management.rename_eg')}</Text>
						<View style={styles.modalButtons}>
							<TouchableOpacity style={styles.cancelButton} onPress={this.onRenameWalletCancel}>
								<Text style={styles.cancelText}>{strings('other.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.okButton} onPress={this.onRenameWalletOk}>
								<Text style={styles.okText}>{strings('wallet_management.rename')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		);
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

	hideCheckPasswordModal = () => {
		this.setState({ checkPasswordModalVisible: false });
	};

	onPasswordValueChange = value => {
		this.setState({ passwordValue: value });
	};

	onConfirmPw = async () => {
		const { passwordValue, currentDeleteAccount } = this.state;
		let success = passwordRequirementsMet(passwordValue);
		if (success) {
			this.setState({ ready: false });
			try {
				await tryVerifyPassword(passwordValue);
				success = true;
			} catch (e) {
				success = false;
			}
		}
		if (!success) {
			this.setState({ wrongPwVisible: true });
			return;
		}
		currentDeleteAccount ? this.deleteAccount() : this.removeWallet();
		this.hideCheckPasswordModal();
	};

	removeWallet = async () => {
		const { walletSelectedIndex } = this.state;
		const { KeyringController } = Engine.context;
		if (this.props.keyrings.length <= 1) {
			this.props.navigation.navigate('OnboardingRootNav');
			try {
				await Engine.resetState();
				await KeyringController.createNewVaultAndKeychain(`${Date.now()}`);

				await AsyncStorage.removeItem(EXISTING_USER);
			} catch (error) {
				util.logWarn('removeWallet', error);
			}
		} else {
			const deleteAccounts = this.props.keyrings[walletSelectedIndex]?.accounts;
			await KeyringController.removeKeyring(walletSelectedIndex);
			this.props.toggleShowHint(strings('wallet_management.wallet_deleted'));
			WalletConnect.removeAccounts(deleteAccounts);
		}
	};

	renderCheckPassword = () => {
		const { checkPasswordModalVisible, passwordValue, wrongPwVisible } = this.state;
		const { isLockScreen } = this.props;
		return (
			<Modal
				isVisible={checkPasswordModalVisible && !isLockScreen}
				onBackdropPress={this.hideCheckPasswordModal}
				onBackButtonPress={this.hideCheckPasswordModal}
				onSwipeComplete={this.hideCheckPasswordModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
			>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>{strings('wallet_management.confirm_password')}</Text>
						<TextInput
							ref={this.fieldRef}
							style={styles.pwInput}
							value={passwordValue}
							onChangeText={this.onPasswordValueChange}
							secureTextEntry
							placeholder={strings('wallet_management.password')}
							placeholderTextColor={colors.$8F92A1}
							onSubmitEditing={this.onLogin}
							returnKeyType={'done'}
							autoCapitalize="none"
						/>
						<Text style={[styles.wrongPw, wrongPwVisible && styles.wrongPwShowing]} Visible={false}>
							{strings('wallet_management.wrong_password')}
						</Text>
						<View style={styles.pwModalButtons}>
							<TouchableOpacity style={styles.cancelButton} onPress={this.hideCheckPasswordModal}>
								<Text style={styles.cancelText}>{strings('action_view.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.okButton} onPress={this.onConfirmPw}>
								<Text style={styles.okText}>{strings('action_view.confirm')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		);
	};

	onRename = account => {
		this.currentModalAccount = account;
		this.setState({ renameAccountModalVisible: true, accountNameValue: account.name });
	};

	onRenameWallet = (wallet, keyringIndex) => {
		this.hideHeaderPopModal();

		const walletName = wallet.walletName ? wallet.walletName : `Wallet${keyringIndex + 1}`;
		wallet.walletName = walletName;

		this.currentModalWallet = wallet;
		this.setState({ renameWalletModalVisible: true, walletNameValue: walletName });
	};

	showDeleteAccountModal = account => {
		this.currentModalAccount = account;
		this.setState({ deleteAccountModalVisible: true });
	};

	renderAccountItem = (address, index, canRemove) => {
		const { currencyCode, identities, wealths } = this.props;

		const { renameAddressLoading, deleteAddressLoading, currentChainTypes } = this.state;
		const account = identities[address];
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
				<Image
					source={ChainTypeBgWithoutShadows[currentTranslateIndex]}
					style={[styles.absoluteStart, { width: cardWidth, height: cardHeight, borderRadius: 15 }]}
				/>

				{canRemove && (
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
				)}

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
						<Text
							style={styles.accountName}
							allowFontScaling={false}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
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
							{address.substring(0, 6) + '...' + address.slice(-4)}
						</Text>
					</View>

					<View style={styles.chainTypeBaseWrap}>
						<ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
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
												{currentTranslateIndex === translateIndex
													? ChainTypeNames[translateIndex]
													: ''}
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

	tryBiometric = async () => {
		try {
			const credentials = await SecureKeychain.getGenericPassword();
			if (!credentials) return false;
		} catch (error) {
			return false;
		}
		return true;
	};

	checkBiometric = async () => {
		let hasCredentials = false;
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			let enabled = true;
			const previouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
			if (previouslyDisabled && previouslyDisabled === TRUE) {
				enabled = false;
			}
			try {
				if (enabled && !previouslyDisabled) {
					hasCredentials = await this.tryBiometric();
				}
			} catch (e) {
				util.logWarn('Login componentDidMount', e);
			}
		}
		return hasCredentials;
	};

	hideDeleteWalletModal = () => {
		this.setState({ deleteWalletModalVisible: false });
	};

	showDeleteWalletModal = () => {
		this.hideHeaderPopModal();
		this.setState({ deleteWalletModalVisible: true });
	};

	renderDeleteWallet = () => {
		const { deleteWalletModalVisible, walletSelectedName } = this.state;
		const { isLockScreen } = this.props;
		return (
			<Modal
				isVisible={deleteWalletModalVisible && !isLockScreen}
				onBackdropPress={this.hideDeleteWalletModal}
				onBackButtonPress={this.hideDeleteWalletModal}
				onSwipeComplete={this.hideDeleteWalletModal}
				swipeDirection={'down'}
				propagateSwipe
				style={styles.centerModal}
			>
				<KeyboardAvoidingView style={styles.modalRoot} behavior={'padding'}>
					<View style={styles.modalContainer2}>
						<Text style={styles.modalTitle}>
							{strings('wallet_management.delete_wallet', {
								name: walletSelectedName
							})}
						</Text>

						<Text style={styles.modalWarn}>{strings('wallet_management.delete_wallet_warn')}</Text>
						<View style={styles.modalButtons2}>
							<TouchableOpacity style={styles.cancelButton2} onPress={this.hideDeleteWalletModal}>
								<Text style={styles.cancelText2}>{strings('other.cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.okButton2} onPress={this.onWalletDelete}>
								<Text style={styles.okText2}>{strings('wallet_management.confirm_delete')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		);
	};

	onWalletDelete = async () => {
		const hasCredentials = await this.checkBiometric();
		if (hasCredentials) {
			this.setState({ deleteWalletModalVisible: false });
			this.removeWallet();
		} else if (Device.isAndroid()) {
			this.setState({
				deleteWalletModalVisible: false,
				checkPasswordModalVisible: true,
				wrongPwVisible: false,
				passwordValue: '',
				currentDeleteAccount: false
			});
		} else {
			this.setState({ deleteWalletModalVisible: false });
			setTimeout(
				() =>
					this.setState({
						checkPasswordModalVisible: true,
						wrongPwVisible: false,
						passwordValue: '',
						currentDeleteAccount: false
					}),
				1000
			);
		}
	};

	hideHeaderPopModal = () => {
		this.setState({ headerPopModalVisible: false });
	};

	toggleHeaderPopModal = async => {
		const { current } = this.headerButtonRef;
		current.measure((ox, oy, width, height, px, py) => {
			const statusBarHeight = StatusBar.currentHeight;
			const dis = Device.isAndroid() ? statusBarHeight : 0;
			this.setState({
				headerPopModalVisible: true,
				isWalletPop: false,
				headerIconRect: { x: px, y: py - dis, width, height }
			});
		});
	};

	renderHeaderPopModal = () => {
		const {
			headerPopModalVisible,
			headerIconRect,
			isWalletPop,
			walletSelectedIndex,
			walletSelectedType,
			walletSelectedName,
			walletMainAddress,
			walletSelectedCanRemove,
			renameWalletLoading
		} = this.state;
		const { isLockScreen, identities } = this.props;

		const wallet = identities[walletMainAddress];

		return (
			<Modal
				style={styles.margin0}
				transparent
				onRequestClose={this.hideHeaderPopModal}
				visible={headerPopModalVisible && !isLockScreen}
			>
				{/*<View style={{width: 200, height: 100, backgroundColor: colors.blue}}></View>*/}
				<Popover
					isVisible={headerPopModalVisible}
					fromRect={headerIconRect}
					onClose={this.hideHeaderPopModal}
					disX={-10}
				>
					{isWalletPop ? (
						<View style={styles.paddingVertical7}>
							<TouchableOpacity
								style={styles.walletPopItemButton}
								onPress={() => {
									this.hideHeaderPopModal();
									this.props.navigation.navigate('RevealPrivateCredential', {
										keyringIndex: walletSelectedIndex,
										walletName:
											walletSelectedName.length > 10
												? walletSelectedName.slice(0, 10) + '...'
												: walletSelectedName
									});
								}}
							>
								<Icon width="19" height="19" color={colors.$1A1A1A} name="visibility" />
								<Text style={styles.walletPopItemText}>
									{walletSelectedType === KeyringTypes.hd
										? strings('reveal_credential.seed_phrase_title')
										: strings('reveal_credential.private_key_title')}
								</Text>
							</TouchableOpacity>

							{walletSelectedType === KeyringTypes.hd && (
								<TouchableOpacity
									style={styles.walletPopItemButton}
									onPress={() => {
										this.hideHeaderPopModal();
										this.props.navigation.navigate('VerifySeedPhrase', {
											keyringIndex: walletSelectedIndex,
											walletName:
												walletSelectedName.length > 10
													? walletSelectedName.slice(0, 10) + '...'
													: walletSelectedName
										});
									}}
								>
									<Icon width="18" height="18" color={colors.$1A1A1A} name="shield" />
									<Text style={styles.walletPopItemText}>
										{strings('wallet_management.verify_seed_phrase')}
									</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={styles.walletPopItemButton}
								onPress={() => {
									if (!renameWalletLoading || renameWalletLoading === '') {
										this.onRenameWallet(wallet, walletSelectedIndex);
									}
								}}
							>
								<Icon width="18" height="18" color={colors.$1A1A1A} name="edit" />
								<Text style={styles.walletPopItemText}>
									{strings('wallet_management.rename_wallet')}
								</Text>
							</TouchableOpacity>
							{walletSelectedCanRemove && (
								<TouchableOpacity
									style={styles.walletPopItemButton}
									onPress={this.showDeleteWalletModal}
								>
									<Icon width="18" height="18" color={colors.$1A1A1A} name="trash" />
									<Text style={styles.walletPopItemText}>
										{strings('wallet_management.delete_this_wallet')}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					) : (
						<View>
							<TouchableOpacity
								style={styles.importPhraseButton}
								activeOpacity={0.7}
								onPress={this.onImportPhrase}
							>
								<Text style={styles.importPhraseButtonText}>
									{strings('wallet_management.import_seed_phrase')}
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.importPrivateKeyButton}
								onPress={this.onImportPrivateKey}
								activeOpacity={0.5}
							>
								<Text style={styles.importPrivateKeyButtonText}>
									{strings('wallet_management.import_private_key')}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.createWalletButton}
								onPress={this.onCreateWallet}
								activeOpacity={0.5}
							>
								<View style={styles.askBaseLayout}>
									<Text style={styles.createWalletButtonText}>
										{strings('wallet_management.create_new_wallet')}
									</Text>
									<TouchableOpacity
										style={styles.askButton}
										onPress={() => {
											this.showFaqModal();
										}}
									>
										<Image source={require('../../../images/ask.png')} />
									</TouchableOpacity>
								</View>
							</TouchableOpacity>
						</View>
					)}
				</Popover>
			</Modal>
		);
	};

	renderItem = (keyring, keyringIndex, canRemove) => {
		const { addAccountLoadingIndex } = this.state;
		const { identities } = this.props;
		const walletButtonRef = React.createRef();

		return (
			<ImageCapInset
				style={styles.cardWrapper}
				source={Device.isAndroid() ? { uri: 'default_card' } : require('../../../images/default_card.png')}
				capInsets={baseStyles.capInsets}
				key={'element-' + keyringIndex}
			>
				<View style={styles.childrenWrapper} activeOpacity={1}>
					<View style={styles.flexOne}>
						<View style={styles.rowFlex}>
							<View style={styles.rowFlex2}>
								<Text
									style={styles.walletTitle}
									allowFontScaling={false}
									numberOfLines={1}
									ellipsizeMode="tail"
								>
									{identities[keyring.accounts[0]] && identities[keyring.accounts[0]].walletName ? (
										identities[keyring.accounts[0]].walletName
									) : (
										<>
											{strings('wallet_management.wallet_index', {
												number: keyringIndex + 1
											})}
										</>
									)}
								</Text>
								{keyring && keyring.isImported && (
									<View style={styles.importedView}>
										<Text style={styles.importedText}>Imported</Text>
									</View>
								)}
							</View>

							<TouchableOpacity
								style={styles.walletMoreTouch}
								onPress={async () => {
									walletButtonRef?.current?.measure((ox, oy, width, height, px, py) => {
										const statusBarHeight = StatusBar.currentHeight;
										const dis = Device.isAndroid() ? statusBarHeight : 0;
										this.setState({
											headerPopModalVisible: true,
											isWalletPop: true,
											walletSelectedCanRemove: canRemove,
											walletSelectedIndex: keyringIndex,
											walletSelectedType: keyring.type,
											walletSelectedName: identities[keyring.accounts[0]].walletName
												? identities[keyring.accounts[0]].walletName
												: strings('wallet_management.wallet_index', {
														number: keyringIndex + 1
												  }),

											walletMainAddress: keyring.accounts[0],
											headerIconRect: { x: px, y: py - dis, width, height }
										});
									});
								}}
							>
								<Image source={require('../../../images/ic_defi_more.png')} ref={walletButtonRef} />
							</TouchableOpacity>
						</View>

						{keyring.accounts.map((address, index) =>
							this.renderAccountItem(address, index, keyring.accounts.length > 1 && index !== 0)
						)}

						{keyring.type === KeyringTypes.hd &&
							(addAccountLoadingIndex === keyringIndex ? (
								<View style={styles.accountItem}>
									<View
										style={[
											styles.absoluteStart,
											{
												width: cardWidth,
												height: cardHeight,
												backgroundColor: colors.brandPink50,
												borderRadius: 15
											}
										]}
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
										if (addAccountLoadingIndex < 0) {
											this.onAddAccount(keyringIndex);
										}
									}}
								>
									<View style={styles.accountItem}>
										<View
											style={[
												styles.absoluteStart,
												{
													width: cardWidth,
													height: cardHeight,
													backgroundColor: colors.brandPink50,
													borderRadius: 15
												}
											]}
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
												<Image
													style={styles.addButton}
													source={require('../../../images/ic_add_account.png')}
												/>
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
							))}
					</View>
				</View>
			</ImageCapInset>
		);
	};

	onCreateWallet = async () => {
		this.hideHeaderPopModal();
		this.props.navigation.navigate('DrawingGuideView', { fromWalletManager: true });
		return;
		// this.setState({ createWalletLoading: true });
		// await new Promise(resolve => setTimeout(() => resolve(true), 1));
		// const { KeyringController } = Engine.context;
		// await KeyringController.createNewVault();
		// this.setState({ createWalletLoading: false });
		// this.props.toggleShowHint(strings('manual_backup_step_2.wallet_create'));
	};

	onImportPhrase = () => {
		this.hideHeaderPopModal();
		this.props.navigation.navigate('ImportFromSeedView', { fromWalletManager: true });
	};

	onImportPrivateKey = () => {
		this.hideHeaderPopModal();
		this.props.navigation.navigate('ImportPrivateKeyView', { fromWalletManager: true });
	};

	showFaqModal = account => {
		this.hideHeaderPopModal();
		this.setState({ faqModalVisible: true });
	};

	hideFaqModal = account => {
		this.setState({ faqModalVisible: false });
	};

	renderFaqModal = () => (
		<Modal
			isVisible={this.state.faqModalVisible && !this.props.isLockScreen}
			onBackdropPress={this.hideFaqModal}
			onBackButtonPress={this.hideFaqModal}
			onSwipeComplete={this.hideFaqModal}
			swipeDirection={'down'}
			propagateSwipe
			style={styles.bottomModal}
		>
			<View>
				<View style={styles.faqWrapper}>
					<View style={styles.faqContainer}>
						<Text style={styles.faqTitle}>{strings('wallet_management.account_wallet_difference')}</Text>
						<Text style={styles.faqDesc}>
							{strings('wallet_management.account_wallet_difference_desc')}
						</Text>
						<Image source={require('../../../images/img_pop_wallet.png')} />
					</View>
				</View>
			</View>
		</Modal>
	);

	render = () => {
		const { keyrings } = this.props;
		const { createWalletLoading, error } = this.state;

		return (
			<SafeAreaView style={styles.wrapper} testID={'wallet-management-screen'}>
				<MStatusBar navigation={this.props.navigation} fixPadding={false} />
				<View style={styles.headerStyle}>
					<TouchableOpacity
						onPress={() => this.props.navigation.pop()}
						style={styles.backButton}
						testID={'edit-contact-back-button'}
					>
						<IonicIcon
							name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
							size={Device.isAndroid() ? 24 : 28}
							style={styles.backIcon}
						/>
					</TouchableOpacity>
					<Text style={styles.headerLabelStyle}>{strings(`wallet_management.title`)}</Text>
					{createWalletLoading ? (
						<View style={styles.backButton}>
							<ActivityIndicator size="small" color="#FE6E91" />
						</View>
					) : (
						<TouchableOpacity onPress={this.toggleHeaderPopModal} style={styles.backButton}>
							<Image source={require('../../../images/ic_wallet_add.png')} ref={this.headerButtonRef} />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.flexOne}>
					<View style={styles.rowWrapper}>
						<ScrollView
							style={styles.flexOne}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<View style={styles.scrollViewContent}>
								{keyrings.map((keyring, index) => this.renderItem(keyring, keyring.index, true))}
							</View>
						</ScrollView>
					</View>
					{this.renderRenameAccount()}
					{this.renderRenameWallet()}
					{this.renderDeleteAccount()}
					{this.renderDeleteWallet()}
					{this.renderCheckPassword()}
					{this.renderFaqModal()}
					{this.renderHeaderPopModal()}
					<PromptView
						isVisible={error != null}
						title={strings('wallet_management.add_new_account')}
						message={error}
						onRequestClose={() => {
							this.setState({ error: null });
						}}
					/>
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
	isLockScreen: state.settings.isLockScreen
});

const mapDispatchToProps = dispatch => ({
	toggleShowHint: hintText => dispatch(toggleShowHint(hintText))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(WalletManagement);
