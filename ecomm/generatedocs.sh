#!/usr/bin/env bash

cp ../README.md docs/sources/pages/index.md
cp services/micro-cart-service/README.md docs/sources/pages/micro-cart-service.md
cp services/micro-catalog-service/README.md docs/sources/pages/micro-catalog-service.md
cp services/micro-stock-service/README.md docs/sources/pages/micro-stock-service.md
cp services/micro-oauth-service/README.md docs/sources/pages/micro-oauth-service.md

npm run doc