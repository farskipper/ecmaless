var _ = require("lodash");

module.exports = function(ast, target_macros){

  var callMacro = function(name, ast){
    if(!_.has(target_macros, name)){
      throw new Error("No target macro defined for: " + name);
    }
    return target_macros[name](ast, astToTarget);
  };

  var astToTarget = function(ast){
    if(_.isArray(ast)){
      return _.compact(_.map(ast, astToTarget));
    }else if(ast.type !== "list"){
      return callMacro("$$ecmaless$$make-type-" + ast.type, ast);
    }
    var list_op = ast.value[0];
    if(!list_op){
      throw new Error("An AST list should never be empty");
    }
    if((list_op.type !== "symbol") || !_.has(target_macros, list_op.value)){
      list_op = _.assign({}, ast, {
        type: "symbol",
        value: "$$ecmaless$$apply"
      });
      ast.value.unshift(list_op);
    }
    return callMacro(list_op.value, ast);
  };

  return astToTarget(ast);
};
