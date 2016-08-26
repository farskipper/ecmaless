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

var nativejs_infix_ops = {
  "<": true,
  "<=": true,
  ">": true,
  ">=": true,
  "+": true,
  "-": true,
  "*": true,
  "/": true,
  "%": true,
};

var wrapTruthyTest = function(test){
  var loc = test.loc;
  if(test && test.type === "BinaryExpression" && test.operator === "==="){
    return test;
  }
  return e("call", e("id", "$$$ecmaless$$$truthy", loc), [test], loc);
};

var comp_by_type = {
  "Number": function(ast, comp){
    return e("number", ast.value, ast.loc);
  },
  "String": function(ast, comp){
    return e("string", ast.value, ast.loc);
  },
  "Identifier": function(ast, comp, ctx){
    ctx.useIdentifier(ast.value, ast.loc);
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
  "Function": function(ast, comp, ctx){
    ctx.pushScope();
    var params = [];
    var body = [];
    if(ast.params && ast.params.type === "Identifier"){
      ctx.defIdentifier(ast.params.value);
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
          ctx.defIdentifier(p.value.value);
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
          ctx.defIdentifier(p.value);
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
    _.each(ast.block.body, function(b, i){
      if((i === _.size(ast.block.body) - 1) && b.type === "ExpressionStatement"){
        body.push(e("return", comp(b.expression), b.loc));
      }else{
        body.push(comp(b));
      }
    });
    ctx.popScope();
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
    if(ast.op === "-" || ast.op === "+"){
      return e(ast.op, comp(ast.arg), ast.loc);
    }
    return e("call", e("id", toId(ast.op), ast.loc), [comp(ast.arg)], ast.loc);
  },
  "InfixOperator": function(ast, comp){
    if(nativejs_infix_ops.hasOwnProperty(ast.op)){
      return e(ast.op, comp(ast.left), comp(ast.right), ast.log);
    }
    if(ast.op === "=="){
      return e("===", comp(ast.left), comp(ast.right), ast.log);
    }
    if(ast.op === "!="){
      return e("!==", comp(ast.left), comp(ast.right), ast.log);
    }
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
      left.callee.name = "$$$ecmaless$$$set";
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
    return e("call", e("id", "$$$ecmaless$$$get", ast.loc), [
      comp(ast.object),
      path
    ], ast.loc);
  },
  "ConditionalExpression": function(ast, comp){
    return e("?",
      wrapTruthyTest(comp(ast.test)),
      comp(ast.consequent),
      comp(ast.alternate),
      ast.loc
    );
  },
  "Block": function(ast, comp, ctx){
    ctx.pushScope();
    var body = comp(ast.body);
    ctx.popScope();
    return e("block", body, ast.loc);
  },
  "ExpressionStatement": function(ast, comp){
    return e(";", comp(ast.expression), ast.loc);
  },
  "Return": function(ast, comp){
    return e("return", comp(ast.expression), ast.loc);
  },
  "If": function(ast, comp){
    var test = comp(ast.test);
    var then = comp(ast.then);
    var els_ = ast["else"] ? comp(ast["else"]) : void 0;
    return e("if", wrapTruthyTest(test), then, els_, ast.loc)
  },
  "Cond": function(ast, comp){
    var prev = ast["else"]
      ? comp(ast["else"])
      : undefined;
    var i = _.size(ast.blocks) - 1;
    while(i >= 0){
      var block = ast.blocks[i];
      prev = e("if",
        wrapTruthyTest(comp(block.test)),
        comp(block.block),
        prev,
        block.loc
      );
      i--;
    }
    return prev;
  },
  "Case": function(ast, comp){
    var mkTest = function(val){
      return e("===", comp(ast.to_test), comp(val), val.loc);
    };
    var prev = ast["else"]
      ? comp(ast["else"])
      : undefined;
    var i = _.size(ast.blocks) - 1;
    while(i >= 0){
      var block = ast.blocks[i];
      prev = e("if",
        mkTest(block.value),
        comp(block.block),
        prev,
        block.loc
      );
      i--;
    }
    return prev;
  },
  "While": function(ast, comp){
    return e("while", wrapTruthyTest(comp(ast.test)), comp(ast.block), ast.loc);
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
      comp(ast.catch_id),
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
    useIdentifier: function(id, loc){
      if(!symt_stack[0].has(id)){
        if(!_.has(undefined_symbols, id)){
          undefined_symbols[id] = {loc: loc};
        }
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
    undefined_symbols: undefined_symbols
  };
};
