const hash = require('object-hash');
const glob = require('glob');
const path = require('path');

module.exports = function (base) {

  const rootPath = base.config.get('rootPath');

  const service = {

    extractErrors(error) {
      const errors = [];
      Object.keys(error.errors).forEach(key => {
        const eObj = error.errors[key];
        if (eObj.dataPath) {
          // Schema validation
          errors.push(`payload${eObj.dataPath}: ${eObj.message}`);
        } else {
          // Mongoose Validation
          errors.push(`${key}: ${eObj.message}`);
        }
      });
      return errors;
    },

    loadModulesFromFolder(folder) {
      const modules = [];
      glob.sync(`${rootPath}/${folder}/*.js`).forEach(file => {
        modules.push({
          module: require(file)(base, file),
          file
        });
      });
      return modules;
    },

    loadModulesFromKey(key) {
      const baseConfig = base.config.get(key);
      const modules = [];
      Object.keys(baseConfig).forEach(moduleKey => {
        modules.push(this.loadModule(`${key}:${moduleKey}`));
      });
      return modules;
    },

    loadModule(key) {
      if (base.logger.isDebugEnabled()) base.logger.debug(`[modules] loading module from '${key}'`);
      const name = base.config.get(key);
      if (!name) {
        base.logger.warn(`[modules] module '${key}' not found`);
        return null;
      }
      let modulePath;
      if (name.startsWith('.')) {
        modulePath = path.normalize(`${rootPath}/${name}`);
      } else {
        modulePath = name;
      }
      try {
        return {
          module: require(modulePath)(base, key.split(':')),
          keys: key.split(':'),
          path: modulePath
        };
      } catch (e) {
        base.logger.error(`[modules] module '${key}:${modulePath}' not found`);
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
      if (error.code) response.error = error.code.replace(/ /g, '_').toLowerCase();
      if (error.data) response.data = error.data;
      if (error.statusCode) response.statusCode = error.statusCode;
      if (!response.data && error.message) response.data = error.message;
      if (error.log) {
        base.logger.error(`${error.code} ${JSON.stringify(error.data)}`);
      }
      if (error.stack) {
        base.logger.error(error.stack);
      }
      return response;
    },

    Error(code, data, log) {
      const e = {
        code: code.replace(/ /g, '_').toLowerCase()
      };
      if (data) e.data = data;
      if (log) e.log = log;
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
            const m = base.utils.loadModule(`${middleware}:${mRoute}`).module;
            this.middlewares.push(m);
          });
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
          Object.keys(config).forEach(name => {
            const m = base.utils.loadModule(`${fn}:${name}`).module;
            this.ops[name] = m.fn;
            if (m.alias) {
              m.alias.forEach(alias => {
                this.ops[alias] = m.fn;
              });
            }
          });
        }
        return this;
      }

      evaluate(context, opContext, level, op) {
        if (base.logger.isDebugEnabled()) {
          base.logger.debug(`[evaluator]' ${this.indent(level)} ${Object.keys(op)[0]} ${JSON.stringify(op).substring(0, 160)}`);
        }
        const result = this.ops[Object.keys(op)[0]](
          context,
          opContext,
          level,
          op,
          this
        );
        if (base.logger.isDebugEnabled()) {
          base.logger.debug('[evaluator]', this.indent(level), 'result:', JSON.stringify(result).substring(0, 160));
        }
        return result;
      }

    }

  };

  return service;
};
