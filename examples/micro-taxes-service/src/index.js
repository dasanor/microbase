const base = require('microbase')();

// Add operations
base.services.addModule(require('./modules/taxes')(base));

module.exports = base;