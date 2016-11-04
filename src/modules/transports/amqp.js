const url = require('url');
const amq = require('amq');
const cls = require('continuation-local-storage');

module.exports = function (base) {

  // request storage
  const ns = cls.getNamespace('microbase') || cls.createNamespace('microbase');

  const configUrl = base.config.get('transports:amqp:url');
  base.logger.info(`[amqp] running at ${configUrl}`);

  const parsedUrl = url.parse(configUrl);
  const connection = amq.createConnection({
    host: parsedUrl.hostname,
    port: parsedUrl.port,
    login: parsedUrl.auth ? parsedUrl.auth : '',
    vhost: parsedUrl.path ? parsedUrl.path.substring(1) : '',
    ssl: parsedUrl.protocol == 'amqps',
    debug: base.logger.isDebugEnabled()
  }, {
    reconnect: { strategy: 'constant', initial: 1000 }
  });

  const rpc = connection.rpc();

  function use(operationFullName, op) {
    base.logger.info(`[amqp] added service [${operationFullName}] in [rcp-${operationFullName}]`);
    rpc.expose(`rcp-${operationFullName}`, function (payload) {
      const headers = {};
      if (payload._headers) {
        headers['x-request-id'] = payload._headers['x-request-id'];
        headers['authorization'] = payload._headers['authorization'];
        delete payload._headers;
      }
      base.logger.info(`[amqp] ${operationFullName} with ${JSON.stringify(payload)}`);
      return new Promise((resolve, reject) => {
        ns.run(function () {
          ns.set('x-request-id', headers['x-request-id']);
          ns.set('authorization', headers['authorization']);
          op.handler(
            payload,
            resolve,
            { headers }
          )
        })
      });
    })
  }

  function call(config, msg) {
    const { serviceName, serviceVersion, operationName } = base.services.splitOperationName(config.name);
    const operationFullName = base.services.getOperationFullName(serviceName, serviceVersion, operationName);
    if (base.logger.isDebugEnabled()) base.logger.debug(`[amqp] calling ${operationFullName} with ${JSON.stringify(msg)}`);
    return new Promise((resolve, reject) => {
      const headers = {
        'x-request-id': ns.get('x-request-id'),
        authorization: ns.get('authorization')
      };
      const options = { headers };
      msg._headers = headers; // hack to get the headers in rpc.expose
      rpc.call(`rcp-${operationFullName}`, msg, options)
        .then(response => {
          ns.run(function () {
            ns.set('x-request-id', headers['x-request-id']);
            ns.set('authorization', headers['authorization']);
            resolve(response)
          })
        })
    });
  }

  return {
    app: rpc,
    use,
    call
  };
}
;
