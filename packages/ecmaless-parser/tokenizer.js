var EStreeLoc = require("estree-loc");
var tokenizer2 = require("tokenizer2/core");
var escapeRegExp = require("escape-regexp");

var groups = {
  "(": ")",
  "[": "]",
  "{": "}"
};

var toIndent = function(src){
  var lines = src.split("\n");
  if(lines.length < 2){
    return -1;
  }
  var last = lines[lines.length - 1];
  if((last.length % 4) !== 0){
    return -1;
  }
  return last.length / 4;
};

module.exports = function(src){
  var toLoc = EStreeLoc(src);
  var tokens = [];
  var stack = [0];
  var index = 0;

  var pushTok = function(type, src){
    tokens.push({
      type: type,
      src: src,
      loc: toLoc(index, index + src.length)
    });
  };

  var t = tokenizer2(function(tok){
    if(tok.type === "COMMENT"){
      //ignore comments
    }else if(tok.type === "SPACE"){
      if(tok.src.indexOf("\n") >= 0){
        pushTok("NEWLINE", tok.src);
      }
      if(typeof stack[0] === "number"){
        var ind = toIndent(tok.src);
        if(ind >= 0){
          while(ind > stack[0]){
            stack.unshift(stack[0] + 1);
            pushTok("INDENT", tok.src);
          }
          while(ind < stack[0]){
            pushTok("DEDENT", tok.src);
            stack.shift();
          }
        }
      }
    }else if(tok.type === "OPEN"){
      pushTok(tok.src, tok.src);
      stack.unshift(tok.src);
    }else if(tok.type === "CLOSE"){
      pushTok(tok.src, tok.src);
      stack.shift();
    }else if(tok.type === "RAW"){
      pushTok(tok.src, tok.src);
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
  t.addRule(/^[:+\-*\/%,?]$/, "RAW");
  t.addRule(/^\.\.?\.?$/, "RAW");
  t.addRule(/^\|\|?$/, "RAW");
  t.addRule(/^&&?$/, "RAW");
  t.addRule(/^==?$/, "RAW");
  t.addRule(/^!=?$/, "RAW");
  t.addRule(/^<=?$/, "RAW");
  t.addRule(/^>=?$/, "RAW");

  var key;
  for(key in groups){
    if(groups.hasOwnProperty(key)){
      t.addRule(new RegExp("^" + escapeRegExp(key) + "$"), "OPEN"); 
      t.addRule(new RegExp("^" + escapeRegExp(groups[key]) + "$"), "CLOSE"); 
    }
  }

  t.onText(src);
  t.end();

  while(0 < stack[0]){
    pushTok("DEDENT", "");
    stack.shift();
  }
  return tokens;
};
