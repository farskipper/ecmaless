var _ = require("lodash");
var symbolToJSIdentifier = require("./symbolToJSIdentifier");

var estree_macros = {};
var defMacro = function(name, fn){
  estree_macros[name] = fn;
};

var mkJSLiteral = function(ast, value, raw){
  return {
    loc: ast.loc,
    type: "Literal",
    value: value,
    raw: raw
  };
};

var assertAstListLength = function(ast, len){
  if(_.size(ast.value) !== len){
    throw new Error("Wrong num args "+len+" != "+_.size(ast.value)+": todo helpful message with line numbers etc...");
  }
};
var assertAstType = function(ast, type){
  if(ast.type !== type){
    throw new Error("Expected "+type+" but got "+ast.type+": todo helpful message with line numbers etc...");
  }
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
  "js/this": function(ast){
    return {
      "loc": ast.loc,
      "type": "ThisExpression"
    };
  },
  "js/arguments": function(ast){
    return {
      "loc": ast.loc,
      "type": "Identifier",
      "name": "arguments"
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

////////////////////////////////////////////////////////////////////////////////
//primitive $$ecmaless$$ macros
defMacro("$$ecmaless$$fn-call", function(ast, astToTarget){
  //TODO look for user defined macros here?
  return {
    loc: ast.loc,
    type: "CallExpression",
    callee: astToTarget(ast.value[1]),
    "arguments": _.map(ast.value.slice(2), astToTarget)
  };
});
defMacro("$$ecmaless$$make-type-symbol", function(ast, astToTarget){
  if(_.has(literal_symbols, ast.value)){
    return literal_symbols[ast.value](ast);
  }
  var symbol = ast.value;
  return {
    loc: ast.loc,
    type: "Identifier",
    name: symbolToJSIdentifier(symbol)
  };
});
defMacro("$$ecmaless$$make-type-number", function(ast, astToTarget){
  return mkJSLiteral(ast, parseFloat(ast.value), ast.src);
});
defMacro("$$ecmaless$$make-type-string", function(ast, astToTarget){
  return mkJSLiteral(ast, ast.value, ast.src);
});

////////////////////////////////////////////////////////////////////////////////
//js macros
defMacro("js/program", function(ast, astToTarget){
  return {
    "loc": ast.loc,
    "type": "Program",
    "body": _.map(astToTarget(ast.value.slice(1)), toStatement)
  };
});

var mkJS1ArgOperator = function(ast, astToTarget, operator){
  return {
    loc: ast.value[0].loc,
    type: "UnaryExpression",
    prefix: true,
    operator: operator,
    argument: astToTarget(ast.value[1])
  };
};

var mkJS2ArgOperator = function(ast, astToTarget, type, operator){
  return {
    loc: ast.value[0].loc,
    type: type,
    operator: operator,
    left: astToTarget(ast.value[1]),
    right: astToTarget(ast.value[2])
  };
};

var defJSOperator = function(type, operator){
  var name = "js/" + operator;
  name = name.replace(/</g, "lt");
  name = name.replace(/>/g, "gt");
  defMacro(name, function(ast, astToTarget){
    assertAstListLength(ast, 3);
    return mkJS2ArgOperator(ast, astToTarget, type, operator);
  });
};
_.each([
  "==", "!=", "===", "!==",
  "<", "<=", ">", ">=",
  "<<", ">>", ">>>",
  "*", "/", "%",
  "|", "^", "&", "in",
  "instanceof"
], function(operator){
  defJSOperator("BinaryExpression", operator);
});
_.each(["&&", "||"], function(operator){
  defJSOperator("LogicalExpression", operator);
});

_.each(["!", "~", "typeof", "void", "delete"], function(operator){
  defMacro("js/" + operator, function(ast, astToTarget){
    assertAstListLength(ast, 2);
    return mkJS1ArgOperator(ast, astToTarget, operator);
  });
});

_.each(["+", "-"], function(operator){
  defMacro("js/" + operator, function(ast, astToTarget){
    if(_.size(ast.value) === 2){
      return mkJS1ArgOperator(ast, astToTarget, operator);
    }else if(_.size(ast.value) === 3){
      return mkJS2ArgOperator(ast, astToTarget, "BinaryExpression", operator);
    }else{
      throw new Error("Wrong num args "+_.size(ast.value)+" expected 2 or 3: todo helpful message with line numbers etc...");
    }
  });
});

defMacro("js/=", function(ast, astToTarget){
  assertAstListLength(ast, 3);
  return {
    type: "AssignmentExpression",
    operator: "=",
    left: astToTarget(ast.value[1]),
    right: astToTarget(ast.value[2])
  };
});

defMacro("js/var", function(ast, astToTarget){
  var args = ast.value.slice(1);
  if((_.size(args) % 2) !== 0){
    throw new Error("js/var expects an even number of pairs");//TODO be more helpful
  }
  return {
    loc: ast.value[0].loc,
    type: "VariableDeclaration",
    kind: "var",
    declarations: _.map(_.chunk(args, 2), function(pair){
      assertAstType(pair[0], "symbol");
      return {
        loc: pair[0].loc,
        type: "VariableDeclarator",
        id: astToTarget(pair[0]),
        init: astToTarget(pair[1])
      };
    })
  };
});

defMacro("js/property-access", function(ast, astToTarget){
  assertAstListLength(ast, 3);
  return {
    type: "MemberExpression",
    computed: true,
    object: astToTarget(ast.value[1]),
    property: astToTarget(ast.value[2])
  };
});

defMacro("js/return", function(ast, astToTarget){
  return {
    loc: ast.value[0].loc,
    type: "ReturnStatement",
    argument: astToTarget(ast.value[1])
  };
});

defMacro("js/block-statement", function(ast, astToTarget){
  return {
    loc: ast.value[0].loc,
    type: "BlockStatement",
    body: _.map(astToTarget(ast.value.slice(1)), toStatement)
  };
});

defMacro("js/function", function(ast, astToTarget){
  assertAstListLength(ast, 4);
  assertAstType(ast.value[1], "symbol");
  assertAstType(ast.value[2], "list");
  _.each(ast.value[2].value, function(arg){
    assertAstType(arg, "symbol");
  });

  return {
    loc: ast.value[0].loc,
    type: "FunctionExpression",
    id: astToTarget(ast.value[1]),
    rest: null,
    generator: false,
    expression: false,
    defaults: [],
    params: _.map(ast.value[2].value, astToTarget),
    body: toStatement(astToTarget(ast.value[3]))
  };
});

defMacro("js/while", function(ast, astToTarget){
  assertAstListLength(ast, 3);
  return {
    "loc": ast.value[0].loc,
    "type": "WhileStatement",
    "test": astToTarget(ast.value[1]),
    "body": toStatement(astToTarget(ast.value[2]))
  };
});

defMacro("js/ternary", function(ast, astToTarget){
  assertAstListLength(ast, 4);
  return {
    loc: ast.value[0].loc,
    type: "ConditionalExpression",
    test: astToTarget(ast.value[1]),
    consequent: astToTarget(ast.value[2]),
    alternate: astToTarget(ast.value[3])
  };
});

defMacro("js/if", function(ast, astToTarget){
  assertAstListLength(ast, 4);
  return {
    loc: ast.value[0].loc,
    type: "IfStatement",
    test: astToTarget(ast.value[1]),
    consequent: toStatement(astToTarget(ast.value[2])),
    alternate: toStatement(astToTarget(ast.value[3]))
  };
});

defMacro("js/try-catch", function(ast, astToTarget){
  assertAstListLength(ast, 4);
  assertAstType(ast.value[2], "symbol");
  return {
    "loc": ast.value[0].loc,
    "type": "TryStatement",
    "block": toStatement(astToTarget(ast.value[1])),
    "guardedHandlers": [],
    "handlers": [{
      "loc": ast.value[2].loc,
      "type": "CatchClause",
      "param": astToTarget(ast.value[2]),
      "body": toStatement(astToTarget(ast.value[3]))
    }],
    "finalizer": null
  };
});

module.exports = estree_macros;