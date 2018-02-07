var _ = require("lodash");
var ast = require("./ast");
var test = require("tape");
var parser = require("./");

var rmLoc = function(ast){
    if(_.isPlainObject(ast)){
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
        var ast = rmLoc(r);
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

    tstErr("a + + b", "Rule `+` does not have a nud|4-5");

    tstErr("=", "Rule `=` does not have a nud|0-1");

    tstErr("a b", "Expected `(end)`|2-3");

    tstErr("a +", "Rule `(end)` does not have a nud|3-3");


    t.end();
});
