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
    "(js/function add4 (a) (js/block-statement\n"
    + "(js/var b 4)\n"
    + "(log :hello-world)\n"
    + "(js/return (js/+ a b))))"
    ),
    "(function add4(a) {\n"
    + "    var b = 4;\n"
    + "    log('hello-world');\n"
    + "    return a + b;\n"
    + "});"
  );
  t.equals(compile(
    "(js/while (js/lt= i 3) (js/block-statement\n"
    + "(log :loop-again)\n"
    + "(js/= i (js/+ i 1))))"
    ),
    "while (i <= 3) {\n"
    + "    log('loop-again');\n"
    + "    i = i + 1;\n"
    + "}"
  );
  t.equals(compile("(js/ternary (js/=== a 1) :one a)"), "a === 1 ? 'one' : a;");
  t.equals(compile(
    "(js/if (js/=== a 1)\n"
    + "(js/block-statement (log :true))"
    + "(js/block-statement (log :false)))"),

    "if (a === 1) {\n"
    + "    log('true');\n"
    + "} else {\n"
    + "    log('false');\n"
    + "}"
  );
  t.equals(compile(
    "(js/if (js/=== a 1)\n"
    + "(log :true)"
    + "(log :false))"),

    "if (a === 1)\n"
    + "    log('true');\n"
    + "else\n"
    + "    log('false');"
  );
  //TODO js/try catch
  //TODO js objects and arrays
  t.end();
});
