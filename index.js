var _ = require("lodash");
var lang = require("./lang");
var parser = require("./parser");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");

module.exports = function(src, options){
  options = options || {};


  var ast = parser(src);
  ast = {
    loc: ast.loc,
    type: "list",
    value: [
      {
        loc: ast.loc,
        type: "symbol",
        value: "js/program"
      }
    ].concat(ast)
  };

  var estree = astToTarget(ast, lang.target_macros);

  return escodegen.generate(estree, options.escodegen);
};
