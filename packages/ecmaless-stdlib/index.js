var objectToString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var funcToString = Function.prototype.toString;
var objectCtorString = funcToString.call(Object);
var isObject = function(v){
  var type = typeof v;
  return !!v && (type == "object" || type == "function");
};
var isTag = function(v, tag){
  return !!v && typeof v == "object" && (objectToString.call(v) === tag);
};
var isJSNumber = function(v){
  return (typeof v == "number") || isTag(v, "[object Number]")
};
var isNaN = function(v){
  return isJSNumber(v) && v != +v;
};
var isHostObject = function(v){
  var result = false;
  if (v != null && typeof v.toString != "function") {
    try {
      result = !!(v + "");
    } catch (e) {}
  }
  return result;
};
var nativeGetPrototype = Object.getPrototypeOf;
var getPrototype = function(v){
  return nativeGetPrototype(Object(v));
};

var stdlib = {};

stdlib.isNil = function(v){
  return (v === void 0) || (v === null) || isNaN(v);
};

stdlib.isNumber = function(v){
  return isJSNumber(v) && v == +v;
};

stdlib.isString = function(v){
  return (typeof v == "string")
    || (!stdlib.isArray(v) && isTag(v, "[object String]"));
};

stdlib.isBoolean = function(v){
  return (v === true) || (v === false) || isTag(v, "[object Boolean]");
};

stdlib.isArray = Array.isArray;

stdlib.isStruct = function(v){
  if(!isTag(v, "[object Object]") || isHostObject(v)){
    return false;
  }
  var proto = getPrototype(v);
  if(proto === null){
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor == "function"
      && Ctor instanceof Ctor
      && funcToString.call(Ctor) == objectCtorString;
};

stdlib.isFunction = function(v){
  var tag = isObject(v) ? objectToString.call(v) : "";
  return tag === "[object Function]" || tag === "[object GeneratorFunction]";
};

stdlib.truthy = function(v){
  return !stdlib.isNil(v) && v !== false;
};

stdlib.has = function(obj, key){
  return obj != null && hasOwnProperty.call(obj, key);
};

stdlib.get = function(o, key, deflt){
  if(stdlib.has(o, key)){
    return o[key];
  }
  return deflt;
};

stdlib.iterate = function(o, fn){
  if(stdlib.isArray(o)){
    var i;
    for(i=0; i < o.length; i++){
      if(!stdlib.truthy(fn(o[i], i, o))){
        return;
      }
    }
  }
  if(stdlib.isStruct(o)){
    var key;
    for(key in o){
      if(stdlib.has(o, key)){
        if(!stdlib.truthy(fn(o[key], key, o))){
          return;
        }
      }
    }
  }
};

module.exports = stdlib;
