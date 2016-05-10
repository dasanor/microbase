'use strict';

var path = require('path');

module.exports = function (options) {
  options = options || {};
  /*
    options = options || {
      config: Configuration Object
      logger: Logger service
      module: Initial operations from a module
    };
  */
  const base = {};

  // Configuration object
  var rootPath = path.dirname(require.main.filename);
  base.config = options.config || require('./modules/config')([
       rootPath + '/config/' + (process.env.NODE_ENV || 'local') + '.json',
       rootPath + '/config/defaults.json'
     ]);

  // Logger service
  base.logger = options.logger || require('./modules/logger')(base);

  // Services service
  base.services = options.services || require('./modules/services')(base);

  // Initial operations
  if (options.module) {
    const module = options.module(base);
    base.services.addModule(module);
  }

  // Global error handler
  process.on('uncaughtException', function (err) {
    console.error('An uncaught error occurred!');
    console.error(err.stack);
    process.exit(1);
  });

  return base;
};
