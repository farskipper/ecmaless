var _ = require("lodash");
var test = require("tape");
var compile = require("../");

var testCompile = function(t, src, expected){
  t.equals(compile(src, {
    escodegen: {format: {compact: true}}
  }), expected);
};

test("basics", function(t){
  var tc = _.partial(testCompile, t);

  tc("(add 1 2)", "add(1,2);");

  t.end();
});

