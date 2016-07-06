const Catbox = require('catbox');
const memoryCache = require('catbox-memory');

module.exports = function (base) {

  const implementation = base.config.get('cache:implementation');

  const proxy = (cache) => {
    return {
      get: (key) => {
        return new Promise(function (resolve, reject) {
          const keys = key.split(':');
          if (keys[1]) {
            // Hierarchical key
            cache.get(keys[0], (err, value, cached, report) => {
              if (err) return reject(err);
              if (!cached) return resolve(cached);
              return resolve(cached.item[keys[1]]);
            });
          } else {
            cache.get(key, (err, value, cached, report) => {
              if (err) return reject(err);
              return resolve(cached.item);
            });
          }
        })
      },

      set: (key, value) => {
        const keys = key.split(':');
        if (keys[1]) {
          // Hierarchical key
          cache.get(keys[0], (err, val, cached, report) => {
            if (err) return reject(err);
            let cachedValue = {};
            if (cached) {
              cachedValue = cached.item;
            }
            cachedValue[keys[1]] = value;
            cache.set(keys[0], cachedValue, undefined, err => {
              if (err) base.logger.error(`[cache] setting '${key}'`)
            });
          });
        } else {
          cache.set(key, value, undefined, err => {
            if (err) base.logger.error(`[cache] setting '${key}'`)
          });
        }
      },

      drop: (key) => {
        console.log('dropping', key);
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
