var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var assertT = require("./assertT");
var ImportBlock = require("./c/ImportBlock");
var ExportBlock = require("./c/ExportBlock");
var SymbolTableStack = require("symbol-table/stack");


var omitTypeInstanceSpecifics = function(TYPE){
    //TODO recurse down in complex types
    return _.omit(_.omit(TYPE, "value"), "loc");
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
        var id = ast.value;
        if(!ctx.scope.has(id)){
            throw ctx.error(ast.loc, "Not defined: " + id);
        }
        return {
            estree: e("id", toId(ast.value), ast.loc),
            TYPE: ctx.scope.get(id).TYPE,
        };
    },
    "Array": function(ast, comp, ctx){
        var TYPE = {
            tag: "Array",
            type: void 0,
            loc: ast.loc,
        };
        var est_vals = [];
        _.each(ast.value, function(v_ast, i){
            var v = comp(v_ast);
            if(TYPE.type){
                //TODO better error message i.e. array elements all must have same type
                ctx.assertT(v.TYPE, TYPE.type, v_ast.loc);
            }else{
                TYPE.type = v.TYPE;
            }
            est_vals.push(v.estree);
        });
        return {
            estree: e("array", est_vals, ast.loc),
            TYPE: TYPE,
        };
    },
    "Struct": function(ast, comp, ctx){
        var TYPE = {
            tag: "Struct",
            by_key: {},
            loc: ast.loc,
        };
        var est_pairs = [];
        _.each(_.chunk(ast.value, 2), function(pair){
            var key = pair[0];
            var key_str;
            var key_est;
            if(key.type === "Symbol"){
                key_str = key.value;
                key_est = e("string", key.value, key.loc);
            }else if(key.type === "String"){
                key_str = key.value;
                key_est = comp(key).estree;
            }else{
                throw ctx.error(key.loc, "Invalid struct key.type: " + key.type);
            }

            var val = comp(pair[1]);

            if(_.has(TYPE.by_key, key_str)){
                throw ctx.error(key.loc, "No duplicate keys: " + key_str);
            }

            TYPE.by_key[key_str] = val.TYPE;

            est_pairs.push(e("object-property", key_est, val.estree, {start: pair[0].loc.start, end: pair[1].loc.end}));
        });
        return {
            estree: e("object-raw", est_pairs, ast.loc),
            TYPE: TYPE,
        };
    },
    "Function": function(ast, comp, ctx, from_caller){
        var expTYPE = from_caller && from_caller.TYPE;
        if(!expTYPE || expTYPE.tag !== "Fn"){
            throw ctx.error(ast.loc, "Sorry, function types are not infered");
        }
        if(_.size(expTYPE.params) !== _.size(ast.params)){
            throw ctx.error(ast.loc, "Function should have " + _.size(expTYPE.params) + " params not " + _.size(ast.params));
        }

        ctx.scope.push();

        var params = _.map(ast.params, function(p, i){
            ctx.scope.set(p.value, {TYPE: expTYPE.params[i]});
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
        ctx.scope.pop();
        var id;
        return {
            estree: e("function", params, body, id, ast.loc),
            TYPE: expTYPE,
        };
    },
    "Application": function(ast, comp, ctx){

        var callee = comp(ast.callee);
        var args = _.map(ast.args, function(arg){
            return comp(arg);
        });

        ctx.assertT({
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

        //TODO better error i.e. explain can't change types
        ctx.assertT(right.TYPE, left.TYPE, ast.right.loc);

        if(ast.left.type === "Identifier"){
            return {
                estree: e("=", left.estree, right.estree, ast.loc),
                TYPE: left.TYPE,
            };
        }
        throw ctx.error(ast.left.loc, "Only Identifier can be assigned");
    },
    "MemberExpression": function(ast, comp, ctx){

        var obj = comp(ast.object);

        if(ast.method === "dot" && ast.path && ast.path.type === "Identifier"){

            var key = ast.path.value;

            if(obj.TYPE.tag !== "Struct"){
                throw ctx.error(ast.loc, ". notation only works on Struct");
            }
            if( ! _.has(obj.TYPE.by_key, key)){
                throw ctx.error(ast.loc, "Key does not exist: " + key);
            }

            return {
                estree: e(".", obj.estree, e("id", key, ast.path.loc), ast.loc),
                TYPE: obj.TYPE.by_key[key],
            };
        }else if(ast.method === "index"){
            var path = comp(ast.path);
            if(obj.TYPE.tag === "Array"){
                if(path.TYPE.tag !== "Number"){//TODO Int
                    throw ctx.error(ast.loc, "Array subscript notation only works with Ints");
                }
                return {
                    estree: e("get", obj.estree, path.estree, ast.loc),
                    TYPE: {
                        tag: "Maybe",
                        params: [obj.TYPE.type],
                        loc: ast.loc,
                    },
                };
            }else{
                throw ctx.error(ast.loc, "subscript notation only works on Arrays");
            }
        }else{
            throw ctx.error(ast.loc, "Unsupported MemberExpression method: " + ast.method);
        }
    },
    "ConditionalExpression": function(ast, comp, ctx){
        var test = comp(ast.test);
        var consequent = comp(ast.consequent);
        var alternate = comp(ast.alternate);

        ctx.assertT(test.TYPE, {tag: "Boolean"}, ast.test.loc);

        //TODO better error i.e. explain both need to match
        ctx.assertT(alternate.TYPE, consequent.TYPE, ast.alternate.loc);

        //remove specifics b/c it may be either branch
        var TYPE = omitTypeInstanceSpecifics(consequent.TYPE);

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
        ctx.scope.push();
        var body = _.map(ast.body, function(ast){
            return comp(ast).estree;
        });
        ctx.scope.pop();
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
        ctx.assertT(test.TYPE, {tag: "Boolean"}, ast.test.loc);
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
        ctx.assertT(test.TYPE, {tag: "Boolean"}, ast.test.loc);
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
            throw ctx.error(ast.id.loc, "Only Identifiers can be defined");
        }
        var curr_val = ctx.scope.get(ast.id.value);
        var annotated = curr_val && curr_val.TYPE;

        var init = comp(ast.init, {TYPE: annotated});

        if(annotated){
            //ensure it matches the annotation
            ctx.assertT(init.TYPE, annotated, ast.id.loc);
        }

        ctx.scope.set(ast.id.value, {TYPE: init.TYPE});

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
        ctx.scope.set(ast.id.value, {TYPE: def.TYPE});
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
        if( ! ctx.scope.has(ast.value)){
            throw ctx.error(ast.loc, "Type not defined: " + ast.value);
        }
        var vTYPE = ctx.scope.get(ast.value).TYPE;
        if(!_.isEmpty(ast.params)){
            if(vTYPE.tag !== "Generic"){
                throw ctx.error(ast.loc, "Type doesn't take generic params: " + ast.value);
            }
            if(_.size(vTYPE.params) !== _.size(ast.params)){
                throw ctx.error(ast.loc, "Expected " + ast.value + "<" + vTYPE.params + "> but was given " + _.size(ast.params) + " params");
            }
            vTYPE = vTYPE.ctor(ast.params, ast.loc, comp, ctx);
        }
        return {
            TYPE: vTYPE,
        };
    },
    "TypeAlias": function(ast, comp, ctx){
        var TYPE = comp(ast.value).TYPE;
        ctx.scope.set(ast.id.value, {TYPE: TYPE});
        return {
            TYPE: TYPE,
        };
    },
    "TypeVariable": function(ast, comp, ctx){
        var id = ast.value;
        if(!ctx.tvarScope.has(id)){
            throw ctx.error(ast.loc, "TypeVariable not defined: " + id);
        }
        return {
            TYPE: ctx.tvarScope.get(id),
        };
    },
    "Enum": function(ast, comp, ctx){
        var TYPE;
        if( ! _.isEmpty(ast.id.params)){
            var params = _.map(ast.id.params, function(param){
                if(param.type !== "TypeVariable"){
                    throw ctx.error(param.loc, "Enum params must be TypeVariable");
                }
                return param.value;
            });
            TYPE = {
                tag: "Generic",
                params: params,
                ctor: function(types, called_loc, comp, ctx){
                    var TYPE = {
                        tag: "Enum",
                        id: ast.id.value,
                        variants: {},
                        args: {},
                        loc: ast.loc,
                    };
                    if(_.size(types) !== _.size(params)){
                        throw ctx.error(called_loc, "Expected " + _.size(params) + " type params not " + _.size(types) + " for " + ast.id.value + "<" + params.join(",") + ">");
                    }
                    ctx.tvarScope.push();
                    _.each(params, function(param_str, i){
                        var t = comp(types[i]).TYPE;
                        TYPE.args[param_str] = t;
                        ctx.tvarScope.set(param_str, t);
                    });
                    _.each(ast.variants, function(variant){
                        var tag = variant.tag.value;
                        if(_.has(TYPE.variants, tag)){
                            throw ctx.error(variant.tag.loc, "Duplicate enum variant: " + tag);
                        }
                        TYPE.variants[tag] = _.map(variant.params, function(param){
                            return comp(param).TYPE;
                        });
                    });
                    ctx.tvarScope.pop();
                    return TYPE;
                },
                loc: ast.loc,
            };
            ctx.scope.set(ast.id.value, {TYPE: TYPE});
            return {
                TYPE: TYPE,
            };
        }
        TYPE = {
            tag: "Enum",
            id: ast.id.value,
            variants: {},
            args: {},
            loc: ast.loc,
        };
        _.each(ast.variants, function(variant){
            var tag = variant.tag.value;
            if(_.has(TYPE.variants, tag)){
                throw ctx.error(variant.tag.loc, "Duplicate enum variant: " + tag);
            }
            TYPE.variants[tag] = _.map(variant.params, function(param){
                return comp(param).TYPE;
            });
        });
        ctx.scope.set(ast.id.value, {TYPE: TYPE});
        return {
            TYPE: TYPE,
        };
    },
    "EnumValue": function(ast, comp, ctx){
        if(!ast.enum || !ctx.scope.has(ast.enum.value)){
            throw ctx.error(ast.enum.loc, "Enum not defined: " + ast.enum.value);
        }

        var enumT = ctx.scope.get(ast.enum.value).TYPE;
        if(enumT.tag === "Generic"){
            enumT = enumT.ctor(ast.enum.params, ast.enum.loc, comp, ctx);
        }
        if(enumT.tag !== "Enum"){
            throw ctx.error(ast.enum.loc, "Not an enum: " + ast.enum.value);
        }
        if(!_.has(enumT.variants, ast.tag.value)){
            throw ctx.error(ast.tag.loc, "Not an enum variant: " + ast.enum.value + "." + ast.tag.value);
        }
        var paramsT = enumT.variants[ast.tag.value];
        if(_.size(paramsT) !== _.size(ast.params)){
            throw ctx.error(ast.tag.loc, "Expected " + _.size(paramsT) + " params not " + _.size(ast.params) + " for " + ast.enum.value + "." + ast.tag.value);
        }
        var params = _.map(ast.params, function(p_ast, i){
            var pT = paramsT[i];
            var param = comp(p_ast);
            ctx.assertT(param.TYPE, pT, p_ast.loc);
            return param.estree;
        });
        return {
            estree: e("obj", {
                tag: e("string", ast.tag.value, ast.tag.loc),
                params: e("array", params, ast.loc),
            }, ast.loc),
            TYPE: enumT,
        };
    },
    "StructType": function(ast, comp, ctx){
        var by_key = {};
        _.each(ast.pairs, function(p){
            var key = p[0];
            var val = p[1];
            if(key.type !== "Symbol" || !_.isString(key.value)){
                throw ctx.error(key.loc, "StructType keys must be Symbols");
            }
            by_key[key.value] = comp(val).TYPE;
        });
        return {
            TYPE: {
                tag: "Struct",
                by_key: by_key,
                loc: ast.loc,
            },
        };
    },
    "ImportBlock": function(ast, comp, ctx){
        throw ctx.error(ast.loc, "`import` must be the first statement");
    },
    "ExportBlock": function(ast, comp, ctx){
        throw ctx.error(ast.loc, "`export` must be the last statement");
    },
};

module.exports = function(ast, conf){
    conf = conf || {};

    var ctx = {
        requireModule: conf.requireModule,

        error: function(loc, message){
            var err = new Error(message);
            err.ecmaless = {
                loc: loc,
            };
            return err;
        },
        assertT: function(actual, expected, loc){
            assertT(ctx, actual, expected, loc);
        },

        scope: SymbolTableStack(),
        tvarScope: SymbolTableStack(),
    };

    var compile = function compile(ast, from_caller){
        if(!_.has(ast, "type")){
            throw ctx.error(ast.loc, "Invalid ast node: " + JSON.stringify(ast));
        }else if(!_.has(comp_ast_node, ast.type)){
            throw ctx.error(ast.loc, "Unsupported ast node type: " + ast.type);
        }
        return comp_ast_node[ast.type](ast, compile, ctx, from_caller);
    };


    var main_loc = {start: _.head(ast).loc.start, end: _.last(ast).loc.end};
    var estree = [];
    var TYPE;//the `export` type (the return value of the estree function)
    var modules = {};

    var first_ast = _.head(ast);
    if(first_ast && first_ast.type === "ImportBlock"){
        var imported = ImportBlock(first_ast, compile, ctx);
        estree = estree.concat(imported.estree);
        modules = imported.modules;
        ast = _.tail(ast);
    }

    var last_ast = _.last(ast);
    if(last_ast && last_ast.type === "ExportBlock"){
        ast = _.dropRight(ast);
    }

    _.each(ast, function(ast){
        var c = compile(ast);
        if(c && c.estree){
            estree.push(c.estree);
        }
    });

    if(last_ast && last_ast.type === "ExportBlock"){
        var exported = ExportBlock(last_ast, compile, ctx);
        estree.push(exported.estree);
        TYPE = exported.TYPE;
    }

    return {
        estree: e("function", _.keys(modules), estree, main_loc),
        TYPE: TYPE,
        modules: modules,
    };
};
