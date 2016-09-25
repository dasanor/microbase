#!/usr/bin/env bash

cp ../README.md docs/sources/index.md
cp services/micro-catalog-service/README.md docs/sources/micro-catalog-service.md
cp services/micro-stock-service/README.md docs/sources/micro-stock-service.md
cp services/micro-cart-service/README.md docs/sources/micro-cart-service.md
cp services/micro-tax-service/README.md docs/sources/micro-tax-service.md
cp services/micro-promotion-service/README.md docs/sources/micro-promotion-service.md
cp services/micro-oauth-service/README.md docs/sources/micro-oauth-service.md

cp services/micro-catalog-service/src/docs/api docs/sources/api
cp services/micro-stock-service/src/docs/api docs/sources/api
cp services/micro-cart-service/src/docs/api docs/sources/api
cp services/micro-tax-service/src/docs/api docs/sources/api
cp services/micro-promotion-service/src/docs/api docs/sources/api
cp services/micro-oauth-service/src/docs/api docs/sources/api

#cp ../../examples/micro-catalog-service/README.md docs/sources/micro-catalog-service.md
#cp ../../examples/micro-stock-service/README.md docs/sources/micro-stock-service.md
#cp ../../examples/micro-cart-service/README.md docs/sources/micro-cart-service.md
#cp ../../examples/micro-tax-service/README.md docs/sources/micro-tax-service.md
#cp ../../examples/micro-promotion-service/README.md docs/sources/micro-promotion-service.md
#cp ../../examples/micro-oauth-service/README.md docs/sources/micro-oauth-service.md

#cp -R ../../examples/micro-catalog-service/src/docs/api docs/sources
#cp -R ../../examples/micro-stock-service/src/docs/api docs/sources
#cp -R ../../examples/micro-cart-service/src/docs/api docs/sources
#cp -R ../../examples/micro-tax-service/src/docs/api docs/sources
#cp -R ../../examples/micro-promotion-service/src/docs/api docs/sources
#cp -R ../../examples/micro-oauth-service/src/docs/api docs/sources

npm run doc
