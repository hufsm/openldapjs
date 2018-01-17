import LoginError from './login_error';

export default class LdapStrongAuthRequired extends LoginError {

  static get code(): number {
    return 8;
  }

  static get description(): string {
    return 'Indicates one of the following: In bind requests, the LDAP server accepts only strong authentication.' +
    ' In a client request, the client requested an operation such as delete that requires strong authentication.' +
    ' In an unsolicited notice of disconnection, the LDAP server discovers the security protecting the communication' +
    ' between the client and server has unexpectedly failed or been compromised.';
  }

}
