var _ = require("lodash");
var test = require("tape");
var srcToTokens = require("./src-to-tokens");

var toToks = function(src){
  var toks = [];
  srcToTokens(src, function(token){
    toks.push([token.type, token.src]);
  });
  return toks;
};

test("tokenize numbers", function(t){
  var assertNumbers = function(src, numbers){
    var toks = toToks(src);
    toks = _.reject(toks, function(tok){
      return tok[0] === "whitespace";
    });
    t.ok(_.every(toks, function(tok){
      return tok[0] === "number";
    }));
    t.deepEquals(_.map(toks, 1), numbers);
  };

  assertNumbers("123.4 1", ["123.4", "1"]);
  assertNumbers("-1.23e4", ["-1.23e4"]);
  t.end();
});
