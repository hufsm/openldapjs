#ifndef LDAP_CONTROL_H
#define LDAP_CONTROL_H
#include <iostream>
#include <lber.h>
#include <ldap.h>
#include <nan.h>
#include <vector>

#define LBER_ALIGNED_BUFFER(uname, size)                                       \
  union uname {                                                                \
    char buffer[size];                                                         \
    int ialign;                                                                \
    long lalign;                                                               \
    float falign;                                                              \
    double dalign;                                                             \
    char *palign;                                                              \
  }

#define LBER_ELEMENT_SIZEOF (256)
typedef LBER_ALIGNED_BUFFER(lber_berelement_u,
                            LBER_ELEMENT_SIZEOF) BerElementBuffer;

class LdapControls {
public:
  LdapControls();

  std::vector<LDAPControl *>
  CreateModificationControls(const v8::Local<v8::Array> &control_handle);
  std::string PrintModificationControls(LDAP *ld, LDAPMessage *resultMsg);
};

#endif // LDAP_CONTROLs_H
