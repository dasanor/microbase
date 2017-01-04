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
  it('should load modules from a folder', (done) => {
    const modules = base.utils.loadModulesFromFolder('test/loadModules');
    expect(modules).to.be.a.array().and.to.have.length(2);
    expect(modules[0]).to.be.an.object();
    expect(modules[0].module).to.be.a.function();
    done();
  });
  it('should load modules from folder, key overwriting', (done) => {
    const modules = base.utils.loadModulesFromFolder('test/loadModules');
    expect(modules).to.be.a.array().and.to.have.length(2);
    expect(modules[0]).to.be.an.object();
    expect(modules[0].module).to.be.a.function();
    expect(modules[0].module()).contains('moduleOverwritten');
    done();
  });
  it('should load modules from key', (done) => {
    const modules = base.utils.loadModulesFromKey('test:loadModules');
    expect(modules).to.be.a.array().and.to.have.length(1);
    expect(modules[0]).to.be.an.object();
    expect(modules[0].module).to.be.a.function();
    done();
  });
  it('should log a warn on load a module from inexistent key', (done) => {
    const spy = sinon.spy(base.logger, 'warn');
    const module = base.utils.loadModule('test:loadModule:nonExistentKey');
    expect(module).to.be.null();
    expect(spy.getCall(0).args[0]).equals('[modules] module \'test:loadModule:nonExistentKey\' not found');
    base.logger.warn.restore();
    done();
  });
  it('should log an error on load an inexistent module', (done) => {
    const spy = sinon.spy(base.logger, 'error');
    const module = base.utils.loadModule('test:loadModule:nonExistentModule');
    expect(module).to.be.null();
    expect(spy.getCall(0).args[0]).equals('[modules] module \'test:loadModule:nonExistentModule:nonExistentModule\' not found');
    base.logger.error.restore();
    done();
  });
  it('should load a module from key, dot', (done) => {
    const module = base.utils.loadModule('test:loadModule:moduleDot');
    expect(module).to.be.an.object();
    expect(module.module).to.be.a.function();
    done();
  });
  it('should load a module from key, no dot', (done) => {
    const module = base.utils.loadModule('test:loadModule:moduleNoDot');
    expect(module).to.be.an.object();
    expect(module.module).to.be.a.string();
    done();
  });
  it('should generate an generic error response on ValidationError', (done) => {
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
    const expectedResponse = {
      error: 'validation_error',
      data: ['stockStatus: Cast to Number failed for value \'A\' at path \'stockStatus\'']
    };
    const response = base.utils.genericErrorResponse(error);
    expect(response).to.equal(expectedResponse);
    done();
  });
  it('should generate an generic error response on Mongo DuplicateKey error', (done) => {
    const error = {
      errmsg: 'Duplicate key',
      code: 11000,
      name: 'MongoError'
    };
    const expectedResponse = { error: 'duplicate_key', data: 'Duplicate key' };
    const response = base.utils.genericErrorResponse(error);
    expect(response).to.equal(expectedResponse);
    done();
  });
  it('should generate an generic error response', (done) => {
    const spy = sinon.spy(base.logger, 'error');
    const error = {
      code: 'an error',
      data: { number: 1 },
      statusCode: 404,
      log: true,
      stack: 'stackTrace...'
    };
    const expectedResponse = { error: 'an_error', data: { number: 1 }, statusCode: 404 };
    const response = base.utils.genericErrorResponse(error);
    expect(response).to.equal(expectedResponse);
    expect(spy.getCall(0).args[0]).equals('an error {"number":1}');
    expect(spy.getCall(1).args[0]).equals('stackTrace...');
    base.logger.error.restore();
    done();
  });
});

describe('Cache', () => {
  it('should create a cache', (done) => {
    base.cache
      .create('test')
      .then((cache) => {
        expect(cache).to.be.an.object();
        expect(cache.get).to.be.a.function();
        const cacheAgain = base.cache.get('test');
        expect(cacheAgain).to.be.an.object();
        expect(cacheAgain.get).to.be.a.function();
        done();
      });
  });
  it('should store an item in a simple key', (done) => {
    const cacheName = 'test';
    const cacheExpires = 500;
    const cacheOptions = { expiresIn: cacheExpires };
    const key = 'key1';
    const value = 'value';
    base.cache
      .create(cacheName, cacheOptions)
      .then(cache => cache.set(key, value))
      .then(() => base.cache.get(cacheName))
      .then(cache => cache.get(key))
      .then((cahedValue) => {
        expect(value).equals(cahedValue);
        done();
      })
      .catch(err => console.log(err))
  });
  it('should expire an item in a simple key', (done) => {
    const cacheName = 'test';
    const cacheExpires = 500;
    const cacheOptions = { expiresIn: cacheExpires };
    const key = 'key1';
    const value = 'value';
    base.cache
      .create(cacheName, cacheOptions)
      .then(cache => cache.set(key, value))
      .then(() => base.cache.get(cacheName))
      .then(cache => cache.get(key))
      .then((cachedValue) => {
        expect(value).equals(cachedValue);
        setTimeout(() => {
          return Promise.resolve(base.cache.get(cacheName))
            .then(cache => cache.get(key))
            .then((cachedValue) => {
              expect(cachedValue).to.equal(null);
              done();
            })
        }, cacheExpires + 100);
      })
      .catch(err => console.log(err));
  });
  it('should store an item in a hierarchical key', (done) => {
    const cacheName = 'test';
    const cacheExpires = 500;
    const cacheOptions = { expiresIn: cacheExpires };
    const key = 'key1';
    const subkey = 'key2';
    const value = 'value';
    base.cache
      .create(cacheName, cacheOptions)
      .then(cache => cache.set(`${key}:${subkey}`, value))
      .then(() => base.cache.get(cacheName))
      .then(cache => cache.get(`${key}:${subkey}`))
      .then((cahedValue) => {
        expect(cahedValue).equals(value);
        done();
      })
      .catch(err => done(err));
  });
});

// Keep this at the end
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

