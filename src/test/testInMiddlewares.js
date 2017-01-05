const Code = require('code');
const Lab = require('lab');
const nock = require('nock');
const sinon = require('sinon');

// shortcuts
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const beforeEach = lab.beforeEach;
const after = lab.after;
const it = lab.it;
const expect = Code.expect;

const numberFromFile = __filename
  .slice(__dirname.length + 1, -3)
  .split('')
  .reduce((port, char) => {
    return port += char.charCodeAt(0);
  }, 0);

// Randomize http port
process.env.transports_http_port = 3000 + numberFromFile;

const fakeBase = {
  log: (level, msg) => {
    console.log(`${new Date().toISOString()} - ${level}: [] ${msg}`);
  }
};

const base = require('../index.js')({
  config: require('../modules/config')([
    './test/config.json'
  ], fakeBase)
});

describe('inMiddlewares', () => {
  it('should xxx', (done) => {
    const params = { a: 1 };
    const channel = 'TEST';
    const eem = require('../modules/services/inMiddlewares/eventEmitter')(base).handler({ channel: channel });
    base.bus.subscribe(`${channel}.*`, (msg) => {
      expect(msg).to.equal({ data: params });
      done();
    });
    eem(params, undefined, undefined, () => {
    });
  });
});
