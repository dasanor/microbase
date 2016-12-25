#!/usr/bin/env bash

cp README.md src/
cp CHANGELOG.md src/
cp LICENSE src/

cd src
npm publish

rm README.md
rm CHANGELOG.md
rm LICENSE