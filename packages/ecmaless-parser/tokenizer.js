var EStreeLoc = require("estree-loc");
var tokenizer2 = require("tokenizer2/core");

module.exports = function(src){
  var toLoc = EStreeLoc(src);
  var tokens = [];
  var index = 0;

  var pushTok = function(type, src){
    tokens.push({
      type: type,
      src: src,
      loc: toLoc(index, index + src.length)
    });
  };

  var t = tokenizer2(function(tok){
    if(tok.type === "SPACE"){
    }else{
      pushTok(tok.type, tok.src);
    }
    index += tok.src.length;
  });

  t.addRule(/^[ \n]+$/, "SPACE");
  t.addRule(/^;[^\n]*$/, "COMMENT");
  t.addRule(/(^""$)|(^"([^"]|\\")*[^\\]"$)/, "STRING");
  t.addRule(/^[0-9]+\.?[.0-9]*$/, "NUMBER");
  t.addRule(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "SYMBOL");

  t.onText(src);
  t.end();

  return tokens;
};
