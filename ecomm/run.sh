#!/usr/bin/env bash

if [ -z "$1" ]
then
  echo Usage: run.sh /tmp
  exit 1
fi

DEST=$1/micro
ORIG="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mkdir -p $DEST

cp $ORIG/docker-compose.yml $DEST

cd $DEST
git clone --depth 1 https://github.com/ncornag/micro-catalog-service.git
git clone --depth 1 https://github.com/ncornag/micro-stock-service.git
git clone --depth 1 https://github.com/ncornag/micro-cart-service.git

docker-compose up --build