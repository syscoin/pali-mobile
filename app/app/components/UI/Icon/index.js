import React, { useMemo } from 'react';

import AccountSettings from '../../../images/svg/account_settings.svg';
import Back from '../../../images/svg/back.svg';
import Broom from '../../../images/svg/broom.svg';
import Coin from '../../../images/svg/coin.svg';
import CheckCircle from '../../../images/svg/check_circle.svg';
import Edit from '../../../images/svg/edit.svg';
import FaceId from '../../../images/svg/face_id.svg';
import Fingerprint from '../../../images/svg/fingerprint.svg';
import Globe from '../../../images/svg/globe.svg';
import Home from '../../../images/svg/ic_home.svg';
import NFT from '../../../images/svg/nft.svg';
import Menu from '../../../images/svg/menu.svg';
import Moon from '../../../images/svg/ic_moon.svg';
import Order from '../../../images/svg/order.svg';
import PrivateKey from '../../../images/svg/private_key.svg';
import Sun from '../../../images/svg/ic_sun.svg';
import Sapling from '../../../images/svg/sapling.svg';
import Settings from '../../../images/svg/settings.svg';
import Shield from '../../../images/svg/shield.svg';
import Trash from '../../../images/svg/trash.svg';
import Visibility from '../../../images/svg/visibility.svg';
import VisibilityOff from '../../../images/svg/visibilityOff.svg';
import Wallet from '../../../images/svg/wallet.svg';
import WalletOutline from '../../../images/svg/wallet_outline.svg';
import CoinGecko from '../../../images/svg/coingecko-logo.svg';

const icons = {
	accountSettings: AccountSettings,
	back: Back,
	broom: Broom,
	coin: Coin,
	checkCircle: CheckCircle,
	edit: Edit,
	fingerprint: Fingerprint,
	faceId: FaceId,
	globe: Globe,
	home: Home,
	nft: NFT,
	menu: Menu,
	moon: Moon,
	order: Order,
	privateKey: PrivateKey,
	sun: Sun,
	sapling: Sapling,
	settings: Settings,
	shield: Shield,
	trash: Trash,
	visibility: Visibility,
	visibilityOff: VisibilityOff,
	wallet: Wallet,
	walletOutline: WalletOutline,
	coinGecko: CoinGecko
};

const Icon = _props => {
	const SelectedIcon = useMemo(() => icons[_props.name], [_props.name]);
	return <SelectedIcon {..._props} />;
};

export default Icon;
