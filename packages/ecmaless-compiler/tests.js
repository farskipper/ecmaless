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
    "fn [a, b...]:\n    nil",
    "(function(a){var b=arguments.slice(1);return void 0;});"
  );
  tc(
    "fn [a, b..., c]:\n    nil",
    "(function(a){var b=arguments.slice(1,-1);var c=arguments[arguments.length-1];return void 0;});"
  );
  tc(
    "fn [a..., b, c]:\n    nil",
    "(function(){var a=arguments.slice(0,-2);var b=arguments[arguments.length-2];var c=arguments[arguments.length-1];return void 0;});"
  );
  tc(
    "fn [a...]:\n    nil",
    "(function(){var a=arguments.slice(0);return void 0;});"
  );
  tc("return false", "return false;");

  tc("-1", "$45$(1);");
  tc("1 + 2", "$43$(1,2);");

  tc("if a:\n    b\nelse if c:\n    d\nelse:\n    e", "if(a){b;}else if(c){d;}else{e;}");
  tc("cond:\n    a:\n        b\n    c:\n        d\n    else:\n        e", "if(a){b;}else if(c){d;}else{e;}");
  tc(
    "case a:\n    1:\n        b\n    2:\n        c\n    else:\n        d",
    "if($61$$61$(a,1)){b;}else if($61$$61$(a,2)){c;}else{d;}"
  );
  tc("while a:\n    b", "while(a){b;}");
  tc("break", "break;");
  tc("continue", "continue;");

  tc("try:\n    a\ncatch b:\n    c\nfinally:\n    d", "try{a;}catch(b){c;}finally{d;}");

  tc("def a", "var a=void 0;");
  tc("def a = 1", "var a=1;");
  tc("a = 1", "a=1;");

  tc("a.b", "get(a,'b');");
  tc("a[b]", "get(a,b);");
  tc("a.b[c][1][\"e\"]", "get(get(get(get(a,'b'),c),1),'e');");

  t.end();
});
