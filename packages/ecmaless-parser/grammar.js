// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

//TODO
var grammar = {
    ParserRules: [
    {"name": "main$string$1", "symbols": [{"literal":"T"}, {"literal":"O"}, {"literal":"D"}, {"literal":"O"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "main", "symbols": ["main$string$1"], "postprocess": id}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
