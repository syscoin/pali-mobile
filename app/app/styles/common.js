/**
 * Common styles and variables
 */

import Device from '../util/Device';

/**
 * Map of color names to HEX values
 */
export const colors = {
	fontPrimary: '#141414',
	fontSecondary: '#777777',
	fontTertiary: '#AAAAAA',
	fontError: '#D73A49',
	fontWarning: '#f66a0a',
	primaryFox: '#f66a0a',
	black: '#000000',

	white: '#FFFFFF',
	white100: '#F9FAFB',
	paliGrey100: '#F9F9F9',
	paliGrey200: '#A2A5AB',
	paliGrey300: '#808795',
	grey450: '#8E8E93',
	grey700: '#3C3F42',
	grey600: '#736F73',
	grey500: '#6a737d',
	grey400: '#848c96',
	grey300: '#9fa6ae',
	grey200: '#bbc0c5',
	grey100: '#d6d9dc',
	grey050: '#D8D8D8',
	grey000: '#f2f3f4',
	greytransparent: 'rgba(36, 41, 46, 0.6)',
	grey: '#333333',
	red: '#D73A49',
	red000: '#fcf2f3',
	paliBlue100: '#C9DEFF',
	paliBlue400: '#4D76B8',
	paliBlue900: '#061120',
	blue: '#037dd6',
	blue000: '#eaf6ff',
	blue200: '#75C4FD',
	blue500: '#1097FB',
	blue600: '#0260A4',
	blue700: '#0074C8',
	deepBlue200: '#A0B1D1',
	deepBlue400: '#677CA1',
	deepBlue800: '#223552',

	greenModal100: '#83B100',
	greenModal200: '#83B200',
	green600: '#1e7e34',
	green500: '#28a745',
	green400: '#28A745',
	green300: '#86e29b',
	green200: '#afecbd',
	green100: '#e6f9ea',
	yellow: '#FFD33D',
	yellow700: '#705700',
	yellow200: '#ffe281',
	yellow300: '#FFD33D',
	yellow100: '#fffcdb',
	orange: '#f66a0a',
	orange300: '#faa66c',
	orange000: '#fef5ef',
	brandPink50: '#FFE1ED',
	brandPink300: '#ff3E92',
	brandPink500: '#FA005D',
	brandBlue900: '#335e84',
	brandBlue800: '#07152A',
	brandBlue700: '#111E33',
	brandBlue600: '#162742',
	brandBlue500: '#1E365C',
	brandBlue400: '#4da2cf',
	spinnerColor: '#037DD6',
	success: '#219E37',
	dimmed: '#00000080',
	transparent: 'transparent',
	buttonDisabled: 'rgba(255, 62, 145, 0.5)',
	lightOverlay: 'rgba(0,0,0,.2)',
	overlay: 'rgba(0,0,0,.5)',
	darkAlert: 'rgba(0,0,0,.75)',
	normalAlert: 'rgba(55,55,55,.97)',
	spinnerBackground: `rgba(185, 156, 171, 0.396)`,
	$8F92A1Alpha: `rgba(143, 146, 161, 0.24)`,
	$8F92A1: '#8F92A1',
	$8F92A13D: '#8F92A13D',
	$1A1A1A: '#1A1A1A',
	$030319: '#030319',
	$DCDCDC: '#DCDCDC',
	$F5F5F5: '#F5F5F5',
	$404040: '#404040',
	$4040407F: '#4040407F',
	$202020: '#202020',
	$343434: '#343434',
	$888888: '#888888',
	$9B989B: '#9B989B',
	$4CD964: '#4CD964',
	$4CA1CF: '#4CA1CF',
	$D20058: '#D20058',
	blackAlpha200: 'rgba(0, 0, 0, 0.08)',
	blackAlpha300: 'rgba(0, 0, 0, 0.16)',
	brandPink300Alpha: 'rgba(254, 110, 145, 0.14)',
	brandPink300Alpha3: 'rgba(254, 110, 145, 0.3)',
	brandPink30026: '#FE6E9126',
	brandPink3001A: '#FE6E911A',
	$8C9CDA: '#8C9CDA',
	$F7F7F7: '#F7F7F7',
	$BEBEBE: '#BEBEBE',
	$505050: '#505050',
	$00BB8E: '#00BB8E',
	$2CCFAA: '#2CCFAA',
	$B5B5B5: '#B5B5B5',
	$A6A6A6: '#A6A6A6',
	$01BF84: '#01BF84',
	$FC6564: '#FC6564',
	$356BF8: '#356BF8',
	$E6E6E6: '#E6E6E6',
	$E2E2E2: '#E2E2E2',
	searchHint: 'rgba(0,0,0,.5)',
	$BEC8CE: '#BEC8CE',
	$FF9B13: '#FF9B13',
	$3E4654: '#3E4654',
	$F0F0F0: '#F0F0F0',
	$19191996: '#19191996',
	borderColor: 'rgba(0,0,0,.01)',
	$60657D: '#60657D',
	$B8B4BF: '#B8B4BF',
	$333333: '#333333',
	$FFFFFFC0: '#FFFFFFC0',
	$19C54C: '#19C54C',
	$069531: '#069531',
	$F6F6F6: '#F6F6F6',
	$C8C8C8: '#C8C8C8',
	$A5A5A5: '#A5A5A5',
	$3AFFCF: '#3AFFCF',
	$2CBDA9: '#2CBDA9',
	$1E1F20: '#1E1F20',
	$ECE4FF: '#ECE4FF',
	$666666: '#666666',
	$08C2AB: '#08C2AB',
	$F7A93E: '#F7A93E',
	$4F7EED: '#4F7EED',
	$1E1E1E: '#1E1E1E',
	$34C738: '#34C738',
	$B9BDCD: '#B9BDCD',
	$09C285: '#09C285',
	securityBg: 'rgba(255,255,255,.2)',
	securityDangerBg: '#FEEFEF',
	securityWarningBg: '#FFF7E5',
	$FF9E9E: '#FF9E9E',
	$FFB653: '#FFB653',
	$FF5454: '#FF5454',
	$E37A00: '#E37A00',
	$3EC6FF: '#3EC6FF',
	$FFB000: '#FFB000',
	$FF6C79: '#FF6C79',
	$FFA000: '#FFA000',
	$74788D: '#74788D',
	$FF820C: '#FF820C',
	$FF894B: '#FF894B',
	$5772FF: '#5772FF',
	$94A5F9: '#94A5F9',
	$F66564: '#F66564',
	$627EEA: '#627EEA',
	$FFAD00: '#FFAD00',
	$FAFAFA: '#FAFAFA',
	$8247E5: '#8247E5',
	$23A1F0: '#23A1F0',
	$F3F3F3: '#F3F3F3',
	$999999: '#999999',
	white05: 'rgba(255,255,255,.5)',
	white08: 'rgba(255,255,255,.8)',
	$EFEFEF: '#EFEFEF',
	loaderOverlay: 'rgba(0,0,0,.3)',
	white06: 'rgba(255,255,255,.6)',
	white02: 'rgba(255,255,255,.2)',
	white016: 'rgba(255, 255, 255, 0.16)',
	black02: 'rgba(0,0,0,.2)',
	$FEFEFE: '#FEFEFE',
	$F9F9F9: '#F9F9F9',
	$32C98A: '#32C98A',
	$FFE8C5: '#FFE8C5',
	$F8B671: '#F8B671',
	$C46A4F: '#C46A4F',
	$3D5BFF: '#3D5BFF',
	$4D76B8: '#4D76B8',
	$514570: '#514570',
	errorBg: 'rgba(252, 101, 100, .1)',
	correctBg: 'rgba(9, 194, 133, .1)',
	$E1E3E8: '#E1E3E8',
	$5092FF1F: '#5092FF1F',
	$ccc: '#ccc',
	$5092FF: '#5092FF',
	$F8F8F8: '#F8F8F8',
	$3C3D40: '#3C3D40',
	$FFFFFFB5: '#FFFFFFB5',
	$FFE1CE: '#FFE1CE',
	$C4C5CD: '#C4C5CD',
	famousTwitterBg: '#00000059',
	famousTagBg: '#00000040',
	watchFamousTwitterBg: '#5092FF17',
	$DADFE3A8: '#DADFE3A8',
	$F1D3C29E: '#F1D3C29E',
	$D38D69: '#D38D69',
	$FFB00030: '#FFB00030',
	$E9ECF1: '#E9ECF1'
};

/**
 * Map of reusable base styles
 */
export const baseStyles = {
	flex3: {
		flex: 3
	},
	flex2: {
		flex: 2
	},
	flexGrow: {
		flex: 1
	},
	flexStatic: {
		flex: 0
	},
	darkCancelButton: { borderColor: colors.white, color: 'white' },
	darkConfirmButton: {
		borderColor: colors.white,
		backgroundColor: colors.white,
		color: colors.$4CA1CF
	},
	darkConfirmText: {
		color: colors.$4CA1CF
	},
	darkBackground: {
		backgroundColor: colors.brandBlue700
	},
	darkInputBackground: {
		backgroundColor: colors.brandBlue800
	},
	darkModalBackground: {
		backgroundColor: colors.paliBlue900
	},
	darkBackground600: {
		backgroundColor: colors.brandBlue600
	},
	darkCardBackground: {
		backgroundColor: colors.brandBlue500
	},
	darkActionBackground: {
		backgroundColor: colors.deepBlue800
	},
	lightBlueBackground: {
		backgroundColor: colors.$4CA1CF
	},
	textDark: { color: 'white' },
	subTextDark: { color: colors.paliGrey200 },
	shadow: {
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 7
	},
	input: {
		marginTop: 2,
		fontSize: 13,
		paddingVertical: 12,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderColor: colors.$F0F0F0,
		color: colors.$030319
	},
	capInsets: {
		top: 32,
		left: 32,
		bottom: 32,
		right: 32
	}
};

/**
 * Map of reusable fonts
 */
export const fontStyles = {
	normal: {
		fontWeight: 'normal',
		fontFamily: 'Poppins'
	},
	medium: {
		fontWeight: Device.isAndroid() ? 'bold' : '500',
		fontFamily: 'Poppins'
	},
	semibold: {
		fontWeight: Device.isAndroid() ? 'bold' : '600',
		fontFamily: 'Poppins'
	},
	bold: {
		fontWeight: 'bold',
		fontFamily: 'Poppins'
	}
};

export const activeOpacity = 0.8;
