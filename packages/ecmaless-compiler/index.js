var e = require("estree-builder");

module.exports = function(ast){
  return e(";", e("number", 1));
};
