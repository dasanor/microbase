const base = require('microbase')();

// Add operations
base.services.addModule(require('./modules/math')(base));

module.exports = base;