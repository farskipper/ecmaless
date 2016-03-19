var _ = require("lodash");
var parser = require("./parser");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");
var js_target_macros = require("./js-target-macros");

module.exports = function(src){
  var ast = parser(src);

  ast = _.assign({}, ast, {
    type: "list",
    value: [
      _.assign({}, ast, {
        type: "symbol",
        value: "js/program"
      })
    ].concat(ast)
  });

  return escodegen.generate(astToTarget(ast, js_target_macros));
};
