#include <nan.h>
#include <ldap.h>
#include <iostream>
#include <string>

using namespace v8;
using namespace std;

//Create the LDAP object
class LDAPClient : public Nan::ObjectWrap {
 public:
  static NAN_MODULE_INIT(Init) {
    v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("LDAPClient").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    Nan::SetPrototypeMethod(tpl, "initialize", initialize);
    Nan::SetPrototypeMethod(tpl, "getState", getState);
    Nan::SetPrototypeMethod(tpl, "bind", bind);
    Nan::SetPrototypeMethod(tpl, "search", search);
    Nan::SetPrototypeMethod(tpl, "compare", compare);
    Nan::SetPrototypeMethod(tpl, "unbind", unbind);

    constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("LDAPClient").ToLocalChecked(),
      Nan::GetFunction(tpl).ToLocalChecked());
  }

 protected:
 private:
  LDAP *ld;
  unsigned int stateClient = 0;
  enum STATECLIENT 
  {
    ERROR = 0,
    INITIALIZE = 1,
    BIND = 2,
    UNBIND = 5
  };
  explicit LDAPClient(){};
  ~LDAPClient(){};

  static NAN_METHOD(New) {
    if (info.IsConstructCall()) {
      LDAPClient *obj = new LDAPClient();
      obj->Wrap(info.This());
    } else {
      const int argc = 1;
      v8::Local<v8::Value> argv[argc] = {info[0]};
      v8::Local<v8::Function> cons = Nan::New(constructor());
      info.GetReturnValue().Set(cons->NewInstance(argc, argv));
    }
  }

  static NAN_METHOD(getState) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    info.GetReturnValue().Set(obj->stateClient);
  }

  static NAN_METHOD(initialize) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    Nan::Utf8String hostArg(info[0]);
    LDAPClient::STATECLIENT stateClient;
    //LDAP *ld = obj->ld;

    char *hostAddress = *hostArg;
    int state;
    int protocol_version = LDAP_VERSION3;
    state = ldap_initialize(&obj->ld, hostAddress);
    if(state != LDAP_SUCCESS || obj->ld == 0) {
      stateClient = ERROR;
      info.GetReturnValue().Set(stateClient);
      return;
    }

    state = ldap_set_option(obj->ld, LDAP_OPT_PROTOCOL_VERSION, &protocol_version);
    if(state != LDAP_SUCCESS) {
      stateClient = ERROR;
      info.GetReturnValue().Set(stateClient);
      return;
    }
    stateClient = INITIALIZE;
    info.GetReturnValue().Set(stateClient);
    return;
  }

  static NAN_METHOD(bind) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    Nan::Utf8String userArg(info[0]);
    Nan::Utf8String passArg(info[1]);
    LDAPClient::STATECLIENT stateClient;

    char *username = *userArg;
    char *password = *passArg;
    int status;
    
    if(obj->ld == 0) {
      stateClient = ERROR;
      info.GetReturnValue().Set(stateClient);
      return;
    }

    status = ldap_simple_bind_s(obj->ld, username, password);
    if(status != LDAP_SUCCESS) {
      stateClient = ERROR;
      info.GetReturnValue().Set(stateClient);
      return;
    }
    stateClient = BIND;
    info.GetReturnValue().Set(stateClient);
    return;
  }

  static NAN_METHOD(search) {
  LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
  //Takes the argument given by nodeJS and make it string
  Nan::Utf8String baseArg(info[0]);
  Nan::Utf8String filterArg(info[2]);

  char *DNbase = *baseArg;
  char *filterSearch = *filterArg;
  int status, i;
  struct timeval timeOut = {1,0};
  char *dn, *attribute, **values;

  // create the structure of LDAPMessage for registering the response from server
  LDAPMessage *searchResult, *entry;
  BerElement *ber;
  string returnValue = "\n";

  //Verify if the argument is a Number for scope
  if(!info[1] -> IsNumber()) {
    obj->stateClient = 0;
    info.GetReturnValue().Set(obj->stateClient);
    return;
  }
  int scopeSearch = info[1]->NumberValue();
  if (scopeSearch <= 0 && scopeSearch >= 3) {
    obj->stateClient = 0;
    info.GetReturnValue().Set(obj->stateClient);
    return;
  }

   if (obj->ld == 0) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
  }
  // request a search to LDAP server
  status = ldap_search_ext_s(obj->ld, 
                            DNbase, 
                            scopeSearch, 
                            filterSearch, 
                            NULL, 
                            0, 
                            NULL, 
                            NULL, 
                            &timeOut, 
                            LDAP_NO_LIMIT, 
                            &searchResult);

  if (status != LDAP_SUCCESS) {
    obj->stateClient = 0;
    info.GetReturnValue().Set(obj->stateClient);
    ldap_msgfree(searchResult);
    return;
  }

  //take every node from result and print it
  for (entry = ldap_first_entry(obj->ld, searchResult);
      entry != NULL;
      entry = ldap_next_entry(obj->ld, entry)) {
        //print the dn
        if((dn = ldap_get_dn(obj->ld, entry)) != NULL) {
          returnValue += "dn:";
          returnValue += dn;
          returnValue += "\n";
          ldap_memfree(dn);
        }
        //print the attribute of specific entry
      for(attribute = ldap_first_attribute (obj->ld, entry, &ber);
          attribute != NULL;
          attribute = ldap_next_attribute(obj->ld, entry, ber) ) {
            if((values = (char **)(intptr_t)ldap_get_values(obj->ld,entry,attribute)) != NULL) {
              for(i=0; values[i] != NULL; i++) {
                returnValue += attribute;
                returnValue += ":";
                returnValue += values[i];
                returnValue += "\n";
              }
              ldap_value_free(values);
            }
            ldap_memfree(attribute);
      }
      ber_free(ber, 0);
    }
    ldap_msgfree(searchResult);
    returnValue += "stateClient3";
    info.GetReturnValue().Set(Nan::New(returnValue).ToLocalChecked());
    return;
  }

  static NAN_METHOD(compare) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Nan::Utf8String DNArg(info[0]);
    Nan::Utf8String attrArg(info[1]);
    Nan::Utf8String valueArg(info[2]);

    char *DNEntry = *DNArg;
    char *attribute = *attrArg;
    char *value = *valueArg;
    int status;

    struct berval bvalue;

    bvalue.bv_val = value;
    bvalue.bv_len = strlen(value);

    if (obj->ld == 0) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }

    status = ldap_compare_ext_s(obj->ld,
                      DNEntry,
                      attribute,
                      &bvalue,
                      NULL,
                      NULL);
    if(status != LDAP_COMPARE_TRUE) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }
    obj->stateClient = 4;
    info.GetReturnValue().Set(obj->stateClient);
    return;
  }

  static NAN_METHOD(unbind) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    LDAPClient::STATECLIENT stateClient;

    if (obj->ld == 0) {
      stateClient = ERROR;
      info.GetReturnValue().Set(stateClient);
      return;
    }
    ldap_unbind_s(obj->ld);
    stateClient = UNBIND;
    info.GetReturnValue().Set(stateClient);
    return;
  }

  static inline Nan::Persistent<v8::Function> & constructor() {
    static Nan::Persistent<v8::Function> my_constructor;
    return my_constructor;
  }

};

NODE_MODULE(objectwrapper, LDAPClient::Init)
