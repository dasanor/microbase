const base = require('microbase')();

// Add operations
base.services.addOperationsFromFolder('operations', base);

module.exports = base;
