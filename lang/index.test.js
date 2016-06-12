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

  tc("1", "1;");
  tc("+1,200.3", "1200.3;");
  tc("-.3", "-0.3;");
  tc("0.0", "0;");
  tc('"one"', "'one';");
  tc("nil", "void 0;");
  tc("true", "true;");
  tc("false", "false;");
  tc("one", "one;");
  tc(":", "'';");
  tc("::", "':';");
  tc(":keyword", "'keyword';");
  tc(";comment", "");

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
  tc('(+ 1 2 3)', "1+2+3;");
  tc('(+ 1 2 3 4)', "1+2+3+4;");
  tc('(+ blah (one))', "blah+one();");

  tc('(- 1 2)', "1-2;");
  tc('(/ 1 2)', "1/2;");
  tc('(* 1 2)', "1*2;");
  tc('(% a b)', "a%b;");

  tc('(and a)', "a;");
  tc('(and a b c)', "a&&b&&c;");
  tc('(and (or a b) c)', "(a||b)&&c;");

  tc('(not a)', "!a;");

  tc('(set! a 2)', "a=2;");

  tc('(get)', "void 0;");
  tc('(get a)', "a;");
  tc('(get a 1)', "a[1];");
  tc('(get a 1 "two")', "a[1]['two'];");
  tc('(get a 1 "two" three)', "a[1]['two'][three];");

  tc('(set! (get a 1) (+ b 2))', "a[1]=b+2;");

  tc('#a b', "a(b);");
  tc('@a', "_4(a);");
  tc('#[1 2]', "_5([1,2]);");

  tc('a.b', "a['b'];");
  tc('a.b.1', "a['b']['1'];");
  tc('one-thing.2', "one_thing['2'];");

  tc('a.', "a_;");
  tc('.a', "_a;");
  tc('.', "_3;");
  tc('..', "__;");
  tc('...', "___;");

  tc("'a", "({'type':'symbol','value':'a','src':'a','loc':{'start':{'line':1,'column':1},'end':{'line':1,'column':1}}});");

  tc("'(a 1 2)", "({'type':'list','value':[a,1,2],'loc':{'start':{'line':1,'column':1},'end':{'line':1,'column':1}}});");
  tc("'[1 2]", "({'type':'list','value':[_6,1,2],'loc':{'start':{'line':1,'column':1},'end':{'line':1,'column':1}}});");

  tc("(defmacro def-a [val] '('def 'a val))", "");
  tc("(def-a 1)", "var a=1;");

  tc("(if a b c)", "a?b:c;");
  tc("(if a b)", "a?b:void 0;");

  t.end();
});
