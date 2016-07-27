#!/usr/bin/env bash

cp ../README.md docs/sources/index.md
cp services/micro-cart-service/README.md docs/sources/micro-cart-service.md
cp services/micro-catalog-service/README.md docs/sources/micro-catalog-service.md
# cp ../../examples/micro-catalog-service/README.md docs/sources/micro-catalog-service.md
cp services/micro-stock-service/README.md docs/sources/micro-stock-service.md
cp services/micro-oauth-service/README.md docs/sources/micro-oauth-service.md

cp services/micro-catalog-service/src/docs/api docs/sources/api
# cp -R ../../examples/micro-catalog-service/src/docs/api docs/sources

npm run doc
