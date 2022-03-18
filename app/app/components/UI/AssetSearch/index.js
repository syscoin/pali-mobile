import React, { PureComponent } from 'react';
import { TextInput, View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { queryContractMap } from '../../../data/ContractData';
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

	searchByChainTYpe = async (types: [], trimedSearchQuery) => {
		if (!trimedSearchQuery) {
			return [];
		}
		let { queryAddress, querySymbol } = await queryContractMap(types, trimedSearchQuery, false, 20);
		if (queryAddress) {
			queryAddress = queryAddress.map(token => {
				return { ...token, searchByAddress: true };
			});
		}
		let queryResult = [...queryAddress, ...querySymbol];
		queryResult = queryResult.map(token => {
			return { ...token, fromSearch: true };
		});

		for (const currentChainType of types) {
			if (queryResult.find(token => token.type === currentChainType)) {
				continue;
			}
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
					const searchToken =
						currentChainType === ChainType.Arbitrum
							? {
									address: l2Address,
									l1Address: address,
									decimals,
									symbol,
									type: currentChainType,
									fromSearch: true,
									searchByAddress: true
							  }
							: {
									address,
									decimals,
									symbol,
									type: currentChainType,
									fromSearch: true,
									searchByAddress: true
							  };
					queryResult.push(searchToken);
				}
			} catch (e) {
				util.logDebug('leon.w@ search failed: ', trimedSearchQuery, currentChainType);
			}
		}
		return queryResult;
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
			newResult = await this.searchByChainTYpe(enabledChains, trimedSearchQuery);
		} else {
			newResult = await this.searchByChainTYpe([currentChainType], trimedSearchQuery);
		}
		if (searchQuery !== this.state.searchQuery || currentChainType !== this.props.contactEntry?.currentChain) {
			return;
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
