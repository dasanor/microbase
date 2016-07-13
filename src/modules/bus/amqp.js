var url = require('url');
var servicebus = require('servicebus');

module.exports = function (base, engineConfig) {

  var parsedUrl = url.parse(engineConfig.url);
  base.logger.info(`[bus] amqp engine started in [${parsedUrl.host}]`);

  var bus = servicebus.bus({
    url: parsedUrl.path ? engineConfig.url.substring(0, engineConfig.url.length - parsedUrl.path.length) : engineConfig.url,
    vhost: parsedUrl.path ? parsedUrl.path.substring(1) : '/'
  });

  return {
    send: function (channel, data) {
      bus.send(channel, data);
    },
    listen: function (channel, handler) {
      return bus.listen(channel, handler);
    },
    publish: function (channel, data) {
      const names = channel.split('.');
      const msg = { data };
      if (names.length === 2) msg.type = names[1];
      bus.publish(channel, msg);
    },
    subscribe: function (channel, handler) {
      return bus.subscribe(channel, handler);
    }
  };

};
