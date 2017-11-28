#include <node.h>
#include <v8.h>
#include <v8-debug.h>

namespace liveedit
{

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

void setLiveEditEnabled(const v8::FunctionCallbackInfo<v8::Value> &args)
{
  Isolate *isolate = args.GetIsolate();

  if (!args[0]->IsBoolean())
  {
    isolate->ThrowException(v8::Exception::TypeError(
        String::NewFromUtf8(isolate, "Argument must be a boolean")));
  }

  bool argEnable = args[0]->IsBoolean();

  v8::Debug::SetLiveEditEnabled(isolate, argEnable);
}

void init(Local<Object> exports)
{
  NODE_SET_METHOD(exports, "setLiveEditEnabled", setLiveEditEnabled);
}

NODE_MODULE(live_edit_enable, init)

}
