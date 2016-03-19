var _ = require("lodash");
var test = require("tape");
var compiler = require("./");

test("basics", function(t){
  t.equals(compiler("(add 1 2)"), "add(1, 2);");
  t.end();
});
