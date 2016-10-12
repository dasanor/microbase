const os = require("os");
const winston = require('winston');
const cls = require('continuation-local-storage');

module.exports = function (base) {
  const ns = cls.getNamespace('microbase') || cls.createNamespace('microbase');
  const serviceName = base.config.get('services:name') + ':' + base.config.get('services:version');
  const hostName = os.hostname();
  const level = base.config.get('logger:level');

  const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        level: level,
        json: false,
        timestamp: true,
        colorize: true
      })
    ],
    exceptionHandlers: [
      new (winston.transports.Console)({
        level: level,
        json: false,
        timestamp: true,
        colorize: true,
        silent: false,
        prettyPrint: true
      })
    ],
    exitOnError: false
  });

  logger.isDebugEnabled = function() {
    return level === 'debug';
  };

  logger.log = function () {
    const args = arguments;
    const rid = ns.get('x-request-id');
    const sessionId = rid ? ' [' + rid + ']' : '';
    args[1] = `[${hostName}] [${serviceName}]${sessionId} ${args[1]}`;
    winston.Logger.prototype.log.apply(this, args);
  };

  logger.info('[logger] initialized with [%s] level', level);
  return logger;
};

