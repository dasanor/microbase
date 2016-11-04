const url = require('url');
const amq = require('amq');

module.exports = function (base, engineConfig) {

  const defaultExchangeOptions = { durable: true };
  const defaultQueueOptions = { durable: true };
  const defaultConsumeOptions = { prefetch: 1 };
  const pubsubExchangeOptions = { durable: true, type: 'fanout' };
  const topicsExchangeOptions = { durable: true, type: 'topic' };
  const pubsubQueueOptions = { exclusive: true };

  const exchanges = {};
  const queues = {};
  const configUrl = engineConfig.url;
  base.logger.info(`[bus] amqp engine started in [${configUrl}]`);

  // TODO: add auth parameters
  const parsedUrl = url.parse(configUrl);
  const connection = amq.createConnection({
    host: parsedUrl.hostname,
    port: parsedUrl.port,
    login: parsedUrl.auth ? parsedUrl.auth : '',
    vhost: parsedUrl.path ? parsedUrl.path.substring(1) : '',
    ssl: parsedUrl.protocol == 'amqps',
    debug: base.logger.isDebugEnabled()
  }, {
    reconnect: { strategy: 'constant', initial: 1000 }
  });

  return {
    getExchange: function (name, options) {
      if (!exchanges[name]) {
        exchanges[name] = connection.exchange(name, options || defaultExchangeOptions);
      }
      return exchanges[name];
    },
    getQueue: function (name, options, exchangeToBind, keyToBind) {
      let queue;
      // Create if name=='' or not in cache
      if (name === '' || !queues[name]) {
        queue = connection.queue(name, options);
      }
      if (!queue) queue = connection.queue(name, options); // Not found in cache, create
      if (exchangeToBind) queue.bind(exchangeToBind, keyToBind); // bind to exchange
      if (name !== '') queues[name] = queue; // store in cache
      return queue;
    },

    send: function (channel, data, messageOptions, queueOptions) {
      const queue = this.getQueue(channel, queueOptions || defaultQueueOptions);
      return queue.publish(JSON.stringify(data), messageOptions);
    },

    listen: function (channel, queueOptions, consumeOptions, handler) {
      if (typeof queueOptions == 'function') {
        handler = queueOptions;
        queueOptions = undefined;
        consumeOptions = undefined;
      }
      if (typeof consumeOptions == 'function') {
        handler = consumeOptions;
        consumeOptions = undefined;
      }
      const queue = this.getQueue(channel, queueOptions || defaultQueueOptions);
      return queue.consume(consumeOptions || defaultConsumeOptions, function (message) {
        queue.ack(message);
        message.json = JSON.parse(message.content.toString('utf8'));
        handler(message);
      });
    },

    publish: function (channel, data, messageOptions) {
      const words = channel.split('.');
      const msg = { data };
      if (words.length === 2) msg.type = words[1];
      const exchangeName = words[0];
      const exchange = this.getExchange(exchangeName, words.length !== 1 ? topicsExchangeOptions : pubsubExchangeOptions);
      return exchange.publish(words.length !== 1 ? channel : '', JSON.stringify(msg), messageOptions);
    },

    subscribe: function (channel, queueOptions, consumeOptions, handler) {
      if (typeof queueOptions == 'function') {
        handler = queueOptions;
        queueOptions = undefined;
        consumeOptions = undefined;
      }
      if (typeof consumeOptions == 'function') {
        handler = consumeOptions;
        consumeOptions = undefined;
      }
      const words = channel.split('.');
      const exchangeName = words[0];
      base.logger.debug(`[amqp] subscribed to ${channel} in ${exchangeName}`);
      const exchange = this.getExchange(exchangeName, words.length !== 1 ? topicsExchangeOptions : pubsubExchangeOptions);
      const queue = this.getQueue('', queueOptions || pubsubQueueOptions, exchangeName, words.length !== 1 ? channel : undefined);
      return queue.consume(consumeOptions || defaultConsumeOptions, function (message) {
        queue.ack(message);
        message.json = JSON.parse(message.content.toString('utf8'));
        handler(message);
      });
    },

    engine: connection
  }
};