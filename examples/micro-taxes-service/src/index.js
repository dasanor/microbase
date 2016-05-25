const base = require('micro-base')();

// Add operations
base.services.addModule(require('./modules/taxes')(base));

module.exports = base;