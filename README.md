# GoPocket App

### build steps

#### 1. config apikeys
  
- mv ./app/.env.template to ./app/apikeys/.env
- set infura_id/etherscan/polygonscan/bscscan/opensea keys in ./app/apikeys/.env

#### 2. build
- cd app && yarn clean
- yarn start:android for android debug build
- yarn start:ios for ios debug build
- yarn build:android for android release build
- yarn build:ios for ios release build
