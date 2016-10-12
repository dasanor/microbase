const mongoose = require('mongoose');
const shimmer = require('shimmer');
const cls = require('continuation-local-storage');
const ns = cls.getNamespace('microbase') || cls.createNamespace('microbase');

function dbService(base) {
  if (!base.config.get('db')) {
    base.logger.info(`[db-mongo] database properties not configured`);
    return
  }
  const url = getMongoUrl(base.config.get('db'), true);
  base.logger.info(`[db-mongo] connecting to [${getMongoUrl(base.config.get('db'))}]`);

  // Use native Promises
  mongoose.Promise = global.Promise;
  patchMPromise(ns);

  // DB
  mongoose.connect(url);
  //  mongoose.set('debug', true);
  if (base.config.get('logger:level') === 'debug') {
    mongoose.set('debug', function (collectionName, method, query, doc, options) {
      base.logger.debug(`[db-mongo] ${collectionName}.${method}(${JSON.stringify(query)})`, doc);
    });
  }

  // If the Node process ends, close the Mongoose connection
  process.on('SIGINT', function () {
    mongoose.connection.close(function () {
      base.logger.debug('[db-mongo] default connection disconnected through app termination');
      process.exit(0);
    });
  });

  mongoose.url = url;

  return mongoose;
}

function patchMPromise(ns) {

  if (typeof ns.bind !== 'function') {
    throw new TypeError("must include namespace to patch Mongoose against");
  }

  shimmer.wrap(mongoose.Mongoose.prototype.Query.prototype, 'exec', function (original) {
    return function (op, callback) {
      if (typeof op == 'function') op = ns.bind(op);
      if (typeof callback == 'function') callback = ns.bind(callback);
      return original.call(this, op, callback);
    };
  });

  shimmer.wrap(mongoose.Mongoose.prototype.Query.base, '_wrapCallback', function (original) {
    return function (method, callback, queryInfo) {
      if (typeof callback == 'function') callback = ns.bind(callback);
      return original.call(this, method, callback, queryInfo);
    };
  });

  shimmer.wrap(mongoose.Mongoose.prototype.Model.prototype, 'save', function (original) {
    return function (op, callback) {
      if (typeof op == 'function') op = ns.bind(op);
      if (typeof callback == 'function') callback = ns.bind(callback);
      return original.call(this, op, callback);
    };
  });
}

function getMongoUrl(config, withCredentials) {
  if (config.url) {
    return config.url;
  } else {
    return 'mongodb://'
       + (withCredentials ? (config.user ? config.user + ':' + config.password + '@' : '') : '')
       + config.host
       + (config.port ? ':' + config.port : '')
       + '/' + config.db;
  }
}

module.exports = dbService;
