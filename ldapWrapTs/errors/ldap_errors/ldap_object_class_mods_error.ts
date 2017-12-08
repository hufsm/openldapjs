'use strict';

import LdapError = require('./ldap_error');
import OperationalError = require('./operational_error');


class LdapObjectClassModsError extends OperationalError {

  static get code() {
    return 69;
  }

  static get description() {
    return 'Indicates that the modify operation attempted to modify the structure rules of an object class.';
  }

}

export = LdapObjectClassModsError;
