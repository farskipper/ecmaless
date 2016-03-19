var _ = require("lodash");
var parser = require("./parser");
var escodegen = require("escodegen");
var symbolToJSIdentifier = require("./symbolToJSIdentifier");

var mkJSLiteral = function(ast, value, raw){
  return {
    loc: ast.loc,
    type: "Literal",
    value: value,
    raw: raw
  };
};

var literal_symbols = {
  "js/null": function(ast){
    return mkJSLiteral(ast, null, "null");
  },
  "js/false": function(ast){
    return mkJSLiteral(ast, false, "false");
  },
  "js/true": function(ast){
    return mkJSLiteral(ast, true, "true");
  },
  "js/undefined": function(ast){
    return {
      loc: ast.loc,
      type: "Identifier",
      name: "undefined"
    };
  },
  "nil": function(ast){
    return {
      loc: ast.loc,
      type: "UnaryExpression",
      prefix: true,
      operator: "void",
      argument: {
        loc: ast.loc,
        type: "Literal",
        value: 0,
        raw: "0"
      }
    };
  }
};

module.exports = function(src){
  var ast = parser(src);

  var estree_macros = {};

  estree_macros["js/fn-call"] = function(ast, astToTarget){
    return {
      loc: ast.loc,
      type: "CallExpression",
      callee: astToTarget(ast.value[1]),
      "arguments": _.map(ast.value.slice(2), astToTarget)
    };
  };
  estree_macros["js/make-type-symbol"] = function(ast, astToTarget){
    if(_.has(literal_symbols, ast.value)){
      return literal_symbols[ast.value](ast);
    }
    var symbol = ast.value;
    return {
      loc: ast.loc,
      type: "Identifier",
      name: symbolToJSIdentifier(symbol)
    };
  };
  estree_macros["js/make-type-number"] = function(ast, astToTarget){
    return mkJSLiteral(ast, parseFloat(ast.value), ast.src);
  };

  var callMacro = function(name, ast){
    if(!estree_macros[name]){
      throw new Error("No target macro defined for: " + name);
    }
    return estree_macros[name](ast, astToTarget);
  };

  var astToTarget = function(ast){
    if(_.isArray(ast)){
      return _.map(ast, astToTarget);
    }else if(ast.type === "list"){
      var list_op = ast.value[0];
      if(!list_op || list_op.type !== "symbol"){
        throw new Error("First arg in an AST list should always be a symbol, but was: " + (list_op && list_op.type));
      }
      var macro = estree_macros[list_op.value];
      if(!macro){
        list_op = _.assign({}, ast, {
          type: "symbol",
          value: "js/fn-call"
        });
        ast.value.unshift(list_op);
      }
      return callMacro(list_op.value, ast);
    }
    return callMacro("js/make-type-" + ast.type, ast);
  };


  var body = _.map(astToTarget(ast), function(estree){
    if(_.includes(["VariableDeclaration"], estree.type)){
      return estree;
    }
    return {
      loc: estree.loc,
      type: "ExpressionStatement",
      expression: estree
    };
  });

  return escodegen.generate({
    "loc": body[0].loc,
    "type": "Program",
    "body": body
  });
};
