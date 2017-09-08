
'use strict';

const should = require('should');
const LDAPWrap = require('../modules/ldapAsyncWrap.js');
const jsonMap = require('../modules/mappingJsonObject/mappingStringJson.js');
//const heapdump = require('heapdump');

describe('Testing the async LDAP search ', () => {


  const host = 'ldap://localhost:389';
  const dnAdmin = 'cn=admin,dc=demoApp,dc=com';
  const dnUser = 'cn=cghitea,ou=users,o=myhost,dc=demoApp,dc=com';
  const searchBase = 'dc=demoApp,dc=com';



  const password = 'secret';
  let clientLDAP = new LDAPWrap(host);
  //heapdump.writeSnapshot('/home/hufserverldap/Desktop/Share/raribas/openldapjs/openldapjs/SnapshotsSearch/' + Date.now() + '.heapsnapshot');


  beforeEach((next) => {
    clientLDAP = new LDAPWrap(host);


    clientLDAP.initialize()
      .then(() => {
        clientLDAP.bind(dnAdmin, password)
          .then(() => {
            next();
          });

      });
  });
  afterEach((next) => {
    clientLDAP.unbind()
      .then(() => {
        next();


      });
  });

  it('should return an empty search', (next) => {
    clientLDAP.search(searchBase, 2, 'objectclass=aliens')
      .then((result) => {
        result.should.be.empty;
      })
      .then(() => {
        next();
      });
  });
  /**
   * case for search with non existing search base
   */
  it('should return the root node', (next) => {
    clientLDAP.search('', 0, 'objectclass=*')
      .then((result) => {
        const baseDN = '\ndn:\nobjectClass:top\nobjectClass:OpenLDAProotDSE\n\n';
        should.deepEqual(result, baseDN);
      })
      .then(() => {
        next();
      });

  });
  /**
   * test case for search with access denied
   */

  /* it('should return nothing', (next) => {
     clientLDAP.bind(dnUser, password)
       .then(() => {
         clientLDAP.search(searchBase, 2, 'objectClass=*')
           .catch((err) => {
             err.message.should.be.deepEqual('32');
           });
       })
       .then(() => {
         next();
       });
 
   }); */

  /**
   * test case with a single result
   */

  it('should return a single result', (next) => {
    clientLDAP.search(searchBase, 2, 'objectClass=simpleSecurityObject')
      .then((result) => {
        const count = (result.match(/\ndn:/g) || []).length;
        count.should.be.eql(1);
      })
      .then(() => {
        next();
      });
  });

  /**
   * test case with multiple results on the same level( scope argument 1?)
   * unfinished
   */
  it('should return multiple results located on the same level', (next) => {
    clientLDAP.search(searchBase, 1, 'objectClass=*')
      .then((result) => {
        const count = (result.match(/\ndn:/g) || []).length;
        count.should.be.above(1);
      })
      .then(() => {
        next();
      });
  });

  /**
   * test case with sequential identical searches
   */

  it('should return the same result', (next) => {

    clientLDAP.search(searchBase, 2, 'objectClass=simpleSecurityObject')
      .then((res1) => {
        clientLDAP.search(searchBase, 2, 'objectClass=simpleSecurityObject')
          .then((res2) => {
            should.deepEqual(res1, res2);
            next();
          });

      });
  });

  /**
   * case with sequential different searches(including error cases)
   */
  it('should return sequential different results and errors', (next) => {

    clientLDAP.search(searchBase, 2, 'objectClass=simpleSecurityObject')
      .then((result1) => {
        clientLDAP.search(searchBase, 2, 'objectClass=aliens')
          .then((result2) => {
            should.notDeepEqual(result1, result2);
            clientLDAP.search(searchBase, 1, 'objectClass=template')
              .then((result3) => {
                should.notDeepEqual(result1, result3);
                should.notDeepEqual(result2, result3);
                clientLDAP.search('dc=wrongBase,dc=err', 2, 'objectClass=errors')
                  .catch((err) => {
                    err.should.not.be.empty;
                    next();
                  });
              });
          });
      });
  });

  /**
   * test cases for parallel searches
   */

  it('should return search results done in parallel', (next) => {
    const firstResult = clientLDAP.search(searchBase, 2, 'objectClass=simpleSecurityObject');
    const secondResult = clientLDAP.search(searchBase, 2, 'objectClass=simpleSecurityObject');
    const thirdResult = clientLDAP.search(searchBase, 2, 'objectClass=aliens');

    Promise.all([firstResult, secondResult, thirdResult])
      .then((values) => {
        should.deepEqual(values[0], values[1]);
        should.notDeepEqual(values[0], values[2]);
        should.notDeepEqual(values[1], values[2]);
      })
      .then(() => {
        next();
      });
  });

  /** 
   * Test case with a large number of results (>10k)
   */

  it.only('should return 10k entries', function () {
    this.timeout(0);
 return   clientLDAP.search(searchBase, 2, 'objectClass=person')
      .then((result) => {
        const count = (result.match(/\ndn:/g) || []).length;
        count.should.be.above(10000);
        console.log(count);
        console.log(result);
      })
     
  });


  it('should return results in entire subtree', (next) => {

    clientLDAP.search(searchBase, 2, 'objectClass=inetOrgPerson')
      .then((result) => {
        const count = (result.match(/\ndn:/g) || []).length;
        count.should.be.above(1);
      })
      .then(() => {
        next();
      });
  });
});