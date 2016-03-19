var _ = require("lodash");
var parser = require("./");
require("./src-to-tokens.test");

var astWoLocAndSrc = function(ast){
  if(_.isArray(ast)){
    return _.map(ast, astWoLocAndSrc);
  }
  return {
    type: ast.type,
    value: ast.type === 'list' ? astWoLocAndSrc(ast.value) : ast.value
  };
};

//console.log(parser("[\"one\"2<three :four>]"));
console.log(JSON.stringify(astWoLocAndSrc(parser("(\"one\"2)")), undefined, 2));
