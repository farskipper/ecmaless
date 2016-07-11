var EStreeLoc = require("estree-loc");
var tokenizer2 = require("tokenizer2/core");

var toIndent = function(src){
  var lines = src.split('\n');
  var last = lines[lines.length - 1];
  if((last.length % 4) === 0){
    return last.length / 4;
  }
  return -1;
};

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
      //TODO ignore this when inside a grouping of some kind
      var ind = toIndent(tok.src);
      if(ind > 0){
        pushTok("INDENT", tok.src);
      }
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
  t.addRule(/^:$/, "COLON");

  t.onText(src);
  t.end();

  return tokens;
};
