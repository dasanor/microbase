const express = require('express');
//const multer = require('multer');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const shortid = require('shortid');
const cls = require('continuation-local-storage');
const jwt = require('express-jwt');
const Wreck = require('wreck');

module.exports = function (base) {

  // request storage
  const ns = cls.getNamespace('microbase') || cls.createNamespace('microbase');

  // Service data
  const serviceBasePath = base.config.get('transports:http:path');
  const serviceName = base.config.get('services:name');
  const serviceVersion = base.config.get('services:version');
  const routesStyle = base.config.get('transports:http:style');

  // Call services variables
  const wreck = Wreck.defaults({
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  const gatewayHost = base.config.get('gateway:host');
  const gatewayPort = base.config.get('gateway:port');
  const gatewayBasePath = base.config.get('gateway:path');
  const gatewayUrlOverrride = base.config.get('gateway:gatewayUrlOverrride');
  const remoteCallsTimeout = base.config.get('gateway:timeout');
  let getGatewayBaseUrl;
  if (gatewayUrlOverrride) {
    getGatewayBaseUrl = base.utils.loadModule('gateway:gatewayUrlOverrride');
  } else {
    const gatewayBaseUrl = `http://${gatewayHost}:${gatewayPort}`;
    getGatewayBaseUrl = () => gatewayBaseUrl;
  }

  // Helpers
  const getOperationUrl = (basePath, serviceName, serviceVersion, operationName, operationPath) =>
    `${basePath}/${serviceName}/${serviceVersion}/${operationName}${operationPath !== undefined ? operationPath : ''}`;
  const splitOperationName = name => {
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
  };

  // TODO: call external services

  const app = express();

  app.use(bodyParser.json());                         // for parsing application/json
  app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  //app.use(multer());                                  // for parsing multipart/form-data
  // TODO: cors

  // Overwrite the powered-by header
  app.use(function (req, res, next) {
    res.set('X-Powered-By', 'microbase');
    next();
  });

  const router = express.Router();

  // Log HTTP requests
  app.use(expressWinston.logger({
    winstonInstance: base.logger,
    msg: base.config.get('transports:http:logpattern'),
    meta: false
  }));

  app.use(router);

  // Error handler for 401s
  app.use(function errorHandler(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ ok: false, error: 'invalid_token' });
    }
    next();
  });

  // Log Errors
  app.use(expressWinston.errorLogger({
    transports: [
      new (winston.transports.Console)({
        json: false,
        timestamp: true,
        colorize: true,
        silent: false,
        prettyPrint: true
      })
    ]
  }));

  // Error handler
  app.use(function errorHandler(err, req, res, next) {
    // console.log('============================');
    // console.log(err);
    // if (err.name === 'UnauthorizedError') {
    //   return res.status(401).json({ ok: false, error: 'invalid_token' });
    // }
    if (err.status) res.statusCode = err.status;
    if (res.statusCode < 400) res.status(500);
    const error = { message: err.message };
    for (let prop in err) error[prop] = err[prop];
    res.json({ ok: false, error: error });
  });

  // HTTP server listen
  app.listen(base.config.get('transports:http:port'), base.config.get('transports:http:host'), function () {
    base.logger.info(`[http] running at ${this.address().address}:${this.address().port}${base.config.get('services:path')}`);
  });

  // Add operation method
  function use(operationFullName, op) {
    const operationMethod = routesStyle === 'REST' ? (op.method || 'post').toLowerCase() : 'all';
    const operationUrl = getOperationUrl(serviceBasePath, serviceName, serviceVersion, op.name, op.path);
    base.logger.info(`[services] added ${routesStyle} service [${operationFullName}] in [${operationMethod}][${operationUrl}]`);
    // Add the route, mixing parameters and payload to call the handler
    router[operationMethod](
      operationUrl,
      // TODO: database tokens / scope
      jwt({ secret: base.config.get('token:secretKey') }),
      (req, res, next) => {

        // wrap the events from request and response
        ns.bindEmitter(req);
        ns.bindEmitter(res);
        ns.run(function () {
          if (!req.headers['x-request-id']) {
            // Create CID
            req.headers['x-request-id'] = shortid.generate();
            res.set('x-request-id', req.headers['x-request-id']);
          }
          // Store CID & Authorization token in the local storage
          ns.set('x-request-id', req.headers['x-request-id']);
          ns.set('authorization', req.headers['authorization']);
          // Mix body payload/params/query
          let payload = req.body || {};
          Object.assign(payload, req.params);
          Object.assign(payload, req.query);
          // Call the handler
          return op.handler(payload, (response) => {
            return res.status(response.statusCode || 200).json(response);
          }, req);

        });
      });
  }

  // Call another services
  function call(config, msg) {
    // Mix default and user headers
    const headers = {
      'x-request-id': ns.get('x-request-id'),
      authorization: ns.get('authorization')
    };
    Object.assign(headers, config.headers);
    const { serviceName, serviceVersion, operationName } = splitOperationName(config.name);
    const operationMethod = config.method || 'POST';

    return new Promise((resolve, reject) => {
      const operationUrl = getOperationUrl(getGatewayBaseUrl(serviceName, serviceVersion, operationName) + gatewayBasePath, serviceName, serviceVersion, operationName, config.path);
      if (base.logger.isDebugEnabled()) base.logger.debug(`[services] calling [${operationMethod}] ${operationUrl} with ${JSON.stringify(msg)}`);
      wreck.request(
        operationMethod,
        operationUrl,
        {
          payload: JSON.stringify(msg),
          headers: headers,
          timeout: config.timeout || remoteCallsTimeout
        },
        (error, response) => {
          if (error) return reject(error);
          Wreck.read(response, { json: 'smart' }, (error, payload) => {
            if (error) return reject(error);
            return resolve(payload, response);
          });
        })
      ;
    });

  }

  return {
    app,
    use,
    call
  };
};