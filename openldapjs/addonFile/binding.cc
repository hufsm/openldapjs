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
    Nan::SetPrototypeMethod(tpl, "bind", bind);
    Nan::SetPrototypeMethod(tpl, "unbind", unbind);
    Nan::SetPrototypeMethod(tpl, "resultMessage", resultMessage);
    Nan::SetPrototypeMethod(tpl, "errCatch", errCatch);
    Nan::SetPrototypeMethod(tpl, "errMessage", errMessage);

    constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("LDAPClient").ToLocalChecked(),
      Nan::GetFunction(tpl).ToLocalChecked());
  }

 protected:
 private:
  LDAP *ld;
  LDAPMessage *result;
  unsigned int stateClient = 0;
  int msgid;
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

  static NAN_METHOD(initialize) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    Nan::Utf8String hostArg(info[0]);
    //LDAP *ld = obj->ld;

    char *hostAddress = *hostArg;
    int state;
    int protocol_version = LDAP_VERSION3;
    state = ldap_initialize(&obj->ld, hostAddress);
    if(state != LDAP_SUCCESS || obj->ld == 0) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }

    state = ldap_set_option(obj->ld, LDAP_OPT_PROTOCOL_VERSION, &protocol_version);
    if(state != LDAP_SUCCESS) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }
    obj->stateClient = 1;
    info.GetReturnValue().Set(obj->stateClient);
    return;
  }

  static NAN_METHOD(bind) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    Nan::Utf8String userArg(info[0]);
    Nan::Utf8String passArg(info[1]);

    char *username = *userArg;
    char *password = *passArg;

    
    if(&obj->ld == 0) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }

    obj->msgid = ldap_simple_bind(obj->ld, username, password);
  }

  static NAN_METHOD(resultMessage) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    struct timeval timeOut;
    timeOut.tv_sec = timeOut.tv_usec = 0L;
    int status = 0;

    status = ldap_result(obj->ld, obj->msgid, NULL, &timeOut, &obj->result);
    info.GetReturnValue().Set(status);
    return;
  }

  static NAN_METHOD(errCatch) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    int status;

    status = ldap_result2error(obj->ld, obj->result, 0);
    if(status == LDAP_SUCCESS) {
      ldap_msgfree(obj->result);
    }
    info.GetReturnValue().Set(status);
    return;
  }

  static NAN_METHOD(errMessage) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    if(!info[0] -> IsNumber()) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }
    int errNumber = info[0] -> NumberValue();
    string errReturn = "";

    errReturn = ldap_err2string(errNumber);
    info.GetReturnValue().Set(Nan::New(errReturn).ToLocalChecked());
    ldap_msgfree(obj->result);
    return;
  }

  static NAN_METHOD(unbind) {
    LDAPClient* obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    if (obj->ld == 0) {
      obj->stateClient = 0;
      info.GetReturnValue().Set(obj->stateClient);
      return;
    }
    ldap_unbind(obj->ld);
    obj->stateClient = 5;
    info.GetReturnValue().Set(obj->stateClient);
    return;
  }

  static inline Nan::Persistent<v8::Function> & constructor() {
    static Nan::Persistent<v8::Function> my_constructor;
    return my_constructor;
  }

};

NODE_MODULE(objectwrapper, LDAPClient::Init)
