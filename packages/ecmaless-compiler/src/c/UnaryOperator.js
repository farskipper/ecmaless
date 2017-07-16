var e = require("estree-builder");
var assertT = require("../assertT");

module.exports = function(ast, comp, ctx){
    var arg = comp(ast.arg);

    switch(ast.op){
    case "-":
        assertT(arg.TYPE, {tag: "Number"}, ast.arg.loc);
        return {
            estree: e("-", arg.estree, ast.loc),
            TYPE: {tag: "Number"},
        };
    case "+":
        assertT(arg.TYPE, {tag: "Number"}, ast.arg.loc);
        return arg;
    case "not":
        assertT(arg.TYPE, {tag: "Boolean"}, ast.arg.loc);
        return {
            estree: e("!", arg.estree, ast.loc),
            TYPE: {tag: "Boolean"},
        };
    }
    throw new Error("Unsupported unary operator: " + ast.op);
};
