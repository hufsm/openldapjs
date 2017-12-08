'use strict';

import path = require('path');
import Promise = require('bluebird');
import _ = require('underscore');
import { method } from 'bluebird';

import checkParameters = require('./utils/check_variable_format');

import SearchStream = require('./stream_interface');
import StateError = require('./errors/state_error');
import errorList = require('../test/error_list.json');

const errorHandler = require('./errors/error_dispenser').errorFunction;
const binary = require('node-pre-gyp');
const bindingPath:string = binary.find(path.resolve(path.join(__dirname, '../package.json')));
const binding = require(bindingPath);

interface ObjectE_STATE {
  CREATED: number;
  INITIALIZED : number,
  BOUND : number,
  UNBOUND : number
  [key: string]: number
}

interface ObjectScopeObject {
  BASE: number;
  ONE : number,
  SUBTREE : number,
  [key: string]: number
}

const E_STATES: ObjectE_STATE = {
  CREATED : 0,
  INITIALIZED : 1,
  BOUND : 2,
  UNBOUND : 5
};

const scopeObject: ObjectScopeObject = {
  BASE : 0,
  ONE : 1,
  SUBTREE : 2
};

/**
 * @module LDAPTransition
 * @class LDAPAsyncWrap
 */

class LDAPAsyncWrap {
   private _hostAddress:string;
   public _binding = new binding.LDAPClient();
   public _stateClient:number;
   public _searchID:number;
   constructor(public host:string) {
    this._hostAddress = host;
    this._stateClient = E_STATES.CREATED;
   }

    /**
    * Initialize to an LDAP server.
    *
    * @method initialize
    * @return {Promise} That resolves if ldap_initialize succeeds
    ** Rejects if client was not created or ldap_initialize fails.
    * */

   initialize() {
     return new Promise((resolve, reject) => {
      if(this._stateClient === E_STATES.CREATED) {
        this._binding.initialize(this._hostAddress, (err:number, result:boolean) => {
          if(err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapInitializeErrorMessage));
          } else {
            this._stateClient = E_STATES.INITIALIZED;
            resolve();
          }
        });
      } else {
        reject(new StateError((<any>errorList).initErrorMessage));
      }
     });
   }


  /**
    * Initiate a TLS processing on an LDAP session.
    *
    * @method startTLS
    * @param {String} pathToCertFile The path to the certificate can be optional
    * @return {Promise} Will reject if state is not Initialized or if the
    * certificate is not good else will resolve If the certificate is not
    * specified then the client will use the server certificate
    * */

    startTLS(pathToCertFile:string) {
      return new Promise((resolve, reject) => {
        if (this._stateClient === E_STATES.INITIALIZED) {
          const pathCert = pathToCertFile === undefined ? '' : pathToCertFile;
          this._binding.startTls(pathCert, (err:number, res:boolean) => {
            if (err) {
              const CustomError = errorHandler(err);
              reject(new CustomError((<any>errorList).ldapStartTlsErrorMessage));
            } else {
              resolve();
            }
          });
        } else {
          reject(new StateError((<any>errorList).initErrorMessage));
        }
      });
    }

    /**
    * Authenticate to LDAP server.
    *
    * @method bind
    * @param {String} bindDn The client user DN.
    * @param {String} passwordUser The client's password.
    * @return {Promise} That resolves if the credentials are correct.
    * Rejects if dn or password are incorrect or the client did not initialize.
    * */

  bind(bindDn:string, passwordUser:string) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === E_STATES.INITIALIZED) {
        this._binding.bind(bindDn, passwordUser, (err:number, state:number) => {
          if (err) {
            const CustomError = errorHandler(err);
            this._stateClient = E_STATES.INITIALIZED;
            reject(new CustomError((<any>errorList).ldapBindErrorMessage));
          } else {
            this._stateClient = E_STATES.BOUND;
            resolve();
          }
        });
      } else {
        reject(new StateError((<any>errorList).uninitializedErrorMessage));
      }
    });
  }

    /**
     * Search operation.
     *
     * @method search
     * @param {String} searchBase the base for the search.
     * @param {String} scope  scope for the search, can be BASE, ONE or
     * SUBTREE
     * @param {String} searchFilter  search filter.If not provided,
     * the default filter, (objectClass=*), is used.
     * @return {Promise} That resolves and returns a string with the search
     * results. Rejects in case of error.
     * */
    search(searchBase:string, scope:string, searchFilter:string) {
      return new Promise((resolve, reject) => {
        if (this._stateClient !== E_STATES.BOUND) {
          reject(new StateError((<any>errorList).bindErrorMessage));
        } else {
          checkParameters.validateStrings(searchBase, searchFilter, scope);
  
          if (scopeObject[scope] === undefined) {
            throw new Error((<any>errorList).scopeSearchErrorMessage);
          }
  
          this._binding.search(
            searchBase, scopeObject[scope], searchFilter, (err:number, result:string) => {
              if (err) {
                const CustomError = errorHandler(err);
                reject(new CustomError((<any>errorList).ldapSearchErrorMessage));
              } else {
                resolve(result);
              }
            });
        }
      });
    }

      /**
     * Search operation with results displayed page by page.
     *
     * @method pagedSearch
     * @param {String} searchBase the base for the search.
     * @param {String} scope  scope for the search, can be BASE, ONE or
     * SUBTREE
     * @param {String} searchFilter search filter.
     * @param {int} pageSize The number of entries per LDAP page
     * @return {Promise} that resolves to a readable stream or rejects to a
     * Error;
     */
  pagedSearch(searchBase:string, scope:string, searchFilter:string, pageSize:number) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === E_STATES.BOUND) {
        checkParameters.validateStrings(searchBase, searchFilter, scope);

        if (scopeObject[scope] === undefined) {
          throw new Error((<any>errorList).scopeSearchErrorMessage);
        }

        if (!_.isNumber(pageSize)) {
          throw new TypeError((<any>errorList).typeErrorMessage);
        }
        this._searchID += 1;
        resolve(
          new SearchStream(
            searchBase, scopeObject[scope], searchFilter, pageSize,
            this._searchID, this._binding));
      }
      reject(new StateError((<any>errorList).bindErrorMessage));
    });
  }


  /**
   * Compare operation.
   *
   * @method compare
   * @param {String} dn The dn of the entry to compare.
   * @param {String} attr The attribute given for comparison.
   * @param {String} value Value sent to compare.
   * @return {Promise} That resolves and returns True if the elements are
   * equal
   * or
   * False otherwise.
   * Rejects if an error occurs.
   */

  compare(dn:string, attr:string, value:string) {
    const LDAP_COMPARE_TRUE:number = 6;
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new StateError((<any>errorList).bindErrorMessage));
      } else {
        checkParameters.validateStrings(dn, attr, value);

        this._binding.compare(dn, attr, value, (err:number, result:number) => {
          if (err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapCompareErrorMessage));
          } else {
            const res:boolean = result === LDAP_COMPARE_TRUE;
            resolve(res);
          }
        });
      }
    });
  }

  /**
    * Perform an LDAP modify operation
    *
    * @method modify
    * @param {String} dn The dn of the entry to modify
    * @param {JSON} jsonChange The attribute and value to be changed
    * @param {JSON} [controls] Request to execute a specific control
   * or
    * multiple controls. This parameter is optional.
    * @return {Promise} That resolves if LDAP modified successfully the
    * entry.
    * Reject if  LDAP rejects the operation or the client's state is not
    * BOUND
    */
  modify(dn:string, jsonChange:JSON, controls:JSON) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new StateError((<any>errorList).bindErrorMessage));
      } else {
        checkParameters.validateStrings(dn);
        const changes:JSON = checkParameters.checkModifyChange(jsonChange);
        const ctrls:JSON = checkParameters.checkControl(controls);

        this._binding.modify(dn, changes, ctrls, (err:number, result:string) => {
          if (err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapModifyErrorMessage));
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
   * Perform an LDAP rename  operation
   *
   * @method rename
   * @param {String} dn The dn of the entry to rename
   * @param {String} newRdn The new rdn for the dn
   * @param {String} newParent New parent for the rdn
   * @param {JSON} [controls] Request to execute a specific control
   * or
   * multiple controls. This parameter is optional.
   * @return {Promise} Will fulfil with a result from a control if the
   * operation is successful, else will reject with an LDAP error number.
   * */
  rename(dn:string, newRdn:string, newParent:string, controls:JSON) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new StateError((<any>errorList).bindErrorMessage));
      } else {
        checkParameters.validateStrings(dn, newRdn, newParent);
        const ctrls:JSON = checkParameters.checkControl(controls);

        this._binding.rename(dn, newRdn, newParent, ctrls, (err:number, result:string) => {
          if (err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapRenameErrorMessage));
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
   * Perform an LDAP delete operation
   *
   * @method delete
   * @param {String} dn the dn entry to be deleted.
   * @param {JSON} [controls] Request to execute a specific control
   * or
   * multiple controls. This parameter is optional.
   * @return {Promise} promise that resolves if the element provided was
   * deleted
   * or rejects if not.
   * */
  delete(dn:string, controls:JSON) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new StateError((<any>errorList).bindErrorMessage));
      } else {
        checkParameters.validateStrings(dn);
        const ctrls:JSON = checkParameters.checkControl(controls);

        this._binding.delete(dn, ctrls, (err:number, result:string) => {
          if (err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapDeleteErrorMessage));
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
    * Perform an LDAP password change operation
    *
    * @method changePassword
    * @param {String} userDN The user dn which the password will be changed
    * @param {String} oldPassword Old password of user
    * @param {String} newPassword New password for user
    * @return {Promise} Will fulfil with a result of success if the
    * Old password is given correctly, the parameters are string type and
    * the state of client is BOUND else will fail with type error or LDAP ERROR.
    * */
  changePassword(userDN:string, oldPassword:string, newPassword:string) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new StateError((<any>errorList).bindErrorMessage));
      } else {
        checkParameters.validateStrings(userDN, oldPassword, newPassword);

        this._binding.changePassword(
          userDN, oldPassword, newPassword, (err:number, result:number) => {
            if (err) {
              const CustomError = errorHandler(err);
              reject(
                new CustomError((<any>errorList).ldapChangePasswordErrorMessage));
            } else {
              resolve();
            }
          });
      }
    });
  }
  /**
   * Perform an LDAP add operation
   *
   * @method add
   * @param {String} dn  dn of the entry to add Ex: 'cn=foo, o=example..,
   * NOTE:every entry except the first one,cn=foo in this case, must already
   * exist'
   * @param {JSON} entry ldif format to be added, needs to have a
   * structure that is mappable to a LDAPMod structure
   * @param {JSON} [controls] Request to execute a specific control
   * or
   * multiple controls. This parameter is optional.
   * @return {Promise} that fulfils if the add was successful, rejects
   * otherwise.
   * */
  add(dn:string, entry:JSON, controls:JSON) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new StateError((<any>errorList).bindErrorMessage));
      } else {
        checkParameters.validateStrings(dn);
        const entryAttr:JSON = checkParameters.checkEntryObject(entry);
        const ctrls:JSON = checkParameters.checkControl(controls);

        this._binding.add(dn, entryAttr, ctrls, (err:number, result:JSON) => {
          if (err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapAddErrorMessage));
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
    * Unbind from a LDAP server.
    *
    * @method unbind
    * @return {Promise} That resolves if the LDAP structure was unbound.
    * Reject if the LDAP could not unbind.
    */
  unbind() {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.UNBOUND) {
        this._binding.unbind((err:number, state:boolean) => {
          if (err) {
            const CustomError = errorHandler(err);
            reject(new CustomError((<any>errorList).ldapUnbindErrorMessage));
          } else {
            this._stateClient = E_STATES.UNBOUND;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

 }

export = LDAPAsyncWrap;
