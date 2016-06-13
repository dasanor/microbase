module.exports = function (base) {

  const service = {

    extractErrors: (error) => {
      const errors = [];
      for (field in error.errors) {
        errors.push(`${field}: ${error.errors[field].message}`);
      }
      return errors;
    },

    loadModule: (key) => {
      if (base.logger.isDebugEnabled()) base.logger.debug(`[services] loading module from '${key}'`);
      const name = base.config.get(key);
      if (!name) {
        base.logger.warn(`[services] module '${key}' not found`);
        return null;
      }
      if (name.startsWith('.')) {
        const modulePath = `${base.config.get('rootPath')}/${name}`;
        try {
          return require(modulePath)(base)
        } catch (e) {
          base.logger.error(`[services] module '${key}:${modulePath}' not found`)
          return false;
        }
      } else {
        return require(name)(base);
      }
    }

  };

  return service;
};
