/*
 The module should add this to the index.js:
 const raven = require('raven');
 const base = require('microbase')({ extra: { raven } });
 */
module.exports = (base) => {
  base.extra.raven.disableConsoleAlerts();
  base.extra.raven.config(base.config.get('transports:http:monitors:sentry:url'), {
    autoBreadcrumbs: true,
    captureUnhandledRejections: true
  }).install();
  return (app, place) => {
    if (place === 'beforeRoutes') {
      app.use(base.extra.raven.requestHandler());
    } else if (place === 'beforeErrorHandlers') {
      app.use((err, req, res, next) => {
        if (err) {
          base.extra.raven.mergeContext({
            tags: {
              // 'x-request-id': req.headers['x-request-id'],
              service: `${base.config.get('services:name')}:${base.config.get('services:version')}`,
              mbversion: base.config.get('info:microbase:version'),
              package: `${base.config.get('info:package:name')}@${base.config.get('info:package:version')}`,
              commit: base.config.get('info:package:commit') || 'N/A'
            }
          });
        }
        next(err);
      });
      app.use(base.extra.raven.errorHandler());
    }
  };
};