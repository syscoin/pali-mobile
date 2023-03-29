import React, { useMemo } from 'react';

import AccountSettings from '../../../images/svg/account_settings.svg';
import Coin from '../../../images/svg/coin.svg';
import Globe from '../../../images/svg/globe.svg';
import NFT from '../../../images/svg/nft.svg';
import Settings from '../../../images/svg/settings.svg';
import Visibility from '../../../images/svg/visibility.svg';
import VisibilityOff from '../../../images/svg/visibilityOff.svg';
import Wallet from '../../../images/svg/wallet.svg';

const icons = {
	accountSettings: AccountSettings,
	coin: Coin,
	nft: NFT,
	globe: Globe,
	settings: Settings,
	visibility: Visibility,
	visibilityOff: VisibilityOff,
	wallet: Wallet
};

const Icon = _props => {
	const SelectedIcon = useMemo(() => icons[_props.name], [_props.name]);
	return <SelectedIcon {..._props} />;
};

export default Icon;
