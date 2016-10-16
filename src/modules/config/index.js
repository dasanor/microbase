const path = require('path');
const fs = require('fs');
const conf = require('nconf');

module.exports = function (stores, base) {

  stores = stores || {};

  const env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  const basePath = path.normalize(__dirname + '/../..');
  let rootPath = path.dirname(require.main.filename);
  if (rootPath.lastIndexOf('node_modules') != -1) {
    rootPath = rootPath.substr(0, rootPath.lastIndexOf('node_modules') - 1);
  }
  // add framework defaults
  stores.push(basePath + '/modules/config/defaults.json');

  base.log('info', `[config] using [${env}] configuration`);

  conf.env('_');
  conf.argv();

  let i = 1;
  stores.forEach(function (file) {
    if (!path.isAbsolute(file)) {
      file = rootPath + '/' + file;
    }
    file = path.normalize(file);
    base.log('debug', `[config] using file [${file}]`);
    try {
      if (!fs.existsSync(file)) {
        throw new Error('File doesn\'t exist');
      }
      conf.use('z' + i++, { type: 'file', file: file });
    } catch (e) {
      base.log('error', `[config] file [${file}] error [${e.message}]`);
    }
  });

  conf.set('env', env);
  conf.set('basePath', basePath);
  conf.set('rootPath', rootPath);

  return conf;
};