var _ = require("lodash");
var e = require("estree-builder");

module.exports = function(ast, comp, ctx){
    var TYPE = {
        tag: "Struct",
        by_key: {},
        loc: ast.loc,
    };
    var est_pairs = [];
    _.each(ast.names, function(name){
        name = (name && name.name) || {};
        if(name.type === "Type"){
            TYPE.by_key[name.value] = comp(name).TYPE;
        }else if(name.type === "Identifier"){
            var val = comp(name);
            TYPE.by_key[name.value] = val.TYPE;
            est_pairs.push(e(
                "object-property",
                e("string", name.value, name.loc),
                val.estree,
                name.loc
            ));
        }else{
            throw new Error("only Identifier and Type can be exported");
        }
    });
    return {
        estree: e("return", e("object-raw", est_pairs, ast.loc), ast.loc),
        TYPE: TYPE,
    };
};
