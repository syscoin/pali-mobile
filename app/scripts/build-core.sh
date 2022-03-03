#!/bin/bash

cd ./../core

yarn build

rsync -rcv ./dist/ ./../app/node_modules/gopocket-core/dist/

cd ./../app
