var _ = require("lodash");
var test = require("tape");
var parser = require("./");

var astWoLocAndSrc = function(ast){
  if(_.isArray(ast)){
    return _.map(ast, astWoLocAndSrc);
  }
  return {
    type: ast.type,
    value: ast.type === 'list' ? astWoLocAndSrc(ast.value) : ast.value
  };
};

test("parse numbers", function(t){
  console.log(parser("(1 2)"));
  t.end();
//console.log(parser("[\"one\"2<three :four>]"));
//console.log(JSON.stringify(astWoLocAndSrc(parser("(\"one\"2)")), undefined, 2));
});
