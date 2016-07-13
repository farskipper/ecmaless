// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

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
var grammar = {
    ParserRules: [
    {"name": "main", "symbols": ["Statement"], "postprocess": id},
    {"name": "Statement", "symbols": ["Define"], "postprocess": id},
    {"name": "Statement", "symbols": ["Expression"], "postprocess": id},
    {"name": "Define$ebnf$1$subexpression$1", "symbols": [tok_EQ, "Expression"]},
    {"name": "Define$ebnf$1", "symbols": ["Define$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Define$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Define", "symbols": [tok_def, "Symbol", "Define$ebnf$1"], "postprocess":  function(d){
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
    {"name": "Expression", "symbols": ["Number"], "postprocess": id},
    {"name": "Expression", "symbols": ["String"], "postprocess": id},
    {"name": "Expression", "symbols": ["Symbol"], "postprocess": id},
    {"name": "Expression", "symbols": ["Function"], "postprocess": id},
    {"name": "Function", "symbols": [tok_fn, "Params", "Blok"], "postprocess":  function(d){
          return {
            loc: {start: d[0].loc.start, end: d[2].loc.end},
            type: "Function",
            params: d[1],
            body: d[2].body
          };
        } },
    {"name": "Params", "symbols": ["Symbol"], "postprocess": id},
    {"name": "Blok$ebnf$1", "symbols": []},
    {"name": "Blok$ebnf$1", "symbols": ["Statement", "Blok$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "Blok", "symbols": [tok_COLON, tok_INDENT, "Blok$ebnf$1", tok_DEDENT], "postprocess": 
        function(d){
          return {
            loc: {start: d[0].loc.start, end: d[3].loc.end},
            type: "Block",
            body: d[2]
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
