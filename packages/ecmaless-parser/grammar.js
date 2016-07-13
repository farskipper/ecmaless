// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

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
var tok_if = tok("SYMBOL", "if");
var tok_else = tok("SYMBOL", "else");
var tok_cond = tok("SYMBOL", "cond");
var tok_while = tok("SYMBOL", "while");

var isReserved = function(src){
  //TODO
  return src === "else";
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

var grammar = {
    ParserRules: [
    {"name": "main", "symbols": ["Statement"], "postprocess": id},
    {"name": "Statement", "symbols": ["Define"], "postprocess": id},
    {"name": "Statement", "symbols": ["ExpressionStatement"], "postprocess": id},
    {"name": "Statement", "symbols": ["While"], "postprocess": id},
    {"name": "Statement", "symbols": ["Cond"], "postprocess": id},
    {"name": "ExpressionStatement", "symbols": ["Expression"], "postprocess":  function(d){
          return {
            loc: d[0].loc,
            type: "ExpressionStatement",
            expression: d[0]
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
    {"name": "While", "symbols": [tok_while, "Expression", "Block"], "postprocess":  function(d){
          return {
            loc: mkLoc(d, 0, 2),
            type: "While",
            test: d[1],
            body: d[2].body
          };
        } },
    {"name": "Cond$ebnf$1", "symbols": ["ElseBlock"], "postprocess": id},
    {"name": "Cond$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Cond", "symbols": [tok_cond, tok_COLON, tok_INDENT, "CondBlocks", "Cond$ebnf$1", tok_DEDENT], "postprocess":  function(d){
          return {
            loc: mkLoc(d, 0, 5),
            type: "Cond",
            blocks: d[3],
            "else": d[4]
          };
        } },
    {"name": "CondBlocks", "symbols": ["CondBlock"], "postprocess": idArr},
    {"name": "CondBlocks", "symbols": ["CondBlocks", "CondBlock"], "postprocess": function(d){return d[0].concat(d[1])}},
    {"name": "CondBlock", "symbols": ["Expression", "Block"], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d, 0, 1),
            type: "CondBlock",
            test: d[0],
            body: d[1].body
          };
        }
        },
    {"name": "ElseBlock", "symbols": [tok_else, "Block"], "postprocess": function(d){return d[1].body;}},
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1", "symbols": ["Statement", "Block$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "Block", "symbols": [tok_COLON, tok_INDENT, "Block$ebnf$1", tok_DEDENT], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d, 0, 3),
            type: "Block",
            body: d[2]
          };
        }
        },
    {"name": "Expression", "symbols": ["ConditionalExpression"], "postprocess": id},
    {"name": "ConditionalExpression", "symbols": ["exp_or"], "postprocess": id},
    {"name": "ConditionalExpression", "symbols": ["exp_or", tok_QUESTION, "exp_or", tok_COLON, "exp_or"], "postprocess": 
        function(d){
          return {
            loc: mkLoc(d, 0, 4),
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
    {"name": "exp_sum", "symbols": ["exp_product"], "postprocess": id},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_PLUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_MINUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["MemberExpression"], "postprocess": id},
    {"name": "exp_product", "symbols": ["exp_product", tok_TIMES, "MemberExpression"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["exp_product", tok_DIVIDE, "MemberExpression"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["exp_product", tok_MODULO, "MemberExpression"], "postprocess": infixOp},
    {"name": "MemberExpression", "symbols": ["PrimaryExpression"], "postprocess": id},
    {"name": "MemberExpression", "symbols": ["MemberExpression", tok_DOT, "Identifier"], "postprocess":  function(d){
            return mkMemberExpression(mkLoc(d, 0, 2), "dot", d[0], d[2]);
        } },
    {"name": "MemberExpression", "symbols": ["MemberExpression", tok_OPEN_SQ, "Expression", tok_CLOSE_SQ], "postprocess":  function(d){
            return mkMemberExpression(mkLoc(d, 0, 3), "index", d[0], d[2]);
        } },
    {"name": "PrimaryExpression", "symbols": ["Number"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["String"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Identifier"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Function"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Application"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Array"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Struct"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": [tok_OPEN_PN, "Expression", tok_CLOSE_PN], "postprocess": idN(1)},
    {"name": "Application", "symbols": ["MemberExpression", tok_OPEN_PN, "Expression_list", tok_CLOSE_PN], "postprocess":  function(d){
          return {
            loc: mkLoc(d, 0, 3),
            type: "Application",
            callee: d[0],
            args: d[2]
          };
        } },
    {"name": "Struct", "symbols": [tok_OPEN_CU, "KeyValPairs", tok_CLOSE_CU], "postprocess":  function(d){
          return {
            loc: mkLoc(d, 0, 2),
            type: "Struct",
            value: d[1]
          };
        } },
    {"name": "KeyValPairs", "symbols": [], "postprocess": noopArr},
    {"name": "KeyValPairs$ebnf$1", "symbols": [tok_COMMA], "postprocess": id},
    {"name": "KeyValPairs$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "KeyValPairs", "symbols": ["KeyValPairs_body", "KeyValPairs$ebnf$1"], "postprocess": id},
    {"name": "KeyValPairs_body", "symbols": ["KeyValPair"], "postprocess": id},
    {"name": "KeyValPairs_body", "symbols": ["KeyValPairs_body", tok_COMMA, "KeyValPair"], "postprocess": concatArr},
    {"name": "KeyValPair$subexpression$1", "symbols": ["String"]},
    {"name": "KeyValPair$subexpression$1", "symbols": ["Number"]},
    {"name": "KeyValPair$subexpression$1", "symbols": ["Symbol"]},
    {"name": "KeyValPair", "symbols": ["KeyValPair$subexpression$1", tok_COLON, "Expression"], "postprocess":  function(d){
          return [d[0][0], d[2]];
        } },
    {"name": "Array", "symbols": [tok_OPEN_SQ, "Expression_list", tok_CLOSE_SQ], "postprocess":  function(d){
          return {
            loc: mkLoc(d, 0, 2),
            type: "Array",
            value: d[1]
          };
        } },
    {"name": "Expression_list", "symbols": [], "postprocess": noopArr},
    {"name": "Expression_list$ebnf$1", "symbols": [tok_COMMA], "postprocess": id},
    {"name": "Expression_list$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Expression_list", "symbols": ["Expression_list_body", "Expression_list$ebnf$1"], "postprocess": id},
    {"name": "Expression_list_body", "symbols": ["Expression"], "postprocess": idArr},
    {"name": "Expression_list_body", "symbols": ["Expression_list_body", tok_COMMA, "Expression"], "postprocess": concatArr},
    {"name": "Function", "symbols": [tok_fn, "Params", "Block"], "postprocess":  function(d){
          return {
            loc: mkLoc(d, 0, 2),
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
    {"name": "Params_body", "symbols": ["Params_body", tok_COMMA, "Param"], "postprocess": concatArr},
    {"name": "Param$ebnf$1", "symbols": [tok_DOTDOTDOT], "postprocess": id},
    {"name": "Param$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Param", "symbols": ["Identifier", "Param$ebnf$1"], "postprocess": 
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
    {"name": "Symbol", "symbols": [tok_SYMBOL], "postprocess":  function(d){
          return mkType(d, "Symbol", d[0].src);
        } }
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
