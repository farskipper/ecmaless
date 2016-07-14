var _ = require("lodash");
var e = require("estree-builder");

var comp_by_type = {
  "Number": function(ast, comp){
    return e("number", ast.value, ast.loc);
  },
  "String": function(ast, comp){
    return e("string", ast.value, ast.loc);
  },
  "Identifier": function(ast, comp){
    return e("id", ast.value, ast.loc);
  },
  "Nil": function(ast, comp){
    return e("void", e("number", 0, ast.loc), ast.loc);
  },
  "Boolean": function(ast, comp){
    return e(ast.value ? "true" : "false", ast.loc);
  },
  "Array": function(ast, comp){
    return e("array", comp(ast.value), ast.loc);
  },
  "Struct": function(ast, comp){
    return e("object-raw", _.map(_.chunk(ast.value, 2), function(pair){
      var key = pair[0];
      if(key.type === "Symbol"){
        key = e("string", key.value, key.loc);
      }else{
        key = comp(key);
      }
      var val = comp(pair[1] || {loc: key.loc, type: "Nil"});
      return e("object-property", key, val, {start: key.loc.start, end: val.loc.end});
    }), ast.loc);
  },
  "ExpressionStatement": function(ast, comp){
    return e(";", comp(ast.expression), ast.loc);
  },
  "Define": function(ast, comp){
      var init = comp(ast.init || {loc: ast.id.loc, type: "Nil"});
    return e("var", comp(ast.id), init, ast.loc);
  },
};

module.exports = function(ast){

  var compile = function compile(ast){
    if(_.isArray(ast)){
      return _.map(ast, function(a){
        return compile(a);
      });
    }else if(!_.has(ast, "type")){
      throw new Error("Invalid ast node: " + JSON.stringify(ast));
    }else if(!_.has(comp_by_type, ast.type)){
      throw new Error("Unsupported ast node type: " + ast.type);
    }
    return comp_by_type[ast.type](ast, compile);
  };

  return {
    estree: compile(ast)
  };
};
