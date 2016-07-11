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

  t.end();
});
