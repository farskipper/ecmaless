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

test("parser", function(t){
  var tst = function(src, expected){
    var ast = parser(src);
    t.deepEquals(rmLoc(ast), expected);
  };

  tst("123", mk.num(123));
  tst("\"ok\"", mk.str("ok"));
  tst("\"\\\"that\\\"\"", mk.str("\"that\""));

  tst("def a", mk.def(mk.sym("a")));
  tst("def a = 1.2", mk.def(mk.sym("a"), mk.num(1.2)));
  /*
  var src = "";
  src += "def add = fn [a, b] :\n"
  src += "    a + b"
  tst(src, {});
  */

  t.end();
});
