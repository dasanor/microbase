const shortId = require('shortid');
const moment = require('moment');

const Code = require('code');
const Lab = require('lab');
const nock = require('nock');

// shortcuts
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const beforeEach = lab.beforeEach;
const after = lab.after;
const it = lab.it;
const expect = Code.expect;

const base = require('../index.js');

describe('Base', () => {
  beforeEach(done => {
    done();
  });
  after(done => {
    done();
  });

  it('is a dummy test', done => {
    done();
  });
});
