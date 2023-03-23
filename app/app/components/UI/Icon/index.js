import React, { useMemo } from 'react';

import NFT from '../../../images/svg/nft.svg';
import Coin from '../../../images/svg/coin.svg';
import Visibility from '../../../images/svg/visibility.svg';
import VisibilityOff from '../../../images/svg/visibilityOff.svg';

const icons = {
	nft: NFT,
	coin: Coin,
	visibility: Visibility,
	visibilityOff: VisibilityOff
};

const Icon = _props => {
	const SelectedIcon = useMemo(() => icons[_props.name], [_props.name]);
	return <SelectedIcon {..._props} />;
};

export default Icon;
