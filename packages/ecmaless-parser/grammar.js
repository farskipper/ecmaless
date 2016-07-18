// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

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
var tok_NL = tok("NEWLINE");
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
var tok_finally = tok("SYMBOL", "finally");
var tok_return = tok("SYMBOL", "return");
var tok_nil = tok("SYMBOL", "nil");
var tok_true = tok("SYMBOL", "true");
var tok_false = tok("SYMBOL", "false");

var isReserved = function(src){
  return reserved[src] === true;
};

var tok_OR = tok("||");
var tok_AND = tok("&&");
var tok_EQEQ = tok("==");
var tok_NOTEQ = tok("!=");
var tok_LT = tok("<");
var tok_LTEQ = tok("<=");
var tok_GT = tok(">");
var tok_GTEQ = tok(">=");
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


var tryCatchMaker = function(i_id, i_catch, i_finally){
  return function(d){
    return {
      loc: mkLoc(d),
      type: "TryCatch",
      try_block: d[1].body,
      catch_id: i_id > 0 ? d[i_id] : null,
      catch_block: i_catch > 0 ? d[i_catch].body : null,
      finally_block: i_finally > 0 ? d[i_finally].body : null
    };
  };
};

var grammar = {
    ParserRules: [
    {"name": "main", "symbols": ["_NL", "Statement_list", "_NL"], "postprocess": idN(1)},
    {"name": "Statement_list", "symbols": ["Statement"], "postprocess": idArr},
    {"name": "Statement_list", "symbols": ["Statement_list", "NL", "Statement"], "postprocess": concatArr(2)},
    {"name": "Statement", "symbols": ["Define"], "postprocess": id},
    {"name": "Statement", "symbols": ["ExpressionStatement"], "postprocess": id},
    {"name": "Statement", "symbols": ["Return"], "postprocess": id},
    {"name": "Statement", "symbols": ["If"], "postprocess": id},
    {"name": "Statement", "symbols": ["While"], "postprocess": id},
    {"name": "Statement", "symbols": ["Break"], "postprocess": id},
    {"name": "Statement", "symbols": ["Continue"], "postprocess": id},
    {"name": "Statement", "symbols": ["Cond"], "postprocess": id},
    {"name": "Statement", "symbols": ["Case"], "postprocess": id},
    {"name": "Statement", "symbols": ["TryCatch"], "postprocess": id},
    {"name": "ExpressionStatement", "symbols": ["Expression"], "postprocess":  function(d){
          return {
            loc: d[0].loc,
            type: "ExpressionStatement",
            expression: d[0]
          };
        } },
    {"name": "Return$ebnf$1", "symbols": ["Expression"], "postprocess": id},
    {"name": "Return$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Return", "symbols": [tok_return, "Return$ebnf$1"], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Return",
            expression: d[1]
          };
        } },
    {"name": "Define$ebnf$1$subexpression$1", "symbols": [tok_EQ, "Expression"]},
    {"name": "Define$ebnf$1", "symbols": ["Define$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Define$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Define", "symbols": [tok_def, "Identifier", "Define$ebnf$1"], "postprocess":  function(d){
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
        } },
    {"name": "If$ebnf$1$subexpression$1$subexpression$1", "symbols": ["If"]},
    {"name": "If$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Block"]},
    {"name": "If$ebnf$1$subexpression$1", "symbols": [tok_else, "If$ebnf$1$subexpression$1$subexpression$1"]},
    {"name": "If$ebnf$1", "symbols": ["If$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "If$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "If", "symbols": [tok_if, "Expression", "Block", "If$ebnf$1"], "postprocess":  function(d){
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
        } },
    {"name": "While", "symbols": [tok_while, "Expression", "Block"], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "While",
            test: d[1],
            body: d[2].body
          };
        } },
    {"name": "Break", "symbols": [tok_break], "postprocess": function(d){return {loc: d[0].loc, type: "Break"};}},
    {"name": "Continue", "symbols": [tok_continue], "postprocess": function(d){return {loc: d[0].loc, type: "Continue"};}},
    {"name": "Cond$ebnf$1", "symbols": ["ElseBlock"], "postprocess": id},
    {"name": "Cond$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Cond", "symbols": [tok_cond, tok_COLON, "NL", tok_INDENT, "CondBlocks", "Cond$ebnf$1", tok_DEDENT], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Cond",
            blocks: d[4],
            "else": d[5]
          };
        } },
    {"name": "CondBlocks", "symbols": ["CondBlock"], "postprocess": idArr},
    {"name": "CondBlocks", "symbols": ["CondBlocks", "CondBlock"], "postprocess": concatArr(1)},
    {"name": "CondBlock", "symbols": ["Expression", "Block"], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d),
            type: "CondBlock",
            test: d[0],
            body: d[1].body
          };
        }
        },
    {"name": "Case$ebnf$1", "symbols": ["ElseBlock"], "postprocess": id},
    {"name": "Case$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Case", "symbols": [tok_case, "Expression", tok_COLON, "NL", tok_INDENT, "CaseBlocks", "Case$ebnf$1", tok_DEDENT], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Case",
            to_test: d[1],
            blocks: d[5],
            "else": d[6]
          };
        } },
    {"name": "CaseBlocks", "symbols": ["CaseBlock"], "postprocess": idArr},
    {"name": "CaseBlocks", "symbols": ["CaseBlocks", "CaseBlock"], "postprocess": concatArr(1)},
    {"name": "CaseBlock", "symbols": ["Expression", "Block"], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d),
            type: "CaseBlock",
            value: d[0],
            body: d[1].body
          };
        }
        },
    {"name": "TryCatch", "symbols": [tok_try, "Block", tok_catch, "Identifier", "Block"], "postprocess": tryCatchMaker(3, 4, -1)},
    {"name": "TryCatch", "symbols": [tok_try, "Block", tok_finally, "Block"], "postprocess": tryCatchMaker(-1, -1, 3)},
    {"name": "TryCatch", "symbols": [tok_try, "Block", tok_catch, "Identifier", "Block", tok_finally, "Block"], "postprocess": tryCatchMaker(3, 4, 6)},
    {"name": "ElseBlock", "symbols": [tok_else, "Block"], "postprocess": function(d){return d[1].body;}},
    {"name": "Block", "symbols": [tok_COLON, "NL", tok_INDENT, "Statement_list", "_NL", tok_DEDENT], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d),
            type: "Block",
            body: d[3]
          };
        }
        },
    {"name": "Expression", "symbols": ["AssignmentExpression"], "postprocess": id},
    {"name": "AssignmentExpression", "symbols": ["ConditionalExpression"], "postprocess": id},
    {"name": "AssignmentExpression", "symbols": ["MemberExpression", tok_EQ, "AssignmentExpression"], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d),
            type: "AssignmentExpression",
            op: d[1].src,
            left: d[0],
            right: d[2]
          };
        }
        },
    {"name": "ConditionalExpression", "symbols": ["exp_or"], "postprocess": id},
    {"name": "ConditionalExpression", "symbols": ["exp_or", tok_QUESTION, "exp_or", tok_COLON, "exp_or"], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d),
            type: "ConditionalExpression",
            test: d[0],
            consequent: d[2],
            alternate: d[4]
          };
        }
        },
    {"name": "exp_or", "symbols": ["exp_and"], "postprocess": id},
    {"name": "exp_or", "symbols": ["exp_or", tok_OR, "exp_and"], "postprocess": infixOp},
    {"name": "exp_and", "symbols": ["exp_comp"], "postprocess": id},
    {"name": "exp_and", "symbols": ["exp_and", tok_AND, "exp_comp"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_sum"], "postprocess": id},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_EQEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_NOTEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_LT, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_LTEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_GT, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_GTEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_sum", "symbols": ["exp_product"], "postprocess": id},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_PLUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_MINUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["UnaryOperator"], "postprocess": id},
    {"name": "exp_product", "symbols": ["exp_product", tok_TIMES, "UnaryOperator"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["exp_product", tok_DIVIDE, "UnaryOperator"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["exp_product", tok_MODULO, "UnaryOperator"], "postprocess": infixOp},
    {"name": "UnaryOperator", "symbols": ["MemberExpression"], "postprocess": id},
    {"name": "UnaryOperator", "symbols": [tok_PLUS, "UnaryOperator"], "postprocess": unaryOp},
    {"name": "UnaryOperator", "symbols": [tok_MINUS, "UnaryOperator"], "postprocess": unaryOp},
    {"name": "UnaryOperator", "symbols": [tok_BANG, "UnaryOperator"], "postprocess": unaryOp},
    {"name": "MemberExpression", "symbols": ["PrimaryExpression"], "postprocess": id},
    {"name": "MemberExpression", "symbols": ["MemberExpression", tok_DOT, "Identifier"], "postprocess":  function(d){
            return mkMemberExpression(mkLoc(d), "dot", d[0], d[2]);
        } },
    {"name": "MemberExpression", "symbols": ["MemberExpression", tok_OPEN_SQ, "Expression", tok_CLOSE_SQ], "postprocess":  function(d){
            return mkMemberExpression(mkLoc(d), "index", d[0], d[2]);
        } },
    {"name": "PrimaryExpression", "symbols": ["Number"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["String"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Identifier"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Nil"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Boolean"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Function"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Application"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Array"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Struct"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": [tok_OPEN_PN, "Expression", tok_CLOSE_PN], "postprocess": idN(1)},
    {"name": "Application", "symbols": ["MemberExpression", tok_OPEN_PN, "Expression_list", tok_CLOSE_PN], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Application",
            callee: d[0],
            args: d[2]
          };
        } },
    {"name": "Struct", "symbols": [tok_OPEN_CU, "_NL", "KeyValPairs", tok_CLOSE_CU], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Struct",
            value: d[2]
          };
        } },
    {"name": "KeyValPairs", "symbols": [], "postprocess": noopArr},
    {"name": "KeyValPairs$ebnf$1", "symbols": [tok_COMMA], "postprocess": id},
    {"name": "KeyValPairs$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "KeyValPairs", "symbols": ["KeyValPairs_body", "KeyValPairs$ebnf$1", "_NL"], "postprocess": id},
    {"name": "KeyValPairs_body", "symbols": ["KeyValPair"], "postprocess": id},
    {"name": "KeyValPairs_body", "symbols": ["KeyValPairs_body", tok_COMMA, "_NL", "KeyValPair"], "postprocess": concatArr(3, true)},
    {"name": "KeyValPair$subexpression$1", "symbols": ["String"]},
    {"name": "KeyValPair$subexpression$1", "symbols": ["Number"]},
    {"name": "KeyValPair$subexpression$1", "symbols": ["Symbol"]},
    {"name": "KeyValPair", "symbols": ["KeyValPair$subexpression$1", tok_COLON, "Expression"], "postprocess":  function(d){
          return [d[0][0], d[2]];
        } },
    {"name": "Array", "symbols": [tok_OPEN_SQ, "_NL", "Expression_list", tok_CLOSE_SQ], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Array",
            value: d[2]
          };
        } },
    {"name": "Expression_list", "symbols": [], "postprocess": noopArr},
    {"name": "Expression_list$ebnf$1", "symbols": [tok_COMMA], "postprocess": id},
    {"name": "Expression_list$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Expression_list", "symbols": ["Expression_list_body", "Expression_list$ebnf$1", "_NL"], "postprocess": id},
    {"name": "Expression_list_body", "symbols": ["Expression"], "postprocess": idArr},
    {"name": "Expression_list_body", "symbols": ["Expression_list_body", tok_COMMA, "_NL", "Expression"], "postprocess": concatArr(3)},
    {"name": "Function", "symbols": [tok_fn, "Params", "Block"], "postprocess":  function(d){
          return {
            loc: mkLoc(d),
            type: "Function",
            params: d[1],
            body: d[2].body
          };
        } },
    {"name": "Params", "symbols": ["Identifier"], "postprocess": id},
    {"name": "Params", "symbols": [tok_OPEN_SQ, tok_CLOSE_SQ], "postprocess": noopArr},
    {"name": "Params$ebnf$1", "symbols": [tok_COMMA], "postprocess": id},
    {"name": "Params$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Params", "symbols": [tok_OPEN_SQ, "Params_body", "Params$ebnf$1", tok_CLOSE_SQ], "postprocess": idN(1)},
    {"name": "Params_body", "symbols": ["Param"], "postprocess": idArr},
    {"name": "Params_body", "symbols": ["Params_body", tok_COMMA, "Param"], "postprocess": concatArr(2)},
    {"name": "Param$ebnf$1", "symbols": [tok_DOTDOTDOT], "postprocess": id},
    {"name": "Param$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Param", "symbols": ["Identifier", "Param$ebnf$1"], "postprocess": 
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
        },
    {"name": "Number", "symbols": [tok_NUMBER], "postprocess":  function(d){
          return mkType(d, "Number", parseFloat(d[0].src) || 0);
        } },
    {"name": "String", "symbols": [tok_STRING], "postprocess":  function(d){
          var value = d[0].src.replace(/(^")|("$)/g, "").replace(/\\"/g, "\"");
          return mkType(d, "String", value);
        } },
    {"name": "Identifier", "symbols": [tok_SYMBOL], "postprocess":  function(d, start, reject){
          var src = d[0].src;
          if(isReserved(src)){
            return reject;
          }
          return mkType(d, "Identifier", src);
        } },
    {"name": "Nil", "symbols": [tok_nil], "postprocess":  function(d){
          return {loc: d[0].loc, type: "Nil"};
        } },
    {"name": "Boolean$subexpression$1", "symbols": [tok_true]},
    {"name": "Boolean$subexpression$1", "symbols": [tok_false]},
    {"name": "Boolean", "symbols": ["Boolean$subexpression$1"], "postprocess":  function(d){
          var t = d[0][0];
          return {loc: t.loc, type: "Boolean", value: t.src === "true"};
        } },
    {"name": "Symbol", "symbols": [tok_SYMBOL], "postprocess":  function(d){
          return mkType(d, "Symbol", d[0].src);
        } },
    {"name": "NL", "symbols": [tok_NL], "postprocess": noop},
    {"name": "_NL", "symbols": [], "postprocess": noop},
    {"name": "_NL", "symbols": [tok_NL], "postprocess": noop}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
