const events = require('events');

module.exports = function (base) {

  base.logger.info('[events] local events started');
  var eventEmitter = new events.EventEmitter();

  return {
    send: function (channel, data) {
      eventEmitter.emit(channel, data);
    },
    listen: function (channel, handler) {
      eventEmitter.on(channel, handler);
    }
  };

};
