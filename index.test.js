var _ = require("lodash");
var test = require("tape");
var compile = require("./");

test("basics", function(t){
  t.equals(compile("(add 1 2)"), "add(1, 2);");
  t.equals(compile('( log "hello world" )'), "log('hello world');");
  t.equals(compile("(js/+ 1 2)"), "1 + 2;");
  t.equals(compile("(js/=== a b)"), "a === b;");
  t.equals(compile("(js/typeof a)"), "typeof a;");
  t.equals(compile("(js/&& a b)"), "a && b;");
  t.equals(compile("(js/! a)"), "!a;");
  t.equals(compile(
    "(log js/null js/false js/true js/undefined js/this js/arguments)"),
    "log(null, false, true, undefined, this, arguments);"
  );
  t.equals(compile("(js/var a 1 b 2)"), "var a = 1, b = 2;");
  t.equals(compile("(js/property-access a b)"), "a[b];");
  t.equals(compile("(js/property-access a :b)"), "a['b'];");
  t.equals(compile("(js/= a :b)"), "a = 'b';");
  t.equals(compile(
    "(js/function add (a b) (js/+ a b))"),
    "(function add(a, b) {\n    return a + b;\n});"
  );
  t.equals(compile(
    "(js/function add4 (a) (js/var b 4) (log :hello-world) (js/+ a b))"),
    "(function add4(a) {\n"
    + "    var b = 4;\n"
    + "    log('hello-world');\n"
    + "    return a + b;\n"
    + "});"
  );
  t.end();
});
