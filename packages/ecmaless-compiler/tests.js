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

  tc("fn args:\n    nil", "(function(){var args=arguments.slice(0);return void 0;});");
  tc("fn [a, b]:\n    nil", "(function(a,b){return void 0;});");
  tc(
    "fn [a, b..., c]:\n    nil",
    "(function(a){var b=arguments.slice(1,-1);var c=arguments[arguments.length-1];return void 0;});"
  );

  tc("def a", "var a=void 0;");
  tc("def a = 1", "var a=1;");

  t.end();
});
