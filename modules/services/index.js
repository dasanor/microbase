const Hapi = require('hapi');
const Wreck = require('wreck');

// TODO: Refactor to split the service and the transports

module.exports = function (base) {

  const wreck = Wreck.defaults({
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  const gatewayHost = base.config.get('gateway:host');
  const gatewayPort = base.config.get('gateway:port');
  const gatewayBasePath = base.config.get('gateway:path');
  const serviceBasePath = base.config.get('services:path');
  const gatewayBaseUrl = `http://${gatewayHost}:${gatewayPort}`;

  const getOperationUrl = (basePath, service, version, operation) =>
     `${basePath}/${service}/${version}/${operation}`;
  const getOperationFullName = (serviceName, serviceVersion, operationName) =>
     `${serviceName}:${serviceVersion}:${operationName}`;
  const splitOperationName = name => {
    const s = name.split(':')
    let serviceName, serviceVersion = 'v1', operationName;
    if (s.length === 1) {
      serviceName = operationName = s[0];
    } else if (s.length === 2) {
      serviceName = s[0];
      operationName = s[1];
    } else {
      serviceName = s[0];
      serviceVersion = s[1];
      operationName = s[2];
    }
    return {serviceName, serviceVersion, operationName};
  };

  const service = {
    name: base.config.get('services:name'),
    version: base.config.get('services:version'),
    operations: new Set()
  };

  const server = new Hapi.Server();
  server.connection({
    host: base.config.get('services:host'),
    port: base.config.get('services:port')
  });

  server.register([
    {
      register: require('ratify'),
      options: {}
    }, {
      register: require('good'),
      options: {
        ops: {
          interval: 1000
        },
        reporters: {
          console: [{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{log: '*', request: '*', response: '*'}]
          }, {
            module: 'good-console'
          }, 'stdout']
        }
      }
    }], (err) => {
    if (err) {
      throw err; // something bad happened loading the plugin
    }
    server.start((err) => {
      if (err) {
        throw err;
      }
      base.logger.info(`[server-http] running at: [${server.info.uri}${base.config.get('services:path')}]`);
    });
  });

  // Call internal or external services
  service.call = function (name, msg) {
    let {serviceName, serviceVersion, operationName} = splitOperationName(name);
    const operationFullName = getOperationFullName(serviceName, serviceVersion, operationName);
    if (service.operations.has('operationFullName')) {
      // Its a local service
      const operationUrl = getOperationUrl(serviceBasePath, serviceName, serviceVersion, operationName);
      return server.inject({
        url: operationUrl,
        payload: msg,
        method: 'POST',
      }).then(response => {
        return new Promise(resolve => {
          return resolve(response.result, response);
        });
      });
    } else {
      // It's a remote operation
      return new Promise((resolve, reject) => {
        const operationUrl = getOperationUrl(gatewayBasePath, serviceName, serviceVersion, operationName);
        wreck.post(
           `${gatewayBaseUrl}${operationUrl}`,
           {
             payload: JSON.stringify(msg),
             json: 'smart'
           },
           (error, response, payload) => {
             if (error) return reject(error);
             return resolve(payload, response);
           })
        ;
      });
    }
  };

  // Add all the operations inside a module
  service.addModule = function (module) {
    for (var op of module) {
      service.add(op);
    }
  };

  // Add operation method
  service.add = function (op) {
    const operationUrl = getOperationUrl(serviceBasePath, service.name, service.version, op.name)
    base.logger.info(`[services] added service [${service.name}:${service.version}:${op.name}] in [${operationUrl}]`);
    service.operations.add(getOperationFullName(service.name, service.version, op.name));
    server.route({
      method: ['GET', 'POST', 'PUT'],
      path: operationUrl,
      handler: (request, reply) => {
        return op.handler(request.payload || {}, reply, request);
      },
      config: {
        plugins: {
          ratify: op.schema || {}
        }
      }
    });
  };

  // Load a module
  service.loadModule = function(key) {
    if (!key) return null;
    const name = base.config.get(key);
    if (name.startsWith('.')) {
      return require(`${base.config.get('rootPath')}/${name}`)(base)
    } else {
      return require(name)(base);
    }
  };

  return service;
};
