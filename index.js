var _ = require("lodash");
var parser = require("./parser");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");
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

  estree_macros["js/program"] = function(ast, astToTarget){
    return {
      "loc": ast.loc,
      "type": "Program",
      "body": _.map(astToTarget(ast.value.slice(1)), function(estree){
        if(_.includes(["VariableDeclaration"], estree.type)){
          return estree;
        }
        return {
          loc: ast.loc,
          type: "ExpressionStatement",
          expression: estree
        };
      })
    };
  };

  estree_macros["$$ecmaless$$fn-call"] = function(ast, astToTarget){
    //TODO look for user defined macros here?
    return {
      loc: ast.loc,
      type: "CallExpression",
      callee: astToTarget(ast.value[1]),
      "arguments": _.map(ast.value.slice(2), astToTarget)
    };
  };
  estree_macros["$$ecmaless$$make-type-symbol"] = function(ast, astToTarget){
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
  estree_macros["$$ecmaless$$make-type-number"] = function(ast, astToTarget){
    return mkJSLiteral(ast, parseFloat(ast.value), ast.src);
  };

  return escodegen.generate(astToTarget(_.assign({}, ast, {
    type: "list",
    value: [
      _.assign({}, ast, {
        type: "symbol",
        value: "js/program"
      })
    ].concat(ast)
  }), estree_macros));
};
