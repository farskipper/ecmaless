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
    tc("\"a b\"", "'a b';");
    tc("true", "true;");
    tc("false", "false;");
    tc("nil", "void 0;");

    tc("[1, 2]", "[1,2];");
    tc("{a: 1, b: 2}", "({'a':1,'b':2});");

    tc("fn (a, b):\n    nil", "(function(a,b){return void 0;});");

    tc("return false", "return false;");
    tc("add()", "add();");
    tc("add(1, 2)", "add(1,2);");

    tc("+a", "+a;");
    tc("-1", "-1;");
    tc("1 + 2", "1+2;");
    tc("1 - 2 + 3 / 4 * 5 % 3", "1-2+3/4*5%3;");
    tc("a == b != c", "a==b!=c;");

    tc("if a:\n    b", "if(a){b;}");
    tc("if a == b:\n    c", "if(a==b){c;}");
    tc("if a:\n    b\nelse if c:\n    d\nelse:\n    e", "if(a){b;}else if(c){d;}else{e;}");
    tc("a ? b : c", "a?b:c;");
    tc(
        "case a:\n    1:\n        b\n    2:\n        c\n    else:\n        d",
        "if(a==1){b;}else if(a==2){c;}else{d;}"
    );
    tc("while a:\n    b", "while(a){b;}");
    tc("break", "break;");
    tc("continue", "continue;");

    tc("try:\n    a\ncatch b:\n    c\nfinally:\n    d", "try{a;}catch(b){c;}finally{d;}");

    tc("def a = 1", "var a=1;");
    tc("a = 1", "a=1;");

    tc("a.b", "$$$ecmaless$$$get(a,'b');");
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

    t.end();
});
