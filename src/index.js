const path = require('path');

module.exports = function (options) {
  options = options || {};
  /*
   options = options || {
   config: Configuration service,
   logger: Logger service,
   db:     Database service,
   module: Initial operations from a module
   };
   */
  const base = {};

  // Configuration object
  var rootPath = path.dirname(require.main.filename);
  if (rootPath.lastIndexOf('node_modules') != -1) {
    rootPath = rootPath.substr(0, rootPath.lastIndexOf('node_modules') - 1);
  }
  base.config = options.config || require('./modules/config')([
      `${rootPath}/config/${process.env.NODE_ENV || 'development'}.json`,
      `${rootPath}/config/defaults.json`
    ]);

  // Util service
  base.utils = options.utils || require('./modules/utils')(base);

  // Logger service
  base.logger = options.logger || require('./modules/logger')(base);

  // Logstash depends on logger
  base.logstash = options.logstash || require('./modules/logstash')(base);

  // Cache service
  base.cache = options.cache || require('./modules/cache')(base);

  // Bus service
  base.bus = options.bus || require('./modules/bus')(base);

  // Database service
  base.db = options.db || require('./modules/db')(base);

  // Search service
  base.search = options.search || require('./modules/search')(base);

  // Transports
  base.transports = {};
  base.transports.http = (options.transports && options.transports.http)
    ? options.transports.http : require('./modules/transports/http.js')(base);

  // Services service
  base.services = options.services || require('./modules/services')(base);

  // Workers service
  base.workers = options.workers || require('./modules/workers')(base);

  return base;
};
