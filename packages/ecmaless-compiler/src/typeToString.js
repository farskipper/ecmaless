var _ = require("lodash");

var typeToString = function(type){
    if(type.tag === "Enum"){
        return type.id + "<" + _.map(type.args, typeToString).join(", ") + ">";
    }
    return type.tag;
};

module.exports = typeToString;
