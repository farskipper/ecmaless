var _ = require("lodash");


var compVariants = function(ast, comp, ctx, just_check){
    var variants = {};
    _.each(ast.variants, function(variant){
        var tag = variant.tag.value;
        if(_.has(variants, tag)){
            throw ctx.error(variant.tag.loc, "Duplicate enum variant `" + tag + "`");
        }
        variants[tag] = just_check
            ? true
            : _.map(variant.params, function(param){
                return comp(param).TYPE;
            });
    });
    return variants;
};


module.exports = function(ast, comp, ctx){

    var EnumType = {
        tag: "Enum",
        id: ast.id.value,
        args: {},
        variants: {},
        loc: ast.loc,
    };

    var params = _.map(ast.id.params, function(param){
        if(param.type !== "TypeVariable"){
            throw ctx.error(param.loc, "Enum params must be TypeVariable");
        }
        return param.value;
    });


    var TYPE;
    if(_.isEmpty(ast.id.params)){
        EnumType.variants = compVariants(ast, comp, ctx);
        TYPE = EnumType;
    }else{
        compVariants(ast, comp, ctx, true);//just check for duplicate variants
        TYPE = {
            tag: "Generic",
            params: params,
            ctor: function(types, called_loc, comp, ctx){
                var TYPE = _.cloneDeep(EnumType);
                if(_.size(types) !== _.size(params)){
                    throw ctx.error(called_loc, "Trying to give " + _.size(types) + " type params for " + ast.id.value + "<" + params.join(", ") + ">");
                }
                ctx.tvarScope.push();
                _.each(params, function(param_str, i){
                    var t = comp(types[i]).TYPE;
                    TYPE.args[param_str] = t;
                    ctx.tvarScope.set(param_str, t);
                });
                TYPE.variants = compVariants(ast, comp, ctx);
                ctx.tvarScope.pop();
                return TYPE;
            },
            loc: ast.loc,
        };
    }

    ctx.scope.set(EnumType.id, {TYPE: TYPE});

    return {
        TYPE: TYPE,
    };
};
