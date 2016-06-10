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
  tc("+1,200.3", "1200.3;");
  tc("-.3", "-0.3;");
  tc("0.0", "0;");
  tc('"one"', "'one';");
  tc("nil", "void 0;");
  tc("true", "true;");
  tc("false", "false;");
  tc("one", "one;");

  tc("[]", "[];");
  tc("[1 2 3]", "[1,2,3];");

  tc('{}', "({});");
  tc('{"one" 1 "two" 2}', "({'one':1,'two':2});");
  tc('{"one" [1 2] "two"}', "({'one':[1,2],'two':undefined});");
  tc('{one 1 two 2}', "struct(one,1,two,2);");

  tc('<>', "todo_angled_list();");
  tc('<1 2>', "todo_angled_list(1,2);");

  tc('(def a)', "var a=void 0;");
  tc('(def a 1)', "var a=1;");

  tc('(fn [a b] 1 2 3)', "(function(a,b){1;2;return 3;});");

  tc('(fn arg2 [a b] b)', "(function arg2(a,b){return b;});");

  tc('(+)', "0;");
  tc('(+ 1)', "1;");
  tc('(+ 1 2)', "1+2;");

  t.end();
});
