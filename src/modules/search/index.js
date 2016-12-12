const elasticsearch = require('elasticsearch');

module.exports = function (base) {
  if (!base.config.get('search')) {
    base.logger.warn('[search] search properties not configured');
    return;
  }

  const logLevelsConversion = {
    silly: 'debug',
    debug: 'debug',
    verbose: 'trace',
    info: 'info',
    warn: 'warning',
    error: 'error'
  };

  const host = base.config.get('search:host');
  var client = new elasticsearch.Client({
    host: host,
    log: logLevelsConversion[base.config.get('logger:level')]
  });

  base.logger.info(`[search] initialized in '${host}'`);
  return client;
};

