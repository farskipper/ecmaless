var _ = require("lodash");
var test = require("tape");
var tokenizer = require("./tokenizer");

test("tokenizer", function(t){

  t.deepEquals(tokenizer("123"), [
    {
      type: 'Number',
      src: '123',
      loc: {source: '123', start: {line: 1, column: 0}, end: {line: 1, column: 3}}
    }
  ]);
  t.deepEquals(tokenizer("123.45"), [
    {
      type: 'Number',
      src: '123.45',
      loc: {source: '123.45', start: {line: 1, column: 0}, end: {line: 1, column: 6}}
    }
  ]);

  var testOrder = function(src, tok_order){
    t.deepEquals(_.map(tokenizer(src), "type"), tok_order);
  };

  testOrder('123 "four"\nblah', ["Number", "Space", "String", "NewLine", "Symbol"]);
  testOrder('10 0.1 1.0', ["Number", "Space", "Number", "Space", "Number"]);

  t.end();
});
