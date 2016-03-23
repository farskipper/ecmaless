var _ = require("lodash");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");

module.exports = function(src, options){
  options = options || {};

  var lang_name = "index";

  var re_lang = /^#lang ([^\n]+)\n/.exec(src);
  if(re_lang && re_lang[1]){
    lang_name = re_lang[1].trim();
    src = src.replace(/^#lang[^\n]+\n/, "");
  }

  var lang = require("./lang/" + lang_name);

  var ast = lang.parse(src);
  var estree = astToTarget(ast, lang.target_macros);

  return escodegen.generate(estree, options.escodegen);
};
