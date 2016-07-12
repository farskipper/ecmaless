@{%
var tok = function(type){
  return {test: function(x){
    return x && (x.type === type);
  }};
};
var tok_NUMBER = tok("NUMBER");
var tok_STRING = tok("STRING");
var tok_SYMBOL = tok("SYMBOL");

var mkType = function(d, type, value){
  return {
    loc: d[0].loc,
    type: type,
    value: value
  };
};
%}

main -> Expression {% id %}

Expression ->
      Number {% id %}
    | String {% id %}
    | Symbol {% id %}

Number -> %tok_NUMBER {% function(d){
  return mkType(d, 'Number', parseFloat(d[0].src) || 0);
} %}

String -> %tok_STRING {% function(d){
  return mkType(d, 'String', JSON.parse(d[0].src));
} %}

Symbol -> %tok_SYMBOL {% function(d){
  return mkType(d, 'Symbol', d[0].src);
} %}
