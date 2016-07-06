module.exports = function (base) {

  const implementation = base.config.get('cache:implementation');
  const proxy = require(implementation)(base);

  const caches = new Map();

  const service = {

    create: (name, policyOptions) => {
      proxy.create(name, policyOptions)
        .then(cache => {
          caches.set(name, cache);
        });
    },

    get: (name) => {
      return caches.get(name);
    }

  };

  return service;
};
