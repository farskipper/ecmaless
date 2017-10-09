var _ = require("lodash");
var test = require("tape");
var parser = require("ecmaless-parser");
var compiler = require("./");
var escodegen = require("escodegen");

var compToStr = function(src){
    var ast = parser(src);
    var est = compiler(ast).estree;
    est = {
        "loc": est.loc,
        "type": "Program",
        "body": est.body.body,
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

    tc("1 == 3", "1==3;");
    tc("not (1 == 1)", "!(1==1);");
    tc("\"a\" == \"b\"", "'a'=='b';");
    terr("\"a\" == 2", "Number", "String", {line: 1, column: 7});

    tc("if true:\n    1", "if(true){1;}");
    terr("if 1:\n    1", "Number", "Boolean", {line: 1, column: 3});
    tc("if 1 == 3:\n    4", "if(1==3){4;}");

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

    src = "";
    src += "alias Foo = {a: Number, b: String}\n";
    src += "ann foo = Foo\n";
    tc(src + "def foo = {a: 1, b: \"wat\"}", "var foo={'a':1,'b':'wat'};");
    terr(src + "def foo = {a: 1, b: 2}", "Number", "String", {line: 3, column: 20});
    try{
        tc(src + "def foo = {a: 1}", "");
        t.fail("should throw");
    }catch(e){
        t.equals(e + "", "TypeError: TODO better error Bad Struct keys");//TODO better error
    }


    tc("def a = 1\nexport:\n    a", "var a=1;return{'a':a};");
    try{
        tc("export:\n    a", "");
        t.fail("should throw");
    }catch(e){
        t.equals(e + "", "Error: Not defined: a");
    }


    /*
    src = "";
    src += "def foo = [1, 2]\n";
    src += "foo[0] + 3";
    tc(src, "var foo=[1,2];foo[0]+3;");

    tc("a[b]", "$$$ecmaless$$$get(a,b);");
    tc("a.b[c][1][\"e\"]", "$$$ecmaless$$$get($$$ecmaless$$$get($$$ecmaless$$$get($$$ecmaless$$$get(a,'b'),c),1),'e');");

    tc("a.b = 1", "$$$ecmaless$$$set(a,'b',1);");
    tc("a.b.c = 1", "$$$ecmaless$$$set($$$ecmaless$$$get(a,'b'),'c',1);");
    */

    t.end();
});

test("import / export", function(t){
    var requireModule = function(path){
        if(path === "foo"){
            return {
                TYPE: {
                    tag: "Struct",
                    by_key: {
                        foo: {tag: "Number"},
                    },
                },
            };
        }
    };

    var tc = function(src, expected){
        var ast = parser(src);
        var c = compiler(ast, {
            requireModule: requireModule,
        });
        var js = escodegen.generate({
            "loc": c.estree.loc,
            "type": "Program",
            "body": [c.estree],
        }, {format: {compact: true}});

        t.equals(js, expected);
    };

    tc("def a = 1\nexport:\n    a", "function(){var a=1;return{'a':a};}");

    try{
        tc("export:\n    a", "");
        t.fail("should throw");
    }catch(e){
        t.equals(e + "", "Error: Not defined: a");
    }

    var src = "";
    src += "import:\n";
    src += "    \"foo\":\n";
    src += "        foo\n";
    src += "\n";
    src += "def a = foo + 1\n";
    src += "\n";
    src += "export:\n";
    src += "    a";
    tc(src, "function($0){var foo=$0['foo'];var a=foo+1;return{'a':a};}");

    src = "";
    src += "import:\n";
    src += "    \"foo\":\n";
    src += "        foo as bar\n";
    src += "\n";
    src += "bar + 1\n";
    tc(src, "function($0){var bar=$0['foo'];bar+1;}");

    src = "";
    src += "alias Foo = String\n";
    src += "alias Bar = {foo: Foo}\n";
    src += "export:\n";
    src += "    Bar";
    tc(src, "function(){return{'Bar':{'tag':'Struct','by_key':{'foo':{'tag':'String'}}}};}");

    src = "";
    src += "alias Foo = String\n";
    src += "alias Bar = {foo: Foo}\n";
    src += "alias Baz = {bar: Bar}\n";
    src += "export:\n";
    src += "    Baz";
    tc(src, "function(){return{'Baz':{'tag':'Struct','by_key':{'bar':{'tag':'Struct','by_key':{'foo':{'tag':'String'}}}}}};}");

    src = "";
    src += "alias Foo = Fn(Number) Number\n";
    src += "export:\n";
    src += "    Foo";
    tc(src, "function(){return{'Foo':{'tag':'Fn','params':[{'tag':'Number'}],'return':{'tag':'Number'}}};}");

    t.end();
});
