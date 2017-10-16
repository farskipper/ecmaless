var _ = require("lodash");
var e = require("estree-builder");


module.exports = function(ast, comp, ctx){
    var left = comp(ast.left);
    var right = comp(ast.right);

    var assertLR = function(typeName){
        if(typeName === "Comparable"){
            typeName = left.TYPE.tag;
        }
        ctx.assertT(left.TYPE, {tag: typeName}, ast.left.loc);
        ctx.assertT(right.TYPE, {tag: typeName}, ast.right.loc);
    };

    switch(ast.op){
    case "or":
        assertLR("Boolean");
        return {
            estree: e("||", left.estree, right.estree, ast.loc),
            TYPE: {tag: "Boolean"},
        };
    case "and":
        assertLR("Boolean");
        return {
            estree: e("&&", left.estree, right.estree, ast.loc),
            TYPE: {tag: "Boolean"},
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
            TYPE: {tag: "Boolean"},
        };
    case "+":
    case "-":
    case "*":
    case "/":
    case "%":
        assertLR("Number");
        return {
            estree: e(ast.op, left.estree, right.estree, ast.loc),
            TYPE: {tag: "Number"},
        };
    case "++":
        assertLR("String");
        if(_.isString(left.TYPE.value) && _.isString(right.TYPE.value)){
            var value = left.TYPE.value + right.TYPE.value;
            return {
                estree: e("str", value, ast.loc),
                TYPE: {tag: "String", value: value},
            };
        }
        return {
            estree: e("+", left.estree, right.estree, ast.loc),
            TYPE: {tag: "String"},
        };
    }
    throw new Error("Unsupported infix op: " + ast.op);
};
