var _ = require("lodash");
var test = require("tape");
var srcToTokens = require("./src-to-tokens");

var toToks = function(src){
  var toks = [];
  srcToTokens(src, function(token){
    if(token.type !== "whitespace"){
      toks.push([token.type, token.src]);
    }
  });
  return toks;
};

var assertAllOfType = function(t, type, src, vals){
  var toks = toToks(src);
  t.ok(_.every(toks, function(tok){
    return tok[0] === type;
  }), "all must be: " + type);
  t.deepEquals(_.map(toks, 1), vals);
};

test("prevent harmful whitespace", function(t){
  var assertWS = function(is_good, src){
    try{
      var toks = toToks(src);
      t.ok(is_good);
    }catch(err){
      t.notOk(is_good);
    }
  };

  assertWS(true, "\n");
  assertWS(true, " ");
  assertWS(true, "  \n  \n\n");

  assertWS(false, "\t");//yes tabs are harmful, especially when formatting lisp code
  assertWS(false, "\r");//yep you need to adjust your text editor
  assertWS(false, "\v");
  assertWS(false, "\f");
  assertWS(false, "\b");
  assertWS(false, "\u00A0");
  assertWS(false, "\u2028");
  assertWS(false, "\u2029");
  assertWS(false, "\uFEFF");
  t.end();
});

test("tokenize comments", function(t){
  var asrt = _.partial(assertAllOfType, t, "comment");
  asrt('  ;some msg\n  ;annother;one ', [';some msg', ';annother;one ']);
  t.end();
});

test("tokenize strings", function(t){
  var asrt = _.partial(assertAllOfType, t, "string");
  asrt('"one"\n"two"', ['"one"', '"two"']);
  asrt(' "some (+ 1 2) \n\t \\" :string" ', ['"some (+ 1 2) \n\t \\" :string"']);
  t.end();
});

test("tokenize numbers", function(t){
  var asrt = _.partial(assertAllOfType, t, "number");
  asrt("123.4 1 +0 -.12", ["123.4", "1", "+0", "-.12"]);
  asrt("-1.23e4", ["-1.23e4"]);
  t.end();
});

test("tokenize keywords", function(t){
  var asrt = _.partial(assertAllOfType, t, "keyword");
  asrt(':one :two', [':one', ':two']);
  asrt(':one:two ::thr:ee', [':one:two', '::thr:ee']);
  t.end();
});

test("tokenize symbols", function(t){
  var asrt = _.partial(assertAllOfType, t, "symbol");
  asrt('one two.three four', ['one', 'two.three', 'four']);
  asrt('+-= + - %', ['+-=', '+', '-', '%']);
  t.end();
});

test("tokenize dispatchers", function(t){
  var asrt = _.partial(assertAllOfType, t, "dispatch");
  asrt("#one #'`@~^", ["#one", "#", "'", "`", "@", "~", "^"]);
  t.end();
});

test("tokenize groups", function(t){
  var toks = toToks("()[]{}<>");
  t.deepEquals(toks, [
    ["open-(" , "("],
    ["close-(", ")"],
    ["open-[" , "["],
    ["close-[", "]"],
    ["open-{" , "{"],
    ["close-{", "}"],
    ["open-<" , "<"],
    ["close-<", ">"]
  ]);
  t.end();
});
