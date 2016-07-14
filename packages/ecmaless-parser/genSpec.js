var _ = require("lodash");
var rmLoc = require("./rmLoc");
var parser = require("./");
var stringify = require("json-stringify-pretty-compact");

console.log("# AST Specification");
console.log("All AST nodes will have a `loc` property. It's identical to the [estree loc](https://github.com/estree/estree/blob/master/spec.md#node-objects). These examples omit `loc` for brevity.");
_.each({
  "### Literals": [
    "100.25",
    "\"Hi!\"",
    "foo",
    "nil",
    "true",
    "false",
  ]
}, function(srcs, head){
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
