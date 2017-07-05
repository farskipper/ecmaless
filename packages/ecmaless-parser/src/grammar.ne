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
var concatArr = function(i, no_wrap){
  if(no_wrap){
    return function(d){
      return d[0].concat(d[i]);
    };
  }
  return function(d){
    return d[0].concat([d[i]]);
  };
};
var idN = function(n){
  return function(d){
    return d[n];
  };
};

var mkLoc = function(d){
  var loc = {};
  var elms = flatten(d);
  var i = 0;
  while(i < elms.length){
    if(elms[i] && elms[i].loc){
      if(!loc.start){
        loc.start = elms[i].loc.start;
        loc.source = elms[i].loc.source;
      }
      loc.end = elms[i].loc.end;
    }
    i++;
  }
  return loc;
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
var tok_DOCSTRING = tok("DOCSTRING");
var tok_SYMBOL = tok("SYMBOL");
var tok_TYPE = tok("TYPE");
var tok_INDENT = tok("INDENT");
var tok_DEDENT = tok("DEDENT");
var tok_NL = tok("NEWLINE");
var tok_COLON = tok("RAW", ":");
var tok_COMMA = tok("RAW", ",");
var tok_DOT = tok("RAW", ".");
var tok_QUESTION = tok("RAW", "?");
var tok_DOTDOTDOT = tok("RAW", "...");
var tok_EQ = tok("RAW", "=");
var tok_OPEN_PN = tok("RAW", "(");
var tok_CLOSE_PN = tok("RAW", ")");
var tok_OPEN_SQ = tok("RAW", "[");
var tok_CLOSE_SQ = tok("RAW", "]");
var tok_OPEN_CU = tok("RAW", "{");
var tok_CLOSE_CU = tok("RAW", "}");

var tok_import = tok("SYMBOL", "import");
var tok_export = tok("SYMBOL", "export");

var tok_def = tok("SYMBOL", "def");

var tok_fn = tok("SYMBOL", "fn");
var tok_return = tok("SYMBOL", "return");

var tok_if = tok("SYMBOL", "if");
var tok_else = tok("SYMBOL", "else");

var tok_cond = tok("SYMBOL", "cond");
var tok_case = tok("SYMBOL", "case");

var tok_try = tok("SYMBOL", "try");
var tok_catch = tok("SYMBOL", "catch");
var tok_finally = tok("SYMBOL", "finally");

var tok_while = tok("SYMBOL", "while");
var tok_break = tok("SYMBOL", "break");
var tok_continue = tok("SYMBOL", "continue");

var tok_nil = tok("SYMBOL", "nil");
var tok_true = tok("SYMBOL", "true");
var tok_false = tok("SYMBOL", "false");

var tok_or = tok("SYMBOL", "or");
var tok_and = tok("SYMBOL", "and");
var tok_not = tok("SYMBOL", "not");

var tok_ann = tok("SYMBOL", "ann");
var tok_Fn = tok("TYPE", "Fn");

var isReserved = function(src){
  return reserved[src] === true;
};

var tok_EQEQ = tok("RAW", "==");
var tok_NOTEQ = tok("RAW", "!=");
var tok_LT = tok("RAW", "<");
var tok_LTEQ = tok("RAW", "<=");
var tok_GT = tok("RAW", ">");
var tok_GTEQ = tok("RAW", ">=");
var tok_PLUS = tok("RAW", "+");
var tok_MINUS = tok("RAW", "-");
var tok_TIMES = tok("RAW", "*");
var tok_DIVIDE = tok("RAW", "/");
var tok_MODULO = tok("RAW", "%");

var mkType = function(d, type, value){
  return {
    loc: mkLoc(d),
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


var tryCatchMaker = function(i_id, i_catch, i_finally){
  return function(d){
    return {
      loc: mkLoc(d),
      type: "TryCatch",
      try_block: d[1],
      catch_id: i_id > 0 ? d[i_id] : null,
      catch_block: i_catch > 0 ? d[i_catch] : null,
      finally_block: i_finally > 0 ? d[i_finally] : null
    };
  };
};

%}

main ->
    NL:?
    (%tok_import %tok_COLON NL INDENT Import:+ DEDENT NL):?
    Statement_list:?
    (%tok_export Expression NL):?
{% function(d){
    return {
        loc: mkLoc(d),
        type: "Module",
        "import": (d[1] && d[1][4]) || [],
        body: d[2] || [],
        "export": d[3] && d[3][1],
    };
} %}

Import -> Identifier String NL {% function(d){
  return {
    loc: mkLoc(d),
    type: "Import",
    id: d[0],
    path: d[1]
  };
} %}


################################################################################
# Statement

Statement_list -> Statement NL {% idArr %}
    | Statement_list Statement NL {% concatArr(1) %}

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
    | Annotation {% id %}

ExpressionStatement -> Expression {% function(d){
  return {
    loc: mkLoc(d),
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
  return {
    loc: mkLoc(d),
    type: "Define",
    id: d[1],
    init: d[2] ? d[2][1] : void 0
  };
} %}

If -> %tok_if Expression Block (NL %tok_else (If | Block)):? {% function(d){
  var else_block = d[3] && d[3][2] && d[3][2][0];
  if(else_block && else_block.type === "Block"){
    else_block = else_block;
  }
  return {
    loc: mkLoc(d),
    type: "If",
    test: d[1],
    then: d[2],
    "else": else_block
  };
} %}

While -> %tok_while Expression Block {% function(d){
  return {
    loc: mkLoc(d),
    type: "While",
    test: d[1],
    block: d[2]
  };
} %}

Break -> %tok_break
    {% function(d){return {loc: d[0].loc, type: "Break"};} %}

Continue -> %tok_continue
    {% function(d){return {loc: d[0].loc, type: "Continue"};} %}

Cond -> %tok_cond %tok_COLON NL INDENT CondBlock:* (ElseBlock NL):? DEDENT {% function(d){
  return {
    loc: mkLoc(d),
    type: "Cond",
    blocks: d[4],
    "else": d[5] && d[5][0],
  };
} %}

CondBlock -> Expression Block NL {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "CondBlock",
      test: d[0],
      block: d[1]
    };
  }
%}

Case -> %tok_case Expression %tok_COLON NL INDENT CaseBlock:* (ElseBlock NL):? DEDENT {% function(d){
  return {
    loc: mkLoc(d),
    type: "Case",
    to_test: d[1],
    blocks: d[5],
    "else": d[6] && d[6][0],
  };
} %}

CaseBlock -> Expression Block NL {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "CaseBlock",
      value: d[0],
      block: d[1]
    };
  }
%}

TryCatch ->
      %tok_try Block NL %tok_catch Identifier Block {% tryCatchMaker(4, 5, -1) %}
    | %tok_try Block NL %tok_finally Block {% tryCatchMaker(-1, -1, 4) %}
    | %tok_try Block NL %tok_catch Identifier Block NL %tok_finally Block
      {% tryCatchMaker(4, 5, 8) %}

ElseBlock -> %tok_else Block {% idN(1) %}

Block -> %tok_COLON NL INDENT Statement_list DEDENT {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "Block",
      body: d[3]
    };
  }
%}

################################################################################
# Types 

Annotation -> %tok_ann Identifier %tok_EQ TypeExpression {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "Annotation",
      id: d[1], 
      def: d[3], 
    };
  }
%}


TypeExpression ->
      Type {% id %}
    | ArrayType {% id %}
    | StructType {% id %}
    | FunctionType {% id %}


Type -> %tok_TYPE {%
  function(d){
    return {
      loc: mkLoc(d),
      type: "Type",
      value: d[0].src,
    };
  }
%}


ArrayType -> %tok_OPEN_SQ ArrayType_body:? %tok_CLOSE_SQ {% function(d){
  return {
    loc: mkLoc(d),
    type: "ArrayType",
    value: d[1] || [],
  };
} %}


ArrayType_body ->
      ArrayType_elm {% idArr %}
    | ArrayType_body COMMA ArrayType_elm {% concatArr(2) %}


ArrayType_elm -> TypeExpression %tok_DOTDOTDOT:? {%
    function(d){
        if(!d[1]){
            return d[0];
        }
        return {
            loc: mkLoc(d),
            type: "DotDotDot",
            value: d[0],
        };
    }
%}


StructType -> %tok_OPEN_CU KeyValPairsType %tok_CLOSE_CU {% function(d){
  return {
    loc: mkLoc(d),
    type: "StructType",
    pairs: d[1],
  };
} %}


KeyValPairsType -> null {% noopArr %}
    | KeyValPairsType_body {% id %}
    | NL INDENT KeyValPairsType_body_nl DEDENT NL {% idN(2) %}


KeyValPairsType_body ->
      KeyValPairType {% idArr %}
    | KeyValPairsType_body COMMA KeyValPairType {% concatArr(2) %}


KeyValPairsType_body_nl ->
      KeyValPairType COMMA NL {% idArr %}
    | KeyValPairsType_body_nl KeyValPairType COMMA NL {% concatArr(1) %}


KeyValPairType -> (String|Number|Symbol|AnyKey) %tok_COLON TypeExpression {% function(d){
    return [d[0][0], d[2]];
} %}


AnyKey -> %tok_TIMES {% function(d){
    return {
        loc: mkLoc(d),
        type: "AnyKey",
    };
} %}


FunctionType -> %tok_Fn ArrayType %tok_COLON TypeExpression {% function(d){
  return {
    loc: mkLoc(d),
    type: "FunctionType",
    params: d[1],
    "return": d[3]
  };
} %}

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
    | exp_or %tok_or exp_and {% infixOp %}

exp_and -> exp_comp {% id %}
    | exp_and %tok_and exp_comp {% infixOp %}

exp_comp -> exp_sum {% id %}
    | exp_comp %tok_EQEQ exp_sum {% infixOp %}
    | exp_comp %tok_NOTEQ exp_sum {% infixOp %}
    | exp_comp %tok_LT exp_sum {% infixOp %}
    | exp_comp %tok_LTEQ exp_sum {% infixOp %}
    | exp_comp %tok_GT exp_sum {% infixOp %}
    | exp_comp %tok_GTEQ exp_sum {% infixOp %}

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
    | %tok_not UnaryOperator {% unaryOp %}

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
    | Docstring {% id %}
    | Identifier {% id %}
    | Nil {% id %}
    | Boolean {% id %}
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
    | KeyValPairs_body {% id %}
    | NL INDENT KeyValPairs_body_nl DEDENT NL {% idN(2) %}

KeyValPairs_body ->
      KeyValPair {% id %}
    | KeyValPairs_body COMMA KeyValPair {% concatArr(2, true) %}

KeyValPairs_body_nl ->
      KeyValPair COMMA NL {% id %}
    | KeyValPairs_body_nl KeyValPair COMMA NL {% concatArr(1, true) %}

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
    | Expression_list_body {% id %}
    | NL INDENT Expression_list_body_nl DEDENT NL {% idN(2) %}

Expression_list_body ->
      Expression {% idArr %}
    | Expression_list_body COMMA Expression {% concatArr(2) %}

Expression_list_body_nl ->
      Expression NL:? COMMA NL {% idArr %}
    | Expression_list_body_nl Expression NL:? COMMA NL {% concatArr(1) %}


Function -> %tok_fn Params Block {% function(d){
  return {
    loc: mkLoc(d),
    type: "Function",
    params: d[1],
    block: d[2]
  };
} %}

Params -> Identifier {% id %}
    | %tok_OPEN_SQ %tok_CLOSE_SQ {% noopArr %}
    | %tok_OPEN_SQ Params_body COMMA:? %tok_CLOSE_SQ {% idN(1) %}

Params_body ->
      Param {% idArr %}
    | Params_body COMMA Param {% concatArr(2) %}

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

Docstring -> %tok_DOCSTRING {% function(d){
  var value = d[0].src.replace(/(^""")|("""$)/g, "").replace(/\\"/g, "\"");
  return mkType(d, "Docstring", value);
} %}

Identifier -> %tok_SYMBOL {% function(d, start, reject){
  var src = d[0].src;
  if(isReserved(src)){
    return reject;
  }
  return mkType(d, "Identifier", src);
} %}

Nil -> %tok_nil {% function(d){
  return {loc: d[0].loc, type: "Nil"};
} %}

Boolean -> (%tok_true | %tok_false) {% function(d){
  var t = d[0][0];
  return {loc: t.loc, type: "Boolean", value: t.src === "true"};
} %}

Symbol -> %tok_SYMBOL {% function(d){
  return mkType(d, "Symbol", d[0].src);
} %}

INDENT -> %tok_INDENT {% id %}
DEDENT -> %tok_DEDENT {% id %}

COMMA -> %tok_COMMA {% id %}

NL -> %tok_NL {% id %}
