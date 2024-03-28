import React, { PureComponent } from 'react';
import { TextInput, View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { queryContractMap } from '../../../data/ContractData';
import { isSmartContractAddress } from '../../../util/transactions';
import Engine from '../../../core/Engine';
import { ChainType, isValidAddress, util } from 'paliwallet-core';
import { getAssetLogo } from '../../../util/number';
import { logDebug } from 'paliwallet-core/dist/util';
import { getSecurityData } from '../../../util/security';
import { ThemeContext } from '../../../theme/ThemeProvider';
import AntIcon from 'react-native-vector-icons/AntDesign';

const styles = StyleSheet.create({
	searchSection: {
		marginHorizontal: 20,
		marginVertical: 10,
		height: 42,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 6,
		borderColor: colors.transparent,
		backgroundColor: colors.$F5F5F5
	},
	shadowDark: {
		shadowColor: colors.paliBlue100
	},
	textInput: {
		flex: 1,
		marginLeft: 9,
		marginRight: 5,
		...fontStyles.normal
	},
	searchIcon: {
		marginLeft: 15
	},
	touchPadding: {
		padding: 10,
		paddingRight: 15
	}
});

/**
 * PureComponent that provides ability to search assets.
 */
export default class SearchView extends PureComponent {
	state = {
		searchQuery: ''
	};
	static contextType = ThemeContext;

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		onSearch: PropTypes.func,
		onLoading: PropTypes.func,
		contactEntry: PropTypes.object
	};

	validateCustomTokenAddress = async (address, chainType) => {
		let validated = true;
		const isValidTokenAddress = isValidAddress(address);
		const toSmartContract = isValidTokenAddress && (await isSmartContractAddress(address, chainType));
		if (address.length === 0) {
			validated = false;
		} else if (!isValidTokenAddress) {
			validated = false;
		} else if (!toSmartContract) {
			validated = false;
		}
		return validated;
	};

	validateCustomTokenSymbol = symbol => {
		let validated = true;
		if (symbol.length === 0) {
			validated = false;
		}
		return validated;
	};

	validateCustomTokenDecimals = decimals => {
		let validated = true;
		if (decimals.length === 0) {
			validated = false;
		}
		return validated;
	};

	inLocalResult = (addressArray, address) => {
		const ret = addressArray.find(addr => util.toLowerCaseEquals(addr, address));
		return ret;
	};

	addSecurityTokens = async tokenList => {
		if (tokenList.length === 0) {
			return;
		}
		for (const asset of tokenList) {
			asset.logo = await getAssetLogo({
				type: asset.type,
				address: asset.address,
				l1Address: asset.l1Address
			});

			const securityData = getSecurityData(asset);
			const { normal, notice, risk } = securityData;
			const normalLength = normal ? normal.length : 0;
			const noticeLength = notice ? notice.length : 0;
			const riskLength = risk ? risk.length : 0;
			asset.securityData = { ...securityData, normalLength, noticeLength, riskLength };
		}
	};

	sortResult = result => {
		result.sort((a, b) =>
			a.riskLength !== b.riskLength
				? b.riskLength - a.riskLength
				: a.noticeLength !== b.noticeLength
				? b.noticeLength - a.noticeLength
				: a.normalLength !== b.normalLength
				? b.normalLength - a.normalLength
				: a.type - b.type
		);
	};

	handleSearch = async searchQuery => {
		this.setState({ searchQuery });
		if (searchQuery) {
			this.props.onLoading(searchQuery);
		} else {
			this.props.onSearch({ searchQuery, results: [] });
		}
		const { enabledChains } = this.props.contactEntry || {};

		const { queryAddress, querySymbol } = await queryContractMap(enabledChains, searchQuery, true, 10);
		let results = [...querySymbol, ...queryAddress];

		//不是合约就没必要往下执行了
		if (!isValidAddress(searchQuery)) {
			if (results.length > 0) {
				await this.addSecurityTokens(results);
				this.sortResult(results);
			}
			this.props.onSearch({ searchQuery, results });
			return;
		}

		const chainSearchResult = [];
		for (const type in Engine.networks) {
			const chainType = Number(type);
			if (chainType === ChainType.RPCBase) {
				continue;
			}
			if (!enabledChains.includes(chainType)) {
				continue;
			}
			const addressArray = results.filter(token => token.type === chainType).map(token => token.address);

			if (this.inLocalResult(addressArray, searchQuery)) {
				continue;
			}
			if (chainType === ChainType.Arbitrum) {
				const arbContract = Engine.contracts[ChainType.Arbitrum];
				let success = false;
				let address = searchQuery;
				let l1Address = '';
				let decimals;
				let symbol;
				try {
					const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Arbitrum);
					if (validated) {
						decimals = await arbContract.getTokenDecimals(searchQuery);
						symbol = await arbContract.getAssetSymbol(searchQuery);
						l1Address = await arbContract.calculateL1ERC20Address(address);
						success = true;
					}
				} catch (e2) {
					util.logDebug('handleSearch arb failed with error=', e2);
				}
				if (!success) {
					try {
						const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Ethereum);
						if (validated) {
							const l2Address = await arbContract.calculateL2ERC20Address(searchQuery);
							if (l2Address) {
								decimals = await arbContract.getTokenDecimals(l2Address);
								symbol = await arbContract.getAssetSymbol(l2Address);
								address = l2Address;
								l1Address = searchQuery;
							}
						}
					} catch (e3) {
						util.logDebug('handleSearch arb failed with error=', e3);
					}
				}
				if (decimals && symbol) {
					chainSearchResult.push({
						address,
						l1Address,
						decimals,
						symbol,
						realSymbol: symbol,
						type: ChainType.Arbitrum
					});
				}
			} else {
				try {
					const validated = await this.validateCustomTokenAddress(searchQuery, chainType);
					if (validated) {
						const decimals = await Engine.contracts[chainType].getTokenDecimals(searchQuery);
						const symbol = await Engine.contracts[chainType].getAssetSymbol(searchQuery);
						if (decimals && symbol) {
							chainSearchResult.push({
								address: searchQuery,
								decimals,
								symbol,
								type: chainType
							});
						}
					}
				} catch (e1) {
					util.logDebug('handleSearch eth failed with error=', e1);
				}
			}
		}

		const rpcChain = enabledChains.filter(chainType => util.isRpcChainType(chainType));
		for (let i = 0; i < rpcChain.length; i++) {
			const currentChainType = rpcChain[i];
			try {
				const working = await Engine.networks[ChainType.RPCBase].checkNetwork(currentChainType);
				if (!working) {
					continue;
				}
				const validated = await this.validateCustomTokenAddress(searchQuery, currentChainType);
				if (!validated) {
					continue;
				}
				const decimals = await Engine.contracts[ChainType.RPCBase].callContract(
					currentChainType,
					'getTokenDecimals',
					searchQuery
				);
				const symbol = await Engine.contracts[ChainType.RPCBase].callContract(
					currentChainType,
					'getAssetSymbol',
					searchQuery
				);
				if (decimals && symbol) {
					chainSearchResult.push({ address: searchQuery, decimals, symbol, type: currentChainType });
				}
			} catch (error) {
				logDebug('search rpc error --> ', error);
			}
		}

		results = [...results, ...chainSearchResult];
		if (results.length > 0) {
			this.sortResult(results);
			await this.addSecurityTokens(results);
		}
		this.props.onSearch({ searchQuery, results });
	};

	updateNum = newText => {
		let text = newText ? newText.replace(/\s/g, '') : '';
		text = text.replace(/\n/g, '');
		if (this.state.searchQuery !== text) {
			this.handleSearch(text);
		}
	};

	deleteInput = () => {
		this.handleSearch('');
		this.props.onSearch({ searchQuery: '', results: [] });
	};

	render = () => {
		const { searchQuery } = this.state;
		const { isDarkMode } = this.context;
		return (
			<View
				style={[
					styles.searchSection,
					isDarkMode && baseStyles.subTextDark,
					isDarkMode && baseStyles.darkInputBackground,
					isDarkMode && { borderColor: colors.white016 },
					isDarkMode && styles.shadowDark
				]}
				testID={'add-searched-token-screen'}
			>
				<AntIcon
					size={18}
					color={isDarkMode ? colors.paliBlue100 : colors.paliGrey200}
					name="search1"
					style={styles.searchIcon}
				/>
				<TextInput
					style={styles.textInput}
					value={searchQuery}
					placeholder={strings('token.search_tokens_or_contract')}
					placeholderTextColor={isDarkMode ? colors.paliGrey200 : colors.$80000000}
					onChangeText={newText => this.updateNum(newText)}
					testID={'input-search-asset'}
					fontSize={13}
					color={isDarkMode ? colors.white : colors.black}
				/>

				<Text>{this.input && this.input.current && this.input.current.value}</Text>
				{!(searchQuery === '') && (
					<TouchableOpacity style={styles.touchPadding} onPress={this.deleteInput}>
						<Image source={require('../../../images/search_clear.png')} />
					</TouchableOpacity>
				)}
			</View>
		);
	};
}
