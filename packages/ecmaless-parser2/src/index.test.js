var _ = require("lodash");
var ast = require("./ast");
var test = require("tape");
var parser = require("./");

var rmLoc = function(ast){
    if(_.isPlainObject(ast)){
        if(!_.isEqual(_.keys(ast), ["loc", "ast"])){
            throw "AST tree should only have {loc, ast} properties";
        }
        return _.mapValues(ast.ast, rmLoc);
    }
    if(_.isArray(ast)){
        return _.map(ast, rmLoc);
    }
    return ast;
};

var Id = ast.Identifier;

test("expression", function(t){
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

    tst("123", ast.Number(123));
    tst("\"a\"", ast.String("a"));
    tst("\"a\\\"b\"", ast.String("a\"b"));
    tst("\"a\\\\b\"", ast.String("a\\b"));

    tst("foo", ast.Identifier("foo"));

    tst("a+b", ast.Infix("+", Id("a"), Id("b")));
    tst("aorb", Id("aorb"));
    tst("a or b", ast.Infix("or", Id("a"), Id("b")));

    tstErr("a + + b", "Expected an expression|4-5");

    tstErr("=", "Expected an expression|0-1");
    tstErr("= a", "Expected an expression|0-1");
    tstErr("a =", "Expected `(end)`|2-3");

    tstErr("or", "Expected an expression|0-2");

    tstErr("a +", "Expected an expression|3-3");

    tstErr("a b", "Expected `(end)`|2-3");


    tst("a + b + c", ast.Infix("+", ast.Infix("+", Id("a"), Id("b")), Id("c")));
    tst("a + b * c", ast.Infix("+", Id("a"), ast.Infix("*", Id("b"), Id("c"))));

    tst("not a", ast.Prefix("not", Id("a")));
    tst("not a or b", ast.Infix("or", ast.Prefix("not", Id("a")), Id("b")));
    tst("a or not b == c", ast.Infix("or", Id("a"), ast.Infix("==", ast.Prefix("not", Id("b")), Id("c"))));

    tst("a - b", ast.Infix("-", Id("a"), Id("b")));
    tst("a - - b", ast.Infix("-", Id("a"), ast.Prefix("-", Id("b"))));

    tstErr("-", "Expected an expression|1-1");
    tstErr("not", "Expected an expression|3-3");

    t.end();
});

test("ast shape", function(t){

    t.deepEquals(parser("a"), {
        type: "Ok",
        tree: {
            loc: {start: 0, end: 1},
            ast: {type: "Identifier", value: "a"}
        }
    });

    t.deepEquals(parser("not a"), {
        type: "Ok",
        tree: {
            loc: {start: 0, end: 3},
            ast: {
                type: "Prefix",
                op: "not",
                value: {
                    loc: {start: 4, end: 5},
                    ast: {type: "Identifier", value: "a"}
                }
            }
        }
    });

    t.deepEquals(parser("a + b"), {
        type: "Ok",
        tree: {
            loc: {start: 2, end: 3},
            ast: {
                type: "Infix",
                op: "+",
                left: {
                    loc: {start: 0, end: 1},
                    ast: {type: "Identifier", value: "a"}
                },
                right: {
                    loc: {start: 4, end: 5},
                    ast: {type: "Identifier", value: "b"}
                },
            },
        },
    });

    t.end();
});
