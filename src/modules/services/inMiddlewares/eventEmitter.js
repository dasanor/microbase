module.exports = function (base) {
  return {
    handler: (options) => {
      const defaultFilter = () => true;
      const defaultPayload = (params) => params;
      return (params, reply, request, next) => {
        if ((options.filter || defaultFilter)(params)) {
          base.bus.publish(options.channel, (options.payload || defaultPayload)(params));
        }
        next();
      };
    }
  };
};

