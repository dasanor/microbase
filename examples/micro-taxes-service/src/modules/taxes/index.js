const boom = require('boom');

function taxesService(base) {

  const vat = {
    name: 'vat',
    handler: (msg, reply) => {
      base.services.call('math:multiply', { left: msg.net, right: 0.21 })
        .then(function (result) {
          return reply({ data: result.answer, calcsBy: result.host });
        })
        .catch(function (error) {
          base.logger.error('****************', error.msg);
          return reply(new boom(error));
        });
    }
  };

  return [
    vat
  ];
}

module.exports = taxesService;