var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var SymbolTable = require("symbol-table");

var sysIDtoJsID = function(id){
    return "$$$ecmaless$$$" + toId(id);
};

var nativejs_infix_ops = {
    "<": true,
    "<=": true,
    ">": true,
    ">=": true,
    "+": true,
    "-": true,
    "*": true,
    "/": true,
    "%": true,
};

var wrapTruthyTest = function(test, ctx){
    var loc = test.loc;
    if(test && test.type === "BinaryExpression" && test.operator === "==="){
        return test;
    }
    if(test && test.type === "CallExpression" && test.callee){
        if(test.callee.type === "Identifier"){
            if(false
                || test.callee.name === sysIDtoJsID("==")
                || test.callee.name === sysIDtoJsID("!=")
                || test.callee.name === sysIDtoJsID("!")
            ){
                return test;
            }
        }
    }
    return e("call", ctx.useSystemIdentifier("truthy", loc, true), [test], loc);
};

var comp_by_type = {
    "Number": function(ast, comp){
        return e("number", ast.value, ast.loc);
    },
    "String": function(ast, comp){
        return e("string", ast.value, ast.loc);
    },
    "Identifier": function(ast, comp, ctx){
        ctx.useIdentifier(ast.value, ast.loc);
        return e("id", toId(ast.value), ast.loc);
    },
    "Nil": function(ast, comp){
        return e("void", e("number", 0, ast.loc), ast.loc);
    },
    "Boolean": function(ast, comp){
        return e(ast.value ? "true" : "false", ast.loc);
    },
    "Array": function(ast, comp){
        return e("array", comp(ast.value), ast.loc);
    },
    "Struct": function(ast, comp){
        return e("object-raw", _.map(_.chunk(ast.value, 2), function(pair){
            var key = pair[0];
            if(key.type === "Symbol"){
                key = e("string", key.value, key.loc);
            }else{
                key = comp(key);
            }
            var val = comp(pair[1] || {loc: key.loc, type: "Nil"});
            return e("object-property", key, val, {start: key.loc.start, end: val.loc.end});
        }), ast.loc);
    },
    "Function": function(ast, comp, ctx){
        ctx.pushScope();
        var params = [];
        var body = [];
        _.each(ast.params, function(p, i){
            ctx.defIdentifier(p.value);
            params.push(comp(p));
        });
        _.each(ast.block.body, function(b, i){
            if((i === _.size(ast.block.body) - 1) && b.type === "ExpressionStatement"){
                body.push(e("return", comp(b.expression), b.loc));
            }else{
                body.push(comp(b));
            }
        });
        ctx.popScope();
        var id;
        return e("function", params, body, id, ast.loc);
    },
    "Application": function(ast, comp){
        return e("call", comp(ast.callee), comp(ast.args), ast.loc);
    },
    "UnaryOperator": function(ast, comp, ctx){
        if(ast.op === "-" || ast.op === "+"){
            return e(ast.op, comp(ast.arg), ast.loc);
        }
        return e("call", ctx.useSystemIdentifier(ast.op, ast.loc, true), [comp(ast.arg)], ast.loc);
    },
    "InfixOperator": function(ast, comp, ctx){
        if(nativejs_infix_ops.hasOwnProperty(ast.op)){
            return e(ast.op, comp(ast.left), comp(ast.right), ast.loc);
        }
        var right = comp(ast.right);
        if(ast.op === "or" || ast.op === "and"){
            right = e("fn", [], [e("return", right, right.loc)], right.loc);
        }
        return e("call", ctx.useSystemIdentifier(ast.op, ast.loc, true), [
            comp(ast.left),
            right
        ], ast.loc);
    },
    "AssignmentExpression": function(ast, comp, ctx){
        if(ast.left.type === "Identifier"){
            return e("=", comp(ast.left), comp(ast.right), ast.loc);
        }else if(ast.left.type === "MemberExpression"){
            var left = comp(ast.left);
            left.callee.name = ctx.useSystemIdentifier("set", ast.loc);
            left["arguments"].push(comp(ast.right));
            return left;
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
            path = comp(ast.path);
        }else{
            throw new Error("Unsupported MemberExpression method: " + ast.method);
        }
        return e("call", ctx.useSystemIdentifier("get", ast.loc, true), [
            comp(ast.object),
            path
        ], ast.loc);
    },
    "ConditionalExpression": function(ast, comp, ctx){
        return e("?",
            wrapTruthyTest(comp(ast.test), ctx),
            comp(ast.consequent),
            comp(ast.alternate),
            ast.loc
        );
    },
    "Block": function(ast, comp, ctx){
        ctx.pushScope();
        var body = comp(ast.body);
        ctx.popScope();
        return e("block", body, ast.loc);
    },
    "ExpressionStatement": function(ast, comp){
        return e(";", comp(ast.expression), ast.loc);
    },
    "Return": function(ast, comp){
        return e("return", comp(ast.expression), ast.loc);
    },
    "If": function(ast, comp, ctx){
        var test = comp(ast.test);
        var then = comp(ast.then);
        var els_ = ast["else"] ? comp(ast["else"]) : void 0;
        return e("if", wrapTruthyTest(test, ctx), then, els_, ast.loc);
    },
    "Case": function(ast, comp){
        var mkTest = function(val){
            return comp({
                loc: val.loc,
                type: "InfixOperator",
                op: "==",
                left: ast.to_test,
                right: val
            });
        };
        var prev = ast["else"]
            ? comp(ast["else"])
            : undefined;
        var i = _.size(ast.blocks) - 1;
        while(i >= 0){
            var block = ast.blocks[i];
            prev = e("if",
                mkTest(block.value),
                comp(block.block),
                prev,
                block.loc
            );
            i--;
        }
        return prev;
    },
    "While": function(ast, comp, ctx){
        return e("while", wrapTruthyTest(comp(ast.test), ctx), comp(ast.block), ast.loc);
    },
    "Break": function(ast, comp){
        return e("break", ast.loc);
    },
    "Continue": function(ast, comp){
        return e("continue", ast.loc);
    },
    "TryCatch": function(ast, comp){
        return e("try",
            comp(ast.try_block),
            comp(ast.catch_id),
            comp(ast.catch_block),
            comp(ast.finally_block),
            ast.loc
        );
    },
    "Define": function(ast, comp, ctx){
        if(ast.id.type !== "Identifier"){
            throw new Error("Only Identifiers can be defined");
        }
        ctx.defIdentifier(ast.id.value);
        var init = comp(ast.init || {loc: ast.id.loc, type: "Nil"});
        if(init && init.type === "FunctionExpression"){
            init.id = comp(ast.id);
        }
        return e("var", comp(ast.id), init, ast.loc);
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
        if(_.isArray(ast)){
            return _.map(ast, function(a){
                return compile(a);
            });
        }else if(!_.has(ast, "type")){
            throw new Error("Invalid ast node: " + JSON.stringify(ast));
        }else if(!_.has(comp_by_type, ast.type)){
            throw new Error("Unsupported ast node type: " + ast.type);
        }
        return comp_by_type[ast.type](ast, compile, ctx);
    };

    return {
        estree: compile(ast),
        undefined_symbols: undefined_symbols
    };
};
