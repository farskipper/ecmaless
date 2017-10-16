var e = require("estree-builder");

module.exports = function(ast, comp, ctx){
    var arg = comp(ast.arg);

    switch(ast.op){
    case "-":
        ctx.assertT(arg.TYPE, {tag: "Number"}, ast.arg.loc);
        return {
            estree: e("-", arg.estree, ast.loc),
            TYPE: {tag: "Number"},
        };
    case "+":
        ctx.assertT(arg.TYPE, {tag: "Number"}, ast.arg.loc);
        return arg;
    case "not":
        ctx.assertT(arg.TYPE, {tag: "Boolean"}, ast.arg.loc);
        return {
            estree: e("!", arg.estree, ast.loc),
            TYPE: {tag: "Boolean"},
        };
    }
    throw new Error("Unsupported unary operator: " + ast.op);
};
