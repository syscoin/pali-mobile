import React, { PureComponent } from 'react';
import { TextInput, View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { queryContractMap } from '../../../data/ContractData';
import { isSmartContractAddress } from '../../../util/transactions';
import Engine from '../../../core/Engine';
import { ChainType, defaultEnabledChains, isValidAddress, util } from 'paliwallet-core';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { ThemeContext } from '../../../theme/ThemeProvider';

const styles = StyleSheet.create({
	searchSection: {
		flexDirection: 'row',
		flex: 1,
		height: 52,
		alignItems: 'center',
		paddingHorizontal: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4
	},
	shadowDark: {
		shadowColor: colors.paliBlue100
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
	static contextType = ThemeContext;

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
		if (!symbol || symbol.length === 0) {
			validated = false;
		}
		return validated;
	};

	validateCustomTokenDecimals = decimals => {
		let validated = true;
		if (!decimals || decimals.length === 0) {
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
				if (util.isRpcChainType(currentChainType)) {
					const working = await Engine.networks[ChainType.RPCBase].checkNetwork(currentChainType);
					if (!working) {
						throw new Error('RpcTarget cannot access');
					}
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await Engine.contracts[ChainType.RPCBase].callContract(
						currentChainType,
						'getTokenDecimals',
						address
					);
					symbol = await Engine.contracts[ChainType.RPCBase].callContract(
						currentChainType,
						'getAssetSymbol',
						address
					);
				} else if (currentChainType === ChainType.Arbitrum) {
					let success = false;
					try {
						const validated = await this.validateCustomTokenAddress(address, currentChainType);
						if (!validated) {
							throw new Error('address not validated');
						}
						decimals = await Engine.contracts[ChainType.Arbitrum].getTokenDecimals(address);
						symbol = await Engine.contracts[ChainType.Arbitrum].getAssetSymbol(address);
						l2Address = address;
						address = await Engine.contracts[ChainType.Arbitrum].calculateL1ERC20Address(l2Address);
						success = true;
					} catch (e1) {
						util.logDebug('leon.w@ arb failed with error=', e1);
					}
					if (!success) {
						const validated = await this.validateCustomTokenAddress(address, ChainType.Ethereum);
						if (!validated) {
							throw new Error('address not validated');
						}
						l2Address = await Engine.contracts[ChainType.Arbitrum].calculateL2ERC20Address(address);
						if (!l2Address) {
							throw new Error('l2 address calc failed');
						}
						decimals = await Engine.contracts[ChainType.Arbitrum].getTokenDecimals(l2Address);
						symbol = await Engine.contracts[ChainType.Arbitrum].getAssetSymbol(l2Address);
					}
				} else {
					const validated = await this.validateCustomTokenAddress(address, currentChainType);
					if (!validated) {
						throw new Error('address not validated');
					}
					decimals = await Engine.contracts[currentChainType]?.getTokenDecimals(address);
					symbol = await Engine.contracts[currentChainType]?.getAssetSymbol(address);
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
		const { isDarkMode } = this.context;
		return (
			<View style={[styles.searchSection, isDarkMode && styles.shadowDark]} testID={'add-searched-token-screen'}>
				<AntIcon
					size={18}
					color={isDarkMode ? colors.paliBlue100 : colors.paliGrey200}
					name="search1"
					style={styles.icon}
				/>

				<TextInput
					style={[styles.textInput, { color: isDarkMode ? colors.white : colors.black }]}
					value={searchQuery}
					placeholder={strings('token_search.token_address_hint')}
					placeholderTextColor={isDarkMode ? colors.paliBlue100 : colors.paliGrey200}
					onChangeText={newText => this.onTextChange(newText)}
					testID={'input-search-asset'}
					fontSize={14}
					autoFocus
				/>

				<Text>{this.input && this.input.current && this.input.current.value}</Text>
				{!(searchQuery === '') && (
					<TouchableOpacity style={styles.touchPadding} onPress={this.deleteInput} hitSlop={styles.hitSlop}>
						<AntIcon
							size={16}
							color={isDarkMode ? colors.paliBlue100 : colors.paliGrey200}
							name="closecircle"
						/>
					</TouchableOpacity>
				)}
			</View>
		);
	};
}
