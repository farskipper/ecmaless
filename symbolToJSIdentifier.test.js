var _ = require("lodash");
var test = require("tape");
var symbolToJSIdentifier = require("./symbolToJSIdentifier");
var js_reserved_symbols = symbolToJSIdentifier.js_reserved_symbols;

var isValidJSIdentifier = function(str){
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
};

test("symbolToJSIdentifier", function(t){
  //fix non-js identifier symbols
  t.ok(isValidJSIdentifier(symbolToJSIdentifier("-")));
  t.ok(isValidJSIdentifier(symbolToJSIdentifier("+")));
  t.ok(isValidJSIdentifier(symbolToJSIdentifier("!")));

  //handle reserved words
  _.each(js_reserved_symbols, function(sym){
    t.ok(isValidJSIdentifier(symbolToJSIdentifier(sym)));
  });
  
  //handle collisions
  t.notEquals(symbolToJSIdentifier("_"), symbolToJSIdentifier("-"));
  t.equals(symbolToJSIdentifier("_"), symbolToJSIdentifier("_"));

  t.equals(symbolToJSIdentifier("."), "_3");
  t.equals(symbolToJSIdentifier("a."), "a_");
  t.equals(symbolToJSIdentifier(".a"), "_a");

  t.end();
});
