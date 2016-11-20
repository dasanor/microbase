const dd = require('connect-datadog');
const os = require('os');

module.exports = function (base) {

  const dd_connection = dd({
    response_code: true,
    tags: [
      `app:${base.config.get('services:name')}:${base.config.get('services:version')}`,
      `host:${os.hostname()}`
    ]
  });

  return (app) => {
    app.use(dd_connection);
  }

};