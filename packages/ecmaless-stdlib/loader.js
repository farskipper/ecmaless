var fs = require("fs");
var path = require("path");
var core = require("./src/core");

var lookup = {};

var src_dir = path.resolve(__dirname, "src/");
fs.readdirSync(src_dir).forEach(function(filename){
  var file = path.resolve(src_dir, filename);

  if(filename === "core.js"){
    Object.keys(core).forEach(function(sym){
      lookup[sym] = {file: file, key: sym};
    });
    return;
  }
  var sym = filename.split(".")[0];
  lookup[sym] = {file: file};
});

module.exports = function(sym){
  return lookup[sym];
};
