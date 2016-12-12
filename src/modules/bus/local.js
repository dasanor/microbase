const events = require('events');

module.exports = function (base /* , engineConfig */) {

  base.logger.info('[bus] local events started');
  const bus = new events.EventEmitter();

  return {
    send: () => {
      throw new Error('Not implemented');
    },
    listen: () => {
      throw new Error('Not implemented');
    },
    publish: (channel, data) => {
      const names = channel.split('.');
      const msg = { data };
      if (names.length === 2) msg.type = names[1];
      bus.emit(names[0], msg);
    },
    subscribe: (channel, handler) => {
      const names = channel.split('.');
      if (base.logger.isDebugEnabled()) base.logger.debug(`[bus-local] subscribed to ${names[0]}`);
      bus.on(names[0], handler);
    },
    engine: bus
  };

};
