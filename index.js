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

module.exports = function(conf, callback){

  var modules = {};

  var load = function(path, callback){

    conf.loadPath(path, function(err, src){
      if(err)return callback(err);

      var ast = parser(src);
      var c = compiler(ast);

      modules[path] = {
        src: src,
        ast: ast,
        est: c.estree
      };

      callback();
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
