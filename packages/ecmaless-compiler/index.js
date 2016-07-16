var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");

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
    return e("id", toId(ast.value), ast.loc);
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
          var arg_i_from_end = i - _.size(ast.params) + 1;
          body.push(e("var",
            comp(p.value),
            arg_i_from_end < 0
              ? sliceArgs(ast.params.loc, i, arg_i_from_end)
              : sliceArgs(ast.params.loc, i),
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
  "UnaryOperator": function(ast, comp){
    return e("call", e("id", toId(ast.op), ast.loc), [comp(ast.arg)], ast.loc);
  },
  "InfixOperator": function(ast, comp){
    return e("call", e("id", toId(ast.op), ast.loc), [
      comp(ast.left),
      comp(ast.right)
    ], ast.loc);
  },
  "ExpressionStatement": function(ast, comp){
    return e(";", comp(ast.expression), ast.loc);
  },
  "Return": function(ast, comp){
    return e("return", comp(ast.expression), ast.loc);
  },
  "If": function(ast, comp){
    return e("if", comp(ast.test),
      e("block", comp(ast.then), ast.loc),
      _.isArray(ast["else"])
        ? e("block", comp(ast["else"]), ast.loc)
        : comp(ast["else"]), ast.loc);
  },
  "Cond": function(ast, comp){
    var head;
    var prev = ast["else"]
      ? e("block", comp(ast["else"]), ast["else"].loc)
      : undefined;
    var i = _.size(ast.blocks) - 1;
    while(i >= 0){
      var block = ast.blocks[i];
      var me = e("if",
        comp(block.test),
        e("block", comp(block.body), block.loc),
        prev,
        block.loc
      );

      prev = me;
      i--;
    }
    return prev;
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
