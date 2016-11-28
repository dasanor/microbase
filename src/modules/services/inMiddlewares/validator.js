const Ajv = require('ajv');

module.exports = function (base) {
  return {
    handler: function (options) {
      const ajv = new Ajv();
      const validate = ajv.compile(options.schema);
      return function (params, reply, request, next) {
        if (!validate(params)) {
          return reply(base.utils.genericResponse(null, {
            name: 'ValidationError',
            errors: validate.errors
          }));
        }
        next();
      }
    }
  }
};

