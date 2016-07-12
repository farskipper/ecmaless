// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

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
var grammar = {
    ParserRules: [
    {"name": "main", "symbols": ["Expression"], "postprocess": id},
    {"name": "Expression", "symbols": ["Number"], "postprocess": id},
    {"name": "Expression", "symbols": ["String"], "postprocess": id},
    {"name": "Expression", "symbols": ["Symbol"], "postprocess": id},
    {"name": "Number", "symbols": [tok_NUMBER], "postprocess":  function(d){
          return mkType(d, 'Number', parseFloat(d[0].src) || 0);
        } },
    {"name": "String", "symbols": [tok_STRING], "postprocess":  function(d){
          return mkType(d, 'String', JSON.parse(d[0].src));
        } },
    {"name": "Symbol", "symbols": [tok_SYMBOL], "postprocess":  function(d){
          return mkType(d, 'Symbol', d[0].src);
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
