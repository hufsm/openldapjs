import LdapError = require('./ldap_error');
import OperationalError = require('./operational_error');

declare class LdapAlreadyExistsError extends OperationalError {

}

export = LdapAlreadyExistsError;
