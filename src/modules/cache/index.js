const boom = require('boom');
const Catbox = require('catbox');
const memoryCache = require('catbox-memory');

module.exports = function (base) {

  const caches = {};

  // Default, memory implementation
  const memoryProxy = (cache) => {

    return {
      get: (key) => {
        return new Promise(function (resolve, reject) {
          cache.get(key, (err, value, cached, report) => {
            if (err) return reject(err);
            return resolve(cached);
          });
        })
      },

      set: (key, value) => {
        cache.set(key, value);
      }
    }

  };

  const service = {

    create: (name, policyOptions) => {
      const client = new Catbox.Client(memoryCache, {
        partition: base.config.get('services:name')
      });
      client.start(() => {
        base.logger.debug(`[cache] creating cache '${name}'`);
        caches[name] = memoryProxy(new Catbox.Policy(policyOptions, client, name));
      });
    },

    get: (name) => {
      return caches[name];
    }

  };

  return service;
};
