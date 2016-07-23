var objectToString = Object.prototype.toString;
var isTag = function(v, tag){
  return !!v && typeof v == "object" && (objectToString.call(v) === tag);
};
var isJSNumber = function(v){
  return (typeof v === "number") || isTag(v, "[object Number]")
};
var isNaN = function(v){
  return isJSNumber(v) && v != +v;
};

var stdlib = {};

stdlib.isNil = function(v){
  return (v === void 0) || (v === null) || isNaN(v);
};

stdlib.isNumber = function(v){
  return isJSNumber(v) && v == +v;
};

stdlib.isString = function(v){
  return (typeof v === "string")
    || (!stdlib.isArray(v) && isTag(v, "[object String]"));
};

stdlib.isBoolean = function(v){
  return (v === true) || (v === false) || isTag(v, '[object Boolean]');
};

stdlib.isArray = Array.isArray;

module.exports = stdlib;
