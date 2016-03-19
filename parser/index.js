var srcToTokens = require("./src-to-tokens");
var tokensToAst = require("./tokens-to-ast");

module.exports = function(src){
  var ast = [];

  var tta = tokensToAst(function(ast_node){
    ast.push(ast_node);
  });

  srcToTokens(src, tta.pushToken);

  tta.end();

  return ast;
};
