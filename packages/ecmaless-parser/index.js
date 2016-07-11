var nearley = require('nearley');
var grammar = require('./grammar.js');

module.exports = function(src, opts){
  opts = opts || {};

  var p = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);

  //TODO tokenize first

  p.feed(src);

  if(p.results.length !== 1){
    throw new Error(
      'Parsing Ambiguity: ' + p.results.length + ' parsings found'
    );
  }
  return p.results[0];
};
