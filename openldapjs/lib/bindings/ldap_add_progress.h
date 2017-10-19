#ifndef OPENLDAPJS_LIB_BINDINGS_LDAP_ADD_PROGRESS_H_
#define OPENLDAPJS_LIB_BINDINGS_LDAP_ADD_PROGRESS_H_

#include <ldap.h>
#include <nan.h>

class LDAPAddProgress : public Nan::AsyncProgressWorker {
 private:
  LDAP *ld_{};
  Nan::Callback *progress_{};
  int result_{};
  LDAPMessage *resultMsg_{};
  int msgID_{};

 public:
  /**
   **@brief Constructor
   **@param callback, callback used to pass the final result to js
   **@param progress, callback used to pass intermediate results to js
   **@param ld, LDAP structure that holds ldap internal data.
   **@param msgID, operation identifier.
   **/
  LDAPAddProgress(Nan::Callback *callback, Nan::Callback *progress, LDAP *ld,
                  const int msgID);
  ~LDAPAddProgress();

  /**
   **@brief Execute Method, runs outside the event loop.
   **@param progress, used to send data back to js during execution, currently
   **unused
   **
   **/
  void Execute(const Nan::AsyncProgressWorker::ExecutionProgress &progress);

  /**
   **@brief HandleOkCallback method, gets called when the execute method
   **finishes. Here we send the response back to js.
   **
   ** Executes in event loop.
   **/
  void HandleOKCallback();

  /**
   **@brief HandleProgressCallback method. Used for sending intermediary data to
   **js
   **@param data, intermediary data
   **@param size, size of the data sent (in bytes).
   **/
  void HandleProgressCallback(const char *data, size_t size);
};

#endif  // OPENLDAPJS_LIB_BINDINGS_LDAP_ADD_PROGRESS_H_
