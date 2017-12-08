import LdapError = require('./ldap_error');
import OperationalError = require('./operational_error');

declare class LdapNonLeafError extends OperationalError {

}

export = LdapNonLeafError;
