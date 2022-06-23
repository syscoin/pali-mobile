# GoPocket App
![logo](logo.png)

Go Pocket is a new generation multi-chain wallet that provides security safeguard for Crypto users.


🔗[Official Website](https://gopocket.security)

🎙[Discord](https://discord.gg/78e9u4Xa)

🐦[Twitter](https://twitter.com/GoplusSecurity)

## Build Steps
1. Set API Keys
Go Pocket uses several third party API like Infura and Etherscan. Before build you should set your own API keys for those services.
  
- `mkdir ./app/apikeys`
- `mv ./app/.env.template ./app/apikeys/.env`
- set infura_id/etherscan/polygonscan/bscscan/opensea and etc. in `./app/apikeys/.env`

2. Build
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



