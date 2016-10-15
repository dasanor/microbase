const winston = require('winston');

module.exports = function (base) {
  if (!base.config.get('logstash')) {
    base.logger.warn('[logstash] database properties not configured');
    return;
  }
  const logstashConfig = base.config.get('logstash');
  //console.log(logstashConfig);
  base.logger.info(`[logstash] connecting to [${logstashConfig.host}:${logstashConfig.port}]`);
  
  require('winston-logstash');
  base.logger.add(winston.transports.Logstash, logstashConfig);
};