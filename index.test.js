var _ = require("lodash");
var test = require("tape");
var compiler = require("./");

test("basics", function(t){
  t.equals(compiler("(add 1 2)"), "add(1, 2);");
  t.equals(compiler('( log "hello world" )'), "log('hello world');");
  t.equals(compiler('(js/+ 1 2)'), "1 + 2;");
  t.equals(compiler('(js/=== a b)'), "a === b;");
  t.equals(compiler('(js/typeof a)'), "typeof a;");
  t.equals(compiler('(js/&& a b)'), "a && b;");
  t.equals(compiler(
    "(log js/null js/false js/true js/undefined js/this js/arguments)"),
    "log(null, false, true, undefined, this, arguments);"
  );
  t.end();
});
