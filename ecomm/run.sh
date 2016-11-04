#!/usr/bin/env bash

if [ -z "$1" ]
then
  echo Usage: run.sh /tmp
  exit 1
fi

DEST=$1/micro
ORIG="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

updateRepo() {
  REPO=micro-$1-service
  cd $DEST
  if [ -d "$REPO" ]; then
    cd $REPO
    echo Updating $REPO
    git pull
  else
    echo Clonning $REPO
    git clone --depth 1 https://github.com/ncornag/$REPO.git
  fi
}

mkdir -p $DEST
cp $ORIG/docker-compose*.yml $DEST
cp -R $ORIG/dockerConf $DEST

REPOS=( "catalog" "stock" "cart" "tax" "promotion")
for i in "${REPOS[@]}"
do
	updateRepo $i
done

docker-compose down
docker rmi ncornag/micro-docker-service:latest
docker rmi ncornag/micro-docker-ngnix:latest
#docker rm $(docker ps -a -q -f name=micro_)
docker-compose up --build