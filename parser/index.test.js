var _ = require("lodash");
var test = require("tape");
var parser = require("./");

var printAst = function(ast){
  if(_.isArray(ast)){
    return _.map(ast, printAst).join(" ");
  }else if(ast.type === 'list'){
    return "(" + printAst(ast.value) + ")";
  }else if(ast.type === 'number'){
    return ast.value;
  }else if(ast.type === 'string'){
    return JSON.stringify(ast.value);
  }else if(ast.type === 'symbol'){
    return ast.value;
  }
  throw new Error("Unknown ast_node type: " + ast.type);
};

var testParse = function(t, src, expected, msg){
  t.equals(printAst(parser(src)), expected, msg || "didn't parse as expected");
};

test("parser", function(t){
  var tp = _.partial(testParse, t);
  tp(" 1\n2", "1 2");
  tp(" (+ 1 2\n(  /\n1 4)) ", "(+ 1 2 (/ 1 4))");
  tp("#asdf 2", "(asdf 2)");
  tp("` (1 2)", "(` (1 2))");
  tp("~sym", "(~ sym)");
  //tp("<1 2 3>", "(<> 1 2 3)");
  t.end();
});
