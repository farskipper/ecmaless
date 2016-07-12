var _ = require("lodash");
var test = require("tape");
var parser = require("./");

var rmLoc = function(ast){
  return _.omit(ast, "loc");
};

var mk = {};
mk.num = function(value){
  return {type: "Number", value: value};
};
mk.str = function(value){
  return {type: "String", value: value};
};

test("parser", function(t){
  var tst = function(src, expected){
    var ast = parser(src);
    t.deepEquals(rmLoc(ast), expected);
  };

  tst("123", mk.num(123));
  tst("\"ok\"", mk.str("ok"));
  tst("\"\\\"that\\\"\"", mk.str("\"that\""));

  t.end();
});
