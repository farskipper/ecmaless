var _ = require("lodash");
var test = require("tape");
var parser = require("./");

var rmLoc = function(ast){
  if(_.isPlainObject(ast)){
    return _.mapValues(_.omit(ast, "loc"), rmLoc);
  }
  if(_.isArray(ast)){
    return _.map(ast, rmLoc);
  }
  return ast;
};

var mk = {};
mk.num = function(value){
  return {type: "Number", value: value};
};
mk.str = function(value){
  return {type: "String", value: value};
};
mk.id = function(value){
  return {type: "Identifier", value: value};
};
mk.def = function(id, init){
  return {type: "Define", id: id, init: init};
};
mk.fn = function(params, body){
  return {type: "Function", params: params, body: body};
};
mk.arr = function(value){
  return {type: "Array", value: value};
};
mk.ddd = function(value){
  return {type: "DotDotDot", value: value};
};

test("parser", function(t){
  var tst = function(src, expected){
    var ast = parser(src);
    t.deepEquals(rmLoc(ast), expected);
  };
  var tstFail = function(src){
    try{
      parser(src);
      t.ok(false, "This should have thrown a parsing exception");
    }catch(e){
      t.ok(true);
    }
  };

  tst("123", mk.num(123));
  tst("\"ok\"", mk.str("ok"));
  tst("\"\\\"that\\\"\n\"", mk.str("\"that\"\n"));

  tst("def a", mk.def(mk.id("a")));
  tst("def a = 1.2", mk.def(mk.id("a"), mk.num(1.2)));

  tst("[]", mk.arr([]));
  tstFail("[,]");
  tst("[1, 2, 3]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
  tst("[1, 2, 3,]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
  tstFail("[1, 2, 3,,]");
  tstFail("[,1, 2, 3]");

  tstFail("fn \n    a");
  tstFail("fn []\n    a");
  tst("fn args:\n    a", mk.fn(mk.id("args"), [mk.id("a")]));
  tst("fn []:\n    a", mk.fn([], [mk.id("a")]));
  tst("fn[]:\n    a", mk.fn([], [mk.id("a")]));
  tst("fn [  ] :\n    a", mk.fn([], [mk.id("a")]));
  tstFail("fn [,]:\n    a");
  tstFail("fn [1]:\n    a");
  tstFail("fn [1, 2]:\n    a");
  tst("fn [a]:\n    a", mk.fn([mk.id("a")], [mk.id("a")]));
  tst("fn [a,]:\n    a", mk.fn([mk.id("a")], [mk.id("a")]));
  tst("fn [a, b]:\n    a", mk.fn([mk.id("a"), mk.id("b")], [mk.id("a")]));
  tst("fn [a,b,]:\n    a", mk.fn([mk.id("a"), mk.id("b")], [mk.id("a")]));
  tst("fn [a, b...]:\n    a", mk.fn([mk.id("a"), mk.ddd(mk.id("b"))], [mk.id("a")]));

  var src = "";
  src += "def id = fn args :\n"
  src += "    args"
  tst(src, mk.def(mk.id("id"), mk.fn(mk.id("args"), [
    mk.id("args")
  ])));

  t.end();
});
