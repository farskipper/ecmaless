var EStreeLoc = require("estree-loc");
var tokenizer2 = require("tokenizer2/core");

module.exports = function(src){
  var toLoc = EStreeLoc(src);
  var tokens = [];
  var indent_stack = [0];
  var index = 0;

  var pushTok = function(type, src){
    tokens.push({
      type: type,
      src: src,
      loc: toLoc(index, index + src.length)
    });
  };

  var t = tokenizer2(function(tok){
    var prev = tokens[tokens.length - 1];
    var prev_type = prev && prev.type;
    if(tok.type === "COMMENT"){
      //ignore comments
    }else if(tok.type === "NEWLINE"){
      if(prev_type === "SPACE"){
        //TODO better error
        throw new Error("Dangling whitespace: " + JSON.stringify(tok));
      }
      if(prev_type !== "NEWLINE"){
        pushTok(tok.type, tok.src);
      }
    }else if(tok.type === "SPACE"){
      if(prev_type === "NEWLINE"){
        var ind = (tok.src.length % 4) === 0
          ? tok.src.length / 4
          : -1;
        if(ind < 0){
          //TODO better error
          throw new Error("Invalid indent: " + JSON.stringify(tok));
        }
        while(ind > indent_stack[0]){
          indent_stack.unshift(indent_stack[0] + 1);
          pushTok("INDENT", tok.src);
        }
        while(ind < indent_stack[0]){
          pushTok("DEDENT", tok.src);
          indent_stack.shift();
        }
      }
    }else if(tok.type === "RAW"){
      pushTok(tok.src, tok.src);
    }else{
      pushTok(tok.type, tok.src);
    }
    index += tok.src.length;
  });

  t.addRule(/^\n$/, "NEWLINE");
  t.addRule(/^ +$/, "SPACE");
  t.addRule(/^;[^\n]*$/, "COMMENT");
  t.addRule(/(^""$)|(^"([^"]|\\")*[^\\]"$)/, "STRING");
  t.addRule(/^[0-9]+\.?[.0-9]*$/, "NUMBER");
  t.addRule(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "SYMBOL");
  t.addRule(/^[:+\-*\/%,?({\[\]})]$/, "RAW");
  t.addRule(/^\.\.?\.?$/, "RAW");
  t.addRule(/^\|\|?$/, "RAW");
  t.addRule(/^&&?$/, "RAW");
  t.addRule(/^==?$/, "RAW");
  t.addRule(/^!=?$/, "RAW");
  t.addRule(/^<=?$/, "RAW");
  t.addRule(/^>=?$/, "RAW");

  t.onText(src);
  t.end();

  while(0 < indent_stack[0]){
    pushTok("DEDENT", "");
    indent_stack.shift();
  }
  return tokens;
};
