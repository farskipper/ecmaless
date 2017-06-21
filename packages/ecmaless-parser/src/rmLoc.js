var _ = require("lodash");

module.exports = function rmLoc(ast){
    if(_.isPlainObject(ast)){
        return _.mapValues(_.omit(ast, "loc"), rmLoc);
    }
    if(_.isArray(ast)){
        return _.map(ast, rmLoc);
    }
    return ast;
};
