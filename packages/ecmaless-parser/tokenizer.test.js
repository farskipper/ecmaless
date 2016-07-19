var _ = require("lodash");
var test = require("tape");
var tokenizer = require("./tokenizer");

test("tokenizer", function(t){

  t.deepEquals(tokenizer("123"), [
    {
      type: "NUMBER",
      src: "123",
      loc: {source: "123", start: {line: 1, column: 0}, end: {line: 1, column: 3}}
    }
  ]);
  t.deepEquals(tokenizer("123.45"), [
    {
      type: "NUMBER",
      src: "123.45",
      loc: {source: "123.45", start: {line: 1, column: 0}, end: {line: 1, column: 6}}
    }
  ]);

  var testOrder = function(src, tok_order){
    t.deepEquals(_.map(tokenizer(src), "type"), tok_order);
  };

  testOrder("123 \"four\"\nblah", ["NUMBER", "STRING", "NEWLINE", "SYMBOL"]);
  testOrder("10 0.1 1.0", ["NUMBER", "NUMBER", "NUMBER"]);

  testOrder("({[]})", ["(", "{", "[", "]", "}", ")"]);
  testOrder("deps:\n    1", ["SYMBOL", ":", "NEWLINE", "INDENT", "NUMBER", "DEDENT"]);
  testOrder("deps:\n        1", [
    "SYMBOL",
    ":",
    "NEWLINE",
    "INDENT",
    "INDENT",
    "NUMBER",
    "DEDENT",
    "DEDENT"
  ]);
  testOrder("deps:\n        1\n    2", [
    "SYMBOL",
    ":",
    "NEWLINE",
    "INDENT",
    "INDENT",
    "NUMBER",
    "NEWLINE",
    "DEDENT",
    "NUMBER",
    "DEDENT"
  ]);
  testOrder("deps:\n        1    3\n    2", [
    "SYMBOL",
    ":",
    "NEWLINE",
    "INDENT",
    "INDENT",
    "NUMBER",
    "NUMBER",
    "NEWLINE",
    "DEDENT",
    "NUMBER",
    "DEDENT"
  ]);

  var src = "";
  src += "deps:\n";
  src += "    a [\n";
  src += "        1\n";
  src += "    ]\n";
  testOrder(src, [
    "SYMBOL",
    ":",
    "NEWLINE",
    "INDENT",
    "SYMBOL",
    "[",
    "NEWLINE",
    "INDENT",
    "NUMBER",
    "NEWLINE",
    "DEDENT",
    "]",
    "NEWLINE",
    "DEDENT"
  ]);

  testOrder("1;some comment\n2", [
    "NUMBER",
    "NEWLINE",
    "NUMBER"
  ]);

  testOrder("[\n    1,\n    2,\n]", [
    "[",
    "NEWLINE",
    "INDENT",
    "NUMBER", ",", "NEWLINE",
    "NUMBER", ",", "NEWLINE",
    "DEDENT",
    "]"
  ]);

  t.end();
});
