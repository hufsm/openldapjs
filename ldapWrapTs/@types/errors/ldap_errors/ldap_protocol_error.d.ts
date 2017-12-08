import LdapError = require('./ldap_error');
import OperationalError = require('./operational_error');

declare class LdapProtocolError extends OperationalError {

}

export = LdapProtocolError;
