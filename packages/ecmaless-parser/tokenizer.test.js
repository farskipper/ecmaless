var _ = require("lodash");
var test = require("tape");
var tokenizer = require("./tokenizer");

test("tokenizer", function(t){

  t.deepEquals(tokenizer("123"), [
    {
      type: 'NUMBER',
      src: '123',
      loc: {source: '123', start: {line: 1, column: 0}, end: {line: 1, column: 3}}
    }
  ]);
  t.deepEquals(tokenizer("123.45"), [
    {
      type: 'NUMBER',
      src: '123.45',
      loc: {source: '123.45', start: {line: 1, column: 0}, end: {line: 1, column: 6}}
    }
  ]);

  var testOrder = function(src, tok_order){
    t.deepEquals(_.map(tokenizer(src), "type"), tok_order);
  };

  testOrder('123 "four"\nblah', ["NUMBER", "STRING", "SYMBOL"]);
  testOrder('10 0.1 1.0', ["NUMBER", "NUMBER", "NUMBER"]);

  testOrder('deps:\n    1', ["SYMBOL", ":", "INDENT", "NUMBER", "DEDENT"]);
  testOrder('deps:\n        1', [
    "SYMBOL",
    ":",
    "INDENT",
    "INDENT",
    "NUMBER",
    "DEDENT",
    "DEDENT"
  ]);
  testOrder('deps:\n        1\n    2', [
    "SYMBOL",
    ":",
    "INDENT",
    "INDENT",
    "NUMBER",
    "DEDENT",
    "NUMBER",
    "DEDENT"
  ]);
  testOrder('deps:\n        1    3\n    2', [
    "SYMBOL",
    ":",
    "INDENT",
    "INDENT",
    "NUMBER",
    "NUMBER",
    "DEDENT",
    "NUMBER",
    "DEDENT"
  ]);

  var src = '';
  src += 'deps:\n';
  src += '    a [\n';
  src += '        1\n';
  src += '    ]\n';
  testOrder(src, [
    "SYMBOL",
    ":",
    "INDENT",
    "SYMBOL",
    "[",
    "NUMBER",
    "]",
    "DEDENT"
  ]);

  t.end();
});
