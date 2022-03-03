# GoPocket App

### build steps

#### 1. config apikeys
  
- mv ./app/.env.template to ./app/apikeys/.env
- set infura_id/etherscan/polygonscan/bscscan/opensea keys in ./app/apikeys/.env

#### 2. build
- cd app && yarn clean
- yarn build:thread
- yarn start:android/ios for debug
- yarn build:android/ios for release
