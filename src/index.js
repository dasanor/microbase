const os = require('os');
const path = require('path');

module.exports = function (options) {
  options = options || {};
  const base = {
    extra: options.extra
  };

  // Fake log
  base.log = (level, msg) => {
    const levels = {
      debug: '\u001b[34mdebug\u001b[39m',
      warn: '\u001b[33mwarn\u001b[39m',
      info: '\u001b[32minfo\u001b[39m',
      error: '\u001b[31merror\u001b[39m'
    };
    console.log(`${new Date().toISOString()} - ${levels[level]}: [${os.hostname()}] ${msg}`);
  };

  // Logs microbase start
  base.version = require('./package.json').version;
  base.log('info', `[main] Microbase ${base.version} starting`);

  // Configuration object
  let rootPath = path.dirname(require.main.filename);
  if (rootPath.lastIndexOf('node_modules') != -1) {
    rootPath = rootPath.substr(0, rootPath.lastIndexOf('node_modules') - 1);
  }
  base.config = options.config || require('./modules/config')([
      `${rootPath}/config/${process.env.NODE_ENV || 'development'}.json`,
      `${rootPath}/config/defaults.json`
    ], base);

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
  base.transports.amqp = (options.transports && options.transports.amqp)
    ? options.transports.amqp : require('./modules/transports/amqp.js')(base);

  // Services service
  base.services = options.services || require('./modules/services')(base);

  // Workers service
  base.workers = options.workers || require('./modules/workers')(base);

  return base;
};
