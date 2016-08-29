var path = require("path");
var core = require("./src/core");

var core_path = path.resolve(__dirname, "./src/core.js");


module.exports = function(sym){
  if(core.hasOwnProperty(sym))){
    return core_path;
  }
  //TODO
};
