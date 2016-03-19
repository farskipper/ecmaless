var test = require("tape");
var srcToTokens = require("./src-to-tokens");

test("TODO", function(t){
  srcToTokens("TODO", function(token){
    console.log("token", token);
  });
  t.end();
});
