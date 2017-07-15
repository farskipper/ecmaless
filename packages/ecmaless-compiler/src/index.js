var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var SymbolTable = require("symbol-table");

var sysIDtoJsID = function(id){
    return "$$$ecmaless$$$" + toId(id);
};

var comp_ast_node = {
    "Number": function(ast, comp){
        return {
            estree: e("number", ast.value, ast.loc),
            TYPE: ["Number"],
        };
    },
    "String": function(ast, comp){
        return {
            estree: e("string", ast.value, ast.loc),
            TYPE: ["String"],
        };
    },
    "Boolean": function(ast, comp){
        return {
            estree: e(ast.value ? "true" : "false", ast.loc),
            TYPE: ["Boolean"],
        };
    },
    "Nil": function(ast, comp){
        return {
            estree: e("void", e("number", 0, ast.loc), ast.loc),
            TYPE: ["Nil"],
        };
    },
    "Identifier": function(ast, comp, ctx){
        ctx.useIdentifier(ast.value, ast.loc);
        return {
            estree: e("id", toId(ast.value), ast.loc),
        };
    },
    "Array": function(ast, comp){
        var est_vals = [];
        _.each(ast.value, function(v_ast){
            var v = comp(v_ast);
            est_vals.push(v.estree);
        });
        return {
            estree: e("array", est_vals, ast.loc),
        };
    },
    "Struct": function(ast, comp){
        var estree = e("object-raw", _.map(_.chunk(ast.value, 2), function(pair){
            var key = pair[0];
            if(key.type === "Symbol"){
                key = e("string", key.value, key.loc);
            }else{
                key = comp(key).estree;
            }
            var val = comp(pair[1]).estree;
            return e("object-property", key, val, {start: key.loc.start, end: val.loc.end});
        }), ast.loc);
        return {
            estree: estree,
        };
    },
    "Function": function(ast, comp, ctx){
        ctx.pushScope();
        var params = [];
        var body = [];
        _.each(ast.params, function(p, i){
            ctx.defIdentifier(p.value);
            params.push(comp(p).estree);
        });
        _.each(ast.block.body, function(b, i){
            if((i === _.size(ast.block.body) - 1) && b.type === "ExpressionStatement"){
                body.push(e("return", comp(b.expression).estree, b.loc));
            }else{
                body.push(comp(b).estree);
            }
        });
        ctx.popScope();
        var id;
        return {
            estree: e("function", params, body, id, ast.loc),
        };
    },
    "Application": function(ast, comp){
        var est_args = [];
        _.each(ast.args, function(ast_arg){
            var arg = comp(ast_arg);
            est_args.push(arg.estree);
        });
        return {
            estree: e("call", comp(ast.callee).estree, est_args, ast.loc),
        };
    },
    "UnaryOperator": function(ast, comp, ctx){
        var arg = comp(ast.arg);
        var estree;
        if(ast.op === "-" || ast.op === "+"){
            estree = e(ast.op, arg.estree, ast.loc);
        }else{
            estree = e("call", ctx.useSystemIdentifier(ast.op, ast.loc, true), [arg.estree], ast.loc);
        }
        return {
            estree: estree,
        };
    },
    "InfixOperator": require("./c/InfixOperator"),
    "AssignmentExpression": function(ast, comp, ctx){
        var left = comp(ast.left);
        var right = comp(ast.right);
        if(ast.left.type === "Identifier"){
            return {
                estree: e("=", left.estree, right.estree, ast.loc),
            };
        }else if(ast.left.type === "MemberExpression"){
            left.estree.callee.name = ctx.useSystemIdentifier("set", ast.loc);
            left.estree["arguments"].push(right.estree);
            return {
                estree: left.estree,
            };
        }
        throw new Error("Only Identifier or MemberExpression can be assigned");
    },
    "MemberExpression": function(ast, comp, ctx){
        var path;
        if(ast.method === "dot"){
            if(ast.path && ast.path.type === "Identifier"){
                path = e("string", ast.path.value, ast.path.loc);
            }
        }else if(ast.method === "index"){
            path = comp(ast.path).estree;
        }else{
            throw new Error("Unsupported MemberExpression method: " + ast.method);
        }
        return {
            estree: e("call", ctx.useSystemIdentifier("get", ast.loc, true), [
                comp(ast.object).estree,
                path
            ], ast.loc),
        };
    },
    "ConditionalExpression": function(ast, comp, ctx){
        return {
            estree: e("?",
                comp(ast.test).estree,
                comp(ast.consequent).estree,
                comp(ast.alternate).estree,
                ast.loc
            ),
        };
    },
    "Block": function(ast, comp, ctx){
        ctx.pushScope();
        var body = _.map(ast.body, function(ast){
            return comp(ast).estree;
        });
        ctx.popScope();
        return {
            estree: e("block", body, ast.loc),
        };
    },
    "ExpressionStatement": function(ast, comp){
        var expr = comp(ast.expression);
        return {
            estree: e(";", expr.estree, ast.loc),
        };
    },
    "Return": function(ast, comp){
        return {
            estree: e("return", comp(ast.expression).estree, ast.loc),
        };
    },
    "If": function(ast, comp, ctx){
        var test = comp(ast.test).estree;
        var then = comp(ast.then).estree;
        var els_ = ast["else"]
            ? comp(ast["else"]).estree
            : void 0;
        return {
            estree: e("if", test, then, els_, ast.loc),
        };
    },
    "Case": function(ast, comp){
        var mkTest = function(val){
            return comp({
                loc: val.loc,
                type: "InfixOperator",
                op: "==",
                left: ast.to_test,
                right: val
            }).estree;
        };
        var prev = ast["else"]
            ? comp(ast["else"]).estree
            : undefined;
        var i = _.size(ast.blocks) - 1;
        while(i >= 0){
            var block = ast.blocks[i];
            prev = e("if",
                mkTest(block.value),
                comp(block.block).estree,
                prev,
                block.loc
            );
            i--;
        }
        return {
            estree: prev,
        };
    },
    "While": function(ast, comp, ctx){
        return {
            estree: e("while", comp(ast.test).estree, comp(ast.block).estree, ast.loc),
        };
    },
    "Break": function(ast, comp){
        return {
            estree: e("break", ast.loc),
        };
    },
    "Continue": function(ast, comp){
        return {
            estree: e("continue", ast.loc),
        };
    },
    "TryCatch": function(ast, comp){
        return {
            estree: e("try",
                comp(ast.try_block).estree,
                comp(ast.catch_id).estree,
                comp(ast.catch_block).estree,
                comp(ast.finally_block).estree,
                ast.loc
            ),
        };
    },
    "Define": function(ast, comp, ctx){
        if(ast.id.type !== "Identifier"){
            throw new Error("Only Identifiers can be defined");
        }
        ctx.defIdentifier(ast.id.value);
        var init = comp(ast.init).estree;
        if(init.type === "FunctionExpression"){
            init.id = comp(ast.id).estree;
        }
        return {
            estree: e("var", comp(ast.id).estree, init, ast.loc),
        };
    },
};

module.exports = function(ast){

    var undefined_symbols = {};
    var symt_stack = [SymbolTable()];
    var ctx = {
        pushScope: function(){
            symt_stack.unshift(symt_stack[0].push());
        },
        popScope: function(){
            symt_stack.shift();
        },
        defIdentifier: function(id){
            symt_stack[0].set(id, {id: id});
        },
        useIdentifier: function(id, loc, js_id){
            if(!symt_stack[0].has(id)){
                if(!_.has(undefined_symbols, id)){
                    undefined_symbols[id] = {
                        loc: loc,
                        id: id,
                        js_id: js_id || toId(id),
                    };
                }
            }else{
                return symt_stack[0].get(id);
            }
        },
        useSystemIdentifier: function(id, loc, ret_estree){
            var js_id = sysIDtoJsID(id);
            ctx.useIdentifier("$$$ecmaless$$$" + id, loc, js_id);
            return ret_estree
                ? e("id", js_id, loc)
                : js_id;
        }
    };

    var compile = function compile(ast){
        if(!_.has(ast, "type")){
            throw new Error("Invalid ast node: " + JSON.stringify(ast));
        }else if(!_.has(comp_ast_node, ast.type)){
            throw new Error("Unsupported ast node type: " + ast.type);
        }
        return comp_ast_node[ast.type](ast, compile, ctx);
    };

    return {
        estree: _.map(ast, function(ast){
            return compile(ast).estree;
        }),
        undefined_symbols: undefined_symbols
    };
};
