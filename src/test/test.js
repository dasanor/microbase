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

describe('Config', () => {
  it('should handle a config file not found as a log', (done) => {
    const spy = sinon.spy(fakeBase, 'log');
    require('../modules/config')([
      './test/fake.json'
    ], fakeBase);
    expect(spy.getCall(2).args[0]).equals('error');
    expect(spy.getCall(2).args[1]).contains('[File doesn\'t exist]');
    fakeBase.log.restore();
    done();
  });
  it('should return a correct value', (done) => {
    const value = base.config.get('services:defaultFolder');
    expect(value).to.equal('operations');
    done();
  });
  it('should return a correct env value', (done) => {
    process.env['logger_level'] = 'warn'
    const config = require('../modules/config')([], fakeBase);
    const value = config.get('logger:level');
    expect(value).to.equal('warn');
    done();
  });
});

describe('Utils', () => {
  it('should extract schema validation errors', (done) => {
    const msg = 'should have required property \'title\'';
    const error = {
      name: 'ValidationError',
      errors: [{
        keyword: 'required',
        dataPath: '',
        schemaPath: '#/required',
        params: { missingProperty: 'title' },
        message: msg
      }]
    };

    const errorList = base.utils.extractErrors(error);
    expect(errorList).to.be.a.array().and.to.have.length(1);
    expect(errorList[0]).to.be.equal(`payload: ${msg}`);
    done();
  });
  it('should extract mongoose validation errors', (done) => {
    const msg = 'Cast to Number failed for value \'A\' at path \'stockStatus\'';
    const error = {
      message: 'Product validation failed',
      name: 'ValidationError',
      errors: {
        stockStatus: {
          message: msg,
          name: 'CastError',
          kind: 'Number',
          value: 'A',
          path: 'stockStatus',
          reason: {
            message: msg,
            name: 'CastError',
            kind: 'number',
            value: 'A',
            path: 'stockStatus'
          }
        }
      }
    };
    const errorList = base.utils.extractErrors(error);
    expect(errorList).to.be.a.array().and.to.have.length(1);
    expect(errorList[0]).to.be.equal(`stockStatus: ${msg}`);
    done();
  });
});
