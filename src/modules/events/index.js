const events = require('events');

module.exports = function (base) {

  base.logger.info('[events] local events started');
  const eventEmitter = new events.EventEmitter();

  return {
    send: (channelName, eventType, data) => {
      eventEmitter.emit(channelName, { type: eventType, data: data });
    },
    listen: (channelName, handler) => {
      eventEmitter.on(channelName, handler);
    }
  };

};
