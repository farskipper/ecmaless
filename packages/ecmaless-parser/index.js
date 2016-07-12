var nearley = require('nearley');
var grammar = require('./grammar.js');
var tokenizer = require("./tokenizer");

module.exports = function(src, opts){
  opts = opts || {};

  var tokens = tokenizer(src);

  var p = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);
  p.feed(tokens);

  if(p.results.length !== 1){
    throw new Error(
      'Parsing Ambiguity: ' + p.results.length + ' parsings found'
    );
  }
  return p.results[0];
};
