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

  // Add inMiddlewares
  const inMiddlewaresFns = new Map();
  const inMiddlewares = [];
  const inMiddlewaresBaseKey = 'services:inMiddlewares';
  Object.keys(base.config.get(inMiddlewaresBaseKey)).forEach(middlewareName => {
    base.logger.info(`[services] loading in middleware '${middlewareName}'`);
    inMiddlewares.push(middlewareName);
    const m = base.utils.loadModule(`${inMiddlewaresBaseKey}:${middlewareName}`);
    inMiddlewaresFns.set(middlewareName, m);
  });

  // Add middlewares to operations
  function addInMiddlewares(operationFullName, op) {
    for (let w = inMiddlewares.length; w > 0; w--) {
      const middlewareName = inMiddlewares[w - 1];
      if (op[middlewareName] || middlewareName.indexOf('system-') == 0) {
        // Apply the middleware if we have a configuration or is a system one
        const middleware = inMiddlewaresFns.get(middlewareName);
        const originalFn = op.handler;
        const handler = middleware.handler(op[middlewareName] || { operationFullName });
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
    service.operations.set(operationFullName, addInMiddlewares(operationFullName, op));
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

  // Default transport for out calls
  const defaultOutTransport = base.config.get('services:defaultOutTransport');

  // Call transport out middleware
  function callTransportOutMiddleware(context, next) {
    const transport = context.config.transport || defaultOutTransport;
    base.transports[transport]
      .call(context.config, context.msg)
      .then(response => {
        context.response = response;
        next();
      })
      .catch(error => next(error));
  }

  // Create the out calls chain
  const callChain = new base.utils.Chain().use('services:outMiddlewares');
  callChain.use(callTransportOutMiddleware);

  // Call other services
  service.call = (config, msg) =>
    callChain
      .exec({ config, msg })
      .then(context => context.response);

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
