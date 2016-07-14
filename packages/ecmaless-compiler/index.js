var _ = require("lodash");
var e = require("estree-builder");

var sliceArgs = function(loc, start, end){
  var args = [e("number", start, loc)];
  if(_.isNumber(end)){
    if(end < 0){
      args.push(e("-", e("number", -end, loc)));
    }else{
      args.push(e("number", end, loc));
    }
  }
  return e("call",
    e(".",
      e("id", "arguments", loc),
      e("id", "slice", loc),
      loc
    ),
    args,
    loc
  );
};

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
  "Function": function(ast, comp){
    var params = [];
    var body = [];
    if(ast.params && ast.params.type === "Identifier"){
      body.push(e("var",
        comp(ast.params),
        sliceArgs(ast.params.loc, 0),
        ast.params.loc
      ));
    }else{
      var has_ddd = false;
      _.each(ast.params, function(p, i){
        if(p.type === "DotDotDot"){
          if(has_ddd){
            throw new Error("Only one ... allowed in an argument list");
          }
          has_ddd = true;
          body.push(e("var",
            comp(p.value),
            sliceArgs(ast.params.loc, i, i - (_.size(ast.params) - 1)),
            p.loc
          ));
        }else{
          if(has_ddd){
            body.push(e("var",
              comp(p),
              e("get",
                e("id", "arguments", p.loc),
                e("-",
                  e(".",
                    e("id", "arguments", p.loc),
                    e("id", "length", p.loc),
                    p.loc
                  ),
                  e("number", _.size(ast.params) - i, p.loc),
                  p.loc
                ),
                p.loc
              ),
              p.loc
            ));
          }else{
            params.push(comp(p));
          }
        }
      });
    }
    _.each(ast.body, function(b, i){
      if((i === _.size(ast.body) - 1) && b.type === "ExpressionStatement"){
        body.push(e("return", comp(b.expression), b.loc));
      }else{
        body.push(comp(b));
      }
    });
    var id;
    return e("function", params, body, id, ast.loc);
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
