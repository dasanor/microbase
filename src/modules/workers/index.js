const monq = require('monq');
const CronJob = require('cron').CronJob;

function workers(base) {

  if (!base.db) {
    base.logger.warn('[workers] database properties not configured');
    return;
  }
  const dburl = base.db.url;

  // queue
  const jobs = monq(dburl);

  base.logger.info('[workers] initialized');

  const workers = base.config.get("workers") || [];

  workers.forEach(job => {
    base.logger.info(`[workers] job [${job.worker}] created [${job.when ? job.when : ''}]`);
    const jobHandler = require(`${base.config.get('rootPath')}/${job.handler}`)(base);

    const worker = jobs.worker([job.worker], {});
    worker.register({
      [job.worker]: jobHandler
    });
    worker.start();

    // Start a cronjob if configured
    if (job.when) {
      new CronJob({
        cronTime: job.when,
        start: true,
        timeZone: 'UTC',
        onTick: () => {
          if (base.logger.isDebugEnabled) base.logger.debug(`[worker] enqueuing scheduled job '${job.worker}'`);
          const queueName = job.queue || job.worker;
          jobs.queue(queueName).enqueue(job.worker, {}, function (err, job) {
            if (err) base.logger.error('[worker] error running scheduled job ${job.worker}: ${err}');
          });
        }
      });
    }
  });

  function enqueue(workerName, queueName, params) {
    if (!params) {
      params = queueName;
      queueName = workerName;
    }
    jobs.queue(queueName).enqueue(workerName, params, function (err, job) {
      if (err) base.logger.error(`[worker] error running job '${workerName}': ${err}`);
    });
  };

  return { jobs, enqueue }
}

module.exports = workers;
