var _ = require("lodash");
var test = require("tape");
var rmLoc = require("./rmLoc");
var parser = require("./");

var mk = {};
mk.num = function(value){
    return {type: "Number", value: value};
};
mk.str = function(value){
    return {type: "String", value: value};
};
mk.id = function(value){
    return {type: "Identifier", value: value};
};
mk.sym = function(value){
    return {type: "Symbol", value: value};
};
mk.def = function(id, init){
    return {type: "Define", id: id, init: init};
};
mk.block = function(body){
    return {type: "Block", body: body};
};
mk.fn = function(params, body){
    return {type: "Function", params: params, block: mk.block(body)};
};
mk.app = function(callee, args){
    return {type: "Application", callee: callee, args: args};
};
mk.arr = function(value){
    return {type: "Array", value: value};
};
mk.struct = function(value){
    return {type: "Struct", value: value};
};
mk.ddd = function(value){
    return {type: "DotDotDot", value: value};
};
mk.mem = function(method, object, path){
    return {type: "MemberExpression", object: object, path: path, method: method};
};
mk.ternary = function(test, consequent, alternate){
    return {
        type: "ConditionalExpression",
        test: test,
        consequent: consequent,
        alternate: alternate
    };
};
mk.unary = function(op, arg){
    return {
        type: "UnaryOperator",
        op: op,
        arg: arg
    };
};
mk.infix = function(op, left, right){
    return {
        type: "InfixOperator",
        op: op,
        left: left,
        right: right
    };
};
mk.assign = function(op, left, right){
    return {
        type: "AssignmentExpression",
        op: op,
        left: left,
        right: right
    };
};
mk.stmt = function(e){
    return {type: "ExpressionStatement", expression: e};
};
mk.ret = function(e){
    return {type: "Return", expression: e};
};

var mkv = function(v){
    if(_.isNumber(v)){
        return mk.num(v);
    }else if(_.isString(v)){
        return mk.str(v);
    }else if(_.isPlainObject(v)){
        return mk.struct(_.flatten(_.map(v, function(v, k){
            return [mkv(k + ""), v];
        })));
    }else if(_.isArray(v)){
        return mk.arr(v);
    }
    return v;
};

test("parser", function(t){
    var tst = function(src, expected){
        var ast = parser(src).body;
        ast = _.isArray(ast) && _.size(ast) === 1 ? _.head(ast) : ast;
        if(ast.type === "ExpressionStatement"){
            ast = ast.expression;
        }
        t.deepEquals(rmLoc(ast), expected);
    };
    var tstFail = function(src){
        try{
            parser(src);
            t.ok(false, "This should have thrown a parsing exception");
        }catch(e){
            t.ok(true);
        }
    };

    tst("123", mk.num(123));
    tst("\"ok\"", mk.str("ok"));
    tstFail("\"\\\"that\\\"\n\"", mk.str("\"that\"\n"));

    tst("def a", mk.def(mk.id("a")));
    tst("def a = 1.2", mk.def(mk.id("a"), mk.num(1.2)));

    tst("[]", mk.arr([]));
    tstFail("[,]");
    tst("[1, 2, 3]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
    tstFail("[1, 2, 3,]");
    tst("[\n    1,\n    2,\n    3,\n]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
    tstFail("[\n    1,\n2,    \n    3,,\n]", mk.arr([mk.num(1), mk.num(2), mk.num(3)]));
    tstFail("[,1, 2, 3]");

    tst("{}", mkv({}));
    tst("{\"a\": 1}", mkv({a: mkv(1)}));
    tstFail("{\"a\": 1,}");
    tst("{a: 1}", mk.struct([mk.sym("a"), mkv(1)]));
    tst("{def: 1}", mk.struct([mk.sym("def"), mkv(1)]));
    tst("{1: \"a\"}", mk.struct([mkv(1), mkv("a")]));
    tst("{\n    1: \"a\",\n}", mk.struct([mkv(1), mkv("a")]));
    tst("{\n    1: \"a\",\n    2: \"b\",\n}", mk.struct([
        mkv(1), mkv("a"),
        mkv(2), mkv("b")
    ]));

    var fn_body_a = [mk.stmt(mk.id("a"))];
    tstFail("fn \n    a");
    tstFail("fn []\n    a");
    tst("fn args:\n    a", mk.fn(mk.id("args"), fn_body_a));
    tst("fn []:\n    a", mk.fn([], fn_body_a));
    tst("fn[]:\n    a", mk.fn([], fn_body_a));
    tst("fn[]:\n\n    a", mk.fn([], fn_body_a));
    tst("fn [  ] :\n    a", mk.fn([], fn_body_a));
    tstFail("fn [,]:\n    a");
    tstFail("fn [1]:\n    a");
    tstFail("fn [1, 2]:\n    a");
    tst("fn [a]:\n    a", mk.fn([mk.id("a")], fn_body_a));
    tst("fn [a,]:\n    a", mk.fn([mk.id("a")], fn_body_a));
    tst("fn [a, b]:\n    a", mk.fn([mk.id("a"), mk.id("b")], fn_body_a));
    tst("fn [a,b,]:\n    a", mk.fn([mk.id("a"), mk.id("b")], fn_body_a));
    tst("fn [a, b...]:\n    a", mk.fn([mk.id("a"), mk.ddd(mk.id("b"))], fn_body_a));
    tst("fn [a, b...]:\n    a", mk.fn([mk.id("a"), mk.ddd(mk.id("b"))], fn_body_a));

    tst("a(\n    fn[]:\n        b\n    ,\n)", mk.app(mk.id("a"), [
        mk.fn([], [mk.stmt(mk.id("b"))])
    ]));
    tst("a(\n    1,\n    fn[]:\n        b\n    ,\n)", mk.app(mk.id("a"), [
        mkv(1),
        mk.fn([], [mk.stmt(mk.id("b"))])
    ]));
    tst("a(\n    fn[]:\n        b\n    ,\n    1,\n)", mk.app(mk.id("a"), [
        mk.fn([], [mk.stmt(mk.id("b"))]),
        mkv(1)
    ]));
    tst("a(\n    1,\n    fn[]:\n        b\n    ,\n    2,\n)", mk.app(mk.id("a"), [
        mkv(1),
        mk.fn([], [mk.stmt(mk.id("b"))]),
        mkv(2)
    ]));

    tst("add()", mk.app(mk.id("add"), []));
    tst("add();test", mk.app(mk.id("add"), []));
    tst("add()\n;test", mk.app(mk.id("add"), []));
    tstFail("add(,)");
    tst("add(1, 2)", mk.app(mk.id("add"), [mkv(1), mkv(2)]));
    tstFail("add(1, 2,)");
    tst("add(\n    1,\n    2,\n)", mk.app(mk.id("add"), [mkv(1), mkv(2)]));
    tst("add  (1)", mk.app(mk.id("add"), [mkv(1)]));

    tst("(1)", mkv(1));

    tst("a.b.c", mk.mem("dot", mk.mem("dot", mk.id("a"), mk.id("b")), mk.id("c")));
    tst("a[b][0]", mk.mem("index", mk.mem("index", mk.id("a"), mk.id("b")), mkv(0)));

    tst("a?1:2", mk.ternary(mk.id("a"), mkv(1), mkv(2)));
    tst("a ? 1 : 2", mk.ternary(mk.id("a"), mkv(1), mkv(2)));
    //Don't nest these without parans!
    tstFail("1?2?3:4:5");
    tstFail("1?2:3?4:5");
    tst("1?2:(3?4:5)", mk.ternary(mkv(1), mkv(2), mk.ternary(mkv(3), mkv(4), mkv(5))));

    _.each([
        "||",
        "&&",
        "==",
        "!=",
        "+",
        "-",
        "*",
        "/",
        "%",
        "<",
        "<=",
        ">",
        ">=",
    ], function(op){
        tst("1 " + op + " 2", mk.infix(op, mkv(1), mkv(2)));
    });

    tst("while a:\n    b", {
        type: "While",
        test: mk.id("a"),
        block: mk.block([mk.stmt(mk.id("b"))])
    });
    tst("break", {type: "Break"});
    tst("continue", {type: "Continue"});

    var src = "";
    src += "cond:\n";
    src += "    a:\n";
    src += "        b\n";
    tst(src, {
        type: "Cond",
        blocks: [
            {type: "CondBlock", test: mk.id("a"), block: mk.block([mk.stmt(mk.id("b"))])}
        ],
        "else": null
    });
    src = "";
    src += "cond:\n";
    src += "    a:\n";
    src += "        b\n";
    src += "    c:\n";
    src += "        d\n";
    src += "    else:\n";
    src += "        e";
    tst(src, {
        type: "Cond",
        blocks: [
            {type: "CondBlock", test: mk.id("a"), block: mk.block([mk.stmt(mk.id("b"))])},
            {type: "CondBlock", test: mk.id("c"), block: mk.block([mk.stmt(mk.id("d"))])}
        ],
        "else": mk.block([mk.stmt(mk.id("e"))])
    });

    src = "";
    src += "case a:\n";
    src += "    1:\n";
    src += "        b\n";
    src += "    2:\n";
    src += "        c\n";
    src += "    else:\n";
    src += "        d";
    tst(src, {
        type: "Case",
        to_test: mk.id("a"),
        blocks: [
            {type: "CaseBlock", value: mkv(1), block: mk.block([mk.stmt(mk.id("b"))])},
            {type: "CaseBlock", value: mkv(2), block: mk.block([mk.stmt(mk.id("c"))])}
        ],
        "else": mk.block([mk.stmt(mk.id("d"))])
    });

    src = "";
    src += "if a:\n";
    src += "    b\n";
    tst(src, {
        type: "If",
        test: mk.id("a"),
        then: mk.block([mk.stmt(mk.id("b"))]),
        "else": null
    });
    src = "";
    src += "if a:\n";
    src += "    b\n";
    src += "else:\n";
    src += "    c\n";
    tst(src, {
        type: "If",
        test: mk.id("a"),
        then: mk.block([mk.stmt(mk.id("b"))]),
        "else": mk.block([mk.stmt(mk.id("c"))])
    });
    src = "";
    src += "if a:\n";
    src += "    b\n";
    src += "else if c:\n";
    src += "    d\n";
    src += "else:\n";
    src += "    e\n";
    tst(src, {
        type: "If",
        test: mk.id("a"),
        then: mk.block([mk.stmt(mk.id("b"))]),
        "else": {
            type: "If",
            test: mk.id("c"),
            then: mk.block([mk.stmt(mk.id("d"))]),
            "else": mk.block([mk.stmt(mk.id("e"))])
        }
    });

    src = "";
    src += "try:\n";
    src += "    a\n";
    src += "catch b:\n";
    src += "    c";
    tst(src, {
        type: "TryCatch",
        try_block: mk.block([mk.stmt(mk.id("a"))]),
        catch_id: mk.id("b"),
        catch_block: mk.block([mk.stmt(mk.id("c"))]),
        finally_block: null
    });
    src = "";
    src += "try:\n";
    src += "    a\n";
    src += "catch b:\n";
    src += "    c\n";
    src += "finally:\n";
    src += "    d";
    tst(src, {
        type: "TryCatch",
        try_block: mk.block([mk.stmt(mk.id("a"))]),
        catch_id: mk.id("b"),
        catch_block: mk.block([mk.stmt(mk.id("c"))]),
        finally_block: mk.block([mk.stmt(mk.id("d"))])
    });
    src = "";
    src += "try:\n";
    src += "    a\n";
    src += "finally:\n";
    src += "    b";
    tst(src, {
        type: "TryCatch",
        try_block: mk.block([mk.stmt(mk.id("a"))]),
        catch_id: null,
        catch_block: null,
        finally_block: mk.block([mk.stmt(mk.id("b"))])
    });
    //throw("something", {opts}) ... handled by compiler, not a keyword

    tst("-1", mk.unary("-", mkv(1)));
    tst("+1", mk.unary("+", mkv(1)));
    tst("!a", mk.unary("!", mk.id("a")));
    tst("3- -1", mk.infix("-", mkv(3), mk.unary("-", mkv(1))));

    tst("i = 1", mk.assign("=", mk.id("i"), mkv(1)));
    tst("a[i] = 1 + 1", mk.assign("=",
        mk.mem("index", mk.id("a"), mk.id("i")),
        mk.infix("+", mkv(1), mkv(1))
    ));
    tst("i = j = 0", mk.assign("=", mk.id("i"), mk.assign("=", mk.id("j"), mkv(0))));

    tst("return", mk.ret(null));
    tst("return 1", mk.ret(mkv(1)));

    tst("nil", {type: "Nil"});
    tst("true", {type: "Boolean", value: true});
    tst("false", {type: "Boolean", value: false});

    tst("1\n2", [mk.stmt(mkv(1)), mk.stmt(mkv(2))]);
    tst("1\n2\n3", [mk.stmt(mkv(1)), mk.stmt(mkv(2)), mk.stmt(mkv(3))]);
    tst("fn[]:\n    1\n2", [
        mk.stmt(mk.fn([], [mk.stmt(mkv(1))])),
        mk.stmt(mkv(2))
    ]);
    tst("if a:\n    1\n2", [
        {
            type: "If",
            test: mk.id("a"),
            then: mk.block([mk.stmt(mkv(1))]),
            "else": null
        },
        mk.stmt(mkv(2))
    ]);
    tst("case a:\n    1:\n\n        b", {
        type: "Case",
        to_test: mk.id("a"),
        blocks: [
            {type: "CaseBlock", value: mkv(1), block: mk.block([
                mk.stmt(mk.id("b"))
            ])},
        ],
        "else": null
    });

    t.end();
});

test("module", function(t){
    var ast = parser("import:\n    a \"./a\"\na()");
    t.deepEquals(rmLoc(ast), {
        type: "Module",
        "import": [
            {
                type: "Import",
                id: mk.id("a"),
                path: mkv("./a")
            }
        ],
        body: [
            mk.stmt(mk.app(mk.id("a"), [])),
        ],
        "export": null,
    });

    ast = parser("import:\n    a \"./a\"\n    b    \"b\"\na(b)");
    t.deepEquals(rmLoc(ast), {
        type: "Module",
        "import": [
            {
                type: "Import",
                id: mk.id("a"),
                path: mkv("./a")
            },
            {
                type: "Import",
                id: mk.id("b"),
                path: mkv("b")
            },
        ],
        body: [
            mk.stmt(mk.app(mk.id("a"), [mk.id("b")])),
        ],
        "export": null,
    });

    ast = parser("export a");
    t.deepEquals(rmLoc(ast), {
        type: "Module",
        "import": [],
        body: [],
        "export": mk.id("a"),
    });

    t.end();
});

test("errors", function(t){
    try{
        parser("one two@three", {filepath: "some-file"});
        t.ok(false, "should fail");
    }catch(e){
        t.equals(e.message, "No possible parsings\nsome-file:1:4\n \n"
            + "one two@three\n"
            + "    ^"
        );
        t.deepEquals(e.where, {
            filepath: "some-file",
            line: 1,
            col: 4,
            excerpt: ""
                + "one two@three\n"
                + "    ^"
        });
    }

    try{
        parser("if 1:blah", {filepath: "some-file"});
        t.ok(false, "should fail");
    }catch(e){
        t.equals(e.message, "No possible parsings\nsome-file:1:5\n \nif 1:blah\n     ^");
        t.deepEquals(e.where, {
            filepath: "some-file",
            line: 1,
            col: 5,
            excerpt: ""
                + "if 1:blah\n"
                + "     ^"
        });
    }

    t.end();
});

test("loc", function(t){
    var src = "1";

    var ast = parser(src, {filepath: "/some/file/path-ok?"});
    t.deepEquals(ast.body[0].loc, {
        source: "/some/file/path-ok?",
        start: {line: 1, column: 0},
        end: {line: 1, column: 1}
    });

    t.end();
});
