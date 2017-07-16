var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var assertT = require("./assertT");
var SymbolTable = require("symbol-table");

var sysIDtoJsID = function(id){
    return "$$$ecmaless$$$" + toId(id);
};

var comp_ast_node = {
    "Number": function(ast, comp){
        return {
            estree: e("number", ast.value, ast.loc),
            TYPE: {tag: "Number", value: ast.value, loc: ast.loc},
        };
    },
    "String": function(ast, comp){
        return {
            estree: e("string", ast.value, ast.loc),
            TYPE: {tag: "String", value: ast.value, loc: ast.loc},
        };
    },
    "Boolean": function(ast, comp){
        return {
            estree: e(ast.value ? "true" : "false", ast.loc),
            TYPE: {tag: "Boolean", value: ast.value, loc: ast.loc},
        };
    },
    "Nil": function(ast, comp){
        return {
            estree: e("void", e("number", 0, ast.loc), ast.loc),
            TYPE: {tag: "Nil", loc: ast.loc},
        };
    },
    "Identifier": function(ast, comp, ctx){
        var id = ctx.useIdentifier(ast.value, ast.loc);
        if(!id){
            throw new Error("Not defined: " + ast.value);
        }
        return {
            estree: e("id", toId(ast.value), ast.loc),
            TYPE: id.TYPE,
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
    "Function": function(ast, comp, ctx, from_caller){
        var expTYPE = from_caller && from_caller.TYPE;
        if(!expTYPE || expTYPE.tag !== "Fn"){
            //TODO better error
            throw new Error("Sorry, function types are not infered");
        }
        if(_.size(expTYPE.params) !== _.size(ast.params)){
            //TODO better error
            throw new Error("Function should have " + _.size(expTYPE.params) + " params not " + _.size(ast.params));
        }

        ctx.pushScope();

        var params = _.map(ast.params, function(p, i){
            ctx.defIdentifier(p.value, expTYPE.params[i]);
            return comp(p).estree;
        });
        var body = _.compact(_.map(ast.block.body, function(b){
            var c = comp(b);
            if(c){
                //TODO check return type matches expTYPE
                //TODO check return type matches expTYPE
                return c.estree;
            }
        }));
        ctx.popScope();
        var id;
        return {
            estree: e("function", params, body, id, ast.loc),
            TYPE: expTYPE,
        };
    },
    "Application": function(ast, comp){

        var callee = comp(ast.callee);
        var args = _.map(ast.args, function(arg){
            return comp(arg);
        });

        assertT({
            tag: "Fn",
            params: _.map(args, function(arg, i){
                return _.assign({}, arg.TYPE, {
                    loc: ast.args[i].loc,
                });
            }),
        }, callee.TYPE, ast.callee.loc);

        return {
            estree: e("call", callee.estree, _.map(args, "estree"), ast.loc),
            TYPE: callee.TYPE["return"],
        };
    },
    "UnaryOperator": require("./c/UnaryOperator"),
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
        var test = comp(ast.test);
        var consequent = comp(ast.consequent);
        var alternate = comp(ast.alternate);

        assertT(test.TYPE, {tag: "Boolean"}, ast.test.loc);

        //TODO better error i.e. explain both need to match
        assertT(alternate.TYPE, consequent.TYPE, ast.alternate.loc);

        //remove specifics b/c it may be either branch
        var TYPE = _.omit(_.omit(consequent.TYPE, "value"), "loc");

        return {
            estree: e("?",
                test.estree,
                consequent.estree,
                alternate.estree,
                ast.loc
            ),
            TYPE: TYPE,
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
        var test = comp(ast.test);
        assertT(test.TYPE, {tag: "Boolean"}, ast.test.loc);
        var then = comp(ast.then).estree;
        var els_ = ast["else"]
            ? comp(ast["else"]).estree
            : void 0;
        return {
            estree: e("if", test.estree, then, els_, ast.loc),
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
        var test = comp(ast.test);
        assertT(test.TYPE, {tag: "Boolean"}, ast.test.loc);
        return {
            estree: e("while", test.estree, comp(ast.block).estree, ast.loc),
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
        var curr_val = ctx.get(ast.id.value);
        if(curr_val && curr_val.defined){
            throw new Error("Already defined: " + ast.id.value);
        }
        var annotated = curr_val && curr_val.TYPE;

        var init = comp(ast.init, {TYPE: annotated});

        if(annotated){
            //ensure it matches the annotation
            assertT(init.TYPE, annotated, ast.id.loc);
        }

        ctx.defIdentifier(ast.id.value, init.TYPE);

        var id = comp(ast.id);

        if(init.estree.type === "FunctionExpression"){
            init.estree.id = id.estree;
        }
        return {
            estree: e("var", id.estree, init.estree, ast.loc),
        };
    },
    "Annotation": function(ast, comp, ctx){
        var def = comp(ast.def);
        ctx.annIdentifier(ast.id.value, def.TYPE);
        return void 0;//nothing to compile
    },
    "FunctionType": function(ast, comp, ctx){
        var params = _.map(ast.params, function(p){
            return comp(p).TYPE;
        });
        var ret = comp(ast["return"]).TYPE;
        return {
            TYPE: {
                tag: "Fn",
                params: params,
                "return": ret,
            },
        };
    },
    "Type": function(ast, comp, ctx){
        var basics = {
            "Number": true,
            "String": true,
            "Boolean": true,
            "Nil": true,
        };
        if(_.has(basics, ast.value)){
            return {
                TYPE: {tag: ast.value, loc: ast.loc},
            };
        }
        throw new Error("Type not supported: " + ast.value);
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
        annIdentifier: function(id, TYPE){
            symt_stack[0].set(id, {
                id: id,
                TYPE: TYPE,
            });
        },
        defIdentifier: function(id, TYPE){
            symt_stack[0].set(id, {
                id: id,
                TYPE: TYPE,
                defined: true,
            });
        },
        get: function(id){
            return symt_stack[0].get(id);
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

    var compile = function compile(ast, from_caller){
        if(!_.has(ast, "type")){
            throw new Error("Invalid ast node: " + JSON.stringify(ast));
        }else if(!_.has(comp_ast_node, ast.type)){
            throw new Error("Unsupported ast node type: " + ast.type);
        }
        return comp_ast_node[ast.type](ast, compile, ctx, from_caller);
    };

    return {
        estree: _.compact(_.map(ast, function(ast){
            var c = compile(ast);
            if(c){
                return c.estree;
            }
        })),
        undefined_symbols: undefined_symbols
    };
};
