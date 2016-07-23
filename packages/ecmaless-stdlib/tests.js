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

  t.end();
});
