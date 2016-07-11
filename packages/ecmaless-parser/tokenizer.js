var EStreeLoc = require("estree-loc");
var tokenizer2 = require("tokenizer2/core");

module.exports = function(src){
  var toLoc = EStreeLoc(src);
  var tokens = [];
  var index = 0;
  var t = tokenizer2(function(tok){
    tokens.push({
      type: tok.type,
      src: tok.src,
      loc: toLoc(index, index + tok.src.length)
    });
    index += tok.src.length;
  });

  t.addRule(/^ +$/, "Space");
  t.addRule(/^\n+$/, "NewLine");
  t.addRule(/^;[^\n]*$/, "Comment");
  t.addRule(/(^""$)|(^"([^"]|\\")*[^\\]"$)/, "String");
  t.addRule(/^([0-9]+)|([0-9]+\.[0-9]+)|(\.[0-9]+)$/, "Number");

  t.onText(src);
  t.end();

  return tokens;
};
