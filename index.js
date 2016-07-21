var _ = require("lodash");
var e = require("estree-builder");
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");
var escodegen = require("escodegen");

var toJSFile = function(estree, opts){
  opts = opts || {};

  if(!_.isArray(estree)){
    estree = [estree];
  }
  return escodegen.generate({
    "loc": _.size(estree) > 0 ? _.head(estree).loc : undefined,
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

      var p = extractDeps(parser(src, {filename: path}));
      var c = compiler(p.ast);

      modules[path] = {
        src: src,
        ast: p.ast,
        est: c.estree
      };

      if(_.isEmpty(p.deps)){
        return callback();
      }
      var done = (function(){
        var error;
        var after = _.after(_.size(p.deps), function(){
          callback(error);
        });
        return function(err){
          if(!error && err){
            error = err;
          }
          after();
        };
      }());
      _.each(p.deps, function(dep){
        load(dep.path.value, done);
      });
    });
  };

  load(conf.start_path, function(err){
    if(err)return callback(err);

    var mods = {};
    _.each(modules, function(m, path){
      mods[path] = e("array", [e("fn", [], m.est)]);
    });
    var est = e("call",
        e("fn", ["mdefs", "main"], []),
        [e("object", mods), e("string", conf.start_path)]);
    callback(void 0, toJSFile(est, conf));
  });
};
