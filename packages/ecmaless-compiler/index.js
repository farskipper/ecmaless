var _ = require("lodash");
var e = require("estree-builder");
var toId = require("to-js-identifier");
var SymbolTable = require("symbol-table");

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
  "Identifier": function(ast, comp, ctx){
    ctx.useIdentifier(ast.value);
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
  "Application": function(ast, comp){
    return e("call",
      e(".", comp(ast.callee), e("id", "call", ast.loc), ast.loc),
      [
        e("void", e("number", 0, ast.loc), ast.loc)
      ].concat(comp(ast.args)),
      ast.loc
    );
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
  "AssignmentExpression": function(ast, comp){
    if(ast.left.type === "Identifier"){
      return e("=", comp(ast.left), comp(ast.right), ast.loc);
    }else if(ast.left.type === "MemberExpression"){
      var left = comp(ast.left);
      left.callee.name = "set";
      left["arguments"].push(comp(ast.right));
      return left;
    }
    throw new Error("Only Identifier or MemberExpression can be assigned");
  },
  "MemberExpression": function(ast, comp){
    var path;
    if(ast.method === "dot"){
      if(ast.path && ast.path.type === "Identifier"){
        path = e("string", ast.path.value, ast.path.loc);
      }
    }else if(ast.method === "index"){
      path = comp(ast.path);
    }else{
      throw new Error("Unsupported MemberExpression method: " + ast.method);
    }
    return e("call", e("id", "get", ast.loc), [
      comp(ast.object),
      path
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
    var prev = ast["else"]
      ? e("block", comp(ast["else"]), ast["else"].loc)
      : undefined;
    var i = _.size(ast.blocks) - 1;
    while(i >= 0){
      var block = ast.blocks[i];
      prev = e("if",
        comp(block.test),
        e("block", comp(block.body), block.loc),
        prev,
        block.loc
      );
      i--;
    }
    return prev;
  },
  "Case": function(ast, comp){
    var mkTest = function(val){
      return e("call", e("id", toId("=="), val.loc), [
        comp(ast.to_test),
        comp(val)
      ], val.loc);
    };
    var prev = ast["else"]
      ? e("block", comp(ast["else"]), ast["else"].loc)
      : undefined;
    var i = _.size(ast.blocks) - 1;
    while(i >= 0){
      var block = ast.blocks[i];
      prev = e("if",
        mkTest(block.value),
        e("block", comp(block.body), block.loc),
        prev,
        block.loc
      );
      i--;
    }
    return prev;
  },
  "While": function(ast, comp){
    return e("while", comp(ast.test), e("block", comp(ast.body), ast.loc), ast.loc);
  },
  "Break": function(ast, comp){
    return e("break", ast.loc);
  },
  "Continue": function(ast, comp){
    return e("continue", ast.loc);
  },
  "TryCatch": function(ast, comp){
    return e("try",
      comp(ast.try_block),
      ast.catch_id && ast.catch_id.type === "Identifier"
        ? ast.catch_id.value
        : undefined,
      comp(ast.catch_block),
      comp(ast.finally_block),
      ast.loc
    );
  },
  "Define": function(ast, comp, ctx){
    if(ast.id.type !== "Identifier"){
      throw new Error("Only Identifiers can be defined");
    }
    ctx.defIdentifier(ast.id.value);
    var init = comp(ast.init || {loc: ast.id.loc, type: "Nil"});
    if(init && init.type === "FunctionExpression"){
      init.id = comp(ast.id);
    }
    return e("var", comp(ast.id), init, ast.loc);
  },
};

module.exports = function(ast){

  var undefined_symbols = {};
  var symt_stack = [SymbolTable()];
  var ctx = {
    pushScope: function(){
      symt_stack.unshift(symt_stack[0].push());
    },
    popScope: function(){
      symt_stack.shift();
    },
    defIdentifier: function(id){
      symt_stack[0].set(id, {id: id});
    },
    useIdentifier: function(id){
      if(!symt_stack[0].has(id)){
        undefined_symbols[id] = true;
      }else{
        return symt_stack[0].get(id);
      }
    }
  };

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
    return comp_by_type[ast.type](ast, compile, ctx);
  };

  return {
    estree: compile(ast),
    undefined_symbols: _.keys(undefined_symbols)
  };
};
