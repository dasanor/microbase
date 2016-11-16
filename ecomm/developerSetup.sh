#!/usr/bin/env bash

if [ -z "$1" ]
then
  echo Usage: developerSetup.sh /tmp
  exit 1
fi

PWD=`pwd`
MICROBASE=$PWD/../;
DEST=$1;

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'


./install.sh $1

echo -e "${BLUE}Starting project installation...${NC}"
cd $DEST

for MICRO in `find . -type d -name "micro-*"`
do
  echo "-----------------------";
  echo -e "⚡ Installing module ${GREEN}$MICRO${NC}..."
  echo " - Pulling from repo $DEST/$MICRO"
  cd $DEST/$MICRO;
  MODULE=$DEST/$MICRO/src;
  cd $MODULE;
  echo " - Installing module with yarn $MODULE"
  yarn --pure-lockfile;
  MODULEMB=$MODULE/node_modules/microbase
  rm -rf $MODULEMB;
  echo " - Creating link to microbase for development"
  ln -s $MICROBASE/src $MODULEMB
done

echo "-----------------------";
echo -e "⚡ Installing ${GREEN}Microbase${NC}..."
cd $MICROBASE/src;
git pull;
yarn --pure-lockfile;
echo "-----------------------";

cd $PWD

echo -e "${BLUE}Installation Finished!${NC}"
