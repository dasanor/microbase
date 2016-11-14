#Installation

##Running via docker

```
./run.sh <project folder>
```

##Developer installation
 
```
./developerSetup.sh <project folder>
```

The developer installation will install all the services into the folder `<project folder>/micros`
 
###3rd parties development tools
This installation provides also a dockerized development environment setup:

Installation

```
cd <project folder>/micros
docker-compose --file docker-compose-dev.yml up
```

###Miscellaneous

*Aliases*
```
export MICROBASE_HOME='<project folder>/micro';
alias micro-tool='cd $MICROBASE_HOME;docker-compose --file docker-compose-dev.yml up';
alias micro-cart-service='export NODE_ENV=development;cd $MICROBASE_HOME/micro-cart-service/src;node .'
alias micro-catalog-service='export NODE_ENV=development;cd $MICROBASE_HOME/micro-catalog-service/src;node .'
alias micro-oauth-service='export NODE_ENV=development;cd $MICROBASE_HOME/micro-oauth-service/src;node .'
alias micro-promotion-service='export NODE_ENV=development;cd $MICROBASE_HOME/micro-promotion-service/src;node .'
alias micro-stock-service='export NODE_ENV=development;cd $MICROBASE_HOME/micro-stock-service/src;node .'
alias micro-tax-service='export NODE_ENV=development;cd $MICROBASE_HOME/micro-tax-service/src;node .'
```

*itermocil*

https://github.com/TomAnthony/itermocil

`itermocil --edit  microbase`

```
windows:
  - name: Microbase Development
    root: ~
    layout: tiled
    panes:
      - micro-cart-service
      - micro-catalog-service
      - micro-oauth-service
      - micro-promotion-service
      - micro-stock-service
      - micro-tax-service
```

`alias microbase="itermocil --here microbase"`