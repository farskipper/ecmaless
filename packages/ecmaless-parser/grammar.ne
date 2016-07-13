@{%
var noop = function(){};
var noopArr = function(){return [];};
var idArr = function(d){return [d[0]];};
var concatArr = function(d){
  return d[0].concat([d[2]]);
};
var idN = function(n){
  return function(d){
    return d[n];
  };
};

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
var tok_COMMA = tok(",");
var tok_DOT = tok(".");
var tok_DOTDOTDOT = tok("...");
var tok_EQ = tok("=");
var tok_OPEN_SQ = tok("[");
var tok_CLOSE_SQ = tok("]");
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
    | Array {% id %}

Array -> %tok_OPEN_SQ Expression_list %tok_CLOSE_SQ {% function(d){
  return {
    loc: {start: d[0].loc.start, end: d[2].loc.end},
    type: "Array",
    value: d[1]
  };
} %}

Expression_list -> null {% noopArr %}
    | Expression_list_body %tok_COMMA:? {% id %}
Expression_list_body ->
      Expression {% idArr %}
    | Expression_list_body %tok_COMMA Expression {% concatArr %}

Function -> %tok_fn Params Blok {% function(d){
  return {
    loc: {start: d[0].loc.start, end: d[2].loc.end},
    type: "Function",
    params: d[1],
    body: d[2].body
  };
} %}

Params -> Symbol {% id %}
    | %tok_OPEN_SQ %tok_CLOSE_SQ {% noopArr %}
    | %tok_OPEN_SQ Params_body %tok_COMMA:? %tok_CLOSE_SQ {% idN(1) %}

Params_body ->
      Param {% idArr %}
    | Params_body %tok_COMMA Param {% concatArr %}

Param -> Symbol %tok_DOTDOTDOT:? {%
  function(d){
    if(!d[1]){
      return d[0];
    }
    return {
      loc: {start: d[0].loc.start, end: d[1].loc.end},
      type: "DotDotDot",
      value: d[0]
    };
  }
%}

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
  var value = d[0].src.replace(/(^")|("$)/g, "").replace(/\\"/g, "\"");
  return mkType(d, "String", value);
} %}

Symbol -> %tok_SYMBOL {% function(d){
  return mkType(d, "Symbol", d[0].src);
} %}
