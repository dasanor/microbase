const os = require('os');

/*
 The module should add this to the index.js:
 const dd = require('connect-datadog');
 const base = require('microbase')({ extra: { dd } });
 */
module.exports = function (base) {

  const dd_connection = base.extra.dd({
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