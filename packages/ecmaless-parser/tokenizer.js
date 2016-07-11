var EStreeLoc = require("estree-loc");
var tokenizer2 = require("tokenizer2/core");

module.exports = function(src){
  var toLoc = EStreeLoc(src);
  var tokens = [];
  var index = 0;
  var t = tokenizer2(function(tok){
    var prev = tokens[tokens.length - 1];
    if(prev && prev.type === tok.type){
      prev.src += tok.src;
      prev.loc.source = prev.src;
      prev.loc.end = toLoc(index, index + tok.src.length).end;
    }else{
      tokens.push({
        type: tok.type,
        src: tok.src,
        loc: toLoc(index, index + tok.src.length)
      });
    }
    index += tok.src.length;
  });

  t.addRule(/^ +$/, "Space");
  t.addRule(/^\n$/, "NewLine");
  t.addRule(/^;[^\n]*$/, "Comment");
  t.addRule(/(^""$)|(^"([^"]|\\")*[^\\]"$)/, "String");
  t.addRule(/^[0-9]+\.[0-9]+$/, "Number");
  t.addRule(/^\.[0-9]+$/, "Number");
  t.addRule(/^[0-9]+$/, "Number");
  t.addRule(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Symbol");

  t.onText(src);
  t.end();

  return tokens;
};
