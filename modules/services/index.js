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

  const getOperationUrl = (basePath, serviceName, serviceVersion, operationName, operationPath) =>
    `${basePath}/${serviceName}/${serviceVersion}${operationPath !== undefined ? operationPath : '/' + operationName}`;
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
    return { serviceName, serviceVersion, operationName };
  };

  const service = {
    name: base.config.get('services:name'),
    version: base.config.get('services:version'),
    operations: new Set()
  };

  const server = service.server = new Hapi.Server();
  server.connection({
    host: base.config.get('services:host'),
    port: base.config.get('services:port')
  });

  // Custom error responses
  server.ext('onPreResponse', (request, reply) => {

    const response = request.response;
    if (!response.isBoom) {
      return reply.continue();
    }

    if (response.data) {
      Object.assign(response.output.payload, response.data);
      response.reformat();
    }

    return reply(response);
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
            args: [{ log: '*', request: '*', response: '*', error: '*' }]
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
        if (base.logger.isDebugEnabled()) base.logger.debug(`[services] calling ${gatewayBaseUrl}${operationUrl} with ${JSON.stringify(msg)}`);
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

  // Routes configuration
  const routeConfig = (schema) => {
    return {
      plugins: {
        ratify: schema || {}
      }
    }
  };

  // Routes handler
  const routeHandler = (handler) => (request, reply) => {
    let payload = request.payload || {};
    Object.assign(payload, request.params);
    return handler(payload || {}, reply, request);
  };

  // Routes style
  const routesStyle = base.config.get('services:style');

  // Add operation method
  service.add = function (op) {
    const operationFullName = getOperationFullName(service.name, service.version, op.name);
    let operationUrl, operationMethod;
    if (routesStyle === 'REST') {
      // REST style
      operationUrl = getOperationUrl(serviceBasePath, service.name, service.version, op.name, op.path);
      operationMethod = op.method || 'POST';
    } else {
      // RPC style
      operationUrl = getOperationUrl(serviceBasePath, service.name, service.version, op.name, undefined);
      operationMethod = 'POST';
    }
    base.logger.info(`[services] added service [${operationFullName}] in [${operationMethod}][${operationUrl}]`);
    // Add the operation to this service operations
    service.operations.add(operationFullName);
    // Add the Hapi route, mixing parameters and payload to call the handler
    server.route({
      method: operationMethod,
      path: operationUrl,
      handler: routeHandler(op.handler),
      config: routeConfig(op.schema)
    });
  };

  // Load a module
  service.loadModule = function (key) {
    if (base.logger.isDebugEnabled()) base.logger.debug(`[services] loading module from ${key}`);
    if (!key) return null;
    const name = base.config.get(key);
    if (name.startsWith('.')) {
      const modulePath = `${base.config.get('rootPath')}/${name}`;
      try {
        return require(modulePath)(base)
      } catch (e) {
        base.logger.error(`[services] module '${modulePath}' not found`)
        return false;
      }
    } else {
      return require(name)(base);
    }
  };

  return service;
};
