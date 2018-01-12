'use strict';

const should = require('should');
const LDAPWrap = require('../libs/ldap_async_wrap.js');
const config = require('./config.json');
const errorList = require('./error_codes.json');
const StateError = require('../libs/errors/state_error');

describe('Testing the async initialization', () => {

  const host = config.ldapAuthentication.host;
  let ldapWrap;

  beforeEach(() => { ldapWrap = new LDAPWrap(host); });

  afterEach(() => {});

  it('should initialize the connection', () => {
    return ldapWrap.initialize()
      .catch(() => {
        should.fail('did not expect an error');
      });
  });

  it('should reject when trying multiple initializes on the same object', () => {
    return ldapWrap.initialize()
      .then(() => {
        return ldapWrap.initialize();
      })
      .then(() => {
        should.fail('Didn\'t expect success');
      })
      .catch(StateError, (error) => {
        should.deepEqual(error.message, errorList.initErrorMessage);
      });
  });

});
