var _ = require("lodash");
var tokenizer2 = require("tokenizer2/core");
var escapeRegExp = require("escape-regexp");

var group_pairs = {
  "(": ")",
  "{": "}",
  "[": "]",
  "<": ">"
};

var dispatchers = [
  "#",
  "'",
  "`",
  "@",
  "~",
  "^"
];

var separators = "\\s\\b" + escapeRegExp(",;\"" + _.flattenDeep([
  _.toPairs(group_pairs),
  dispatchers
]).join(""));

var number_regex = (function(){
  var s = "";
  s += "[+-]?";//may start with a + or -
  s += "(" + [
    "([0-9][0-9,]*\\.?[0-9]*)",//starting with a number
    "(\\.[0-9]+)"//starting with a period
  ].join("|") + ")";
  s += "([eE][-+]?[0-9]*)?";//optional exponent (using * b/c the tokenizer needs to match as it goes along)
  return new RegExp("^" + s + "$");
}());

module.exports = function(src, onToken){
  var t = tokenizer2(onToken);

  t.addRule(/^[\n ]+$/, "whitespace");//only new-line and space are valid (sorry \t and \r)
  t.addRule(/^;[^\n]*$/, "comment");
  t.addRule(/(^""$)|(^"([^"]|\\")*[^\\]"$)/, "string");
  t.addRule(number_regex, "number");

  _.each(group_pairs, function(close, open){
    t.addRule(new RegExp("^" + escapeRegExp(open) + "$"), "open-" + open);
    t.addRule(new RegExp("^" + escapeRegExp(close) + "$"), "close-" + open);
  });

  _.each(dispatchers, function(c){
    t.addRule(new RegExp("^" + escapeRegExp(c) + "$"), c);
  });

  t.addRule(new RegExp("^\\:[^" + separators + "]*$"), "keyword");
  t.addRule(new RegExp("^#[^0-9" + separators + "][^" + separators + "]*$"), "dispatch-symbol");
  t.addRule(new RegExp("^[^0-9" + separators + "][^" + separators + "]*$"), "symbol");

  t.onText(src);
  t.end();
};
