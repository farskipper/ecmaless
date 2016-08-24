var lib = require("./");
var test = require("tape");

test("is", function(t){

  t.equals(lib.isNil(void 0), true);
  t.equals(lib.isNil(null), true);
  t.equals(lib.isNil(NaN), true);
  t.equals(lib.isNil(0/0), true);
  t.equals(lib.isNil(parseInt("blah")), true);
  t.equals(lib.isNil(new Number(NaN)), true);
  t.equals(lib.isNil(0), false);
  t.equals(lib.isNil(false), false);

  t.equals(lib.isNumber(1), true);
  t.equals(lib.isNumber(.01), true);
  t.equals(lib.isNumber(-Infinity), true);
  t.equals(lib.isNumber(Number.MAX_VALUE), true);
  t.equals(lib.isNumber(new Number(-100)), true);
  t.equals(lib.isNumber(NaN), false);
  t.equals(lib.isNumber(0/0), false);
  t.equals(lib.isNumber("1"), false);

  t.equals(lib.isString("hi"), true);
  t.equals(lib.isString(""), true);
  t.equals(lib.isString(new String()), true);
  t.equals(lib.isString(0), false);
  t.equals(lib.isString([]), false);

  t.equals(lib.isBoolean(true), true);
  t.equals(lib.isBoolean(false), true);
  t.equals(lib.isBoolean(new Boolean(false)), true);
  t.equals(lib.isBoolean(0), false);
  t.equals(lib.isBoolean(null), false);
  t.equals(lib.isBoolean(void 0), false);

  t.equals(lib.isArray([]), true);
  t.equals(lib.isArray([1, 2]), true);
  t.equals(lib.isArray({}), false);
  t.equals(lib.isArray({"a": [1, 2]}), false);
  t.equals(lib.isArray("array"), false);
  t.equals(lib.isArray(null), false);
  t.equals(lib.isArray(arguments), false);

  t.equals(lib.isStruct({}), true);
  t.equals(lib.isStruct({name: "bob"}), true);
  function User(name){this.name = name;}
  t.equals(lib.isStruct(new User("bob")), false);
  t.equals(lib.isStruct([]), false);
  t.equals(lib.isStruct([1, 2]), false);
  t.equals(lib.isStruct(arguments), false);
  t.equals(lib.isStruct(null), false);

  t.equals(lib.isFunction(function(){}), true);
  t.equals(lib.isFunction(lib.isFunction), true);
  t.equals(lib.isFunction(Array.isArray), true);
  t.notOk(lib.isFunction(/a/));
  t.notOk(lib.isFunction([]));
  t.notOk(lib.isFunction({}));
  t.notOk(lib.isFunction(arguments));
  t.notOk(lib.isFunction(void 0));
  t.notOk(lib.isFunction(null));

  t.equals(lib.truthy(1), true);
  t.equals(lib.truthy({}), true);
  t.equals(lib.truthy([]), true);
  t.equals(lib.truthy(""), true);
  t.equals(lib.truthy(lib), true);
  t.equals(lib.truthy(true), true);
  t.equals(lib.truthy(/a/), true);
  t.equals(lib.truthy(1), true);
  t.equals(lib.truthy(0), true);
  t.notOk(lib.truthy(false));
  t.notOk(lib.truthy(void 0));
  t.notOk(lib.truthy(null));
  t.notOk(lib.truthy(NaN));

  t.end();
});

test("data access", function(t){

  t.equals(lib.has({}, "prototype"), false);
  t.equals(lib.has({a: 1}, "a"), true);

  t.equals(lib.get(), void 0);
  t.equals(lib.get({}, "prototype"), void 0);
  t.equals(lib.get({}, "prototype", "not found"), "not found");
  t.equals(lib.get({a: 1}, "a"), 1);

  t.end();
});
