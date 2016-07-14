var _ = require("lodash");
var e = require("estree-builder");

var comp_by_type = {
  "Number": function(ast, comp){
    return e("number", ast.value, ast.loc);
  },
  "ExpressionStatement": function(ast, comp){
    return e(";", comp(ast.expression), ast.loc);
  }
};

module.exports = function(ast){

  var compile = function compile(ast){
    if(_.isArray(ast)){
      return _.map(ast, function(a){
        return compile(a);
      });
    }else if(!_.has(ast, "type")){
      throw new Error("Invalid ast node: " + JSON.stringify(ast));
    }else if(!_.has(comp_by_type, ast.type)){
      throw new Error("Unsupported ast node type: " + ast.type);
    }
    return comp_by_type[ast.type](ast, compile);
  };

  return {
    estree: compile(ast)
  };
};
