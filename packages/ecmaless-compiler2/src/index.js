var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var SymbolTableStack = require("symbol-table/stack");
var okOrError = require("./okOrError");
var Ok = okOrError.Ok;
var Error = okOrError.Error;
var notOk = okOrError.notOk;

var typeToString = function(TYPE){
    return TYPE.typ.tag;
};

var assertT = function(actual, expected){
    var aTag = actual.typ.tag;
    if(aTag !== expected.typ.tag){
        return Error(actual.loc, "expected `" + typeToString(expected) + "` but was `" + typeToString(actual) + "`");
    }
    return Ok();
};


var comp_ast_node = {
    "Number": function(node, comp, ctx){
        return Ok({
            estree: e("number", node.ast.value, ctx.toLoc(node.loc)),
            TYPE: {
                loc: node.loc,
                typ: {tag: "Number", value: node.ast.value},
            },
        });
    },
    "String": function(node, comp, ctx){
        return Ok({
            estree: e("string", node.ast.value, ctx.toLoc(node.loc)),
            TYPE: {
                loc: node.loc,
                typ: {tag: "String", value: node.ast.value},
            },
        });
    },
    "Symbol": function(node, comp, ctx){
        var id = node.ast.value;
        if(!ctx.scope.has(id)){
            return Error(node.loc, "Not defined `" + id + "`");
        }
        return Ok({
            estree: e("id", toId(node.ast.value), ctx.toLoc(node.loc)),
            TYPE: {
                loc: node.loc,
                typ: ctx.scope.get(id).TYPE.typ,
            },
        });
    },
    "Define": function(node, comp, ctx){
        var sym = node.ast.id.ast.value;
        if(ctx.scope.has(sym)){
            return Error(node.ast.id.loc, "`" + sym + "` is already defined");
        }
        var init = comp(node.ast.init);
        if(notOk(init)){
            return init;
        }

        ctx.scope.set(sym, {TYPE: init.value.TYPE});

        var id = comp(node.ast.id);
        if(notOk(id)){
            return id;
        }

        if(init.value.estree.type === "FunctionExpression"){
            init.value.estree.id = id.value.estree;
        }
        return Ok({
            estree: e("var", id.value.estree, init.value.estree, ctx.toLoc(node.loc)),
            TYPE: {
                loc: node.loc,
                typ: {tag: "Nil"},
            },
        });
    },
    "Infix": function(node, comp, ctx){
        var left = comp(node.ast.left);
        if(notOk(left)){
            return left;
        }
        left = left.value;
        var right = comp(node.ast.right);
        if(notOk(right)){
            return right;
        }
        right = right.value;

        var assertLR = function(typeName){
            var out = assertT(left.TYPE, {
                loc: right.TYPE.loc,
                typ: {tag: typeName},
            });
            if(notOk(out)){
                return out;
            }
            out = assertT(right.TYPE, {
                loc: left.TYPE.loc,
                typ: {tag: typeName},
            });
            if(notOk(out)){
                return out;
            }
            return Ok();
        };

        var op = node.ast.op;

        switch(op){
        case "+":
        case "-":
        case "*":
        case "/":
        case "%":
            var out = assertLR("Number");
            if(notOk(out)){
                return out;
            }
            return Ok({
                estree: e(op, left.estree, right.estree, ctx.toLoc(node.loc)),
                TYPE: {
                    loc: node.loc,
                    typ: left.TYPE.typ,
                }
            });
        default:
            return Error(node.loc, "`" + op + "` not supported");
        }
    },
};

module.exports = function(ast, conf){
    conf = conf || {};

    var toLoc = conf.toLoc || _.noop;

    var ctx = {
        scope: SymbolTableStack(),
        toLoc: toLoc,
    };

    var comp = function(node){
        var type = node.ast.type;
        if(!comp_ast_node[type]){
            throw "Unsupported ast type: " + type;
        }
        return comp_ast_node[type](node, comp, ctx);
    };

    var estree = [];
    var TYPE;//the `export` type (the return value of the estree function)
    var modules = {};

    var i = 0;
    while(i < ast.ast.length){
        var out = comp(ast.ast[i]);
        i++;
        if(notOk(out)){
            return out;
        }
        estree.push(out.value.estree);
    }

    return {
        type: "Ok",
        value: {
            estree: e("function", _.keys(modules), estree, ast.loc),
            TYPE: TYPE,
            modules: modules,
        }
    };
};
