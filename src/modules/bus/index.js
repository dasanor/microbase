module.exports = function (base) {

  if (!base.config.get('bus')) {
    base.logger.warn('[bus] bus properties not configured');
    return;
  }

  const enginesConfig = base.config.get('bus:engines');
  const engines = {};

  Object.keys(enginesConfig).forEach(engineName => {
    const engineConfig = enginesConfig[engineName];
    engines[engineName] = require(engineConfig.handler)(base, engineConfig);
  });

  const channelsConfig = base.config.get('bus:channels');
  const channels = {};

  Object.keys(channelsConfig).forEach(channelName => {
    const channelConfig = channelsConfig[channelName];
    if (!engines[channelConfig.engine]) {
      return base.logger.error(`[bus] non-existent engine '${channelConfig.engine}' for channel '${channelName}'`)
    }
    channels[channelConfig.name] = engines[channelConfig.engine];
  });

  return {
    send: (channel, data) => {
      const names = channel.split('.');
      channels[names[0]].send(channel, data);
    },
    listen: (channel, handler) => {
      const names = channel.split('.');
      channels[names[0]].listen(channel, handler);
    },
    publish: (channel, data) => {
      const names = channel.split('.');
      channels[names[0]].publish(channel, data);
    },
    subscribe: (channel, handler) => {
      const names = channel.split('.');
      channels[names[0]].subscribe(channel, handler);
    },
    engine: (name) => {
      engines[name];
    }
  };

};
