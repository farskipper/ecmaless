@{%
var tok = function(type, value){
  return {test: function(x){
    if(!x || x.type !== type){
      return false;
    }
    if(value){
      return x.src === value;
    }
    return true;
  }};
};
var tok_NUMBER = tok("NUMBER");
var tok_STRING = tok("STRING");
var tok_SYMBOL = tok("SYMBOL");
var tok_INDENT = tok("INDENT");
var tok_DEDENT = tok("DEDENT");
var tok_COLON = tok(":");
var tok_EQ = tok("=");
var tok_def = tok("SYMBOL", "def");
var tok_fn = tok("SYMBOL", "fn");

var mkType = function(d, type, value){
  return {
    loc: d[0].loc,
    type: type,
    value: value
  };
};
%}

main -> Statement {% id %}

Statement ->
      Define {% id %}
    | Expression {% id %}

Define -> %tok_def Symbol (%tok_EQ Expression):? {% function(d){
  var loc = d[0].loc;
  if(d[2]){
    loc = {start: d[0].loc.start, end: d[2][1].loc.end};
  }
  return {
    loc: loc,
    type: "Define",
    id: d[1],
    init: d[2] ? d[2][1] : void 0
  };
} %}

Expression ->
      Number {% id %}
    | String {% id %}
    | Symbol {% id %}
    | Function {% id %}

Function -> %tok_fn Params Blok {% function(d){
  return {
    loc: {start: d[0].loc.start, end: d[2].loc.end},
    type: "Function",
    params: d[1],
    body: d[2].body
  };
} %}

Params -> Symbol {% id %}

Blok -> %tok_COLON %tok_INDENT Statement:* %tok_DEDENT {%
  function(d){
    return {
      loc: {start: d[0].loc.start, end: d[3].loc.end},
      type: "Block",
      body: d[2]
    };
  }
%}

Number -> %tok_NUMBER {% function(d){
  return mkType(d, "Number", parseFloat(d[0].src) || 0);
} %}

String -> %tok_STRING {% function(d){
  return mkType(d, "String", JSON.parse(d[0].src));
} %}

Symbol -> %tok_SYMBOL {% function(d){
  return mkType(d, "Symbol", d[0].src);
} %}
