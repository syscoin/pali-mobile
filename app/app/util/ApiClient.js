import { ChainType, util } from 'gopocket-core';
import { NativeModules, Platform } from 'react-native';
import { getVersion, getBuildNumber } from 'react-native-device-info';
import PreventScreenshot from '../core/PreventScreenshot';
import Device, { getIosDeviceInfo } from './Device';
import { isTestFlight } from './NativeUtils';
import { decryptString } from './CryptUtils';
import { getDapp, getLanguageDapp } from './browser';
import { store } from '../store';
import { addFavouriteDapps, updateDappPage, updateDefaultTypes } from '../actions/browser';
import { SetAppstoreBaseVersion, SetUpdateConfig, updateContractList, updateFamousAccounts } from '../actions/settings';
import Engine from '../core/Engine';
import NativeThreads from '../threads/NativeThreads';
import { API_KEY } from '@env';
import { callSqlite } from './ControllerUtils';
import favoritesDapps from './favoritesList';

const TEST_INVITE_URL = 'http://pocket.libsss.com';
const RELEASE_INVITE_URL = 'https://community.gopocket.xyz';

const log = util.logInfo;
let fetch_config_success = false;
const newData = {
	networks: [
		{
			chain: 9,
			content: [
				{
					items: [
						{
							desc: 'Blockchain explorer for Syscoin',
							name: 'Syscoin BlockExplorer',
							url: 'https://chainz.cryptoid.info/sys/'
						},
						{
							desc: 'RPC info for Syscoin',
							name: 'Syscoin RPC Info',
							url: 'https://syscoincore.org/en/documentation/syscoin-rpc-info/'
						}
					],
					name: 'Tools'
				},
				{
					items: [
						{
							desc: 'Decentralized exchange on Syscoin',
							name: 'Pegasys',
							url: 'https://pegasysdex.com/'
						},
						{
							desc: 'Decentralized exchange on Syscoin',
							name: 'Apeswap',
							url: 'https://apeswap.finance/'
						},
						{
							desc: 'Decentralized exchange on Syscoin',
							name: 'Soyswap',
							url: 'https://soyswap.net/'
						}
					],
					name: 'Exchange'
				},
				{
					items: [
						{
							desc: 'Lending and borrowing platform on Syscoin',
							name: 'Pegasys',
							url: 'https://pegasys.fi/'
						},
						{
							desc: 'Staking and yield farming protocol on Syscoin',
							name: 'QiDAO',
							url: 'https://www.qidao.org/'
						},
						{
							desc: 'Yield farming optimization platform on Syscoin',
							name: 'Beefy',
							url: 'https://sys.beefy.finance/'
						},
						{
							desc: 'Decentralized cloud infrastructure provider on Syscoin',
							name: 'Ankr',
							url: 'https://app.ankr.com/'
						},
						{
							desc: 'Protocol for token vesting and unlocking on Syscoin',
							name: 'Revest',
							url: 'https://revest.finance/'
						},
						{
							desc: 'Oracle service provider on Syscoin',
							name: 'SupraOracles',
							url: 'https://supraoracles.com/'
						},
						{
							desc: 'Launchpad for blockchain projects on Syscoin',
							name: 'Syspad',
							url: 'https://syspad.io/'
						}
					],
					name: 'Lending/DeFi'
				},
				{
					items: [
						{
							desc: 'Decentralized platform for cross-chain asset transfer on Syscoin',
							name: 'Chainge',
							url: 'https://www.chainge.finance/info/trading'
						},
						{
							desc: 'Decentralized platform for cross-chain asset transfer on Syscoin',
							name: 'Multichain',
							url: 'https://app.multichain.org/#/router'
						},
						{
							desc: 'Decentralized platform for cross-chain asset transfer on Syscoin',
							name: 'Celer cBridge',
							url: 'https://celerx.app/'
						}
					],
					name: 'Bridges'
				},
				{
					items: [
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Syscoin',
							name: 'Luxy',
							url: 'https://luxy.art/'
						},
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Syscoin',
							name: 'TribeOne',
							url: 'https://www.tribeone.io/'
						},
						{
							desc: 'Digital asset management platform on Syscoin',
							name: 'Coinify',
							url: 'https://coinify.cc/'
						},
						{
							desc: 'Blockchain-based game developer on Syscoin',
							name: 'Blockdemi',
							url: 'https://www.blockdemi.com/'
						},
						{
							desc: 'DAO platform on Syscoin',
							name: 'DaoSys',
							url: 'https://daosys.io/'
						},
						{
							desc: 'Overview of the Syscoin ecosystem',
							name: 'Syscoin Ecosystem',
							url: 'https://syscoin.org/ecosystem'
						}
					],
					name: 'NFT/Misc'
				}
			],
			name: 'Syscoin'
		},
		{
			chain: 1,
			content: [
				{
					items: [
						{
							desc:
								'Allows users to check transactions, addresses, and tokens on the Ethereum blockchain',
							name: 'Etherscan',
							url: 'https://etherscan.io/'
						},
						{
							desc:
								'Integrated development environment (IDE) for writing, testing, and deploying smart contracts on the Ethereum blockchain',
							name: 'Remix IDE',
							url: 'https://remix.ethereum.org/'
						},
						{
							desc: 'Blockchain data and analytics platform for Ethereum',
							name: 'Ethstats',
							url: 'https://ethstats.dev/'
						}
					],
					name: 'Tools'
				},
				{
					items: [
						{
							desc: 'Decentralized trading platform',
							name: 'Uniswap',
							url:
								'https://bafybeidlvfo3j6lbrq56uultqp5urpirthugtwcrjc642jci4ntkko5ra4.ipfs.cf-ipfs.com/#/swap'
						},
						{
							desc: 'Decentralized exchange aggregator',
							name: '1inch',
							url: 'https://app.1inch.io/#/1/swap/ETH/DAI'
						},
						{
							desc: 'Automated portfolio manager and trading platform',
							name: 'Balancer',
							url: 'https://app.balancer.fi'
						},
						{
							desc: 'Automated market maker (AMM) decentralized exchange',
							name: 'Curve',
							url: 'https://curve.fi/'
						}
					],
					name: 'Exchange'
				},

				{
					items: [
						{
							desc: 'Allows users to borrow and lend cryptocurrency assets',
							name: 'Maker',
							url: 'https://makerdao.com/'
						},
						{
							desc: 'Lending and borrowing platform for cryptocurrency assets',
							name: 'AAVE',
							url: 'https://aave.com/'
						},
						{
							desc: 'Money market protocol on Ethereum for lending and borrowing of assets',
							name: 'Compound',
							url: 'https://compound.finance/'
						},
						{
							desc: 'Automated yield aggregator and optimizer on Ethereum',
							name: 'Abracadabra',
							url: 'https://abracadabra.money/'
						}
					],
					name: 'Lending'
				},
				{
					items: [
						{
							desc: 'Liquid staking solution for Ethereum on the Lido platform',
							name: 'Lido',
							url: 'https://lido.fi/'
						},
						{
							desc:
								'Platform for boosting yield on staked assets, particularly those in the Lido staking pool',
							name: 'Convex',
							url: 'https://www.convexfinance.com/'
						},
						{
							desc:
								'Decentralized finance aggregator that optimizes yield through automated portfolio management and lending',
							name: 'Yearn',
							url: 'https://yearn.finance/'
						},
						{
							desc: 'Algorithmic stablecoin protocol on Ethereum',
							name: 'Frax',
							url: 'https://frax.finance/'
						}
					],
					name: 'DeFi'
				},
				{
					items: [
						{
							desc: 'Decentralized platform for cross-chain asset transfer on Syscoin',
							name: 'Multichain',
							url: 'https://app.multichain.org/#/router'
						},
						{
							desc: 'Decentralized platform for cross-chain asset transfer',
							name: 'Celer cBridge',
							url: 'https://celerx.app/'
						},
						{
							desc:
								'Cross-chain bridge for transferring assets between Ethereum, Binance Smart Chain, and Huobi ECO Chain',
							name: 'Chainge',
							url: 'https://www.chainge.finance/info/trading'
						}
					],
					name: 'Bridges'
				},
				{
					items: [
						{
							desc: 'Decentralized platform for trading and exchanging non-fungible tokens (NFTs)',
							name: 'OpenSea',
							url: 'https://opensea.io/'
						},
						{
							desc: 'Marketplace for buying and selling luxury NFTs',
							name: 'Luxy',
							url: 'https://luxy.art/'
						},
						{
							desc: 'Decentralized protocol for private and fungible payments on Ethereum',
							name: 'Blur',
							url: 'https://blur.io/'
						},
						{
							desc:
								'NFT marketplace that enables users to buy, sell, and discover rare and unique digital assets',
							name: 'LooksRare',
							url: 'https://looksrare.com/'
						},
						{
							desc: 'Search engine for NFTs on the Ethereum blockchain',
							name: 'NFTSCAN',
							url: 'https://nftscan.com/'
						}
					],
					name: 'NFT'
				},
				{
					items: [
						{
							desc:
								'Blockchain infrastructure provider that enables developers to build and scale decentralized applications (dapps) on Ethereum',
							name: 'Alchemy Dapps',
							url: 'https://www.alchemy.com/ecosystem/ethereum'
						},
						{
							desc: 'Tool for monitoring and analyzing Ethereum transactions',
							name: 'Blocknative',
							url: 'https://explorer.blocknative.com/'
						},
						{
							desc: 'Tool for debugging, monitoring, and analyzing smart contracts on Ethereum',
							name: 'Tenderly',
							url: 'https://tenderly.co/'
						},
						{
							desc: 'Tool for batch transfers of ERC-20 and ERC-721 tokens on Ethereum',
							name: 'Disperse',
							url: 'https://disperse.app/'
						},
						{
							desc: 'Domain Name Service (DNS) for the Ethereum blockchain',
							name: 'ENS',
							url: 'https://ens.domains/'
						},
						{
							desc:
								'Tool for converting between different units of Ether and other Ethereum-based assets',
							name: 'Ethereum Unit Converter',
							url: 'https://eth-converter.com'
						},
						{
							desc: 'Tool for managing decentralized autonomous organizations (DAOs) on Ethereum',
							name: 'Boardroom',
							url: 'https://boardroom.io/'
						}
					],
					name: 'Tools'
				}
			],

			name: 'Ethereum'
		},
		{
			chain: 3,
			content: [
				{
					items: [
						{
							desc: 'Decentralized exchange aggregator on Polygon',
							name: '1inch',
							url: 'https://1inch.exchange/'
						},
						{
							desc: 'Decentralized trading platform on Polygon',
							name: 'Uniswap',
							url: 'https://app.uniswap.org/'
						},
						{
							desc: 'Decentralized trading platform on Polygon',
							name: 'Quickswap',
							url: 'https://quickswap.exchange/'
						},
						{
							desc: 'Decentralized exchange on Polygon',
							name: 'Sushi',
							url: 'https://app.sushi.com/'
						},
						{
							desc: 'Decentralized exchange on Polygon',
							name: 'Curve',
							url: 'https://curve.fi/'
						},
						{
							desc: 'Automated portfolio manager and trading platform on Polygon',
							name: 'Balancer',
							url: 'https://polygon.balancer.fi/'
						}
					],
					name: 'Exchange'
				},
				{
					items: [
						{
							desc: 'Blockchain explorer and analytics platform for Polygon',
							name: 'Polygonscan',
							url: 'https://polygonscan.com/'
						}
					],
					name: 'Tools'
				},
				{
					items: [
						{
							desc: 'Lending and borrowing platform on Polygon',
							name: 'AAVE',
							url: 'https://app.aave.com/'
						},
						{
							desc: 'Staking and yield farming protocol on Polygon',
							name: 'QiDAO',
							url: 'https://www.qidao.org/'
						},
						{
							desc: 'Decentralized lending platform on Polygon',
							name: 'Compound',
							url: 'https://app.compound.finance/'
						}
					],
					name: 'Lending'
				},
				{
					items: [
						{
							desc: 'Yield farming optimization platform on Polygon',
							name: 'Beefy',
							url: 'https://polygon.beefy.finance/'
						},
						{
							desc: 'Protocol for managing crypto portfolios on Polygon',
							name: 'Tetu',
							url: 'https://app.tetu.io/'
						},
						{
							desc: 'Protocol for trading and hedging options on Polygon',
							name: 'Gamma',
							url: 'https://gamma.xyz/'
						},
						{
							desc: 'Decentralized options trading platform on Polygon',
							name: 'Toucan',
							url: 'https://toucan.finance/'
						}
					],
					name: 'DeFi'
				},
				{
					items: [
						{
							desc: 'Decentralized platform for cross-chain asset transfer on Polygon',
							name: 'Celer cBridge',
							url: 'https://celerx.app/'
						}
					],
					name: 'Bridges'
				},
				{
					items: [
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Polygon',
							name: 'OpenSea',
							url: 'https://opensea.io/'
						},
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Polygon',
							name: 'Luxy',
							url: 'https://luxy.art/'
						}
					],
					name: 'NFT'
				},
				{
					items: [
						{
							desc:
								'Blockchain infrastructure provider that enables developers to build and scale decentralized applications (dapps) on Polygon',
							name: 'Alchemy Dapps',
							url: 'https://www.alchemy.com/ecosystem/polygon'
						}
					],
					name: 'Tools'
				}
			],
			name: 'Polygon'
		},
		{
			chain: 4,
			content: [
				{
					items: [
						{
							desc: 'Decentralized exchange aggregator on Arbitrum',
							name: '1inch',
							url: 'https://1inch.exchange/'
						},
						{
							desc: 'Decentralized trading platform on Arbitrum',
							name: 'Uniswap',
							url: 'https://app.uniswap.org/'
						},
						{
							desc: 'Decentralized trading platform on Arbitrum',
							name: 'GMX',
							url: 'https://gmx.financial/'
						},
						{
							desc: 'Decentralized exchange on Arbitrum',
							name: 'Sushi',
							url: 'https://app.sushi.com/'
						},
						{
							desc: 'Decentralized exchange on Arbitrum',
							name: 'Camelot',
							url: 'https://camelot.exchange/'
						},
						{
							desc: 'Automated portfolio manager and trading platform on Arbitrum',
							name: 'Balancer',
							url: 'https://app.balancer.fi/'
						},
						{
							desc: 'Decentralized exchange on Arbitrum',
							name: 'ZyberSwap',
							url: 'https://zyberswap.com/'
						}
					],
					name: 'Exchange'
				},
				{
					items: [
						{
							desc: 'Blockchain explorer and analytics platform for Arbitrum',
							name: 'Arbiscan',
							url: 'https://arbiscan.io/'
						}
					],
					name: 'Tools'
				},
				{
					items: [
						{
							desc: 'Lending and borrowing platform on Arbitrum',
							name: 'AAVE',
							url: 'https://app.aave.com/'
						},
						{
							desc: 'Lending and borrowing platform on Arbitrum',
							name: 'Radiant',
							url: 'https://app.radiant.credit/'
						},
						{
							desc: 'Decentralized lending platform on Arbitrum',
							name: 'TenderFi',
							url: 'https://tender.fi/'
						},
						{
							desc:
								'Protocol that enables investors to earn yield on a range of assets by providing liquidity to DeFi platforms on Arbitrum',
							name: 'Abracadabra',
							url: 'https://abracadabra.money/'
						}
					],
					name: 'Lending'
				},
				{
					items: [
						{
							desc: 'Yield farming optimization platform on Arbitrum',
							name: 'Beefy',
							url: 'https://app.beefy.finance/'
						},
						{
							desc: 'Protocol for tokenized farming on Arbitrum',
							name: 'Gains',
							url: 'https://gains.farm/'
						},
						{
							desc: 'DAO that invests in blockchain projects on Arbitrum',
							name: 'JonesDAO',
							url: 'https://jonesdao.com/'
						},
						{
							desc: 'Options trading platform on Arbitrum',
							name: 'Dopex',
							url: 'https://dopex.io/'
						}
					],
					name: 'DeFi'
				},
				{
					items: [
						{
							desc: 'Decentralized platform for cross-chain asset transfer on Arbitrum',
							name: 'Celer cBridge',
							url: 'https://celerx.app/'
						}
					],
					name: 'Bridges'
				},
				{
					items: [
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Arbitrum',
							name: 'OpenSea',
							url: 'https://opensea.io/'
						},
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Arbitrum',
							name: 'Trove',
							url: 'https://trove.treasure.lol/'
						},
						{
							desc: 'NFT marketplace for buying, selling, and trading digital assets on Arbitrum',
							name: 'tofuNFT',
							url: 'https://tofunft.com/arbi'
						}
					],
					name: 'NFT'
				},
				{
					items: [
						{
							desc:
								'Blockchain infrastructure provider that enables developers to build and scale decentralized applications (dapps) on Arbitrum',
							name: 'Alchemy Dapps',
							url: 'https://www.alchemy.com/ecosystem/arbitrum'
						},
						{
							desc:
								'Decentralized platform for creating, deploying, and managing smart contracts on Arbitrum',
							name: 'Arbiproject',
							url: 'https://arbiproject.org/'
						},
						{
							desc: 'Decentralized storage and sharing platform for digital assets on Arbitrum',
							name: 'Space',
							url: 'https://space.id/'
						}
					],
					name: 'Tools'
				}
			],
			name: 'Arbitrum'
		},
		{
			chain: 2,
			content: [
				{
					items: [
						{
							desc: 'Decentralized exchange aggregator',
							name: '1inch',
							url: 'https://bsc.1inch.exchange/#/'
						},
						{
							desc: 'Automated market maker (AMM) decentralized exchange',
							name: 'Pancakeswap',
							url: 'https://pancakeswap.finance/'
						},
						{
							desc: 'Decentralized trading platform',
							name: 'Uniswap',
							url: 'https://app.uniswap.org/'
						},
						{
							desc: 'Automated market maker (AMM) decentralized exchange',
							name: 'Biswap',
							url: 'https://biswap.org/'
						},
						{
							desc: 'Automated market maker (AMM) decentralized exchange',
							name: 'Thena',
							url: 'https://thena.finance/'
						},
						{
							desc: 'Decentralized exchange and yield farming platform',
							name: 'Apeswap',
							url: 'https://apeswap.finance/'
						},
						{
							desc:
								'NFT marketplace for buying, selling, and trading digital assets on the Binance Smart Chain',
							name: 'Izumi',
							url: 'https://izumi.earth/'
						}
					],
					name: 'Exchange'
				},
				{
					items: [
						{
							desc: 'Blockchain explorer and analytics platform for Binance Smart Chain',
							name: 'Bscscan',
							url: 'https://bscscan.com/'
						}
					],
					name: 'Tools'
				},
				{
					items: [
						{
							desc: 'Lending and borrowing platform on Binance Smart Chain',
							name: 'Venus',
							url: 'https://app.venus.io/'
						},
						{
							desc: 'Lending and borrowing platform on Binance Smart Chain',
							name: 'Alpaca',
							url: 'https://app.alpacafinance.org/'
						},
						{
							desc: 'Lending and borrowing platform on Binance Smart Chain',
							name: 'Helio',
							url: 'https://helio-lending.vercel.app/'
						},
						{
							desc:
								'Protocol that enables investors to earn yield on a range of assets by providing liquidity to DeFi platforms on Binance Smart Chain',
							name: 'Abracadabra',
							url: 'https://abracadabra.money/'
						}
					],
					name: 'Lending'
				},
				{
					items: [
						{
							desc: 'Yield farming optimization platform on Binance Smart Chain',
							name: 'Beefy',
							url: 'https://app.beefy.finance/'
						},
						{
							desc: 'DeFi yield aggregator on Binance Smart Chain',
							name: 'Coinwind',
							url: 'https://coinwind.com/'
						},
						{
							desc: 'Node hosting and infrastructure platform on Binance Smart Chain',
							name: 'Ankr',
							url: 'https://app.ankr.com/'
						},
						{
							desc: 'Decentralized liquidity aggregator on Binance Smart Chain',
							name: 'Apollo X',
							url: 'https://apollo-x.network/'
						}
					],
					name: 'DeFi'
				},
				{
					items: [
						{
							desc: 'Decentralized platform for cross-chainasset transfer on Binance Smart Chain',
							name: 'Celer cBridge',
							url: 'https://celerx.app/'
						},
						{
							desc: 'Cross-chain bridge for transferring assets between Ethereum and Binance Smart Chain',
							name: 'Chainge',
							url: 'https://www.chainge.finance/info/trading'
						}
					],
					name: 'Bridges'
				},
				{
					items: [
						{
							desc:
								'NFT marketplace for buying, selling, and trading digital assets on the Binance Smart Chain',
							name: 'OpenSea',
							url: 'https://opensea.io/'
						},
						{
							desc:
								'NFT marketplace for buying, selling, and trading digital assets on the Binance Smart Chain',
							name: 'tofuNFT',
							url: 'https://tofunft.com/'
						}
					],
					name: 'NFT'
				},
				{
					items: [
						{
							desc:
								'Blockchain infrastructure provider that enables developers to build and scale decentralized applications (dapps) on Binance Smart Chain',
							name: 'Alchemy Dapps',
							url: 'https://www.alchemy.com/dapps?chain=BNB+Chain'
						},
						{
							desc:
								'Decentralized storage and sharing platform for digital assets on Binance Smart Chain',
							name: 'Space',
							url: 'https://space.id/'
						}
					],
					name: 'Tools'
				}
			],
			name: 'BSC'
		},
		{
			chain: 8,
			content: [
				{
					items: [
						{
							desc: 'Decentralized trading platform',
							logo: 'https://cdn.gopocket.finance/files/TraderJoelogo.png',
							name: 'Trader Joe',
							url: 'https://traderjoexyz.com/#/trade'
						},
						{
							desc: 'Decentralized trading platform',
							logo: 'https://cdn.gopocket.finance/files/SushiSwapArbitrumlogo.png',
							name: 'SushiSwap',
							url: 'https://app.sushi.com/swap'
						},
						{
							desc: 'Decentralized trading platform',
							logo: 'https://cdn.gopocket.finance/files/Pangolinlogo.png',
							name: 'Pangolin',
							url: 'https://ipfs.io/ipns/app.pangolin.exchange/#/swap'
						},
						{
							desc: 'Automatic market-making protocol for stablecoins',
							logo: 'https://cdn.gopocket.finance/files/curvelogo.png',
							name: 'Curve',
							url: 'https://avax.curve.fi'
						}
					],
					name: 'Exchange'
				},
				{
					items: [
						{ desc: 'Decentralized lending protocol', name: 'AAVE', url: 'https://app.aave.com/#/markets' },
						{
							desc: 'Decentralized non-custodial liquidity market protocol',
							logo: 'https://cdn.gopocket.finance/files/BENQilogo.png',
							name: 'BENQi',
							url: 'https://app.benqi.fi'
						}
					],
					name: 'Lending'
				},
				{
					items: [
						{
							desc: 'bringing yield-farming, staking and more functionalities to the Avalanche Network.',
							logo: 'https://cdn.gopocket.finance/files/Penguinlogo.png',
							name: 'Penguin',
							url: 'https://www.penguinfinance.io'
						},
						{
							desc: 'Auto-compounder and stable-asset exchange',
							logo: 'https://cdn.gopocket.finance/files/Snowballlogo.jpg',
							name: 'Snowball',
							url: 'https://app.snowball.network'
						}
					],
					name: 'Assets'
				},
				{
					items: [
						{
							desc: 'Decentralized trading platform',
							logo: 'https://cdn.gopocket.finance/files/YetiSwaplogo.png',
							name: 'Yeti Swap',
							url: 'https://exchange.yetiswap.app/#/nft-marketplace'
						}
					],
					name: 'NFT'
				},
				{
					items: [
						{
							desc: 'Avalanche C-Chain Explorer',
							logo: 'https://cdn.gopocket.finance/files/SnowTracelogo.png',
							name: 'SnowTrace',
							url: 'https://snowtrace.io'
						}
					],
					name: 'Tools'
				}
			],
			name: 'Avalanche'
		}
	],

	showBanner: false,
	showContent: true
};

const fetchConfig = async () => {
	const configUrl = util.useTestServer()
		? 'https://api.beta.gopocket.finance/app/config'
		: 'https://api.gopocket.finance/app/config';

	try {
		const response = await fetch(configUrl);
		if (response.status === 200) {
			try {
				const rawData = await response.text();
				const content = await decryptString(JSON.parse(rawData).data);
				const jsonContent = JSON.parse(content);
				const updateConfig = jsonContent.update_config;
				const chainTypes = jsonContent.chain_types_v2;
				const appstoreBaseVersion = jsonContent.appstore_base_version;
				let dappPage = jsonContent.dapp_page;
				const contractList = jsonContent.contract_list;
				const useOffchainEndPoint = jsonContent.use_offchain_endpoint;
				const ipfsGateway = jsonContent.ipfs_gateway;
				const famousAccounts = jsonContent.famous_accounts;
				if (updateConfig) {
					const config = Device.isAndroid() ? updateConfig.android : updateConfig.iphone;
					store.dispatch(SetUpdateConfig(config));
				}
				if (chainTypes) {
					store.dispatch(updateDefaultTypes(chainTypes));
				}
				if (appstoreBaseVersion) {
					store.dispatch(SetAppstoreBaseVersion(appstoreBaseVersion));
				}
				if (dappPage) {
					dappPage.en = newData;
					store.dispatch(updateDappPage(dappPage));
					callSqlite('updateWhitelistDapps', getDapp(dappPage));
					store.dispatch(addFavouriteDapps(favoritesDapps));
				}
				if (contractList) {
					store.dispatch(updateContractList(contractList));
				}
				if (famousAccounts) {
					store.dispatch(updateFamousAccounts(famousAccounts));
				}
				if (ipfsGateway) {
					Engine.context.CollectiblesController.setIpfsGateway(ipfsGateway);
				}
				if (Device.isIos()) {
					const appstoreBaseVersion = Number(store.getState().settings.appstoreBaseVersion);
					global.shouldHideSthForAppStoreReviewer =
						!appstoreBaseVersion || Number(getAppVersionCode()) >= appstoreBaseVersion;
				}
				global.useOffchainEndPoint = !!useOffchainEndPoint;
			} finally {
				fetch_config_success = true;
				util.logDebug('leon.w@fetch_config_success');
			}
		}
	} catch (e) {
		util.logDebug('cyh fetch config fail, e', e);
	}
	if (!fetch_config_success) {
		setTimeout(() => fetchConfig(), 5000);
	}
};

export async function initApiClient() {
	global.channel = await PreventScreenshot.getChannel();
	global.appVersion = await getVersion();
	global.appVersionCode = await getBuildNumber();
	global.deviceInfo = await new Promise(resolve => {
		if (Platform.OS === 'android') {
			NativeModules.RNToolsManager.getDeviceInfo().then(event => {
				resolve(event);
			});
			return;
		}
		getIosDeviceInfo().then(info => {
			resolve(info);
		});
	});
	if (Platform.OS === 'android') {
		global.deviceId = '';
		global.testFlight = false;
		global.shouldHideSthForAppStoreReviewer = false;
	} else {
		global.deviceId = '';
		global.testFlight = await isTestFlight();
		const appstoreBaseVersion = Number(store.getState().settings.appstoreBaseVersion);
		global.shouldHideSthForAppStoreReviewer =
			!appstoreBaseVersion || Number(getAppVersionCode()) >= appstoreBaseVersion;
	}

	global.useOffchainEndPoint = false;
	await fetchConfig();
	const etherscan_key = await Engine.getScanKey(ChainType.Ethereum);
	util.checkEtherscanAvailable('0xd8da6bf26964af9d7eed9e03e53415d37aa96045', etherscan_key).then(
		etherscanAvailable => {
			NativeThreads.get().callEngineAsync('setEtherscanAvailable', etherscanAvailable);
			util.setEtherscanAvailable(etherscanAvailable);
			util.logDebug(`leon.w@etherscanAvailable=${etherscanAvailable}`);
		}
	);

	log(
		'initApiClient -> ' +
			JSON.stringify({
				API_KEY,
				deviceId: global.deviceId,
				channel: global.channel,
				appVersion: global.appVersion,
				appVersionCode: global.appVersionCode,
				deviceInfo: global.deviceInfo,
				testFlight: global.testFlight,
				useOffchainEndPoint: global.useOffchainEndPoint,
				shouldHideSthForAppStoreReviewer: global.shouldHideSthForAppStoreReviewer
			})
	);
}

export function getDeviceId() {
	return global.deviceId;
}

export function getChannel() {
	return global.channel;
}

export function getAppVersion() {
	return global.appVersion;
}

export function getAppVersionCode() {
	return global.appVersionCode;
}

export function getDeviceInfo() {
	return global.deviceInfo;
}

export function getTestFlight() {
	return global.testFlight;
}

export function getInviteUrl() {
	const isTest = util.useTestServer();
	return isTest ? TEST_INVITE_URL : RELEASE_INVITE_URL;
}

export function shouldHideSthForAppStoreReviewer() {
	return global.shouldHideSthForAppStoreReviewer;
}

export async function useOffchainEndPoint() {
	let try_count = 8;
	// eslint-disable-next-line no-unmodified-loop-condition
	while (!fetch_config_success && try_count > 0) {
		await new Promise(resolve => setTimeout(() => resolve(true), 500));
		try_count -= 1;
	}
	return global.useOffchainEndPoint;
}
