const base = require('micro-base')();

// Add operations
base.services.addModule(require('./modules/math')(base));

module.exports = base;