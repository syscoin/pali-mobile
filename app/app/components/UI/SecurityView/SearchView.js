import React, { PureComponent } from 'react';
import { TextInput, View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { queryContractMap } from '../../../data/ContractData';
import { isSmartContractAddress } from '../../../util/transactions';
import Engine from '../../../core/Engine';
import { ChainType, isValidAddress, util } from 'gopocket-core';
import { getAssetLogo } from '../../../util/number';
import { logDebug } from 'gopocket-core/dist/util';
import { getSecurityData } from '../../../util/security';

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
		const {
			AssetsContractController,
			BscContractController,
			PolygonContractController,
			ArbContractController,
			HecoContractController,
			OpContractController,
			AvaxContractController,
			SyscoinContractController,
			RpcNetworkController,
			RpcContractController
		} = Engine.context;

		const { queryAddress, querySymbol } = await queryContractMap(enabledChains, searchQuery, true, 10);
		let results = [...querySymbol, ...queryAddress];
		const arbAddressArray = results.filter(token => token.type === ChainType.Arbitrum).map(token => token.address);
		const bscAddressArray = results.filter(token => token.type === ChainType.Bsc).map(token => token.address);
		const ethAddressArray = results.filter(token => token.type === ChainType.Ethereum).map(token => token.address);
		const polyAddressArray = results.filter(token => token.type === ChainType.Polygon).map(token => token.address);
		const hecoAddressArray = results.filter(token => token.type === ChainType.Heco).map(token => token.address);
		const opAddressArray = results.filter(token => token.type === ChainType.Optimism).map(token => token.address);
		const avaxAddressArray = results.filter(token => token.type === ChainType.Avax).map(token => token.address);
		const syscoinAddressArray = results
			.filter(token => token.type === ChainType.Syscoin)
			.map(token => token.address);

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
		// Ethereum
		if (enabledChains.includes(ChainType.Ethereum) && !this.inLocalResult(ethAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Ethereum);
				if (validated) {
					const decimals = await AssetsContractController.getTokenDecimals(searchQuery);
					const symbol = await AssetsContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Ethereum });
						ethAddressArray.push(searchQuery);
					}
				}
			} catch (e1) {
				util.logDebug('handleSearch eth failed with error=', e1);
			}
		}
		//Arbitrum
		if (enabledChains.includes(ChainType.Arbitrum) && !this.inLocalResult(arbAddressArray, searchQuery)) {
			let success = false;
			let address = searchQuery;
			let l1Address = '';
			let decimals;
			let symbol;
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Arbitrum);
				if (validated) {
					decimals = await ArbContractController.getTokenDecimals(searchQuery);
					symbol = await ArbContractController.getAssetSymbol(searchQuery);
					l1Address = await ArbContractController.calculateL1ERC20Address(address);
					success = true;
				}
			} catch (e2) {
				util.logDebug('handleSearch arb failed with error=', e2);
			}
			if (!success) {
				try {
					const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Ethereum);
					if (validated) {
						const l2Address = await ArbContractController.calculateL2ERC20Address(searchQuery);
						if (l2Address) {
							decimals = await ArbContractController.getTokenDecimals(l2Address);
							symbol = await ArbContractController.getAssetSymbol(l2Address);
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
				arbAddressArray.push(searchQuery);
			}
		}
		//BSC
		if (enabledChains.includes(ChainType.Bsc) && !this.inLocalResult(bscAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Bsc);
				if (validated) {
					const decimals = await BscContractController.getTokenDecimals(searchQuery);
					const symbol = await BscContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Bsc });
						bscAddressArray.push(searchQuery);
					}
				}
			} catch (e4) {
				util.logDebug('handleSearch polygon failed with error=', e4);
			}
		}
		//Polygon
		if (enabledChains.includes(ChainType.Polygon) && !this.inLocalResult(polyAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Polygon);
				if (validated) {
					const decimals = await PolygonContractController.getTokenDecimals(searchQuery);
					const symbol = await PolygonContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Polygon });
						polyAddressArray.push(searchQuery);
					}
				}
			} catch (e5) {
				util.logDebug('handleSearch polygon failed with error=', e5);
			}
		}
		//Heco
		if (enabledChains.includes(ChainType.Heco) && !this.inLocalResult(hecoAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Heco);
				if (validated) {
					const decimals = await HecoContractController.getTokenDecimals(searchQuery);
					const symbol = await HecoContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Heco });
						hecoAddressArray.push(searchQuery);
					}
				}
			} catch (e5) {
				util.logDebug('handleSearch polygon failed with error=', e5);
			}
		}
		//Optimism
		if (enabledChains.includes(ChainType.Optimism) && !this.inLocalResult(opAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Optimism);
				if (validated) {
					const decimals = await OpContractController.getTokenDecimals(searchQuery);
					const symbol = await OpContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Optimism });
						opAddressArray.push(searchQuery);
					}
				}
			} catch (e5) {
				util.logDebug('handleSearch polygon failed with error=', e5);
			}
		}
		//Avax
		if (enabledChains.includes(ChainType.Avax) && !this.inLocalResult(avaxAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Avax);
				if (validated) {
					const decimals = await AvaxContractController.getTokenDecimals(searchQuery);
					const symbol = await AvaxContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Avax });
						avaxAddressArray.push(searchQuery);
					}
				}
			} catch (e5) {
				util.logDebug('handleSearch polygon failed with error=', e5);
			}
		}
		//Syscoin
		if (enabledChains.includes(ChainType.Syscoin) && !this.inLocalResult(syscoinAddressArray, searchQuery)) {
			try {
				const validated = await this.validateCustomTokenAddress(searchQuery, ChainType.Syscoin);
				if (validated) {
					const decimals = await SyscoinContractController.getTokenDecimals(searchQuery);
					const symbol = await SyscoinContractController.getAssetSymbol(searchQuery);
					if (decimals && symbol) {
						chainSearchResult.push({ address: searchQuery, decimals, symbol, type: ChainType.Syscoin });
						syscoinAddressArray.push(searchQuery);
					}
				}
			} catch (e5) {
				util.logDebug('handleSearch polygon failed with error=', e5);
			}
		}

		const supportedChain = [
			ChainType.Arbitrum,
			ChainType.Ethereum,
			ChainType.Bsc,
			ChainType.Polygon,
			ChainType.Heco,
			ChainType.Optimism,
			ChainType.Avax,
			ChainType.Syscoin
		];
		const rpcChain = enabledChains.filter(chainType => !supportedChain.includes(chainType));
		for (let i = 0; i < rpcChain.length; i++) {
			const currentChainType = rpcChain[i];
			if (util.isRpcChainType(rpcChain[i])) {
				try {
					const working = await RpcNetworkController.checkNetwork(currentChainType);
					if (!working) {
						continue;
					}
					const validated = await this.validateCustomTokenAddress(searchQuery, currentChainType);
					if (!validated) {
						continue;
					}
					const decimals = await RpcContractController.callContract(
						currentChainType,
						'getTokenDecimals',
						searchQuery
					);
					const symbol = await RpcContractController.callContract(
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
		return (
			<View style={styles.searchSection} testID={'add-searched-token-screen'}>
				<Image style={styles.searchIcon} source={require('../../../images/search.png')} />
				<TextInput
					style={styles.textInput}
					value={searchQuery}
					placeholder={strings('token.search_tokens_or_contract')}
					placeholderTextColor={colors.$80000000}
					onChangeText={newText => this.updateNum(newText)}
					testID={'input-search-asset'}
					fontSize={13}
					color={colors.black}
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
