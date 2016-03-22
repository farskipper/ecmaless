var _ = require("lodash");

module.exports = function(ast, target_macros){

  var callMacro = function(name, ast){
    if(!target_macros[name]){
      throw new Error("No target macro defined for: " + name);
    }
    return target_macros[name](ast, astToTarget);
  };

  var astToTarget = function(ast){
    if(_.isArray(ast)){
      return _.map(ast, astToTarget);
    }else if(ast.type === "list"){
      var list_op = ast.value[0];
      if(!list_op){
        throw new Error("An AST list should never be empty");
      }
      var macro = list_op.type === "symbol"
        ? target_macros[list_op.value]
        : undefined;
      if(!macro){
        list_op = _.assign({}, ast, {
          type: "symbol",
          value: "$$ecmaless$$fn-call"
        });
        ast.value.unshift(list_op);
      }
      return callMacro(list_op.value, ast);
    }
    return callMacro("$$ecmaless$$make-type-" + ast.type, ast);
  };

  return astToTarget(ast);
};
