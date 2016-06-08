# micro-base

Micro-base is a small framework developed as a Node.js module, to define and call services, and give
basic utilities like config, logging, jobs and MongoDB access.

It can be used as a base to implement applications with a microservices style architecture.

## Examples:

[micro-math-service](https://github.com/ncornag/micro-base/tree/develop/examples/micro-math-service)

[micro-taxes-service](https://github.com/ncornag/micro-base/tree/develop/examples/micro-taxes-service)

### Run the examples:
```bash
cd examples
docker-compose up
```
The Consul services could be viewed at:
```
http://localhost:8500
```
The services endpoints are at:
```
http://localhost/services
```
ie:
```bash
curl --request POST \
  --url http://localhost:80/services/taxes/v1/vat \
  --header 'cache-control: no-cache' \
  --header 'content-type: application/json' \
  --data '{"net": "1000"}'
```

## Ecomm

The ecomm services has been linked as submodules to this project.
 
To test them:

```bash
cd ecomm
docker-compose up
curl --request POST \
  --url http://localhost:80/services/catalog/v1/category \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21pY3JvYmFzZS5pbyIsInN1YiI6InVzZXIiLCJzY29wZSI6ImFwaSIsImp0aSI6ImZmYjVhOTQxLTQwYWMtNDBjNy1iMDNiLWIzZjdiMTdlOGRlMCIsImlhdCI6MTQ2NDYwNzU1MCwiZXhwIjoxNDk2MTQzNTUwfQ.kgFdYAGjwLC7wrY2gcm-8swDzwSCuEwLhgSx10rKZew' \
  --data '{"title": "Category 01", "description": "This is the Category 01", "slug": "category01", "parent": "ROOT"}'
```

The `authorizarion` header is based on the default security configuration. It should be changed in production.

### Ecomm repositories:

[Cart Service](https://github.com/ncornag/micro-cart-service)

[Stock Service](https://github.com/ncornag/micro-stock-service)

[Catalog Service](https://github.com/ncornag/micro-catalog-service)

[Oauth Service](https://github.com/ncornag/micro-oauth-service)


## Code documentation

The code is documented with `docco` and can be accessed [here](https://rawgit.com/ncornag/micro-base/develop/docs/index.js.html)

## Tests

Shamefully, no tests yet.

## How to

1. Install the framework:

  ```bash
  npm i -S micro-base
  ```

2. Create an `index.js` file with the following content:

  ```javascript
  const base = require('micro-base')();

  // Add operations
  base.services.add(require('./operations/new')(base));

  // Return express app for easy testing
  module.exports = base;
  ```

3. Implement the `operations/new/index.js`

  ```javascript
  function opFactory(base) {
  
    const op = {
      name: 'new',
      path: '/',
      method: 'POST'
      handler: (msg, reply) => {
        // Implementation here. i.e.:
        // save(msg);
        // reply('Cart saved').code(200);
      }
    };
    return op;
  }
  
  // Exports the factory
  module.exports = opFactory;
  ```

4. Configure the service in `config/defaults.js`
   
   ```json
   {
     "services": {
       "name": "cart",
       "version": "v1"
     }
   }
   ```
    
5. Start the application

  ```
  node index.js
  ```

6. Access the service operations

  ```
  curl --request POST \
    --url http://localhost:3000/services/cart/v1 \
    --header 'content-type: application/json' \
    --header 'accept: application/json' \
    --data '{user: '100'}'
  ```

## Modules

### config

The configuration properties are handled with `nconf`. Out of the box, when used in a service, the
framework reads the following files:

```
config/${NODE_ENV:development}.json
config/default.json
node_modules/micro-base/modules/config/defaults.json
```

The service also reads the environment variables and command line parameters.

Each file in the list provides sensitive defaults for the previous one.
The first file can be customized changing the value of the `NODE_ENV` environment variable.
ie: If `NODE_ENV` is `prod`, the config file used will be `config/prod.json`. If unsetted, the file
`config/development.json`

#### Use

In the application, get the configured values using the `nconf` interface:

```javascript
const maxQuantityPerProduct = base.config.get('hooks:preAddEntry:maxQuantityPerProduct');
```

### db

The service uses `Mongoose` framework. The connection configuration parameters must be set in the
`db` key of the configuration properties.

#### Basic parameters

```json
"db": {
  "host": "localhost",
  "db": "micro"
}
```

#### Full parameters

```json
"db": {
  "host": "localhost",
  "db": "micro",
  "port": 27017,
  "user": "xxxx",
  "password": "xxxx",
  "debug": false
}
```

When the `debug` configuration is set to `true`, the framework will logs the commands sent to the
database.

```
2016-05-18T23:22:01.321Z - debug: [db-mongo] reserves.find({"expirationTime":{"$lt":"2016-05-19T13:22:01.321Z"},"state":"ISSUED"})
```

#### Use

In the application, use the `mongoose` interface:

Register models
```javascript
const Cart = require(base.config.get('models:cartModel'))(base);
```

Use the models
```javascript
base.db.models.Cart
.find({id: 'ByQpDBcM'})
.exec()
.then(reserves => {
  // Do something
})
.catch(error => {
  base.logger.error(error);
});

```

### logger

The service uses `Winston` to log messages to the console.

#### Use

In the application, use the `winston` interface:

```
base.logger.info(`[server-http] running at: [${server.info.uri}${base.config.get('services:path')}]`);
```

### workers

The service uses a combination `monq` and `cron` npm modules to schedule jobs.

#### Use

Configure the job launch times in the `workers` key:
```json
"workers": [
  {
    "worker": "expireCart",
    "queue": "expireCart",
    "when": [
      "0 */1 * * * *"
    ]
  }]
```

The time zone is UTC.

Configure the jobs in the application:
```javascript
const worker = base.workers.jobs.worker(['expireCart']);
worker.register({
  expireCart: (params, done) => {
    // Do the work
    done();
  }
});
worker.start();
```

### services

The service use the `Hapi` framework to expose and call the service operations.

#### Use

You must register your operation in the framework with the `add` or the `addModule` methods.

#### add method

```javascript
const operation = {
  name: 'set',
  schema: require('myJsonSchema'),
  handler: (msg, reply) => {
    // Do something
    reply();
  }
};

base.services.add(operation);
```

The framework creates a `Hapi` route with the following details:

* method: ['GET', 'POST', 'PUT']
* path: The path is built with the concatenation of the following data:
  * services base path: `base.config.get('services:path')` Default: `/services`
  * service name:  `base.config.get('services:name'`)
  * service version:  `base.config.get('services:version'`)
  * operation name: the provided `name`

  In example: `/services/cart/v1/new`

* handler: The provided `handler`
* config: The operation is also configured with the `ratify` json schema validator
  * schema: the `schema` provided

#### addModule method

If all your operations are inside a module, you can add all of them at once:

```javascript
function cartService(base) {
  const new = {
    name: 'set'
    ...
  };
  const get = {
    name: 'get'
    ...
  };
  return [set, get]
}
```

```javascript
const cartFactory = require('./modules/cartService');
base.services.addModule(stockFactory(base));
```

#### Calling another service

You can call another `micro-base` service using the `call` method

```javascript
base.services.call('stock:reserve', {
  productId,
  quantity,
  warehouse,
  reserveStockForMinutes
}).then(response => {
  // Do something
});
```

* If there is only one word in the name of the service to call (ie: `'get'` ), or the name of the
service is the same as the name of the current service (ie `'cart:get'`) it's asumed as an
internal call (an operation hosted in the same application) and not an http connection.
* If the service name is not the one defined for this application (ie: `'stock:reserve'`)
* If you want to specify the service version to call, put the version after the service name (ie
`'stock:v2:reserve'`). The default is `v1`.


