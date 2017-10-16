var _ = require("lodash");
var e = require("estree-builder");

module.exports = function(ast, comp, ctx){
    var estree = [];
    var modules = {};

    _.each(ast.modules, function(m, i){

        var path = m.path.value;

        var module_id = "$" + i;
        modules[module_id] = path;

        var module = ctx.requireModule(path);

        _.each(m.names, function(n){
            var type = n.name.type;
            var key = n.name.value;
            var id = key;
            if(n.as && n.as.type === "Identifier"){
                id = n.as.value;
            }

            if(module && module.commonjs){
                if(!n.is){
                    throw ctx.error(n.loc, "Need to use `is <type>` when importing js");
                }
                if(n.is.type !== "FunctionType"){
                    throw ctx.error(n.loc, "import `is <type>` currently only works on functions");
                }
                if(n.is["return"].type !== "Type" || n.is["return"].value !== "Nil"){
                    throw ctx.error(n.loc, "import `is <type>` currently only works on functions that return Nil");
                }
                if(!_.has(module.commonjs, ["value", key])){
                    throw ctx.error(n.loc, module.commonjs.path + " does not export `" + key);
                }
                if(!_.isFunction(module.commonjs.value[key])){
                    throw ctx.error(n.loc, module.commonjs.path + " export `" + key + " is not a function");
                }

                ctx.scope.set(id, comp(n.is));

                estree.push(e("var",
                    id,
                    e("get",
                        e("id", module_id, n.loc),
                        e("str", key, n.loc),
                        n.loc),
                    n.loc));
                return;
            }

            var TYPE = _.get(module, ["TYPE", "by_key", key]);
            if( ! TYPE){
                throw ctx.error(n.loc, "unable to import " + key);
            }

            if(type === "Identifier"){
                ctx.scope.set(id, {TYPE: TYPE});

                estree.push(e("var",
                    id,
                    e("get",
                        e("id", module_id, n.loc),
                        e("str", key, n.loc),
                        n.loc),
                    n.loc));
            }else if(type === "Type"){
                ctx.scope.set(id, {TYPE: TYPE});
            }else{
                throw ctx.error(n.loc, "only Identifier and Type can be imported");
            }
        });
    });
    return {
        estree: estree,
        modules: modules,
        //TYPE: TYPE,
    };
};
