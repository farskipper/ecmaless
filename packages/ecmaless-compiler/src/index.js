var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var assertT = require("./assertT");
var ImportBlock = require("./c/ImportBlock");
var ExportBlock = require("./c/ExportBlock");
var typeToString = require("./typeToString");
var SymbolTableStack = require("symbol-table/stack");


var omitTypeInstanceSpecifics = function(TYPE){
    //TODO recurse down in complex types
    return _.omit(_.omit(TYPE, "value"), "loc");
};


var comp_ast_node = {
    "Number": function(ast, comp){
        return {
            estree: e("number", ast.value, ast.loc),
            TYPE: {tag: "Number", loc: ast.loc, value: ast.value},
        };
    },
    "String": function(ast, comp){
        return {
            estree: e("string", ast.value, ast.loc),
            TYPE: {tag: "String", loc: ast.loc, value: ast.value},
        };
    },
    "Boolean": function(ast, comp){
        return {
            estree: e(ast.value ? "true" : "false", ast.loc),
            TYPE: {tag: "Boolean", loc: ast.loc, value: ast.value},
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
            throw ctx.error(ast.loc, "Not defined `" + id + "`");
        }
        return {
            estree: e("id", toId(ast.value), ast.loc),
            TYPE: _.assign({}, ctx.scope.get(id).TYPE, {
                loc: ast.loc,
            }),
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
                ctx.assertT(v.TYPE, TYPE.type);
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
            if(key.type !== "Symbol"){
                throw ctx.error(key.loc, "Invalid struct key.type: " + key.type);
            }
            var key_str = key.value;
            var key_est = e("string", key.value, key.loc);

            if(_.has(TYPE.by_key, key_str)){
                throw ctx.error(key.loc, "Duplicate key `" + key_str + "`");
            }

            var val = comp(pair[1]);

            TYPE.by_key[key_str] = val.TYPE;

            est_pairs.push(e("object-property", key_est, val.estree, {start: pair[0].loc.start, end: pair[1].loc.end}));
        });
        return {
            estree: e("object-raw", est_pairs, ast.loc),
            TYPE: TYPE,
        };
    },
    "Function": function(ast, comp, ctx, from_caller){
        var expTYPE = from_caller && from_caller.annotatedTYPE;
        if(!expTYPE || expTYPE.tag !== "Fn"){
            throw ctx.error(ast.loc, "Sorry, function types are not infered");
        }
        if(_.size(expTYPE.params) !== _.size(ast.params)){
            throw ctx.error(ast.loc, "Annotation said the function should have " + _.size(expTYPE.params) + " params not " + _.size(ast.params));
        }

        ctx.scope.push();

        var params = _.map(ast.params, function(p, i){
            ctx.scope.set(p.value, {TYPE: expTYPE.params[i]});
            return comp(p).estree;
        });

        var body = comp(ast.block, {no_scope_push: true});
        if(body.may_return && expTYPE["return"].tag !== "Nil"){
            throw ctx.error(body.may_return.loc, "There is a branch that is not returning");
        }
        ctx.assertT(body.returns || {tag: "Nil", loc: ast.loc}, expTYPE["return"]);

        ctx.scope.pop();
        var id;
        return {
            estree: e("function", params, body.estree, id, ast.loc),
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
            loc: ast.callee.loc,
        }, callee.TYPE);

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
        ctx.assertT(right.TYPE, left.TYPE);

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

        if(ast.method === "dot" && ast.path && ast.path.type === "Symbol"){

            var key = ast.path.value;

            if(obj.TYPE.tag !== "Struct"){
                throw ctx.error(ast.loc, ". notation only works on Struct");
            }
            if( ! _.has(obj.TYPE.by_key, key)){
                throw ctx.error(ast.loc, "Key does not exist `" + key + "`");
            }

            return {
                estree: e(".", obj.estree, e("id", key, ast.path.loc), ast.loc),
                TYPE: obj.TYPE.by_key[key],
            };
        }else if(ast.method === "index"){
            if(obj.TYPE.tag !== "Array"){
                throw ctx.error(ast.loc, "subscript notation only works on Arrays");
            }
            var path = comp(ast.path);
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
            throw ctx.error(ast.loc, "Unsupported MemberExpression method: " + ast.method);
        }
    },
    "ConditionalExpression": function(ast, comp, ctx){
        var test = comp(ast.test);
        var consequent = comp(ast.consequent);
        var alternate = comp(ast.alternate);

        ctx.assertT(test.TYPE, {
            tag: "Boolean",
            loc: ast.test.loc,
        });

        //TODO better error i.e. explain both need to match
        ctx.assertT(alternate.TYPE, consequent.TYPE);

        //remove specifics b/c it may be either branch
        var TYPE = omitTypeInstanceSpecifics(consequent.TYPE);
        TYPE.loc = ast.loc;

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
    "Block": function(ast, comp, ctx, from_caller){
        var should_push_scope = !(from_caller && from_caller.no_scope_push);
        var should_wrap_in_eblock = !(from_caller && from_caller.wrap_in_eblock);
        if(should_push_scope){
            ctx.scope.push();
        }

        var returns;
        var may_return;
        var throwup;
        var may_throwup;
        var body = _.compact(_.map(ast.body, function(ast){
            if(returns || throwup){
                throw ctx.error(ast.loc, "Dead code");
            }
            var c = comp(ast);
            if(c.returns){
                returns = c.returns;
                if(may_return){
                    //TODO better message about branches matching
                    ctx.assertT(may_return, returns);
                    may_return = void 0;
                }
            }
            if(c.may_return){
                if(may_return){
                    //TODO better message about branches matching
                    ctx.assertT(may_return, c.may_return);
                }
                may_return = c.may_return;
            }
            if(c.throwup){
                throwup = c.throwup;
                if(may_throwup){
                    //TODO better message about branches matching
                    ctx.assertT(may_throwup, throwup);
                    may_throwup = void 0;
                }
            }
            if(c.may_throwup){
                if(may_throwup){
                    //TODO better message about branches matching
                    ctx.assertT(c.may_throwup, may_throwup);
                }
                may_throwup = c.may_throwup;
            }
            return c.estree;
        }));

        if(should_push_scope){
            ctx.scope.pop();
        }
        return {
            estree: should_wrap_in_eblock
                ? e("block", body, ast.loc)
                : body,
            returns: returns,
            may_return: may_return,
            throwup: throwup,
            may_throwup: may_throwup,
        };
    },
    "ExpressionStatement": function(ast, comp){
        var expr = comp(ast.expression);
        return {
            estree: e(";", expr.estree, ast.loc),
        };
    },
    "Return": function(ast, comp){
        var c = comp(ast.expression);
        return {
            estree: e("return", c.estree, ast.loc),
            returns: c.TYPE,
        };
    },
    "If": function(ast, comp, ctx){
        var test = comp(ast.test);
        ctx.assertT(test.TYPE, {
            tag: "Boolean",
            loc: ast.test.loc,
        });
        var then = comp(ast.then);
        var els_ = ast["else"]
            ? comp(ast["else"])
            : {};

        var returns;
        var may_return = then.returns || then.may_return;
        if(els_.returns || els_.may_return){
            if(may_return){
                //TODO better message about branches need to match
                ctx.assertT(els_.returns || els_.may_return, may_return);
            }
        }
        if(then.returns && els_.returns){
            returns = els_.returns;
            may_return = void 0;
        }


        var throwup;
        var may_throwup = then.throwup || then.may_throwup;
        if(els_.throwup || els_.may_throwup){
            if(may_throwup){
                //TODO better message about branches need to match
                ctx.assertT(els_.throwup || els_.may_throwup, may_throwup);
            }
        }
        if(then.throwup && els_.throwup){
            throwup = els_.throwup;
            may_throwup = void 0;
        }


        return {
            estree: e("if", test.estree, then.estree, els_.estree, ast.loc),
            returns: returns,
            may_return: may_return,

            throwup: throwup,
            may_throwup: may_throwup,
        };
    },
    "Case": function(ast, comp, ctx){
        var to_test = comp(ast.to_test);
        if(to_test.TYPE.tag !== "Enum"){
            throw ctx.error(ast.to_test.loc, "`case` statements only work on Enums");
        }
        var detId = ctx.sysId("case");
        var getDetIdProp = function(prop, loc){
            return e(".", e("id", detId, loc), e("id", prop, loc), loc);
        };
        var n_branches_with_returns = 0;
        var returns;
        var variants_handled = {};
        var cases = _.map(ast.blocks, function(cblock){
            if(cblock.value.type !== "EnumValue"){
                throw ctx.error(cblock.value.loc, "Not an EnumValue");
            }
            if(cblock.value.enum){
                throw ctx.error(cblock.value.enum.loc, "Enum is implied");
            }
            if(!_.isEmpty(cblock.value.tag.params)){
                throw ctx.error(cblock.value.tag.loc, "No params");
            }
            var tag = cblock.value.tag.value;
            if(!_.has(to_test.TYPE.variants, tag)){
                throw ctx.error(cblock.value.tag.loc, "`" + tag + "` is not a variant");
            }
            if(_.has(variants_handled, tag)){
                throw ctx.error(cblock.value.tag.loc, "Duplicate variant `" + tag + "`");
            }
            variants_handled[tag] = true;
            var vparamTypes = to_test.TYPE.variants[tag];
            if(_.size(cblock.value.params) !== _.size(vparamTypes)){
                throw ctx.error(cblock.value.loc, "Expected "
                        + _.size(vparamTypes) + " params not "
                        + _.size(cblock.value.params));
            }
            ctx.scope.push();
            ctx.tvarScope.push();
            var test = e("string", tag, cblock.value.tag.loc);
            var consequent = [];
            _.each(cblock.value.params, function(cparam, i){
                if(cparam.type !== "Identifier"){
                    throw ctx.error(cparam.loc, "Expected an Identifier");
                }
                ctx.scope.set(cparam.value, {TYPE: vparamTypes[i]});
                consequent.push(e("var",
                    cparam.value,
                    e("get",
                        getDetIdProp("params", cparam.loc),
                        e("number", i, cparam.loc),
                        cparam.loc
                    ),
                    cparam.loc
                ));
            });
            var block = comp(cblock.block, {
                no_scope_push: true,
                wrap_in_eblock: true,
            });
            if(block.returns){
                n_branches_with_returns += 1;
                if(returns){
                    //TODO better message about branches need to match
                    ctx.assertT(block.returns, returns);
                }else{
                    returns = block.returns;
                }
            }
            consequent = consequent.concat(block.estree);
            consequent.push(e("break", cblock.block.loc));
            ctx.scope.pop();
            ctx.tvarScope.pop();
            return e("case", test, consequent);
        });
        var missing = [];
        _.each(to_test.TYPE.variants, function(a, tag){
            if( ! _.has(variants_handled, tag)){
                missing.push(tag);
            }
        });
        if( ! _.isEmpty(missing)){
            throw ctx.error(ast.to_test.loc, "Missing variants `" + missing.join("`, `") + "`");
        }
        return {
            estree: e(";", e("call", e("fn", [detId], [
                e("switch", getDetIdProp("tag", ast.to_test.loc),
                    cases,
                    ast.loc),
            ], ast.loc), [to_test.estree], ast.loc), ast.loc),
            returns: n_branches_with_returns === _.size(ast.blocks)
                ? returns
                : null,
            may_return: n_branches_with_returns === _.size(ast.blocks)
                ? null
                : returns,
        };
    },
    "While": function(ast, comp, ctx){
        var test = comp(ast.test);
        ctx.assertT(test.TYPE, {
            tag: "Boolean",
            loc: ast.test.loc,
        });
        var b = comp(ast.block);
        return {
            estree: e("while", test.estree, b.estree, ast.loc),
            //no absolute returns b/c it's conditional
            may_return: b.returns || b.may_return,
            //no absolute throwup b/c it's conditional
            may_throwup: b.throwup || b.may_throwup,
        };
    },
    "Break": function(ast, comp){
        //TODO only inside while
        return {
            estree: e("break", ast.loc),
        };
    },
    "Continue": function(ast, comp){
        //TODO only inside while
        return {
            estree: e("continue", ast.loc),
        };
    },
    "Throw": function(ast, comp){
        var c = comp(ast.expression);
        return {
            estree: e("throw", c.estree, ast.loc),
            throwup: c.TYPE,
        };
    },
    "TryCatch": function(ast, comp, ctx){
        var try_block = comp(ast.try_block);
        var try_may_throw = try_block.throwup || try_block.may_throwup;
        if( ! try_may_throw){
            throw ctx.error(ast.try_block.loc, "There is nothing to try-catch");
        }

        ctx.scope.push();
        ctx.scope.set(ast.catch_id.value, {TYPE: try_may_throw});
        var catch_id = comp(ast.catch_id);
        var catch_block = comp(ast.catch_block, {no_scope_push: true});
        ctx.scope.pop();

        var finally_block = ast.finally_block
            ? comp(ast.finally_block)
            : void 0;


        if(try_block.returns){
            //sanity check
            throw ctx.error(ast.try_block.loc, "try block can't have a known returns, only may_return");
        }
        var may_return = try_block.may_return;

        var catch_may_return = catch_block.returns || catch_block.may_return;
        if(catch_may_return){
            if(may_return){
                //TODO better message about branches needing to match
                ctx.assertT(catch_may_return, may_return);
            }
            may_return = catch_may_return;
        }

        var finally_may_return = finally_block
            ? finally_block.returns || finally_block.may_return
            : void 0;
        if(finally_may_return){
            if(may_return){
                //TODO better message about branches needing to match
                ctx.assertT(finally_may_return, may_return);
            }
            may_return = finally_may_return;
        }


        var may_throwup = catch_block.throwup || catch_block.may_throwup;

        var finally_may_throwup = finally_block
            ? finally_block.throwup || finally_block.may_throwup
            : void 0;
        if(finally_may_throwup){
            if(may_throwup){
                //TODO better message about branches needing to match
                ctx.assertT(finally_may_throwup, may_throwup);
            }
            may_throwup = finally_may_throwup;
        }

        return {
            estree: {
                loc: ast.loc,
                type: "TryStatement",
                block: try_block.estree,
                handler: {
                    loc: ast.catch_block.loc,
                    type: "CatchClause",
                    param: catch_id.estree,
                    body: catch_block.estree
                },
                finalizer: finally_block ? finally_block.estree : void 0,
            },
            //cannot say for sure the try_block will either throw or return
            may_return: may_return,
            //cannot say for sure if catch or finally may throw something else
            may_throwup: may_throwup,
        };
    },
    "Define": function(ast, comp, ctx){
        if(ast.id.type !== "Identifier"){
            throw ctx.error(ast.id.loc, "Only Identifiers can be defined");
        }
        if(ctx.scope.has(ast.id.value)
            && (ctx.scope.height(ast.id.value) === ctx.scope.getItsHeight(ast.id.value))
        ){
            if( ! ctx.scope.get(ast.id.value).annotation){
                throw ctx.error(ast.id.loc, "`" + ast.id.value + "` is already defined");
            }
        }
        var curr_val = ctx.scope.get(ast.id.value);
        var annotated = curr_val && curr_val.TYPE;

        var init = comp(ast.init, {annotatedTYPE: annotated});

        if(annotated){
            //ensure it matches the annotation
            ctx.assertT(_.assign({}, init.TYPE, {
                loc: ast.id.loc,
            }), annotated);
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
        if(ctx.scope.has(ast.id.value)){
            if(ctx.scope.get(ast.id.value).annotation){
                throw ctx.error(ast.id.loc, "`" + ast.id.value + "` is already annotated");
            }else{
                throw ctx.error(ast.id.loc, "Annotation needs to come before the definition");
            }
        }
        ctx.scope.set(ast.id.value, {TYPE: def.TYPE, annotation: true});
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
                loc: ast.loc,
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
            throw ctx.error(ast.loc, "Type not defined `" + ast.value + "`");
        }
        var vTYPE = ctx.scope.get(ast.value).TYPE;
        if(!_.isEmpty(ast.params)){
            if(vTYPE.tag !== "Generic"){
                throw ctx.error(ast.loc, ast.value + " doesn't have type params");
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
            throw ctx.error(ast.loc, "TypeVariable not defined `" + id + "`");
        }
        return {
            TYPE: ctx.tvarScope.get(id),
        };
    },
    "Enum": require("./c/Enum"),
    "EnumValue": function(ast, comp, ctx){
        if(!ast.enum || !ctx.scope.has(ast.enum.value)){
            throw ctx.error(ast.enum.loc, "Enum not defined `" + ast.enum.value + "`");
        }

        var enumT = ctx.scope.get(ast.enum.value).TYPE;
        if(enumT.tag === "Generic"){
            enumT = enumT.ctor(ast.enum.params, ast.enum.loc, comp, ctx);
        }
        if(enumT.tag !== "Enum"){
            throw ctx.error(ast.enum.loc, "`" + ast.enum.value + "` is not an Enum");
        }
        if(!_.has(enumT.variants, ast.tag.value)){
            throw ctx.error(ast.tag.loc, "`" + ast.tag.value + "` is not a variant of " + typeToString(enumT));
        }
        var paramsT = enumT.variants[ast.tag.value];
        if(_.size(paramsT) !== _.size(ast.params)){
            throw ctx.error(ast.tag.loc, "Expected " + _.size(paramsT) + " params not " + _.size(ast.params) + " for " + ast.enum.value + "." + ast.tag.value);
        }
        var params = _.map(ast.params, function(p_ast, i){
            var pT = paramsT[i];
            var param = comp(p_ast);
            ctx.assertT(param.TYPE, pT);
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

        sysId: (function(){
            var i = 0;
            return function(v){
                i += 1;
                return "$sys$" + toId(v + i);
            };
        }()),

        error: function(loc, message){
            var err = new Error(message);
            err.ecmaless = {
                loc: loc,
            };
            return err;
        },
        assertT: function(actual, expected){
            assertT(ctx, actual, expected);
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
        var out = comp_ast_node[ast.type](ast, compile, ctx, from_caller);
        if(out && out.returns && out.may_return){
            throw ctx.error(ast.loc, "Cannot both return and may_return");
        }
        if(out && out.throwup && out.may_throwup){
            throw ctx.error(ast.loc, "Cannot both throwup and may_throwup");
        }
        return out;
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
        if(!c){
            return;
        }
        if(c.returns || c.may_return){
            throw ctx.error(c.estree.loc, "You cannot return outside a function body. Did you mean `export`?");
        }
        if(c.throwup || c.may_throwup){
            throw ctx.error((c.throwup || c.may_throwup).loc, "Unhandled exception");
        }
        if(c.estree){
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
