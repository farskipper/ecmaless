var _ = require("lodash");
var ast = require("./ast");
var tdop = require("./tdop");
var test = require("tape");
var parser = require("./");
var tokenizer = require("./tokenizer");

var parseExpression = function(src){
    var r = tokenizer(src);
    if(r.type !== "Ok"){
        return r;
    }
    return tdop.parseExpression(r.value);
};

var rmLoc = function(ast){
    if(_.isPlainObject(ast)){
        if(!_.isEqual(_.keys(ast), ["loc", "ast"])){
            throw "AST tree should only have {loc, ast} properties: " + _.keys(ast).join(", ");
        }
        return _.mapValues(ast.ast, rmLoc);
    }
    if(_.isArray(ast)){
        return _.map(ast, rmLoc);
    }
    return ast;
};

var S = ast.Symbol;
var T = ast.Type;

test("expression", function(t){
    var tst = function(src, expected){
        var r = parseExpression(src);
        if(r.type !== "Ok"){
            t.fail(JSON.stringify(r));
            return;
        }
        var ast = rmLoc(r.tree);
        t.deepEquals(ast, expected);
    };
    var tstErr = function(src, expected){
        var r = parseExpression(src);
        if(r.type === "Ok"){
            t.fail("Should have failed: " + expected);
            return;
        }
        t.equals(r.message+"|"+r.loc.start+"-"+r.loc.end, expected);
    };

    tst("123", ast.Number(123));
    tst("\"a\"", ast.String("a"));
    tst("\"a\\\"b\"", ast.String("a\"b"));
    tst("\"a\\\\b\"", ast.String("a\\b"));

    tst("foo", ast.Symbol("foo"));

    tst("a+b", ast.Infix("+", S("a"), S("b")));
    tst("aorb", S("aorb"));
    tst("a or b", ast.Infix("or", S("a"), S("b")));

    tstErr("a + + b", "Expected an expression|4-5");

    tstErr("=", "Expected an expression|0-1");
    tstErr("= a", "Expected an expression|0-1");
    tstErr("a =", "Expected `(end)`|2-3");

    tstErr("or", "Expected an expression|0-2");

    tstErr("a +", "Expected an expression|3-3");

    tstErr("a b", "Expected `(end)`|2-3");


    tst("a + b + c", ast.Infix("+", ast.Infix("+", S("a"), S("b")), S("c")));
    tst("a + b * c", ast.Infix("+", S("a"), ast.Infix("*", S("b"), S("c"))));
    tst("(a + b) * c", ast.Infix("*", ast.Infix("+", S("a"), S("b")), S("c")));

    tst("not a", ast.Prefix("not", S("a")));
    tst("not a or b", ast.Infix("or", ast.Prefix("not", S("a")), S("b")));
    tst("a or not b == c", ast.Infix("or", S("a"), ast.Infix("==", ast.Prefix("not", S("b")), S("c"))));

    tst("a - b", ast.Infix("-", S("a"), S("b")));
    tst("a - - b", ast.Infix("-", S("a"), ast.Prefix("-", S("b"))));

    tstErr("-", "Expected an expression|1-1");
    tstErr("not", "Expected an expression|3-3");

    tstErr("(a", "Expected `)`|2-2");

    tst("a()", ast.ApplyFn(S("a"), []));
    tst("a(b + (c))", ast.ApplyFn(S("a"), [ast.Infix("+", S("b"), S("c"))]));
    tst("a(b())", ast.ApplyFn(S("a"), [ast.ApplyFn(S("b"), [])]));

    tst("fn() a", ast.Function([], S("a")));
    tst("fn(a, b) c", ast.Function([S("a"), S("b")], S("c")));

    tstErr("fn a", "Expected `(`|3-4");
    tstErr("fn(", "Expected a symbol|3-3");
    tstErr("fn(+)", "Expected a symbol|3-4");
    tstErr("fn(a", "Expected `)`|4-4");
    tstErr("fn(a + b)", "Expected `)`|5-6");
    tstErr("fn(1)", "Expected a symbol|3-4");

    tstErr("if a", "Expected `then`|4-4");
    tstErr("if a then b", "Expected `else`|11-11");
    tst("if a then b else c", ast.IfExpression(S("a"), S("b"), S("c")));
    tst("if a then b else if c then d else e", ast.IfExpression(S("a"), S("b"), ast.IfExpression(S("c"), S("d"), S("e"))));
    tst("if a then if b then c else d else e", ast.IfExpression(S("a"), ast.IfExpression(S("b"), S("c"), S("d")), S("e")));


    tstErr("{", "Expected a symbol|1-1");
    tst("{}", ast.Struct([]));
    tstErr("{a", "Expected `:`|2-2");
    tstErr("{a:", "Expected an expression|3-3");
    tstErr("{a: 1", "Expected `}`|5-5");
    tst("{a: 1}", ast.Struct([
        ast.StructPair(S("a"), ast.Number(1)),
    ]));
    tstErr("{a: 1,", "Expected a symbol|6-6");
    tst("{a: 1,}", ast.Struct([
        ast.StructPair(S("a"), ast.Number(1)),
    ]));
    tstErr("{a: 1,,}", "Expected a symbol|6-7");
    tst("{b: 2, c: 3}", ast.Struct([
        ast.StructPair(S("b"), ast.Number(2)),
        ast.StructPair(S("c"), ast.Number(3)),
    ]));
    tst("{b: 2, c: 3,}", ast.Struct([
        ast.StructPair(S("b"), ast.Number(2)),
        ast.StructPair(S("c"), ast.Number(3)),
    ]));
    tstErr("{def: 1}", "Expected a symbol|1-4");


    tstErr("case", "Expected an expression|4-4");
    tstErr("case foo", "Expected `when` or `else`|8-8");
    tstErr("case foo when", "Expected a type expression|13-13");
    tstErr("case foo when Foo()", "Expected an expression|19-19");
    tst("case foo when Foo() bar", ast.CaseExpression(S("foo"), [
        ast.CaseWhenExpression(ast.TypeVariant(T("Foo"), []), S("bar")),
    ]));
    tstErr("case foo when Foo() bar else", "Expected an expression|28-28");
    tst("case foo when Foo() bar else baz", ast.CaseExpression(S("foo"), [
        ast.CaseWhenExpression(ast.TypeVariant(T("Foo"), []), S("bar")),
    ], S("baz")));
    tst("case foo when Foo() bar when Baz() qux", ast.CaseExpression(S("foo"), [
        ast.CaseWhenExpression(ast.TypeVariant(T("Foo"), []), S("bar")),
        ast.CaseWhenExpression(ast.TypeVariant(T("Baz"), []), S("qux")),
    ]));


    t.end();
});

test("ast shape", function(t){

    t.deepEquals(parseExpression("a"), {
        type: "Ok",
        tree: {
            loc: {start: 0, end: 1},
            ast: {type: "Symbol", value: "a"}
        }
    });

    t.deepEquals(parseExpression("not a"), {
        type: "Ok",
        tree: {
            loc: {start: 0, end: 3},
            ast: {
                type: "Prefix",
                op: "not",
                value: {
                    loc: {start: 4, end: 5},
                    ast: {type: "Symbol", value: "a"}
                }
            }
        }
    });

    t.deepEquals(parseExpression("a + b"), {
        type: "Ok",
        tree: {
            loc: {start: 2, end: 3},
            ast: {
                type: "Infix",
                op: "+",
                left: {
                    loc: {start: 0, end: 1},
                    ast: {type: "Symbol", value: "a"}
                },
                right: {
                    loc: {start: 4, end: 5},
                    ast: {type: "Symbol", value: "b"}
                },
            },
        },
    });

    t.deepEquals(parseExpression("(a)"), {
        type: "Ok",
        tree: {
            loc: {start: 1, end: 2},
            ast: {type: "Symbol", value: "a"}
        },
    });

    t.deepEquals(parseExpression("a(b)"), {
        type: "Ok",
        tree: {
            loc: {start: 1, end: 2},
            ast: {
                type: "ApplyFn",
                callee: {
                    loc: {start: 0, end: 1},
                    ast: S("a"),
                },
                args: [
                    {
                        loc: {start: 2, end: 3},
                        ast: S("b"),
                    }
                ],
            }
        },
    });

    t.deepEquals(parseExpression("{a: 1}"), {
        type: "Ok",
        tree: {
            loc: {start: 0, end: 6},
            ast: {
                type: "Struct",
                pairs: [
                    {
                        loc: {start: 1, end: 5},
                        ast: {
                            type: "StructPair",
                            key: {
                                loc: {start: 1, end: 2},
                                ast: S("a")
                            },
                            value: {
                                loc: {start: 4, end: 5},
                                ast: ast.Number(1)
                            }
                        }
                    }
                ]
            }
        }
    });

    t.end();
});

test("statements", function(t){
    var tst = function(src, expected){
        var r = parser(src);
        if(r.type !== "Ok"){
            t.fail(JSON.stringify(r));
            return;
        }
        var ast = rmLoc(r.tree);
        t.deepEquals(ast, expected);
    };
    var tstErr = function(src, expected){
        var r = parser(src);
        if(r.type === "Ok"){
            t.fail("Should have failed: " + expected);
            return;
        }
        t.equals(r.message+"|"+r.loc.start+"-"+r.loc.end, expected);
    };

    tst("a()", [ast.ApplyFn(S("a"), [])]);
    tstErr("a + 1", "Expected a statement|2-3");

    tst("a() b()", [
        ast.ApplyFn(S("a"), []),
        ast.ApplyFn(S("b"), []),
    ]);
    tstErr("a() b", "Expected a statement|4-5");

    tst("def a = 1", [ast.Define(S("a"), ast.Number(1))]);
    tstErr("def 1 = a", "Expected a symbol|4-5");
    tstErr("def a + a", "Expected `=`|6-7");
    tstErr("def a = def b = 2", "Expected an expression|8-11");

    tst("do end", [ast.Block([])]);

    tst("do def a = 1 end", [
        ast.Block([
            ast.Define(S("a"), ast.Number(1)),
        ]),
    ]);

    tst("def noop = fn() do end", [
        ast.Define(S("noop"), ast.Function([], ast.Block([]))),
    ]);
    tst("def foo = fn() do bar() baz() end", [
        ast.Define(S("foo"), ast.Function([], ast.Block([
            ast.ApplyFn(S("bar"), []),
            ast.ApplyFn(S("baz"), []),
        ]))),
    ]);
    tstErr("def noop = fn() do", "Expected `end`|18-18");

    tst("return a", [ast.Return(S("a"))]);
    tstErr("return +", "Expected an expression|7-8");

    tstErr("while a", "Expected `do`|7-7");
    tst("while a do foo() end", [
        ast.While(S("a"), ast.Block([
            ast.ApplyFn(S("foo"), []),
        ]))
    ]);
    tst("continue break", [
        ast.Continue(),
        ast.Break(),
    ]);
    tstErr("def a = fn() continue", "Expected an expression|13-21");

    tstErr("if a then", "Expected `do`|5-9");
    tstErr("if a do foo()", "Expected `elseif` or `else` or `end`|13-13");
    tst("if a do foo() end", [
        ast.IfStatement(S("a"), [
            ast.ApplyFn(S("foo"), []),
        ], null),
    ]);
    tst("if a do foo() else bar() end", [
        ast.IfStatement(S("a"), [
            ast.ApplyFn(S("foo"), []),
        ], [
            ast.ApplyFn(S("bar"), []),
        ]),
    ]);
    tst("if a do else end", [ast.IfStatement(S("a"), [], [])]);
    tst("if a do end", [ast.IfStatement(S("a"), [], null)]);


    tstErr("type", "Expected a type|4-4");
    tstErr("type Foo", "Expected `=`|8-8");
    tstErr("type Foo =", "Expected a type expression|10-10");
    tst("type Foo = Bar", [ast.DefineType(T("Foo"), T("Bar"))]);

    tstErr("type A=B(", "Expected a type expression|9-9");
    tstErr("type A=B(C", "Expected `)`|10-10");
    tst("type Foo = Bar()", [
        ast.DefineType(T("Foo"), ast.TypeVariant(T("Bar"), [])),
    ]);
    tst("type Foo = Bar(String)", [
        ast.DefineType(T("Foo"), ast.TypeVariant(T("Bar"), [
            T("String"),
        ])),
    ]);
    tst("type Foo = Bar(String, Number)", [
        ast.DefineType(T("Foo"), ast.TypeVariant(T("Bar"), [
            T("String"),
            T("Number"),
        ])),
    ]);

    tst("type A = B() | C()", [
        ast.DefineType(T("A"), ast.TypeUnion(
            ast.TypeVariant(T("B"), []),
            ast.TypeVariant(T("C"), [])
        )),
    ]);

    tst("type A = B() | C() | D()", [
        ast.DefineType(T("A"), ast.TypeUnion(
            ast.TypeUnion(
                ast.TypeVariant(T("B"), []),
                ast.TypeVariant(T("C"), [])
            ),
            ast.TypeVariant(T("D"), [])
        )),
    ]);

    tstErr("type A = {", "Expected a symbol|10-10");
    tst("type A = {}", [
        ast.DefineType(T("A"), ast.TypeStruct([]))
    ]);
    tstErr("type A = {name", "Expected `:`|14-14");
    tstErr("type A = {name:", "Expected a type expression|15-15");
    tst("type A = {name: String}", [
        ast.DefineType(T("A"), ast.TypeStruct([
            ast.TypeStructPair(S("name"), T("String")),
        ]))
    ]);
    tst("type A = {name: String,}", [
        ast.DefineType(T("A"), ast.TypeStruct([
            ast.TypeStructPair(S("name"), T("String")),
        ]))
    ]);
    tstErr("type A = {name: String", "Expected `}`|22-22");

    tstErr("case", "Expected an expression|4-4");
    tstErr("case foo", "Expected `do`|8-8");
    tstErr("case foo do", "Expected `when` or `else`|11-11");
    tstErr("case foo do when", "Expected a type expression|16-16");
    tstErr("case foo do when Bar()", "Expected `when`, `else` or `end`|22-22");
    tst("case foo do when Bar() end", [
        ast.CaseStatement(S("foo"), [
            ast.CaseWhenStatement(ast.TypeVariant(T("Bar"), []), []),
        ])
    ]);
    tstErr("case foo do when Bar() baz end", "Expected a statement|23-26");
    tst("case foo do when Bar() baz() end", [
        ast.CaseStatement(S("foo"), [
            ast.CaseWhenStatement(ast.TypeVariant(T("Bar"), []), [
                ast.ApplyFn(S("baz"), []),
            ]),
        ])
    ]);
    tst("case foo do when Bar() baz() when Qux() end", [
        ast.CaseStatement(S("foo"), [
            ast.CaseWhenStatement(ast.TypeVariant(T("Bar"), []), [
                ast.ApplyFn(S("baz"), []),
            ]),
            ast.CaseWhenStatement(ast.TypeVariant(T("Qux"), []), [])
        ])
    ]);
    tstErr("case foo do when Bar() baz() else qux() when Foo() end", "Expected `end`|40-44");
    tst("case foo do when Bar() baz() else qux() end", [
        ast.CaseStatement(S("foo"), [
            ast.CaseWhenStatement(ast.TypeVariant(T("Bar"), []), [
                ast.ApplyFn(S("baz"), []),
            ]),
        ], [
            ast.ApplyFn(S("qux"), []),
        ])
    ]);

    t.end();
});
