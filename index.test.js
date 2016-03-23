var _ = require("lodash");
var test = require("tape");
var compile = require("./");

var testCompile = function(t, src, expected){
  t.equals(compile(src, {
    escodegen: {format: {compact: true}}
  }), expected);
};

test("basics", function(t){
  var tc = _.partial(testCompile, t);

  tc("(add 1 2)", "add(1,2);");
  tc('( log "hello world" )', "log('hello world');");
  tc("(js/+ 1 2)", "1+2;");
  tc("(js/=== a b)", "a===b;");
  tc("(js/typeof a)", "typeof a;");
  tc("(js/&& a b)", "a&&b;");
  tc("(js/! a)", "!a;");
  tc(
    "(log js/null js/false js/true js/undefined js/this js/arguments)",
    "log(null,false,true,undefined,this,arguments);"
  );
  tc("(js/var a 1 b 2)", "var a=1,b=2;");
  tc("(js/property-access a b)", "a[b];");
  tc("(js/property-access a :b)", "a['b'];");
  tc("(js/= a :b)", "a='b';");
  tc(
    "(js/function add4 (a) (js/block-statement\n"
    + "(js/var b 4)\n"
    + "(log :hello-world)\n"
    + "(js/return (js/+ a b))))"
    ,
    "(function add4(a){var b=4;log('hello-world');return a+b;});"
  );
  tc(
    "(js/function js/null (a b) (js/block-statement\n"
    + "(js/return (js/+ a b))))"
    ,
    "(function(a,b){return a+b;});"
  );
  tc(
    "(js/while (js/lt= i 3) (js/block-statement\n"
    + "(log :loop-again)\n"
    + "(js/= i (js/+ i 1))))"
    ,
    "while(i<=3){log('loop-again');i=i+1;}"
  );
  tc("(js/ternary (js/=== a 1) :one a)", "a===1?'one':a;");
  tc(
    "(js/if (js/=== a 1)\n"
    + "(js/block-statement (log :true))"
    + "(js/block-statement (log :false)))",

    "if(a===1){log('true');}else{log('false');}"
  );
  tc(
    "(js/if (js/=== a 1)\n"
    + "(log :true)"
    + "(log :false))",

    "if(a===1)log('true');else log('false');"
  );
  tc(
    "(js/try-catch\n"
    + "(run)\n"
    + "err\n"
    + "(log \"error\" err))",

    "tryrun();catch(err)log('error',err);"
  );
  tc("((js/property-access console :log) 1 2)",
    "console['log'](1,2);"
  );
  tc("(js/array)", "[];");
  tc("(js/array a 1 :2)", "[a,1,'2'];");

  tc("(js/object)", "({});");
  tc("(js/object :a)", "({'a':undefined});");
  tc("(js/object :a 1)", "({'a':1});");
  tc("(js/object :a 1 :2 3)", "({'a':1,'2':3});");

  tc("(js/throw (js/new Error :msg))", "throw new Error('msg');");

  t.end();
});
