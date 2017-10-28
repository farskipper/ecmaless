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


var testError = function(t, src, expected){
    var m = /^e:([a-z<, >]*) a:([a-z<, >]*) (.*)$/i.exec(expected);
    if(m){
        expected = "expected `" + m[1] + "` but was `" + m[2] + "` " + m[3];
    }
    try{
        compToStr(src);
        t.fail("should throw");
    }catch(e){
        var estr = (e + "").replace(/^Error: /, "");
        estr = estr
            + " " + e.ecmaless.loc.start.line
            + ":" + e.ecmaless.loc.start.column
            + "," + e.ecmaless.loc.end.line
            + ":" + e.ecmaless.loc.end.column
        ;
        t.equals(estr, expected);
    }
};


test("compile", function(t){
    var tc = _.partial(testCompile, t);
    var terr = _.partial(testError, t);

    tc("100.25", "100.25;");
    tc("\"a b\"", "'a b';");
    tc("true", "true;");
    tc("false", "false;");
    tc("nil", "void 0;");

    tc("true or  false", "true||false;");
    tc("true and false", "true&&false;");

    terr("true and 1", "e:Boolean a:Number 1:9,1:10");
    terr("true or  1", "e:Boolean a:Number 1:9,1:10");
    terr("\"a\" and true", "e:Boolean a:String 1:0,1:3");
    terr("\"a\" or  true", "e:Boolean a:String 1:0,1:3");

    tc("1 + 2", "1+2;");
    terr("1 + \"a\"", "e:Number a:String 1:4,1:7");

    tc("\"foo\" ++ \"bar\"", "'foobar';");

    terr("foo", "Not defined `foo` 1:0,1:3");

    tc("def a=\"foo\"\na ++ \"bar\"", "var a='foo';'foobar';");

    tc("{a: 1, b: 2}", "({'a':1,'b':2});");
    terr("{a: 1, b: 2, a: 3}", "Duplicate key `a` 1:13,1:14");

    var src = "";
    src += "def add = fn (a, b):\n";
    src += "    return a + b\n";
    terr(src, "Sorry, function types are not infered 1:10,2:17");

    src = "";
    src += "def add = 1\n";
    src += "ann add = Number\n";
    terr(src, "Annotation needs to come before the definition 2:4,2:7");

    src = "";
    src += "ann add = Number\n";
    src += "ann add = Number\n";
    terr(src, "`add` is already annotated 2:4,2:7");

    src = "";
    src += "ann add = Fn (Number, Number) Number\n";
    src += "def add = fn (a):\n";
    src += "    return a + b\n";
    terr(src, "Annotation said the function should have 2 params not 1 2:10,3:17");

    src = "";
    src += "ann add = Fn (Number, Number) Number\n";
    src += "def add = fn (a, b):\n";
    src += "    return a + b\n";
    src += "\n";
    tc(src, "var add=function add(a,b){return a+b;};");
    tc(src + "add(1, 2)", "var add=function add(a,b){return a+b;};add(1,2);");
    terr(src + "add(\"a\", 2)", "e:Number a:String 5:4,5:7");
    terr(src + "\"a\" ++ add(1, 2)", "e:String a:Number 5:7,5:16");

    terr("def a=1\ndef a=2", "`a` is already defined 2:4,2:5");
    src = "";
    src += "def a = 1\n";
    src += "ann foo = Fn (Number) Number\n";
    src += "def foo = fn (a):\n";
    src += "    return a\n";
    tc(src, "var a=1;var foo=function foo(a){return a;};");
    src = "";
    src += "def a = 1\n";
    src += "ann foo = Fn () Number\n";
    src += "def foo = fn ():\n";
    src += "    def a = 2\n";
    src += "    return a\n";
    tc(src, "var a=1;var foo=function foo(){var a=2;return a;};");
    src = "";
    src += "ann foo = Fn (Number) Number\n";
    src += "def foo = fn (a):\n";
    src += "    def a = 2\n";
    src += "    return a\n";
    terr(src, "`a` is already defined 3:8,3:9");

    src = "";
    src += "def add = \"foo\"\n";
    src += "add(1, 2)";
    terr(src, "e:String a:Fn 2:0,2:3");

    src = "";
    src += "ann add = Fn (Number, Number) Number\n";
    src += "def add = fn (a, b):\n";
    src += "    return a + b\n";
    terr(src + "add()", "Expected 2 params but was 0 4:0,4:3");
    terr(src + "add(1, 2, 3)", "Expected 2 params but was 3 4:0,4:3");
    terr(src + "add(1, \"str\")", "e:Number a:String 4:7,4:12");
    terr(src + "add(\"str\", 1)", "e:Number a:String 4:4,4:9");
    tc(
        src + "add(1, 2)",
        "var add=function add(a,b){return a+b;};add(1,2);"
    );

    src = "";
    src += "ann foo = String\n";
    src += "def foo = 10\n";
    terr(src, "e:String a:Number 2:4,2:7");

    tc("-1", "-1;");
    tc("+1", "1;");
    tc("not true", "!true;");
    terr("not 0", "e:Boolean a:Number 1:4,1:5");
    terr("+true", "e:Number a:Boolean 1:1,1:5");
    terr("-true", "e:Number a:Boolean 1:1,1:5");

    tc("1 - 2 + 3 / 4 * 5 % 3", "1-2+3/4*5%3;");

    tc("1 == 3", "1==3;");
    tc("not (1 == 1)", "!(1==1);");
    tc("\"a\" == \"b\"", "'a'=='b';");
    terr("\"a\" == 2", "e:String a:Number 1:7,1:8");

    tc("if true:\n    1", "if(true){1;}");
    terr("if 1:\n    1", "e:Boolean a:Number 1:3,1:4");
    tc("if 1 == 3:\n    4", "if(1==3){4;}");

    tc(
        "if true:\n    1\nelse if true:\n    2\nelse:\n    3",
        "if(true){1;}else if(true){2;}else{3;}"
    );
    terr("if true:\n    1\nelse if 1:\n    2", "e:Boolean a:Number 3:8,3:9");

    tc("true ? 1 : 2", "true?1:2;");
    terr("1 ? 2 : 3", "e:Boolean a:Number 1:0,1:1");
    terr("true ? 2 : true", "e:Number a:Boolean 1:11,1:15");
    terr("true ? false : 2", "e:Boolean a:Number 1:15,1:16");

    tc("(true ? 1 : 2) + 3", "(true?1:2)+3;");

    tc("while true:\n    1", "while(true){1;}");
    terr("while 1:\n    1", "e:Boolean a:Number 1:6,1:7");
    tc("break", "break;");
    tc("continue", "continue;");

    //TODO tc("try:\n    a\ncatch b:\n    c\nfinally:\n    d", "try{a;}catch(b){c;}finally{d;}");

    src = "";
    src += "def a = 1\n";
    tc(src + "a = 2", "var a=1;a=2;");
    terr(src + "a = \"hi\"", "e:Number a:String 2:4,2:8");
    terr("1 = 2", "Only Identifier can be assigned 1:0,1:1");

    src = "";
    src += "def a = 1\n";
    src += "a = true";
    terr(src, "e:Number a:Boolean 2:4,2:8");

    src = "";
    src += "def foo = {a: 1}\n";
    tc(src + "foo.a + 2", "var foo={'a':1};foo.a+2;");
    terr(src + "foo.b", "Key does not exist `b` 2:0,2:5");
    terr("def foo=1\nfoo.b", ". notation only works on Struct 2:0,2:5");

    src = "";
    src += "alias Foo = Number\n";
    src += "ann foo = Foo\n";
    src += "def foo = 1\n";
    tc(src, "var foo=1;");

    src = "";
    src += "alias Foo = Number\n";
    src += "ann foo = Bar\n";
    terr(src, "Type not defined `Bar` 2:10,2:13");

    src = "";
    src += "alias Foo = Number\n";
    src += "ann foo = Foo<String>\n";
    terr(src, "Foo doesn't have type params 2:10,2:20");

    src = "";
    src += "enum Foo:\n";
    src += "    Bar(String, Number)\n";
    src += "    Baz()\n";
    src += "\n";
    tc(src + "def foo = Foo.Bar(\"one\", 2)", "var foo={'tag':'Bar','params':['one',2]};");
    terr(src + "def foo = Foo.Bar(1, 2)", "e:String a:Number 5:18,5:19");
    terr(src + "def foo = Foo.Baz(1)", "Expected 0 params not 1 for Foo.Baz 5:14,5:17");

    src = "";
    src += "alias Foo = {a: Number, b: String}\n";
    src += "ann foo = Foo\n";
    tc(src + "def foo = {a: 1, b: \"wat\"}", "var foo={'a':1,'b':'wat'};");
    terr(src + "def foo = {a: 1, b: 2}", "e:String a:Number 3:20,3:21");
    terr(src + "def foo = {a: 1}", "TODO better error Bad Struct keys 3:4,3:7");


    tc("def a = 1\nexport:\n    a", "var a=1;return{'a':a};");
    terr("export:\n    a", "Not defined `a` 2:4,2:5");


    tc(
        "enum A:\n    B(String)\ndef a = A.B(\"foo\")",
        "var a={'tag':'B','params':['foo']};"
    );
    terr("enum A:\n    B(c)", "TypeVariable not defined `c` 2:6,2:7");

    terr("enum A:\n    B()\n    B()", "Duplicate enum variant `B` 3:4,3:5");
    terr("enum A<t>:\n    B(t)\n    B(t)", "Duplicate enum variant `B` 3:4,3:5");


    src = "";
    src += "enum A<c>:\n";
    src += "    B(c)\n";
    terr(
        src + "ann foo = A<String, Number>",
        "Trying to give 2 type params for A<c> 3:10,3:26"
    );

    src = "";
    src += "enum A<c>:\n";
    src += "    B(c)\n";
    tc(
        src + "def foo = A<String>.B(\"foo\")",
        "var foo={'tag':'B','params':['foo']};"
    );
    terr(src + "def foo = A<String>.B(1)", "e:String a:Number 3:22,3:23");
    terr(src + "def foo = A.B(1)", "Trying to give 0 type params for A<c> 3:10,3:11");
    terr(src + "def foo = A<String>.C()", "`C` is not a variant of A<String> 3:20,3:21");
    tc(
        src + "ann foo = A<String>\ndef foo = A<String>.B(\"bar\")",
        "var foo={'tag':'B','params':['bar']};"
    );
    terr(
        src + "ann foo = A<Number>\ndef foo = A<String>.B(\"bar\")",
        "e:Number a:String 4:12,4:18"
    );
    terr(
        src + "ann foo = Number\ndef foo = A<String>.B(\"bar\")",
        "e:Number a:A<String> 4:4,4:7"
    );

    terr("Blah.B()", "Enum not defined `Blah` 1:0,1:4");

    src = "";
    src += "enum A:\n";
    src += "    B()\n";
    src += "    C()\n";
    src += "\n";
    terr(
        src + "case 1:\n    2:\n        3\n",
        "`case` statements only work on Enums 5:5,5:6"
    );
    terr(
        src + "case A.B():\n    1:\n        2\n",
        "Not an EnumValue 6:4,6:5"
    );
    terr(
        src + "case A.B():\n    A.B():\n        2\n",
        "Enum is implied 6:4,6:5"
    );
    terr(
        src + "case A.B():\n    A<String>():\n        2\n",
        "No params 6:4,6:12"
    );
    terr(
        src + "case A.B():\n    Foo():\n        2\n",
        "`Foo` is not a variant 6:4,6:7"
    );
    terr(
        src + "case A.B():\n    B():\n        2\n    B():\n        3\n",
        "Duplicate variant `B` 8:4,8:5"
    );
    terr(
        src + "case A.B():\n    B(1, 2):\n        2\n",
        "Expected 0 params not 2 6:4,6:11"
    );
    terr(
        src + "case A.B():\n    B():\n        2",
        "Missing variants `C` 5:5,5:10"
    );
    src += "def a = A.B()\n";
    src += "case a:\n";
    src += "    B():\n";
    src += "        1\n";
    src += "    C():\n";
    src += "        2\n";
    tc(
        src,
        "var a={'tag':'B','params':[]};"
        + "(function($sys$case1){"
        + "switch($sys$case1.tag){"
        + "case'B':1;break;"
        + "case'C':2;break;"
        + "}}(a));"
    );

    src = "";
    src += "enum A:\n";
    src += "    B(Number)\n";
    src += "\n";
    src += "case A.B(1):\n";
    src += "    B(1):\n";
    src += "        2\n";
    terr(src, "Expected an Identifier 5:6,5:7");

    src = "";
    src += "enum A:\n";
    src += "    B(Number)\n";
    src += "    C(String, Boolean)\n";
    src += "\n";
    src += "case A.B(1):\n";
    src += "    B(n):\n";
    src += "        n\n";
    src += "    C(s, b):\n";
    src += "        s\n";
    tc(
        src,
        "(function($sys$case1){"
        + "switch($sys$case1.tag){"
        + "case'B':var n=$sys$case1.params[0];n;break;"
        + "case'C':var s=$sys$case1.params[0];var b=$sys$case1.params[1];s;break;"
        + "}}({'tag':'B','params':[1]}));"
    );


    tc("[1, 2]", "[1,2];");
    /*
    src = "";
    src += "ann foo = Array<Number>\n";
    src += "def foo = [1, 2]\n";
    src += "ann bar = Maybe<Number>\n";
    src += "def bar = foo[0]\n";
    tc(src, "var foo=[1,2];var bar=foo[0];");
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
        }else if(path === "Str"){
            return {
                TYPE: {
                    tag: "Struct",
                    by_key: {
                        Str: {tag: "String"},
                    },
                },
            };
        }else if(path === "./log.js"){
            return {
                commonjs: {
                    path: "./log.js",
                    value: {
                        log: function(){},
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
    var terr = _.partial(testError, t);


    tc("def a = 1\nexport:\n    a", "function(){var a=1;return{'a':a};}");

    terr("export:\n    a", "Not defined `a` 2:4,2:5");

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
    tc(src, "function(){return{};}");

    src = "";
    src += "alias Foo = String\n";
    src += "alias Bar = {foo: Foo}\n";
    src += "alias Baz = {bar: Bar}\n";
    src += "export:\n";
    src += "    Baz";
    tc(src, "function(){return{};}");

    src = "";
    src += "alias Foo = Fn(Number) Number\n";
    src += "export:\n";
    src += "    Foo";
    tc(src, "function(){return{};}");


    src = "";
    src += "import:\n";
    src += "    \"Str\":\n";
    src += "        Str\n";
    src += "export:\n";
    src += "    Str";
    tc(src, "function($0){return{};}");

    src = "";
    src += "import:\n";
    src += "    \"./log.js\":\n";
    src += "        log is Fn(String) Nil\n";
    src += "log(\"hi\")\n";
    tc(src, "function($0){var log=$0['log'];log('hi');}");



    t.end();
});
