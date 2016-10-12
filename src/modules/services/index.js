const path = require('path');
const glob = require('glob');

module.exports = function (base) {

  const service = {
    name: base.config.get('services:name'),
    version: base.config.get('services:version'),
    operations: new Map()
  };

  const getOperationFullName = (serviceName, serviceVersion, operationName) =>
    `${serviceName}:${serviceVersion}:${operationName}`;

  // Add wrappers
  const wrappersFns = new Map();
  const wrappers = [];
  const config = base.config.get('services:wrappers');
  Object.keys(config).forEach(wrapperName => {
    const m = base.utils.loadModule(`services:wrappers:${wrapperName}`);
    wrappers.push(wrapperName);
    wrappersFns.set(wrapperName, m);
  });

  // Add wrappers to operations
  function addWrappers(op) {
    // Loop the wrappers
    for (let w = wrappers.length; w > 0; w--) {
      const wrapperName = wrappers[w - 1];
      if (op[wrapperName]) {
        // Apply the wrapper if we have a configuration
        const wrapper = wrappersFns.get(wrapperName);
        const originalFn = op.handler;
        const handler = wrapper.handler(op[wrapperName]);
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
  service.addOperation = function (op, transports = ['http']) {
    const operationFullName = getOperationFullName(service.name, service.version, op.name);
    base.logger.info(`[services] added service [${operationFullName}]`);
    service.operations.set(operationFullName, addWrappers(op));
    transports.forEach(transport => {
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
  service.call = function (config, msg) {
    const transport = config.transport || 'http';
    return base.transports[transport].call(config, msg);
  };

  // Add a ping operation to allow health checks and keep alives
  service.addOperation({
    name: 'micro.ping',
    public: true,
    handler: (msg, reply) => {
      return reply({ answer: 'pong' });
    }
  });

  if (base.logger.isDebugEnabled()) {
    service.addOperation({
      name: 'micro.config',
      public: true,
      handler: (msg, reply) => {
        return reply({ answer: base.config.get() });
      }
    });
  }

  return service;
};
