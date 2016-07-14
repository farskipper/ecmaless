@{%
var flatten = function(toFlatten){
  var isArray = Object.prototype.toString.call(toFlatten) === '[object Array]';

  if (isArray && toFlatten.length > 0) {
    var head = toFlatten[0];
    var tail = toFlatten.slice(1);

    return flatten(head).concat(flatten(tail));
  } else {
    return [].concat(toFlatten);
  }
};

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

var reserved = {};

var tok = function(type, value){
  if((type === "SYMBOL") && typeof value === "string"){
    reserved[value] = true;
  }
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
var tok_if = tok("SYMBOL", "if");
var tok_else = tok("SYMBOL", "else");
var tok_cond = tok("SYMBOL", "cond");
var tok_case = tok("SYMBOL", "case");
var tok_while = tok("SYMBOL", "while");
var tok_break = tok("SYMBOL", "break");
var tok_continue = tok("SYMBOL", "continue");
var tok_try = tok("SYMBOL", "try");
var tok_catch = tok("SYMBOL", "catch");
var tok_return = tok("SYMBOL", "return");

var isReserved = function(src){
  return reserved[src] === true;
};

var tok_OR = tok("||");
var tok_AND = tok("&&");
var tok_EQEQ = tok("==");
var tok_NOTEQ = tok("!=");
var tok_PLUS = tok("+");
var tok_MINUS = tok("-");
var tok_TIMES = tok("*");
var tok_DIVIDE = tok("/");
var tok_MODULO = tok("%");
var tok_BANG = tok("!");

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

var mkLoc = function(d){
  var loc = {};
  var elms = flatten(d);
  var i = 0;
  while(i < elms.length){
    if(elms[i] && elms[i].loc){
      if(!loc.start){
        loc.start = elms[i].loc;
      }
      loc.end = elms[i].loc;
    }
    i++;
  }
  return loc;
};

var unaryOp = function(d){
  return {
    loc: mkLoc(d),
    type: "UnaryOperator",
    op: d[0].src,
    arg: d[1]
  };
};

var infixOp = function(d){
  return {
    loc: mkLoc(d),
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
    | Return {% id %}
    | If {% id %}
    | While {% id %}
    | Break {% id %}
    | Continue {% id %}
    | Cond {% id %}
    | Case {% id %}
    | TryCatch {% id %}

ExpressionStatement -> Expression {% function(d){
  return {
    loc: d[0].loc,
    type: "ExpressionStatement",
    expression: d[0]
  };
} %}

Return -> %tok_return Expression:? {% function(d){
  return {
    loc: mkLoc(d),
    type: "Return",
    expression: d[1]
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

If -> %tok_if Expression Block (%tok_else (If | Block)):? {% function(d){
  var else_block = d[3] && d[3][1] && d[3][1][0];
  if(else_block && else_block.type === "Block"){
    else_block = else_block.body;
  }
  return {
    loc: mkLoc(d),
    type: "If",
    test: d[1],
    then: d[2].body,
    "else": else_block
  };
} %}

While -> %tok_while Expression Block {% function(d){
  return {
    loc: mkLoc(d),
    type: "While",
    test: d[1],
    body: d[2].body
  };
} %}

Break -> %tok_break
    {% function(d){return {loc: d[0].loc, type: "Break"};} %}
Continue -> %tok_continue
    {% function(d){return {loc: d[0].loc, type: "Continue"};} %}

Cond -> %tok_cond %tok_COLON %tok_INDENT CondBlocks ElseBlock:? %tok_DEDENT {% function(d){
  return {
    loc: mkLoc(d),
    type: "Cond",
    blocks: d[3],
    "else": d[4]
  };
} %}

CondBlocks -> CondBlock {% idArr %}
    | CondBlocks CondBlock {% function(d){return d[0].concat(d[1])} %}

CondBlock -> Expression Block {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "CondBlock",
      test: d[0],
      body: d[1].body
    };
  }
%}

Case -> %tok_case Expression %tok_COLON %tok_INDENT CaseBlocks ElseBlock:? %tok_DEDENT {% function(d){
  return {
    loc: mkLoc(d),
    type: "Case",
    to_test: d[1],
    blocks: d[4],
    "else": d[5]
  };
} %}

CaseBlocks -> CaseBlock {% idArr %}
    | CaseBlocks CaseBlock {% function(d){return d[0].concat(d[1])} %}

CaseBlock -> Expression Block {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "CaseBlock",
      value: d[0],
      body: d[1].body
    };
  }
%}

TryCatch -> %tok_try Block %tok_catch Identifier Block {% function(d){
  return {
    loc: mkLoc(d),
    type: "TryCatch",
    try_block: d[1].body,
    catch_id: d[3],
    catch_block: d[4].body
  };
} %}

ElseBlock -> %tok_else Block {% function(d){return d[1].body;} %}

Block -> %tok_COLON %tok_INDENT Statement:* %tok_DEDENT {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "Block",
      body: d[2]
    };
  }
%}

################################################################################
# Expression
Expression -> AssignmentExpression {% id %}

AssignmentExpression -> ConditionalExpression {% id %}
    | MemberExpression %tok_EQ AssignmentExpression {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "AssignmentExpression",
      op: d[1].src,
      left: d[0],
      right: d[2]
    };
  }
%}

ConditionalExpression -> exp_or {% id %}
    | exp_or %tok_QUESTION exp_or %tok_COLON exp_or {%
  function(d){
    return {
      loc: mkLoc(d),
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

exp_product -> UnaryOperator {% id %}
    | exp_product %tok_TIMES UnaryOperator {% infixOp %}
    | exp_product %tok_DIVIDE UnaryOperator {% infixOp %}
    | exp_product %tok_MODULO UnaryOperator {% infixOp %}

UnaryOperator -> MemberExpression {% id %}
    | %tok_PLUS UnaryOperator {% unaryOp %}
    | %tok_MINUS UnaryOperator {% unaryOp %}
    | %tok_BANG UnaryOperator {% unaryOp %}

MemberExpression -> PrimaryExpression {% id %}
    | MemberExpression %tok_DOT Identifier
      {% function(d){
          return mkMemberExpression(mkLoc(d), "dot", d[0], d[2]);
      } %}
    | MemberExpression %tok_OPEN_SQ Expression %tok_CLOSE_SQ
      {% function(d){
          return mkMemberExpression(mkLoc(d), "index", d[0], d[2]);
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
    loc: mkLoc(d),
    type: "Application",
    callee: d[0],
    args: d[2]
  };
} %}

Struct -> %tok_OPEN_CU KeyValPairs %tok_CLOSE_CU {% function(d){
  return {
    loc: mkLoc(d),
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
    loc: mkLoc(d),
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
    loc: mkLoc(d),
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
      loc: mkLoc(d),
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

Identifier -> %tok_SYMBOL {% function(d, start, reject){
  var src = d[0].src;
  if(isReserved(src)){
    return reject;
  }
  return mkType(d, "Identifier", src);
} %}

Symbol -> %tok_SYMBOL {% function(d){
  return mkType(d, "Symbol", d[0].src);
} %}
