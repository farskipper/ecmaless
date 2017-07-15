//var _ = require("lodash");
var e = require("estree-builder");
var assertT = require("../assertT");


module.exports = function(ast, comp, ctx){
    var left = comp(ast.left);
    var right = comp(ast.right);

    var assertLR = function(typeName){
        assertT(left.TYPE, [typeName], ast.left.loc);
        assertT(right.TYPE, [typeName], ast.right.loc);
    };

    switch(ast.op){
    case "or":
        assertLR("Boolean");
        return {
            estree: e("||", left.estree, right.estree, ast.loc),
        };
    case "and":
        assertLR("Boolean");
        return {
            estree: e("&&", left.estree, right.estree, ast.loc),
        };
    case "=="://TODO value equality
    case "!=":
    case "<":
    case "<=":
    case ">":
    case ">=":
        assertLR("Comparable");
        return {
            estree: e(ast.op, left.estree, right.estree, ast.loc),
            TYPE: ["Boolean"],
        };
    case "+":
    case "-":
    case "*":
    case "/":
    case "%":
        assertLR("Number");
        return {
            estree: e(ast.op, left.estree, right.estree, ast.loc),
            TYPE: ["Number"],
        };
    case "++":
        assertLR("String");
        return {
            estree: e("+", left.estree, right.estree, ast.loc),
            TYPE: ["String"],
        };
    }
    throw new Error("Unsupported infix op: " + ast.op);
};
