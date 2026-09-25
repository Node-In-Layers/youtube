#!/bin/bash
set -e

rm -Rf ./dist
tsgo -p ./tsconfig.json
tsgo -p ./tsconfig.cli.json
cp package.json ./dist
cp README.md ./dist
cp -R ./bin/ ./dist/
rm -f ./dist/bin/build.sh
rm -f ./dist/bin/nil-youtube.mts

sed -i -e 's#../src/#../#g' ./dist/bin/nil-youtube.mjs
chmod +x ./dist/bin/nil-youtube
chmod +x ./bin/nil-youtube
