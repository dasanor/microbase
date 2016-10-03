const boom = require('boom');
const hash = require('object-hash');

module.exports = function (base) {

  const service = {

    extractErrors(error) {
      const errors = [];
      for (field in error.errors) {
        errors.push(`${field}: ${error.errors[field].message}`);
      }
      return errors;
    },

    loadModule(key) {
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

    genericErrorResponse(error) {
      if (error.name && error.name === 'ValidationError') {
        return { error: 'validation_error', data: this.extractErrors(error) };
      }
      if (error.name && error.name === 'MongoError' && (error.code === 11000 || error.code === 11001)) {
        return { error: 'duplicate_key', data: error.errmsg };
      }
      const response = {};
      if (error.code) response.error = error.code.replace(' ', '_').toLowerCase();
      if (error.data) response.data = error.data;
      if (!response.data && error.message) response.data = error.message;
      if (!error.code && error.stack) {
        base.logger.error(error);
      }
      return response;
    },

    Error(code, data) {
      const e = new Error();
      e.code = code.replace(' ', '_').toLowerCase();
      if (data) e.data = data;
      return e;
    },

    genericResponse(payload, error) {
      const response = {
        ok: error ? false : true
      };
      Object.assign(response, payload);
      if (error) Object.assign(response, this.genericErrorResponse(error));
      return response;
    },

    hash(payload) {
      return hash(payload);
    },

    Chain: class Chain {
      constructor() {
        this.middlewares = [];
      }

      use(middleware) {
        if (typeof middleware === 'function') {
          this.middlewares.push(middleware);
        } else if (typeof middleware === 'string') {
          const config = base.config.get(middleware);
          Object.keys(config).forEach(mRoute => {
            const m = base.utils.loadModule(`${middleware}:${mRoute}`)
            this.middlewares.push(m);
          })
        }
        return this;
      }

      exec(data) {
        const self = this;
        return new Promise((resolve, reject) => {
          (function iterator(index) {
            if (index === self.middlewares.length) return resolve(data);
            try {
              self.middlewares[index](data, (err) => {
                if (err) return reject(err);
                iterator(++index);
              });
            } catch (e) {
              reject(e);
            }
          })(0);
        })
      }

    },

    Evaluator: class Evaluator {
      constructor() {
        this.ops = {};
      }

      indent(level) {
        return '  '.repeat(level);
      }

      use(fn) {
        if (typeof fn === 'function') {
          this.ops.push(fn);
        } else if (typeof fn === 'string') {
          const config = base.config.get(fn);
          Object.keys(config).forEach(mRoute => {
            const m = base.utils.loadModule(`${fn}:${mRoute}`);
            this.ops[m.name] = (m.fn);
          });
        }
        return this;
      }

      evaluate(context, opContext, level, op) {
        if (base.logger.isDebugEnabled()) {
          base.logger.debug(this.indent(level), Object.keys(op)[0], JSON.stringify(op).substring(0, 160));
        }
        const result = this.ops[Object.keys(op)[0]](
          context,
          opContext,
          level,
          op,
          this
        );
        if (base.logger.isDebugEnabled()) {
          base.logger.debug(this.indent(level), 'result:', JSON.stringify(result).substring(0, 160));
        }
        return result;
      }

    }

  };

  return service;
};
