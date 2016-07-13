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
var tok_QUESTION = tok("?");
var tok_DOTDOTDOT = tok("...");
var tok_EQ = tok("=");
var tok_OPEN_PN = tok("(");
var tok_CLOSE_PN = tok(")");
var tok_OPEN_SQ = tok("[");
var tok_CLOSE_SQ = tok("]");
var tok_OPEN_CU = tok("{");
var tok_CLOSE_CU = tok("}");

var tok_def = tok("SYMBOL", "def");
var tok_fn = tok("SYMBOL", "fn");
var tok_while = tok("SYMBOL", "while");


var tok_OR = tok("||");
var tok_AND = tok("&&");
var tok_EQEQ = tok("==");
var tok_NOTEQ = tok("!=");
var tok_PLUS = tok("+");
var tok_MINUS = tok("-");
var tok_TIMES = tok("*");
var tok_DIVIDE = tok("/");
var tok_MODULO = tok("%");

var mkType = function(d, type, value){
  return {
    loc: d[0].loc,
    type: type,
    value: value
  };
};

var mkMemberExpression = function(loc, method, object, path){
  return {
    loc: loc,
    type: "MemberExpression",
    object: object,
    path: path,
    method: method
  };
};

var mkLoc = function(d, start_i, end_i){
  return {start: d[start_i].loc.start, end: d[end_i].loc.end};
};

var infixOp = function(d){
  return {
    loc: mkLoc(d, 0, 2),
    type: "InfixOperator",
    op: d[1].src,
    left: d[0],
    right: d[2]
  };
};

%}

main -> Statement {% id %}

################################################################################
# Statement
Statement ->
      Define {% id %}
    | ExpressionStatement {% id %}
    | While {% id %}

ExpressionStatement -> Expression {% function(d){
  return {
    loc: d[0].loc,
    type: "ExpressionStatement",
    expression: d[0]
  };
} %}

Define -> %tok_def Identifier (%tok_EQ Expression):? {% function(d){
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

While -> %tok_while Expression Block {% function(d){
  return {
    loc: mkLoc(d, 0, 2),
    type: "While",
    test: d[1],
    body: d[2].body
  };
} %}

Block -> %tok_COLON %tok_INDENT Statement:* %tok_DEDENT {%
  function(d){
    return {
      loc: mkLoc(d, 0, 3),
      type: "Block",
      body: d[2]
    };
  }
%}

################################################################################
# Expression
Expression -> ConditionalExpression {% id %}

ConditionalExpression -> exp_or {% id %}
    | exp_or %tok_QUESTION exp_or %tok_COLON exp_or {%
  function(d){
    return {
      loc: mkLoc(d, 0, 4),
      type: "ConditionalExpression",
      test: d[0],
      consequent: d[2],
      alternate: d[4]
    };
  }
%}

exp_or -> exp_and {% id %}
    | exp_or %tok_OR exp_and {% infixOp %}

exp_and -> exp_comp {% id %}
    | exp_and %tok_AND exp_comp {% infixOp %}

exp_comp -> exp_sum {% id %}
    | exp_comp %tok_EQEQ exp_sum {% infixOp %}
    | exp_comp %tok_NOTEQ exp_sum {% infixOp %}

exp_sum -> exp_product {% id %}
    | exp_sum %tok_PLUS exp_product {% infixOp %}
    | exp_sum %tok_MINUS exp_product {% infixOp %}

exp_product -> MemberExpression {% id %}
    | exp_product %tok_TIMES MemberExpression {% infixOp %}
    | exp_product %tok_DIVIDE MemberExpression {% infixOp %}
    | exp_product %tok_MODULO MemberExpression {% infixOp %}

MemberExpression -> PrimaryExpression {% id %}
    | MemberExpression %tok_DOT Identifier
      {% function(d){
          return mkMemberExpression(mkLoc(d, 0, 2), "dot", d[0], d[2]);
      } %}
    | MemberExpression %tok_OPEN_SQ Expression %tok_CLOSE_SQ
      {% function(d){
          return mkMemberExpression(mkLoc(d, 0, 3), "index", d[0], d[2]);
      } %}

PrimaryExpression ->
      Number {% id %}
    | String {% id %}
    | Identifier {% id %}
    | Function {% id %}
    | Application {% id %}
    | Array {% id %}
    | Struct {% id %}
    | %tok_OPEN_PN Expression %tok_CLOSE_PN {% idN(1) %}

Application -> MemberExpression %tok_OPEN_PN Expression_list %tok_CLOSE_PN {% function(d){
  return {
    loc: mkLoc(d, 0, 3),
    type: "Application",
    callee: d[0],
    args: d[2]
  };
} %}

Struct -> %tok_OPEN_CU KeyValPairs %tok_CLOSE_CU {% function(d){
  return {
    loc: mkLoc(d, 0, 2),
    type: "Struct",
    value: d[1]
  };
} %}

KeyValPairs -> null {% noopArr %}
    | KeyValPairs_body %tok_COMMA:? {% id %}
KeyValPairs_body ->
      KeyValPair {% id %}
    | KeyValPairs_body %tok_COMMA KeyValPair {% concatArr %}

KeyValPair -> (String|Number|Symbol) %tok_COLON Expression {% function(d){
  return [d[0][0], d[2]];
} %}

Array -> %tok_OPEN_SQ Expression_list %tok_CLOSE_SQ {% function(d){
  return {
    loc: mkLoc(d, 0, 2),
    type: "Array",
    value: d[1]
  };
} %}

Expression_list -> null {% noopArr %}
    | Expression_list_body %tok_COMMA:? {% id %}
Expression_list_body ->
      Expression {% idArr %}
    | Expression_list_body %tok_COMMA Expression {% concatArr %}

Function -> %tok_fn Params Block {% function(d){
  return {
    loc: mkLoc(d, 0, 2),
    type: "Function",
    params: d[1],
    body: d[2].body
  };
} %}

Params -> Identifier {% id %}
    | %tok_OPEN_SQ %tok_CLOSE_SQ {% noopArr %}
    | %tok_OPEN_SQ Params_body %tok_COMMA:? %tok_CLOSE_SQ {% idN(1) %}

Params_body ->
      Param {% idArr %}
    | Params_body %tok_COMMA Param {% concatArr %}

Param -> Identifier %tok_DOTDOTDOT:? {%
  function(d){
    if(!d[1]){
      return d[0];
    }
    return {
      loc: mkLoc(d, 0, 1),
      type: "DotDotDot",
      value: d[0]
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

Identifier -> %tok_SYMBOL {% function(d){
  return mkType(d, "Identifier", d[0].src);
} %}

Symbol -> %tok_SYMBOL {% function(d){
  return mkType(d, "Symbol", d[0].src);
} %}
