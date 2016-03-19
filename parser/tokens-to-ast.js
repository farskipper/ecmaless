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

var tokenToLoc = function(token){
  var lines = token.src.split('\n');
  return {
    start: {
      line: token.line,
      column: token.col - 1
    },
    end: {
      line: token.line + lines.length - 1,
      column: (lines.length > 1 ? 1 : token.col) + _.last(lines).length - 2
    }
  };
};

var tokenToNode = function(token){
  return {
    type: token.type,
    value: undefined,
    src: token.src,
    loc: tokenToLoc(token)
  };
};

module.exports = function(src, onError){
  var ast = [];
  var stack = [];

  var t = tokenizer2(function(err, token){
    if(err) return onError(err);

    var node = tokenToNode(token);

    if(node.type === 'whitespace'){
      return;
    }else if(node.type === 'string'){
      node.value = node.src.substring(1, node.src.length - 1).replace(/\\"/g, '"');
    }else if(node.type === 'symbol'){
      node.value = node.src;
    }else if(node.type === 'number'){
      //just de-sugar the number. Converting it to a float, or big-num is up to the language dialect
      node.value = node.src.replace(/[+,]/g, '').toLowerCase();
    }else if(/^open-/.test(node.type)){
      stack.push(_.assign({}, node, {
        type: 'list',
        value: []
      }));
      return;
    }else if(/^close-/.test(node.type)){
      node = stack.pop();
    }else{
      //TODO error
      return;
    }

    var curr_list = _.last(stack);
    if(curr_list){
      curr_list.value.push(node);
    }else{
      ast.push(node);
    }
  });

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
  t.end(function(err){//this is actually synchronous
    if(err) return onError(err);
  });
  return ast;
};
