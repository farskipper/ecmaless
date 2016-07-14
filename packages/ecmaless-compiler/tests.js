var _ = require("lodash");
var test = require("tape");
var parser = require("ecmaless-parser");
var compiler = require("./");
var escodegen = require("escodegen");

var testCompile = function(t, src, expected){
  var ast = parser(src);
  var est = compiler(ast).estree;
  est = {
    "loc": {start: _.head(est).loc.start, end: _.last(est).loc.end},
    "type": "Program",
    "body": est
  };
  var js = escodegen.generate(est, {format: {compact: true}});
  t.equals(js, expected);
};

test("compile", function(t){
  var tc = _.partial(testCompile, t);

  tc("100.25", "100.25;");
  tc("\"a\nb\"", "'a\\nb';");
  tc("nil", "void 0;");
  tc("true", "true;");
  tc("false", "false;");

  tc("[1, 2]", "[1,2];");
  tc("{a: 1, b: 2}", "({'a':1,'b':2});");

  t.end();
});
