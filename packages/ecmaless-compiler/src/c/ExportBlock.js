var _ = require("lodash");
var e = require("estree-builder");

var typeToJSON = function(TYPE){
    if(!_.isString(TYPE && TYPE.tag)){
        throw new Error("typeToJSON missing tag: " + JSON.stringify(TYPE));
    }
    switch(TYPE.tag){
    case "Number":
    case "String":
    case "Boolean":
    case "Nil":
        return {tag: TYPE.tag};
    case "Struct":
        return {
            tag: "Struct",
            by_key: _.mapValues(TYPE.by_key, function(v){
                return typeToJSON(v);
            }),
        };
    case "Fn":
        return {
            tag: "Fn",
            params: _.map(TYPE.params, function(v){
                return typeToJSON(v);
            }),
            "return": typeToJSON(TYPE["return"]),
        };
    default:
        throw new Error("Cannot typeToJSON " + TYPE.tag);
    }
};

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
            var type_json = typeToJSON(comp(name).TYPE);
            TYPE.by_key[name.value] = type_json;
            est_pairs.push(e(
                "object-property",
                e("string", name.value, name.loc),
                e("json", type_json, name.loc),
                name.loc
            ));
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
