import React, { PureComponent } from 'react';
import { TextInput, View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { getContractMap } from '../../../data/ContractData';
import Fuse from 'fuse.js';
import { isSmartContractAddress } from '../../../util/transactions';
import Engine from '../../../core/Engine';
import { ChainType, defaultEnabledChains, isValidAddress, util } from 'gopocket-core';

const styles = StyleSheet.create({
	searchSection: {
		flexDirection: 'row',
		flex: 1,
		height: 52,
		alignItems: 'center',
		paddingHorizontal: 15
	},
	textInput: {
		flex: 1,
		padding: 0,
		color: colors.$030319,
		fontSize: 14,
		paddingLeft: 28,
		marginRight: 5,
		...fontStyles.normal
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10
	},
	icon: {
		position: 'absolute',
		left: 16
	}
});

/**
 * PureComponent that provides ability to search assets.
 */
export default class AssetSearch extends PureComponent {
	state = {
		searchQuery: '',
		inputWidth: '85%'
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		onSearch: PropTypes.func,
		contactEntry: PropTypes.object,
		currentChain: PropTypes.number
	};

	componentDidMount() {
		setTimeout(() => this.setState({ inputWidth: '86%' }), 100);
	}

	componentDidUpdate(preProps, preState) {
		if (preProps.currentChain !== this.props.currentChain) {
			if (this.state.searchQuery?.trim() !== '') {
				this.handleSearch(this.state.searchQuery);
			}
		}
	}

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

	searchByChainTYpe = async (currentChainType, trimedSearchQuery) => {
		const contractMap = getContractMap(currentChainType);
		const contractList = Object.entries(contractMap).map(([address, tokenData]) => {
			tokenData.address = address;
			tokenData.type = currentChainType;
			tokenData.fromSearch = true;
			return tokenData;
		});

		let addressSearchResult =
			trimedSearchQuery.length < 8
				? []
				: contractList.filter(token => {
						const isSearchByAddress = token.address.toLowerCase() === trimedSearchQuery.toLowerCase();
						if (isSearchByAddress) {
							token.searchByAddress = isSearchByAddress;
						}
						return isSearchByAddress;
						// eslint-disable-next-line no-mixed-spaces-and-tabs
				  });

		let fuseSearchResult = [];
		if (!addressSearchResult || addressSearchResult.length <= 0) {
			const fuse = new Fuse(contractList, {
				shouldSort: true,
				threshold: 0.3,
				location: 0,
				distance: 100,
				maxPatternLength: 32,
				minMatchCharLength: 1,
				keys: [{ name: 'symbol', weight: 0.8 }]
			});
			fuseSearchResult = fuse.search(trimedSearchQuery, { limit: 20 });
		}

		if (
			(!addressSearchResult || addressSearchResult.length === 0) &&
			(!fuseSearchResult || fuseSearchResult.length === 0)
		) {
			let address = trimedSearchQuery;
			let decimals;
			let symbol;
			let l2Address;
			try {
				const {
					AssetsContractController,
					BscContractController,
					OpContractController,
					PolygonContractController,
					ArbContractController,
					HecoContractController,
					AvaxContractController,
					RpcContractController,
					RpcNetworkController
				} = Engine.context;
				if (currentChainType === ChainType.Polygon) {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await PolygonContractController.getTokenDecimals(address);
					symbol = await PolygonContractController.getAssetSymbol(address);
				} else if (currentChainType === ChainType.Bsc) {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await BscContractController.getTokenDecimals(address);
					symbol = await BscContractController.getAssetSymbol(address);
				} else if (currentChainType === ChainType.Optimism) {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await OpContractController.getTokenDecimals(address);
					symbol = await OpContractController.getAssetSymbol(address);
				} else if (currentChainType === ChainType.Arbitrum) {
					let success = false;
					try {
						const validated = await this.validateCustomTokenAddress(address, currentChainType);
						if (!validated) {
							throw new Error('address not validated');
						}
						decimals = await ArbContractController.getTokenDecimals(address);
						symbol = await ArbContractController.getAssetSymbol(address);
						l2Address = address;
						address = await ArbContractController.calculateL1ERC20Address(l2Address);
						success = true;
					} catch (e1) {
						util.logDebug('leon.w@ arb failed with error=', e1);
					}
					if (!success) {
						const validated = await this.validateCustomTokenAddress(address, ChainType.Ethereum);
						if (!validated) {
							throw new Error('address not validated');
						}
						l2Address = await ArbContractController.calculateL2ERC20Address(address);
						if (!l2Address) {
							throw new Error('l2 address calc failed');
						}
						decimals = await ArbContractController.getTokenDecimals(l2Address);
						symbol = await ArbContractController.getAssetSymbol(l2Address);
					}
				} else if (currentChainType === ChainType.Heco) {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await HecoContractController.getTokenDecimals(address);
					symbol = await HecoContractController.getAssetSymbol(address);
				} else if (currentChainType === ChainType.Avax) {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await AvaxContractController.getTokenDecimals(address);
					symbol = await AvaxContractController.getAssetSymbol(address);
				} else if (util.isRpcChainType(currentChainType)) {
					const working = await RpcNetworkController.checkNetwork(currentChainType);
					if (!working) {
						throw new Error('RpcTarget cannot access');
					}
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await RpcContractController.callContract(currentChainType, 'getTokenDecimals', address);
					symbol = await RpcContractController.callContract(currentChainType, 'getAssetSymbol', address);
				} else {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await AssetsContractController.getTokenDecimals(address);
					symbol = await AssetsContractController.getAssetSymbol(address);
				}
				if (this.validateCustomTokenSymbol(symbol) && this.validateCustomTokenDecimals(decimals)) {
					addressSearchResult =
						currentChainType === ChainType.Arbitrum
							? [
									{
										address: l2Address,
										l1Address: address,
										decimals,
										symbol,
										type: currentChainType,
										fromSearch: true,
										searchByAddress: true
									}
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  ]
							: [
									{
										address,
										decimals,
										symbol,
										type: currentChainType,
										fromSearch: true,
										searchByAddress: true
									}
									// eslint-disable-next-line no-mixed-spaces-and-tabs
							  ];
				}
			} catch (e) {
				util.logDebug('leon.w@ search failed: ', trimedSearchQuery);
			}
		}
		const results = [...addressSearchResult, ...fuseSearchResult];
		return results;
	};

	handleSearch = async searchQuery => {
		const { contactEntry } = this.props;
		if (!contactEntry) {
			return;
		}

		const trimedSearchQuery = searchQuery?.trim();
		const currentChainType = contactEntry?.currentChain;

		let newResult = [];
		if (currentChainType === ChainType.All) {
			const enabledChains = contactEntry.enabledChains || defaultEnabledChains;
			for (const item of enabledChains) {
				const result = await this.searchByChainTYpe(item, trimedSearchQuery);
				newResult = [...newResult, ...result];
			}
			if (newResult.length > 0 && !newResult[0].searchByAddress) {
				const fuse = new Fuse(newResult, {
					shouldSort: true,
					threshold: 0.3,
					location: 0,
					distance: 100,
					maxPatternLength: 32,
					minMatchCharLength: 1,
					keys: [{ name: 'symbol', weight: 0.8 }]
				});
				newResult = fuse.search(trimedSearchQuery);
			}
		} else {
			newResult = await this.searchByChainTYpe(currentChainType, trimedSearchQuery);
		}
		this.props.onSearch({ searchQuery: trimedSearchQuery, results: newResult });
	};

	onTextChange(newText) {
		this.setState({ searchQuery: newText });
		this.handleSearch(newText);
	}

	deleteInput = () => {
		this.setState({ searchQuery: '' });
		setTimeout(() => {
			this.handleSearch('');
		});
	};

	render = () => {
		const { searchQuery } = this.state;
		return (
			<View style={styles.searchSection} testID={'add-searched-token-screen'}>
				<Image source={require('../../../images/ic_search.png')} style={styles.icon} />
				<TextInput
					style={styles.textInput}
					value={searchQuery}
					placeholder={strings('token_search.token_address_hint')}
					placeholderTextColor={colors.$8F92A1}
					onChangeText={newText => this.onTextChange(newText)}
					testID={'input-search-asset'}
					fontSize={14}
					autoFocus
				/>

				<Text>{this.input && this.input.current && this.input.current.value}</Text>
				{!(searchQuery === '') && (
					<TouchableOpacity style={styles.touchPadding} onPress={this.deleteInput} hitSlop={styles.hitSlop}>
						<Image source={require('../../../images/search_clear.png')} />
					</TouchableOpacity>
				)}
			</View>
		);
	};
}
