var _ = require("lodash");
var e = require("estree-builder");
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");
var path_fns = require("path");
var escodegen = require("escodegen");
var req_est_orig = require("./req_est");

var req_est = _.omit(req_est_orig.body[0], "id");

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

var normalizePath = function(base, path){
  if(path[0] === "."){
    return path_fns.resolve(base, path);
  }
  return path;
};

module.exports = function(conf, callback){
  var base = conf.base || process.cwd();
  var start_path = normalizePath(base, conf.start_path);

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
        var dir = path_fns.dirname(path);
        _.each(ast[0].dependencies, function(d){
          deps[d.id.value] = {
            path: normalizePath(dir, d.path.value)
          };
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
      _.each(deps, function(dep){
        load(dep.path, done);
      });
    });
  };

  load(start_path, function(err){
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
      mods.push(e("array", [m.est].concat(_.map(m.deps, function(dep){
        return toReqPath(dep.path);
      })), m.est.loc));
    });
    var est = e("call", req_est, [
      e("array", mods),
      toReqPath(start_path)
    ]);
    callback(void 0, toJSFile(est, conf));
  });
};
