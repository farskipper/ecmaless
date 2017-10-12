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
            var TYPE = _.get(module, ["TYPE", "by_key", key]);
            if( ! TYPE){
                throw new Error("unable to import " + key);
            }
            var id = key;
            if(n.as && n.as.type === "Identifier"){
                id = n.as.value;
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
                throw new Error("only Identifier and Type can be imported");
            }
        });
    });
    return {
        estree: estree,
        modules: modules,
        //TYPE: TYPE,
    };
};
