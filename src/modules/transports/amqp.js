const url = require('url');
const amqp = require('amqp-rpc');

module.exports = function (base) {

  const configUrl = base.config.get('transports:amqp:url');

  base.logger.info(`[amqp] running at ${configUrl}`);

  const rpc = amqp.factory({
    url: configUrl,
    hearthbeat: 10
  });

  function use(operationFullName, op) {
    base.logger.info(`[amqp] added service [${operationFullName}] in [${operationFullName}]`);
    rpc.on(operationFullName, function (payload, cb, inf) {
      op.handler(payload, (response) => {
        cb(response);
      }, { headers: {} });
    });
  }

  function call(config, msg) {
    const { serviceName, serviceVersion, operationName } = base.services.splitOperationName(config.name);
    const operationFullName = base.services.getOperationFullName(serviceName, serviceVersion, operationName);
    if (base.logger.isDebugEnabled()) base.logger.debug(`[amqp] calling [${operationFullName}] with ${JSON.stringify(msg)}`);
    return new Promise((resolve, reject) => {
      rpc.call(operationFullName, msg, function (msg) {
        resolve(msg);
      });
    });
  }

  return {
    app: rpc,
    use,
    call
  };
}
;
