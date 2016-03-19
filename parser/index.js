var srcToTokens = require("./src-to-tokens");
var tokensToAst = require("./tokens-to-ast");

module.exports = function(src){
  var ast = [];

  srcToTokens(src, tokensToAst(function(ast_node){
    ast.push(ast_node);
  }));

  return ast;
};
