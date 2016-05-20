# micro-base

Micro-base is a small framework developed as a Node.js module, to define and call services, and give
basic utilities like config, logging, jobs and MongoDB access.

It can be used as a base to implement applications with a microservices style architecture.

Real world examples of use could be found here:

[micro-cart-service](https://github.com/ncornag/micro-cart-service/tree/develop)

[micro-stock-service](https://github.com/ncornag/micro-stock-service/tree/develop)


## Code documentation

The code is documented with `docco` and can be accessed [here](https://rawgit.com/ncornag/micro-base/develop/docs/index.js.html)

## Tests

Shamefully, no tests yet.

## How to

1. Install the framework:

  ```
  install i -S micro-base
  ```

2. Create an `index.js` file with the following content:

  ```javascript
  const baseFactory = require('micro-base');
  const cartFactory = require('./modules/cart');

  // Instantiate micro-base
  const base = baseFactory();

  // Add operations
  base.services.addModule(cartFactory(base));

  // Return express app for easy testing
  module.exports = base.app;
  ```

3. Implement the `modules/cart.js`

4. Start the application

  ```
  node index.html
  ```

5. Access the service operations

  ```
  curl --request POST \
    --url http://localhost:3000/services/cart/v1/new \
    --header 'content-type: application/json' \
    --header 'accept: application/json' \
    --data '{}'
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


