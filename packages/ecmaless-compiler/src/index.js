var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var assertT = require("./assertT");
var ImportBlock = require("./c/ImportBlock");
var ExportBlock = require("./c/ExportBlock");
var typeToString = require("./typeToString");
var SymbolTableStack = require("symbol-table/stack");

var Tracker = function(ctx, opts){
    opts = opts || {};
    var n = opts.only_maybe ? 1 : 0;
    var n_with_returns = 0;
    var may_return;

    return {
        add: function(c, add_opts){
            n += 1;
            if(!c){
                return;
            }
            if(add_opts && add_opts.not_a_return_branch){
                n_with_returns += 1;
                if(c.returns || c.may_return){
                    //sanity check
                    throw ctx.error(c.loc, "Can't return here");
                }
            }else{
                if(c.returns){
                    n_with_returns += 1;
                }
                var block_may_return = c.returns || c.may_return;
                if(block_may_return){
                    if(may_return){
                        //TODO better message about branches need to match
                        ctx.assertT(block_may_return, may_return);
                    }
                    may_return = block_may_return;
                }
            }
            if(add_opts && add_opts.no_throw){
                return;
            }
        },
        build: function(out){
            if(n === n_with_returns){
                out.returns = may_return;
            }else{
                out.may_return = may_return;
            }
            return out;
        },
    };
};


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
    "Docstring": function(ast, comp){
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
        var tracker = Tracker(ctx);
        var est_vals = [];
        _.each(ast.value, function(v_ast, i){
            var v = comp(v_ast);
            if(TYPE.type){
                //TODO better error message i.e. array elements all must have same type
                ctx.assertT(v.TYPE, TYPE.type);
            }else{
                TYPE.type = v.TYPE;
            }
            tracker.add(v);
            est_vals.push(v.estree);
        });
        return tracker.build({
            estree: e("array", est_vals, ast.loc),
            TYPE: TYPE,
        });
    },
    "Struct": function(ast, comp, ctx){
        var TYPE = {
            tag: "Struct",
            by_key: {},
            loc: ast.loc,
        };
        var tracker = Tracker(ctx);
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
            tracker.add(val);

            est_pairs.push(e("object-property", key_est, val.estree, {start: pair[0].loc.start, end: pair[1].loc.end}));
        });
        return tracker.build({
            estree: e("object-raw", est_pairs, ast.loc),
            TYPE: TYPE,
        });
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

        var tracker = Tracker(ctx);

        var callee = comp(ast.callee);
        var args = _.map(ast.args, function(arg){
            var c = comp(arg);
            tracker.add(c);
            return c;
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

        return tracker.build({
            estree: e("call", callee.estree, _.map(args, "estree"), ast.loc),
            TYPE: callee.TYPE["return"],
        });
    },
    "UnaryOperator": function(ast, comp, ctx){
        var arg = comp(ast.arg);

        var out = (function(){
            switch(ast.op){
            case "-":
                ctx.assertT(arg.TYPE, {
                    tag: "Number",
                    loc: ast.arg.loc,
                });
                return {
                    estree: e("-", arg.estree, ast.loc),
                    TYPE: {
                        tag: "Number",
                        loc: ast.loc,
                    },
                };
            case "+":
                ctx.assertT(arg.TYPE, {
                    tag: "Number",
                    loc: ast.arg.loc,
                });
                return arg;
            case "not":
                ctx.assertT(arg.TYPE, {
                    tag: "Boolean",
                    loc: ast.arg.loc,
                });
                return {
                    estree: e("!", arg.estree, ast.loc),
                    TYPE: {
                        tag: "Boolean",
                        loc: ast.loc,
                    },
                };
            }
            throw new Error("Unsupported unary operator: " + ast.op);
        }());

        var tracker = Tracker(ctx);
        tracker.add(arg);
        return tracker.build(out);
    },
    "InfixOperator": function(ast, comp, ctx){
        var left = comp(ast.left);
        var right = comp(ast.right);

        var assertLR = function(typeName){
            if(typeName === "Comparable"){
                typeName = left.TYPE.tag;
            }
            ctx.assertT(_.assign({}, left.TYPE, {
                loc: ast.left.loc,
            }), {
                tag: typeName,
                loc: ast.left.loc,
            });
            ctx.assertT(_.assign({}, right.TYPE, {
                loc: ast.right.loc,
            }), {
                tag: typeName,
                loc: ast.right.loc,
            });
        };

        var out = (function(){
            switch(ast.op){
            case "or":
                assertLR("Boolean");
                return {
                    estree: e("||", left.estree, right.estree, ast.loc),
                    TYPE: {
                        tag: "Boolean",
                        loc: ast.loc,
                    },
                };
            case "and":
                assertLR("Boolean");
                return {
                    estree: e("&&", left.estree, right.estree, ast.loc),
                    TYPE: {
                        tag: "Boolean",
                        loc: ast.loc,
                    },
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
                    TYPE: {
                        tag: "Boolean",
                        loc: ast.loc,
                    },
                };
            case "+":
            case "-":
            case "*":
            case "/":
            case "%":
                assertLR("Number");
                return {
                    estree: e(ast.op, left.estree, right.estree, ast.loc),
                    TYPE: {
                        tag: "Number",
                        loc: ast.loc,
                    },
                };
            case "++":
                assertLR("String");
                if(_.isString(left.TYPE.value) && _.isString(right.TYPE.value)){
                    var value = left.TYPE.value + right.TYPE.value;
                    return {
                        estree: e("str", value, ast.loc),
                        TYPE: {
                            tag: "String",
                            value: value,
                            loc: ast.loc,
                        },
                    };
                }
                return {
                    estree: e("+", left.estree, right.estree, ast.loc),
                    TYPE: {
                        tag: "String",
                        loc: ast.loc,
                    },
                };
            }
            throw new Error("Unsupported infix op: " + ast.op);
        }());

        var tracker = Tracker(ctx);
        tracker.add(left);
        tracker.add(right);
        return tracker.build(out);
    },
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

        var tracker = Tracker(ctx);
        tracker.add(test);
        tracker.add(consequent);
        tracker.add(alternate);

        return tracker.build({
            estree: e("?",
                test.estree,
                consequent.estree,
                alternate.estree,
                ast.loc
            ),
            TYPE: TYPE,
        });
    },
    "Block": function(ast, comp, ctx, from_caller){
        var should_push_scope = !(from_caller && from_caller.no_scope_push);
        var should_wrap_in_eblock = !(from_caller && from_caller.wrap_in_eblock);
        if(should_push_scope){
            ctx.scope.push();
        }

        var returns;
        var may_return;
        var body = _.compact(_.map(ast.body, function(ast){
            if(returns){
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
        };
    },
    "ExpressionStatement": function(ast, comp){
        var expr = comp(ast.expression);
        return _.assign({}, expr, {
            estree: e(";", expr.estree, ast.loc),
        });
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

        var tracker = Tracker(ctx);
        tracker.add(test, {not_a_return_branch: true});
        tracker.add(then);
        tracker.add(els_);
        return tracker.build({
            estree: e("if", test.estree, then.estree, els_.estree, ast.loc),
        });
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

        var tracker = Tracker(ctx);
        tracker.add(to_test, {not_a_return_branch: true});

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
            tracker.add(block);
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
        return tracker.build({
            estree: e(";", e("call", e("fn", [detId], [
                e("switch", getDetIdProp("tag", ast.to_test.loc),
                    cases,
                    ast.loc),
            ], ast.loc), [to_test.estree], ast.loc), ast.loc),
        });
    },
    "While": function(ast, comp, ctx){
        var test = comp(ast.test);
        ctx.assertT(test.TYPE, {
            tag: "Boolean",
            loc: ast.test.loc,
        });
        var b = comp(ast.block);

        var tracker = Tracker(ctx, {only_maybe: true});
        tracker.add(test, {not_a_return_branch: true});
        tracker.add(b);
        return tracker.build({
            estree: e("while", test.estree, b.estree, ast.loc),
        });
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
        return {};
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

        var params = _.map(ast.id.params, function(param){
            if(param.type !== "TypeVariable"){
                throw ctx.error(param.loc, "TypeAlias params must be TypeVariable");
            }
            return param.value;
        });

        ctx.scope.set(ast.id.value, {});//to allow recursive alias
        var TYPE;
        if(_.isEmpty(params)){
            TYPE = comp(ast.value).TYPE;
        }else{
            TYPE = {
                tag: "Generic",
                params: params,
                ctor: function(types, called_loc, comp, ctx){
                    if(_.size(types) !== _.size(params)){
                        throw ctx.error(called_loc, "Trying to give " + _.size(types) + " type params for " + ast.id.value + "<" + params.join(", ") + ">");
                    }
                    ctx.tvarScope.push();
                    _.each(params, function(param_str, i){
                        var t = comp(types[i]).TYPE;
                        ctx.tvarScope.set(param_str, t);
                    });
                    var TYPE = comp(ast.value).TYPE;
                    ctx.tvarScope.pop();
                    return TYPE;
                },
                loc: ast.loc,
            };
        }
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
        if(!out){
            throw ctx.error(ast.loc, ast.type + " should at least return {}");
        }
        if(out.returns && out.may_return){
            throw ctx.error(ast.loc, "Cannot both return and may_return");
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
        if(c.returns || c.may_return){
            throw ctx.error(c.estree.loc, "You cannot return outside a function body. Did you mean `export`?");
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
