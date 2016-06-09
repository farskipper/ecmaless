var _ = require("lodash");
var e = require("estree-builder");
var parser = require("../../parser");
var symbolToJSIdentifier = require("../../symbolToJSIdentifier");

var target_macros = {};
var defTmacro = function(name, fn){
  target_macros[name] = fn;
};

var mkAST = function(ast, type, value){
  return _.assign({}, ast, {type: type, value: value});
};

var toStatement = function(estree){
  if(/(Statement|Declaration)$/.test(estree.type)){
    return estree;
  }
  return {
    loc: estree.loc,
    type: "ExpressionStatement",
    expression: estree
  };
};

var literal_symbols = {
  "nil": function(ast){
    return e("void", e.number(0, ast.loc), ast.loc);
  }
};

////////////////////////////////////////////////////////////////////////////////
//primitive $$ecmaless$$ macros
defTmacro("$$ecmaless$$apply", function(ast, astToTarget){
  //TODO look for user defined macros here?
  return e("call", astToTarget(ast.value[1]), _.map(ast.value.slice(2), astToTarget), ast.loc);
});

defTmacro("$$ecmaless$$make-type-symbol", function(ast, astToTarget){
  var symbol = ast.value;
  if(_.has(literal_symbols, symbol)){
    return literal_symbols[symbol](ast);
  }
  return e.id(symbolToJSIdentifier(symbol), ast.loc)
});
defTmacro("$$ecmaless$$make-type-number", function(ast, astToTarget){
  return e("number", parseFloat(ast.value), ast.loc);
});
defTmacro("$$ecmaless$$make-type-string", function(ast, astToTarget){
  return e("string", ast.value, ast.loc);
});

////////////////////////////////////////////////////////////////////////////////
//js macros
defTmacro("js/program", function(ast, astToTarget){
  return {
    "loc": ast.loc,
    "type": "Program",
    "body": _.map(astToTarget(ast.value.slice(1)), toStatement)
  };
});

defTmacro("[", function(ast, astToTarget){
  return e("array", astToTarget(ast.value.slice(1)), ast.loc);
});

defTmacro("{", function(ast, astToTarget){
  return {
    "loc": ast.value[0].loc,
    "type": "ObjectExpression",
    "properties": _.map(_.chunk(ast.value.slice(1), 2), function(pair){
      var key = pair[0];
      if(key && key.type === "string"){
        //TODO funciton call to build obj dynamically
      }
      var val = pair[1];
      return {
        "type": "Property",
        "key": astToTarget(key),
        "value": val ? astToTarget(val) : e.nil(val.loc),
        "kind": "init"
      };
    })
  };
});

module.exports = {
  parse: function(src){
    var ast = parser(src);
    ast = mkAST(ast, "list", [mkAST(ast, "symbol", "js/program")].concat(ast));
    return ast;
  },
  target_macros: target_macros
};
