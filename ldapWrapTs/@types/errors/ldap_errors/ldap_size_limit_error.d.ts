import LdapError = require('./ldap_error');
import OperationalError = require('./operational_error');

declare class LdapSizeLimitError extends OperationalError {

}

export = LdapSizeLimitError;
