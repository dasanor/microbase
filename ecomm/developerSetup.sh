#!/usr/bin/env bash

if [ -z "$1" ]
then
  echo Usage: developerSetup.sh /tmp
  exit 1
fi

PWD=`pwd`
MICROBASE=$PWD/../;
DEST=$1/micro;

./install.sh $1

echo "Installing in directory $MICROBASE"
cd $DEST

for MICRO in `find . -type d -name "micro-*"`
do
  echo "-----------------------";
  echo "⚡ Installing module $MICRO..."
  echo " - Pulling from repo $DEST/$MICRO"
  cd $DEST/$MICRO;
  git pull;
  MODULE=$DEST/$MICRO/src;
  cd $MODULE;
  echo " - Installing module with yarn $MODULE"
  yarn;
  MODULEMB=$MODULE/node_modules/microbase
  rm -rf $MODULEMB;
  echo " - Creating link to microbase for development"
  ln -s $MICROBASE/src $MODULEMB
done

echo "-----------------------";
echo "⚡ Installing Microbase..."
cd $MICROBASE/src;
git pull;
yarn;
echo "-----------------------";

cd $PWD
