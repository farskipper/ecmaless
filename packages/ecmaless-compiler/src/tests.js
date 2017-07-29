var _ = require("lodash");
var test = require("tape");
var parser = require("ecmaless-parser");
var compiler = require("./");
var escodegen = require("escodegen");

var compToStr = function(src){
    var ast = parser(src);
    var est = compiler(ast).estree;
    est = {
        "loc": {start: _.head(est).loc.start, end: _.last(est).loc.end},
        "type": "Program",
        "body": est
    };
    var js = escodegen.generate(est, {format: {compact: true}});
    return js;
};

var testCompile = function(t, src, expected){
    t.equals(compToStr(src), expected);
};

var testTError = function(t, src, actual, expected, loc_start){
    try{
        compToStr(src);
        t.fail("exptected a type error");
    }catch(e){
        t.equals(e.ecmaless.expected.tag, expected);
        t.equals(e.ecmaless.actual.tag, actual);
        t.deepEquals(e.ecmaless.loc.start, loc_start);
    }
};

test("compile", function(t){
    var tc = _.partial(testCompile, t);
    var terr = _.partial(testTError, t);

    tc("100.25", "100.25;");
    tc("\"a b\"", "'a b';");
    tc("true", "true;");
    tc("false", "false;");
    tc("nil", "void 0;");

    tc("true or  false", "true||false;");
    tc("true and false", "true&&false;");

    terr("true and 1", "Number", "Boolean", {line: 1, column: 9});
    terr("true or  1", "Number", "Boolean", {line: 1, column: 9});
    terr("\"a\" and true", "String", "Boolean", {line: 1, column: 0});
    terr("\"a\" or  true", "String", "Boolean", {line: 1, column: 0});

    tc("1 + 2", "1+2;");
    terr("1 + \"a\"", "String", "Number", {line: 1, column: 4});

    tc("\"foo\" ++ \"bar\"", "'foobar';");

    tc("def a=\"foo\"\na ++ \"bar\"", "var a='foo';'foobar';");

    tc("[1, 2]", "[1,2];");
    tc("{a: 1, b: 2}", "({'a':1,'b':2});");

    var src = "";
    src += "ann add = Fn (Number, Number) Number\n";
    src += "def add = fn (a, b):\n";
    src += "    return a + b\n";
    src += "\n";
    tc(src, "var add=function add(a,b){return a+b;};");
    tc(src + "add(1, 2)", "var add=function add(a,b){return a+b;};add(1,2);");
    terr(src + "add(\"a\", 2)", "String", "Number", {line: 5, column: 4});
    terr(src + "\"a\" ++ add(1, 2)", "Number", "String", {line: 5, column: 7});

    src = "";
    src += "def add = \"foo\"\n";
    src += "add(1, 2)";
    terr(src, "Fn", "String", {line: 2, column: 0});

    try{
        src = "";
        src += "ann add = Fn (Number, Number) Number\n";
        src += "def add = fn (a, b):\n";
        src += "    return a + b\n";
        src += "add()";
        compToStr(src);
        t.fail("exptected a type error");
    }catch(e){
        t.equals(e + "", "TypeError: Expected 2 params but was 0");
    }

    src = "";
    src += "ann foo = String\n";
    src += "def foo = 10\n";
    terr(src, "Number", "String", {line: 2, column: 4});

    tc("-1", "-1;");
    tc("+1", "1;");
    tc("not true", "!true;");
    terr("not 0", "Number", "Boolean", {line: 1, column: 4});
    terr("+true", "Boolean", "Number", {line: 1, column: 1});
    terr("-true", "Boolean", "Number", {line: 1, column: 1});

    tc("1 - 2 + 3 / 4 * 5 % 3", "1-2+3/4*5%3;");

    //TODO tc("not (1 == 1)", "!(1==1)");
    //TODO tc("a == b != c", "a==b!=c;");

    tc("if true:\n    1", "if(true){1;}");
    terr("if 1:\n    1", "Number", "Boolean", {line: 1, column: 3});
    //TODO tc("if a == b:\n    c", "if(a==b){c;}");
    tc(
        "if true:\n    1\nelse if true:\n    2\nelse:\n    3",
        "if(true){1;}else if(true){2;}else{3;}"
    );
    terr("if true:\n    1\nelse if 1:\n    2", "Number", "Boolean", {line: 3, column: 8});

    tc("true ? 1 : 2", "true?1:2;");
    terr("1 ? 2 : 3", "Number", "Boolean", {line: 1, column: 0});
    terr("true ? 2 : true", "Boolean", "Number", {line: 1, column: 11});
    terr("true ? false : 2", "Number", "Boolean", {line: 1, column: 15});

    tc("(true ? 1 : 2) + 3", "(true?1:2)+3;");

    //TODO tc(
    //TODO     "case a:\n    1:\n        b\n    2:\n        c\n    else:\n        d",
    //TODO     "if(a==1){b;}else if(a==2){c;}else{d;}"
    //TODO );

    tc("while true:\n    1", "while(true){1;}");
    terr("while 1:\n    1", "Number", "Boolean", {line: 1, column: 6});
    tc("break", "break;");
    tc("continue", "continue;");

    //TODO tc("try:\n    a\ncatch b:\n    c\nfinally:\n    d", "try{a;}catch(b){c;}finally{d;}");

    src = "";
    src += "def a = 1\n";
    src += "a = 2";
    tc(src, "var a=1;a=2;");

    src = "";
    src += "def a = 1\n";
    src += "a = true";
    terr(src, "Boolean", "Number", {line: 2, column: 4});

    src = "";
    src += "def foo = {a: 1}\n";
    src += "foo.a + 2";
    tc(src, "var foo={'a':1};foo.a+2;");

    src = "";
    src += "alias Foo = Number\n";
    src += "ann foo = Foo\n";
    src += "def foo = 1\n";
    tc(src, "var foo=1;");

    src = "";
    src += "enum Foo:\n";
    src += "    Bar(String, Number)\n";
    src += "    Baz()\n";
    src += "\n";
    tc(src + "def foo = Foo.Bar(\"one\", 2)", "var foo={'tag':'Bar','params':['one',2]};");
    terr(src + "def foo = Foo.Bar(1, 2)", "Number", "String", {line: 5, column: 18});
    try{
        tc(src + "def foo = Foo.Baz(1)", "");
        t.fail("should throw");
    }catch(e){
        t.equals(e + "", "Error: Expected 0 params not 1 for Foo.Baz");//TODO better error
    }

    /*
    src = "";
    src += "def foo = [1, 2]\n";
    src += "foo[0] + 3";
    tc(src, "var foo=[1,2];foo[0]+3;");
    /*
    tc("a[b]", "$$$ecmaless$$$get(a,b);");
    tc("a.b[c][1][\"e\"]", "$$$ecmaless$$$get($$$ecmaless$$$get($$$ecmaless$$$get($$$ecmaless$$$get(a,'b'),c),1),'e');");

    tc("a.b = 1", "$$$ecmaless$$$set(a,'b',1);");
    tc("a.b.c = 1", "$$$ecmaless$$$set($$$ecmaless$$$get(a,'b'),'c',1);");

    //named functions
    tc("def add = fn (a, b):\n    nil", "var add=function add(a,b){return void 0;};");

    //boolean ops, preserve expected evaluation
    tc("a or b", "a||b;");
    tc("a and b", "a&&b;");

    t.end();
});

test("scope", function(t){
    var ts = function(src, expected){
        var ast = parser(src);
        var syms = compiler(ast).undefined_symbols;
        t.deepEquals(_.keys(syms), expected);
    };

    ts("1", []);
    ts("a", ["a"]);
    ts("def a = 1\na", []);
    ts("fn(a):\n    a", []);
    ts("fn(a,b,c):\n    a(b,c)", []);

    ts("if 1:\n    def a = 1\n    a\na", ["a"]);

    ts("a[1] = 2", ["$$$ecmaless$$$get", "a", "$$$ecmaless$$$set"]);

    ts("1 or 2", []);
    ts("not a", ["a", "$$$ecmaless$$$not"]);
    ts("a + b", ["a", "b"]);
    ts("1 == 2", []);

    t.deepEquals({
        a: {
            id: "a",
            js_id: "a",
            loc: {end: {column: 1, line: 1}, source: undefined, start: {column: 0, line: 1}}
        }
    }, compiler(parser("a\na\na")).undefined_symbols);
    */

    t.end();
});
