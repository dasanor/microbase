const path = require('path');
const glob = require('glob');

module.exports = function (base) {
  const service = {
    name: base.config.get('services:name'),
    version: base.config.get('services:version'),
    operations: new Map(),
    splitOperationName: name => {
      const s = name.split(':');
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
    },
    getOperationFullName: (serviceName, serviceVersion, operationName) =>
      `${serviceName}:${serviceVersion}:${operationName}`
  };

  // Add wrappers
  const wrappersFns = new Map();
  const wrappers = [];
  const wrappersBaseKey = 'services:wrappers';
  Object.keys(base.config.get(wrappersBaseKey)).forEach(wrapperName => {
    base.logger.info(`[services] loading wrapper '${wrapperName}'`);
    const m = base.utils.loadModule(`${wrappersBaseKey}:${wrapperName}`);
    wrappers.push(wrapperName);
    wrappersFns.set(wrapperName, m);
  });

  // Add wrappers to operations
  function addWrappers(operationFullName, op) {
    // Loop the wrappers
    for (let w = wrappers.length; w > 0; w--) {
      const wrapperName = wrappers[w - 1];
      if (op[wrapperName] || wrapperName.indexOf('system-') == 0) {
        // Apply the wrapper if we have a configuration
        const wrapper = wrappersFns.get(wrapperName);
        const originalFn = op.handler;
        const handler = wrapper.handler(op[wrapperName] || { operationFullName });
        op.handler = function (params, reply, request) {
          handler(params, reply, request, function next(newReply) {

            function replyHandler(response) {
              // Special care with the custom reply exceptions
              if (newReply) {
                try {
                  newReply(response);
                } catch (err) {
                  reply(base.utils.genericResponse(null, {
                    message: err.message,
                    statusCode: 500,
                    stack: err.stack
                  }));
                }
              } else {
                reply(response);
              }
            }

            originalFn(params, replyHandler, request);
          });
        };
      }
    }
    return op;
  }

  // Add operation method
  const defaultTransports = base.config.get('services:defaultTransports');
  service.addOperation = function (op, transports = defaultTransports) {
    const operationFullName = service.getOperationFullName(service.name, service.version, op.name);
    base.logger.info(`[services] added service [${operationFullName}]`);
    service.operations.set(operationFullName, addWrappers(operationFullName, op));
    const usedTransports = op.transports || transports;
    usedTransports.forEach(transport => {
      base.transports[transport].use(operationFullName, op);
    })
  };

  // Add all the operations inside a module
  service.addOperations = function (module, transports = ['http']) {
    for (let op of module) {
      service.addOperation(op, transports);
    }
  };

  // For given folder name each file exports an operation. Name resolved to filename if no one is provided
  service.addOperationsFromFolder = function (folder = base.config.get('services:defaultFolder'), transports) {
    const rootPath = base.config.get('rootPath');
    glob(`${rootPath}/${folder}/*.js`, {}, (err, files) => {
      files.forEach((file) => {
        const operation = require(file)(base);
        operation.name = operation.name || path.basename(file, '.js');
        service.addOperation(operation, transports);
      })
    });
  };

  // Add proxy to transport call
  const defaultCallTransport = base.config.get('services:defaultCallTransport');
  service.call = function (config, msg) {
    const { serviceName, serviceVersion, operationName } = service.splitOperationName(config.name);
    const transport = config.transport || defaultCallTransport;
    return base.transports[transport].call(config, msg);
  };

  // Add a ping operation to allow health checks and keep alives
  service.addOperation({
    name: 'micro.ping',
    transports: ['http'],
    public: true,
    handler: (msg, reply) => {
      return reply({ answer: 'pong' });
    }
  });

  if (base.logger.isDebugEnabled()) {
    service.addOperation({
      name: 'micro.config',
      transports: ['http'],
      public: true,
      handler: (msg, reply) => {
        return reply({ answer: base.config.get() });
      }
    });
  }

  return service;
};
