var _ = require("lodash");
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");
var escodegen = require("escodegen");

var toJSFile = function(estree, opts){
  opts = opts || {};

  if(!_.isArray(estree)){
    estree = [estree];
  }
  return escodegen.generate({
    "loc": _.size(estree) > 0 ? _.head(estree).loc : undefined,
    "type": "Program",
    "body": estree
  }, opts.escodegen);
};

module.exports = function(src, opts){
  opts = opts || {};

  var ast = parser(src);
  var est = compiler(ast).estree;

  return toJSFile(est, opts);
};
