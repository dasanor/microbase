const boom = require('boom');
const hash = require('object-hash');

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
    },

    genericErrorResponse: (error) => {
      if (error.name && error.name === 'ValidationError') {
        return boom.create(406, 'ValidationError', { data: service.extractErrors(error) });
      }
      if (error.name && error.name === 'MongoError' && (error.code === 11000 || error.code === 11001)) {
        return boom.forbidden('duplicate key', { data: error.errmsg });
      }
      if (!(error.isBoom || error.statusCode === 404)) base.logger.error(error);
      return boom.wrap(error);
    },

    hash: (payload) => {
      return hash(payload);
    }

  };

  return service;
};
