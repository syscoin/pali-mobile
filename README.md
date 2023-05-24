# Pali Wallet App

![logo](logo.png)

Pali Wallet is a new generation multi-chain wallet that provides security safeguard for Crypto users.

🔗[Official Website](https://paliwallet.com/)

🎙[Discord](https://discord.gg/syscoin)

🐦[Twitter](https://twitter.com/PaliWallet)

## Build Steps

1. Set API Keys
   Pali Wallet uses several third party API like Infura and Etherscan. Before build you should set your own API keys for those services.

- `mkdir ./app/apikeys`
- `mv ./app/.env.template ./app/apikeys/.env`
- set infura_id/etherscan/polygonscan/bscscan/opensea and etc. in `./app/apikeys/.env`

2. Firebase Information

- You will need to add your own google-service.json(android) and GoogleService-info.plist(ios). You are able to get this on firebase console.

3. Build

```
cd app && yarn clean
yarn build:thread
```

For debug version:
`yarn start:android`
or
`yarn start:ios`

For release version:
`yarn build:android`
or
`yarn build:ios`
