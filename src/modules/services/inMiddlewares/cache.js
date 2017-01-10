const Wreck = require('wreck');

module.exports = function (base) {
  return {
    handler: function (options) {
      base.cache.create(options.name, options.options);
      return function (params, reply, request, next) {
        // Verify the no-cache/no-store headers to bypass the cache
        let noStore = false;
        if (request.headers['cache-control']) {
          noStore = Wreck.parseCacheControl(request.headers['cache-control'])['no-store'];
        }
        if (noStore) {
          return next();
        }
        // Try to get the result from cache
        const key = (options.keyGenerator ? (options.keyGenerator(params) + ':') : '') + base.utils.hash(params);
        let cache = base.cache.get(options.name);
        if (cache) {
          cache
            .get(key)
            .then((value) => {
              if (value) {
                // If the result was on the cache, just return it.
                if (base.logger.isDebugEnabled()) base.logger.debug(`[cache] returning cached response '${key}'`);
                return reply(value.payload);
              } else {
                execAndStore();
              }
            })
            .catch(error => reply(base.utils.genericResponse(null, error)));
        } else {
          execAndStore();
        }

        function customReply(response, error) {
          // No cache on error
          if (error) return reply(response, error);
          // return the data and async cache the data
          reply(response);
          // Cache the data
          if (base.logger.isDebugEnabled()) base.logger.debug(`[cache] caching '${key}'`);
          if (cache) {
            cache.set(key, {
              payload: response
            });
          } else {
            base.cache
              .create(options.name, options.options)
              .then(cache => {
                cache.set(key, {
                  payload: response
                });
              })
              .catch(error => reply(base.utils.genericResponse(null, error)));
          }
        }

        function execAndStore() {
          // Execute the operation and wait the result
          next(customReply);
        }
      }
    }
  }
};
