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

test("iterate", function(t){
  t.plan(8);

  lib.iterate(void 0, function(){
    t.fail();
  });

  lib.iterate([], function(){
    t.fail();
  });

  lib.iterate({}, function(){
    t.fail();
  });

  lib.iterate([1], function(v, k, o){
    t.equals(v, 1);
    t.equals(k, 0);
    t.deepEquals(o, [1]);
  });

  lib.iterate({"0": 1}, function(v, k, o){
    t.equals(v, 1);
    t.equals(k, "0");
    t.deepEquals(o, {"0": 1});
  });

  lib.iterate({a: "b", c: "d"}, function(v, k, o){
    t.equals(v, k === "a" ? "b" : "d");
    return true;
  });
});

test("boolean ops", function(t){
  t.equals(lib["||"](0, 1), 0);
  t.equals(lib["||"](void 0, 1), 1);
  t.equals(lib["||"](NaN, 1), 1);
  t.equals(lib["&&"](false, 1), false);
  t.equals(lib["&&"](0, 1), 1);
  t.equals(lib["!"](0), false);
  t.equals(lib["!"](NaN), true);
  t.end();
});

test("mutation", function(t){

  var a = {};
  t.deepEquals(lib.set(a, "one", 2), 2);
  t.deepEquals(a, {one: 2});

  lib.set(a, "two", {three: 4});
  lib.set(a.two, "five", 6);
  t.deepEquals(a, {one: 2, two: {three: 4, five: 6}});

  var b = [1];
  t.deepEquals(lib.push(b, 2), 2);
  t.deepEquals(b, [1, 2]);

  t.end();
});

test("map", function(t){

  var inc = function(n){
    return n + 1;
  };

  t.deepEquals(lib.map([1, 2], inc), [2, 3]);
  t.deepEquals(lib.map({a: 1, b: 2}, inc), {a: 2, b: 3});

  t.deepEquals(lib.map(void 0, inc), []);
  t.deepEquals(lib.map("wat?", inc), []);

  t.end();
});

test("filter, reject", function(t){

  var isEven = function(n){
    return n % 2 === 0;
  };

  t.deepEquals(lib.filter([1, 2, 3, 4], isEven), [2, 4]);
  t.deepEquals(lib.reject([1, 2, 3, 4], isEven), [1, 3]);
  t.deepEquals(lib.filter({a: 1, b: 2, c: 3, d: 4}, isEven), {b: 2, d: 4});
  t.deepEquals(lib.reject({a: 1, b: 2, c: 3, d: 4}, isEven), {a: 1, c: 3});

  t.end();
});

test("reduce", function(t){
  var add = function(a, b){
    return a + b;
  };
  t.deepEquals(lib.reduce([1, 2, 3], add, 0), 6);
  t.deepEquals(lib.reduce({a: 4, b: 6}, add, 0), 10);
  t.deepEquals(lib.reduce([], add, 0), 0);
  t.deepEquals(lib.reduce(NaN, add, 0), 0);

  t.end();
});
