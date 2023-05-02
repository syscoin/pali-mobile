import React, { useMemo } from 'react';

import AccountSettings from '../../../images/svg/account_settings.svg';
import Coin from '../../../images/svg/coin.svg';
import Edit from '../../../images/svg/edit.svg';
import Globe from '../../../images/svg/globe.svg';
import NFT from '../../../images/svg/nft.svg';
import Settings from '../../../images/svg/settings.svg';
import Shield from '../../../images/svg/shield.svg';
import Trash from '../../../images/svg/trash.svg';
import Visibility from '../../../images/svg/visibility.svg';
import VisibilityOff from '../../../images/svg/visibilityOff.svg';
import Wallet from '../../../images/svg/wallet.svg';

const icons = {
	accountSettings: AccountSettings,
	coin: Coin,
	edit: Edit,
	globe: Globe,
	nft: NFT,
	settings: Settings,
	shield: Shield,
	trash: Trash,
	visibility: Visibility,
	visibilityOff: VisibilityOff,
	wallet: Wallet
};

const Icon = _props => {
	const SelectedIcon = useMemo(() => icons[_props.name], [_props.name]);
	return <SelectedIcon {..._props} />;
};

export default Icon;
