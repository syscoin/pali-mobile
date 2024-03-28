import React from 'react';
import { Image, View, Text } from 'react-native';
import { colors, fontStyles } from '../styles/common';
import { util } from 'paliwallet-core';
import { getRpcNickname } from './ControllerUtils';

const letters = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'z',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'w',
	'x',
	'y',
	'z'
];

const ic_card = [
	require('../images/letter/card/ic_card_a.png'),
	require('../images/letter/card/ic_card_b.png'),
	require('../images/letter/card/ic_card_c.png'),
	require('../images/letter/card/ic_card_d.png'),
	require('../images/letter/card/ic_card_e.png'),
	require('../images/letter/card/ic_card_f.png'),
	require('../images/letter/card/ic_card_g.png'),
	require('../images/letter/card/ic_card_h.png'),
	require('../images/letter/card/ic_card_i.png'),
	require('../images/letter/card/ic_card_j.png'),
	require('../images/letter/card/ic_card_k.png'),
	require('../images/letter/card/ic_card_l.png'),
	require('../images/letter/card/ic_card_m.png'),
	require('../images/letter/card/ic_card_n.png'),
	require('../images/letter/card/ic_card_o.png'),
	require('../images/letter/card/ic_card_p.png'),
	require('../images/letter/card/ic_card_q.png'),
	require('../images/letter/card/ic_card_r.png'),
	require('../images/letter/card/ic_card_s.png'),
	require('../images/letter/card/ic_card_t.png'),
	require('../images/letter/card/ic_card_u.png'),
	require('../images/letter/card/ic_card_v.png'),
	require('../images/letter/card/ic_card_w.png'),
	require('../images/letter/card/ic_card_x.png'),
	require('../images/letter/card/ic_card_y.png'),
	require('../images/letter/card/ic_card_z.png')
];

const ic_tag = [
	require('../images/letter/tag/ic_a_tag.png'),
	require('../images/letter/tag/ic_b_tag.png'),
	require('../images/letter/tag/ic_c_tag.png'),
	require('../images/letter/tag/ic_d_tag.png'),
	require('../images/letter/tag/ic_e_tag.png'),
	require('../images/letter/tag/ic_f_tag.png'),
	require('../images/letter/tag/ic_g_tag.png'),
	require('../images/letter/tag/ic_h_tag.png'),
	require('../images/letter/tag/ic_i_tag.png'),
	require('../images/letter/tag/ic_j_tag.png'),
	require('../images/letter/tag/ic_k_tag.png'),
	require('../images/letter/tag/ic_l_tag.png'),
	require('../images/letter/tag/ic_m_tag.png'),
	require('../images/letter/tag/ic_n_tag.png'),
	require('../images/letter/tag/ic_o_tag.png'),
	require('../images/letter/tag/ic_p_tag.png'),
	require('../images/letter/tag/ic_q_tag.png'),
	require('../images/letter/tag/ic_r_tag.png'),
	require('../images/letter/tag/ic_s_tag.png'),
	require('../images/letter/tag/ic_t_tag.png'),
	require('../images/letter/tag/ic_u_tag.png'),
	require('../images/letter/tag/ic_v_tag.png'),
	require('../images/letter/tag/ic_w_tag.png'),
	require('../images/letter/tag/ic_x_tag.png'),
	require('../images/letter/tag/ic_y_tag.png'),
	require('../images/letter/tag/ic_z_tag.png')
];

export default function subFirstStr(name) {
	if (name && name.length > 0) {
		const ch = name.substring(0, 1);
		if (letters.findIndex(l => l === ch.toLowerCase()) !== -1) {
			return ch.toLowerCase();
		}
	}
	return '';
}

export function getRpcName(chainType) {
	const text = getRpcNickname(chainType) || '';
	return text;
}

export function getRpcFirstLetter(chainType) {
	const text = getRpcName(chainType);
	return subFirstStr(text);
}

export function getColor(letter) {
	letter = letter.toLowerCase();
	if (letter === 'a' || letter === 'g' || letter === 'm' || letter === 'f') {
		return '#FFAE05';
	} else if (letter === 'b' || letter === 'h' || letter === 'n' || letter === 't') {
		return '#894AF3';
	} else if (letter === 'c' || letter === 'i' || letter === 'o' || letter === 'u') {
		return '#1EA8FF';
	} else if (letter === 'd' || letter === 'h' || letter === 'p' || letter === 'v' || letter === 'z') {
		return '#1EA8FF';
	} else if (letter === 'e' || letter === 'k' || letter === 'q' || letter === 'w') {
		return '#FF0013';
	} else if (letter === 'f' || letter === 'l' || letter === 'r' || letter === 'x' || letter === 'y') {
		return '#627EEA';
	}
	return '#737EFF';
}

export function getLetterIndex(letter) {
	if (letter) {
		return letters.findIndex(l => l === letter.toLowerCase());
	}
	return -1;
}

export function getTagColor(chainType) {
	const letter = getRpcFirstLetter(chainType);
	return getColor(letter);
}

export function getIcCardResource(chainType) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (index !== -1) {
		return ic_card[index];
	}
	return require('../images/letter/card/ic_card_other.png');
}

export function getIcLogoResource(chainType) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (index !== -1) {
		return ic_tag[index];
	}
	return require('../images/ic_other_logo.png');
}

export function getIcTagResource(chainType) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (index !== -1) {
		return ic_tag[index];
	}
	return require('../images/letter/tag/ic_other_tag.png');
}

export function getDefiIcon(chainType) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (index === -1) {
		// eslint-disable-next-line react/react-in-jsx-scope
		return <Image source={require('../images/letter/ic_defi_other.png')} />;
	}
	return (
		<View
			/* eslint-disable react-native/no-inline-styles */
			style={{
				width: 24,
				height: 24,
				backgroundColor: getColor(letter),
				borderRadius: 24,
				justifyContent: 'center',
				alignItems: 'center'
			}}
		>
			<Text style={{ fontSize: 14, color: colors.white }} allowFontScaling={false}>
				{letter.toUpperCase()}
			</Text>
		</View>
	);
}

export function getMoreIcon(chainType, isDarkMode = false) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (index === -1) {
		return <Image source={require('../images/letter/ic_card_more_other.png')} />;
	}
	return (
		<View
			style={{
				width: 16,
				height: 16,
				borderWidth: 1.5,
				borderColor: isDarkMode ? colors.white : colors.$333333,
				borderRadius: 16,
				justifyContent: 'center',
				alignItems: 'center'
			}}
		>
			<Text
				style={{ fontSize: 8, color: isDarkMode ? colors.white : colors.$333333, ...fontStyles.semibold }}
				allowFontScaling={false}
			>
				{letter.toUpperCase()}
			</Text>
		</View>
	);
}

export function getOnGoingIcon(style, chainType) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (index === -1) {
		return <Image style source={require('../images/img_ongoing_other.png')} />;
	}
	return (
		<View style={[style, { opacity: 0.1 }]}>
			<Text style={{ fontSize: 110, color: getColor(letter), ...fontStyles.semibold }} allowFontScaling={false}>
				{letter.toUpperCase()}
			</Text>
		</View>
	);
}

export function getAssetIcon(chainType, width, height) {
	const letter = getRpcFirstLetter(chainType);
	const index = getLetterIndex(letter);
	if (!width || !height) {
		width = 46;
		height = 46;
	}
	if (index === -1) {
		return <Image style={{ width, height }} source={require('../images/letter/img_asset_other.png')} />;
	}
	const fontSize = ((width * 1.0) / 46) * 28;
	return (
		<View
			style={{
				width,
				height,
				backgroundColor: getColor(letter),
				borderRadius: width,
				justifyContent: 'center',
				alignItems: 'center'
			}}
		>
			<Text style={{ fontSize, color: colors.white }} allowFontScaling={false}>
				{letter.toUpperCase()}
			</Text>
		</View>
	);
}

export function getIsRpc(chainType) {
	return util.isRpcChainType(chainType);
}
