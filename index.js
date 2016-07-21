var _ = require("lodash");
var e = require("estree-builder");
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");
var escodegen = require("escodegen");

var getMainLoc = function(tree){
  if(!_.isArray(tree)){
    return tree && tree.loc;
  }
  var parts = _.flattenDeep(tree);
  var first_loc;
  var last_loc;
  var i = 0;
  while(i < parts.length){
    if(_.has(parts[i], "loc")){
      first_loc = parts[i].loc;
      break;
    }
    i++;
  }
  i = parts.length - 1;
  while(i >= 0){
    if(_.has(parts[i], "loc")){
      last_loc = parts[i].loc;
      break;
    }
    i--;
  }
  if(!first_loc || !last_loc){
    return;
  }
  return {
    start: first_loc.start,
    end: first_loc.end
  };
};

var toJSFile = function(estree, opts){
  opts = opts || {};

  if(!_.isArray(estree)){
    estree = [estree];
  }
  return escodegen.generate({
    "loc": getMainLoc(estree),
    "type": "Program",
    "body": estree
  }, opts.escodegen);
};

var extractDeps = function(ast){
  var deps = {};
  var new_ast = ast;
  if(ast[0] && ast[0].type === "Dependencies"){
    _.each(ast[0].dependencies, function(d){
      deps[d.id.value] = d;
    });
    new_ast = ast.slice(1);
  }
  return {deps: deps, ast: new_ast};
};

module.exports = function(conf, callback){

  var modules = {};

  var load = function load(path, callback){
    if(_.has(modules, path)){
      return callback();
    }
    conf.loadPath(path, function(err, src){
      if(err)return callback(err);

      var ast = parser(src, {filename: path});
      var mloc = getMainLoc(ast);
      var mast = [
        {
          loc: mloc,
          type: "Function",
          params: [],
          block: {
            loc: mloc,
            type: "Block",
            body: []
          }
        }
      ];
      var deps = {};
      if(ast[0] && ast[0].type === "Dependencies"){
        _.each(ast[0].dependencies, function(d){
          deps[d.id.value] = d.path.value;
          mast[0].params.push(d.id)
        });
        mast[0].block.body = ast.slice(1);
      }else{
        mast[0].block.body = ast;
      }

      var c = compiler(mast);

      modules[path] = {
        src: src,
        ast: ast,
        est: c.estree[0],
        mast: mast,
        deps: deps,
      };

      if(_.isEmpty(deps)){
        return callback();
      }
      var done = (function(){
        var error;
        var after = _.after(_.size(deps), function(){
          callback(error);
        });
        return function(err){
          if(!error && err){
            error = err;
          }
          after();
        };
      }());
      _.each(deps, function(path){
        load(path, done);
      });
    });
  };

  load(conf.start_path, function(err){
    if(err)return callback(err);

    var path_to_i = {};
    var i = 0;
    _.each(modules, function(m, path){
      path_to_i[path] = i;
      i++;
    });

    var toReqPath = function(path){
      return e("number", path_to_i[path]);
    };

    var mods = [];
    _.each(modules, function(m, path){
      mods.push(e("array", [m.est].concat(_.map(m.deps, toReqPath)), m.est.loc));
    });
    var est = e("call",
        e("fn", ["mdefs", "main"], []),
        [e("array", mods), toReqPath(conf.start_path)]);
    callback(void 0, toJSFile(est, conf));
  });
};
