const mongoose = require('mongoose');

function dbService(base) {
  if (!base.config.get('db')) {
    base.logger.info(`[db-mongo] database properties not configured`);
    return
  }
  const url = getMongoUrl(base.config.get('db'), true);
  base.logger.info(`[db-mongo] connecting to [${getMongoUrl(base.config.get('db'))}]`);

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

  return mongoose;
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
