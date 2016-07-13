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
mk.sym = function(value){
  return {type: "Symbol", value: value};
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

  tst("def a", mk.def(mk.sym("a")));
  tst("def a = 1.2", mk.def(mk.sym("a"), mk.num(1.2)));

  tst("[]", mk.arr([]));
  tstFail("[,]");
  tst("[1, 2, 3]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
  tst("[1, 2, 3,]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
  tstFail("[1, 2, 3,,]");
  tstFail("[,1, 2, 3]");

  tstFail("fn \n    a");
  tstFail("fn []\n    a");
  tst("fn args:\n    a", mk.fn(mk.sym("args"), [mk.sym("a")]));
  tst("fn []:\n    a", mk.fn([], [mk.sym("a")]));
  tst("fn[]:\n    a", mk.fn([], [mk.sym("a")]));
  tst("fn [  ] :\n    a", mk.fn([], [mk.sym("a")]));
  tstFail("fn [,]:\n    a");
  tstFail("fn [1]:\n    a");
  tstFail("fn [1, 2]:\n    a");
  tst("fn [a]:\n    a", mk.fn([mk.sym("a")], [mk.sym("a")]));
  tst("fn [a,]:\n    a", mk.fn([mk.sym("a")], [mk.sym("a")]));
  tst("fn [a, b]:\n    a", mk.fn([mk.sym("a"), mk.sym("b")], [mk.sym("a")]));
  tst("fn [a,b,]:\n    a", mk.fn([mk.sym("a"), mk.sym("b")], [mk.sym("a")]));
  tst("fn [a, b...]:\n    a", mk.fn([mk.sym("a"), mk.ddd(mk.sym("b"))], [mk.sym("a")]));

  var src = "";
  src += "def id = fn args :\n"
  src += "    args"
  tst(src, mk.def(mk.sym("id"), mk.fn(mk.sym("args"), [
    mk.sym("args")
  ])));

  t.end();
});
