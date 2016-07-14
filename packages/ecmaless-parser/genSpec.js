var _ = require("lodash");
var rmLoc = require("./rmLoc");
var parser = require("./");
var stringify = require("json-stringify-pretty-compact");

var examples = {
  "### Literals": [
    "100.25",
    "\"Hi!\"",
    "foo",
  ]
};

_.each(examples, function(srcs, head){
  console.log();
  console.log(head);
  if(_.isEmpty(srcs)){
    return;
  }
  console.log();
  console.log("```js\n" + _.map(srcs, function(src){
    var ast = rmLoc(parser(src));
    ast = _.isArray(ast) && _.size(ast) === 1 ? _.head(ast) : ast;
    if(ast.type === "ExpressionStatement"){
      ast = ast.expression;
    }
    return src + "\n" + stringify(ast, {maxLength: 80, indent: 4});
  }).join("\n\n") + "\n```");
});
