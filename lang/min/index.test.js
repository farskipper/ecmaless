var _ = require("lodash");
var test = require("tape");
var compile = require("../../");

var testCompile = function(t, src, expected){
  t.equals(compile('#lang min\n' + src, {
    escodegen: {format: {compact: true}}
  }), expected);
};

test("basics", function(t){
  var tc = _.partial(testCompile, t);

  tc("1", "1;");
  tc('"one"', "'one';");
  tc("nil", "void 0;");
  tc("one", "one;");

  tc("[1 2 3]", "[1,2,3];");
  tc('{"one" 1 "two" 2}', "({'one':1,'two':2});");

  t.end();
});
