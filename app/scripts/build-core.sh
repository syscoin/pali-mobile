#!/bin/bash

cd ./../core

yarn build

rsync -rcv ./dist/ ./../app/node_modules/paiwallet-core/dist/

cd ./../app
