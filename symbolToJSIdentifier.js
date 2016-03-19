var _ = require("lodash");
var js_reserved_symbols = [
  "false",
  "function",
  "null",
  "return",
  "this",
  "true",
  "undefined",
  "var"
  //TODO the rest
];

var sym_to_ident = {};
var ident_to_sym = {};

var collisionAvoidance = function(identifier){
  if(!_.has(ident_to_sym, identifier)){
    return identifier;
  }
  var n = 0;
  while(_.has(ident_to_sym, identifier + n)){
    n += 1;
  }
  return identifier + n;
};

module.exports = function(symbol){
  if(_.has(sym_to_ident, symbol)){
    return sym_to_ident[symbol];
  }

  var identifier = symbol.replace(/[^a-zA-Z0-9_$]/g, "_");
  identifier = identifier.replace(/^([0-9])/g, "_$1");

  if(_.includes(js_reserved_symbols, identifier)){
    identifier = "$" + identifier;
  }

  identifier = collisionAvoidance(identifier);

  sym_to_ident[symbol] = identifier;
  ident_to_sym[identifier] = symbol;
  return identifier;
};
module.exports.js_reserved_symbols = js_reserved_symbols;
