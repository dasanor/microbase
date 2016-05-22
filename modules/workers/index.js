const monq = require('monq');
const CronJob = require('cron').CronJob;

function workers(base) {

  // queue
  const jobs = monq(base.db.url);

  base.logger.info('[workers] initialized');

  const workers = base.config.get("workers") || [];

  workers.forEach(job => {
    job.when.forEach(when => {
      base.logger.info(`[workers] scheduled job [${job.worker}] at [${when}]`);
      const jobHandler = require(`${base.config.get('rootPath')}/${job.handler}`)(base);

      const worker = jobs.worker([job.worker]);
      worker.register({
        [job.worker]: jobHandler
      });
      worker.start();

      new CronJob({
        cronTime: when,
        start: true,
        timeZone: 'UTC',
        onTick: () => {
          if (base.logger.isDebugEnabled) base.logger.debug(`[worker] enqueuing scheduled job ${job.worker}`);
          jobs.queue(job.queue).enqueue(job.worker, {}, function (err, job) {
            if (err) base.logger.error('[worker] error running scheduled job ${job.worker}: ${err}');
          });
        }
      });
    });
  });

  return { jobs }
}

module.exports = workers;
