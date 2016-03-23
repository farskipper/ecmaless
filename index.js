var _ = require("lodash");
var parser = require("./parser");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");

module.exports = function(src, options){
  options = options || {};

  var lang = "js";

  var re_lang = /^#lang ([^\n]+)\n/.exec(src);
  if(re_lang && re_lang[1]){
    lang = re_lang[1].trim();
    src = src.replace(/^#lang[^\n]+\n/, "");
  }

  var target_macros = require("./lang/" + lang);
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

  var estree = astToTarget(ast, target_macros);
  return escodegen.generate(estree, options.escodegen);
};
