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
  if(symbol === "nil"){
    return e("void", e.number(0, ast.loc), ast.loc);
  }else if(symbol === "true"){
    return e("true", ast.loc);
  }else if(symbol === "false"){
    return e("false", ast.loc);
  }
  return e.id(symbolToJSIdentifier(symbol), ast.loc)
});
defTmacro("$$ecmaless$$make-type-number", function(ast, astToTarget){
  var f = parseFloat(ast.value);
  if(f < 0){
    return e("-", e("number", Math.abs(f), ast.loc));
  }
  return e("number", f, ast.loc);
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
  var args = ast.value.slice(1);
  var pairs = _.chunk(args, 2);
  var is_dynamic = _.some(pairs, function(pair){
      var key = pair[0];
      return (key && key.type) !== "string";
  });
  if(is_dynamic){
    return e("call", e("id", "struct", ast.loc), _.map(args, astToTarget), ast.loc);
  }
  return {
    "loc": ast.value[0].loc,
    "type": "ObjectExpression",
    "properties": _.map(pairs, function(pair){
      var key = pair[0];
      var val = pair[1];
      return {
        "type": "Property",
        "key": astToTarget(key),
        "value": val ? astToTarget(val) : e.nil(key.loc),
        "kind": "init"
      };
    })
  };
});
defTmacro("<", function(ast, astToTarget){
  var args = ast.value.slice(1);
  return e("call", e("id", "todo_angled_list", ast.loc), _.map(args, astToTarget), ast.loc);
});

defTmacro("def", function(ast, astToTarget){
  var id = symbolToJSIdentifier(ast.value[1].value);
  if(ast.value.length >= 3){
    return e("var", id, astToTarget(ast.value[2]), ast.loc);
  }
  return e("var", id, astToTarget(mkAST(ast, "symbol", "nil")), ast.loc);
});

defTmacro("fn", function(ast, astToTarget){
  var args = _.map(ast.value[1].value.slice(1), "value");
  var stmts = ast.value.slice(2);
  var body = _.map(stmts, function(stmt, i){
    var estree = astToTarget(stmt);
    if(i < (stmts.length - 1)){
      return toStatement(estree);
    }
    return e("return", estree, ast.loc);
  });
  var id = undefined;
  return e("function", args, body, id, ast.loc);
});

module.exports = {
  parse: function(src){
    var ast = parser(src);
    ast = mkAST(ast, "list", [mkAST(ast, "symbol", "js/program")].concat(ast));
    return ast;
  },
  target_macros: target_macros
};
