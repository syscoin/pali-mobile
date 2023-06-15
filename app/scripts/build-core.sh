#!/bin/bash

cd ./../core

yarn build

rsync -rcv ./dist/ ./../app/node_modules/paliwallet-core/dist/

cd ./../app
