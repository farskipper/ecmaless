var path = require("path");
var lookup = require("./lookup.json");

Object.keys(lookup).forEach(function(sym){
  lookup[sym].file = path.resolve(__dirname, lookup[sym].file);
});

module.exports = function(sym){
  return lookup[sym];
};
