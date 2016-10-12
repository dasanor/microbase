const winston = require('winston');

module.exports = function (base) {

    if (!base.config.get('logstash')) {
        base.logger.info('[logstash] database properties not configured');
        return
    }

    require('winston-logstash');

    var logstashConfig = base.config.get('logstash');

    base.logger.debug('[logstash] Current logstash configuration: ' + JSON.stringify(logstashConfig));


    base.logger.add(winston.transports.Logstash, {
        logstashConfig
    });
};