'use strict';

/**
 Patch the http transport to change the
 url endpoint to allow ngnix routing
 */
const applyPatch = require("apply-patch").applyPatch;
applyPatch(__dirname + '/http.patch');

const Seneca = require('seneca');
const Promise = require('bluebird');
const tv4 = require('tv4');

module.exports = function (base) {

  const seneca = Seneca({
    default_plugins: {
      cluster: false,
      'mem-store': true,
      repl: false,
      web: false
    }
  });
  
  const service = {
    name: base.config.get("services:name"),
    version: base.config.get("services:version"),
    use: function (module) {
      seneca.use(module);
      return seneca;
    }
  };

  // Seneca server
  seneca.logroute({
    level: base.config.get('logger:level'),
    handler: function () {
      if (arguments[3] == 'act') {
        base.logger.log(arguments[2], arguments[1], arguments[6], arguments[7], arguments[8], arguments[12]);
      }
    }
  });
  seneca.listen({
    type: 'http',
    host: base.config.get('services:host'),
    port: base.config.get('services:port'),
    path: base.config.get('services:path')
  });

  // Client
  const client = seneca.client({
    type: 'http',
    host: base.config.get('gateway:host'),
    port: base.config.get('gateway:port'),
    path: base.config.get('gateway:path')
  });

  // Add call method with promises
  const act = Promise.promisify(client.act, {context: client});
  service.act = function (data) {
    if (data.service.indexOf(':') == -1) {
      data.service = data.service + ':v1';
    }
    return act(data);
  };

  // Add operation method
  service.add = function (op) {
    base.logger.info('[services] added service [%s][%s]', service.name, op.pattern.op);
    seneca.add(op.pattern, op.handler);
    // Add validator
    if (op.schema) {
      seneca.add(op.pattern, function validator(msg, done) {
        var result = tv4.validateResult(msg, op.schema);
        console.log(result, msg, op.schema);
        if (result.valid) {
          this.prior(msg, done);
        } else {
          return done(null, {
            error: {
              code: 10,
              msg: 'Validation error',
              error: result.error, // TODO: Clean this
              missing: result.missing
            }
          });
        }
      });
    }
  };

  // Add all the operations inside a module
  service.addModule = function (module) {
    for (var op of module) {
      service.add(op);
    }
  };

  // Add ping op
  service.add({
    pattern: { op: 'ping' },
    handler: function (msg, done) {
      return done(null, { answer: 'pong' });
    }
  });

  return service;

};

