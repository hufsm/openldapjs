'use strict';

import OperationalError = require('./operational_error');

class LdapUndefinedTypeError extends OperationalError {

  static get code() {
    return 17;
  }

  static get description() {
    return 'Indicates that the attribute specified in the modify or add operation does not exist in the LDAP server\'s schema.';
  }

}

export = LdapUndefinedTypeError;
