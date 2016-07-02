const Catbox = require('catbox');
const memoryCache = require('catbox-memory');

module.exports = function (base) {

  const implementation = base.config.get('cache:implementation');

  const proxy = (cache) => {
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
        cache.set(key, value, undefined, err => {
          if (err) base.logger.error(`[cache] setting '${key}'`)
        });
      },

      drop: (key) => {
        cache.drop(key, err => {
          if (err) base.logger.error(`[cache] dropping '${key}'`)
        });
      }

    }
  };

  const cacheFactory = {
    create: (name, policyOptions) => {
      return new Promise((resolve, reject) => {
        const clientOptions = {
          partition: base.config.get('services:name')
        };
        const maxByteSize = base.config.get('cache:maxByteSize');
        if (maxByteSize) clientOptions.maxByteSize = maxByteSize;
        const allowMixedContent = base.config.get('cache:allowMixedContent');
        if (allowMixedContent) clientOptions.allowMixedContent = allowMixedContent;
        const client = new Catbox.Client(memoryCache, clientOptions);
        client.start(() => {
          base.logger.debug(`[cache] creating cache '${name}'`);
          const cache = new Catbox.Policy(policyOptions, client, name);
          const cacheProxy = proxy(cache);
          resolve(cacheProxy);
        });
      });
    }

  };

  return cacheFactory;
};
