var _ = require("lodash");
var e = require("estree-builder");
var parser = require("ecmaless-parser");
var stdlibLoader = require("ecmaless-stdlib/loader");
var esprima = require("esprima");
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

var toJSProgram = function(estree, opts){
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

var loadJSModule = function(src){
  return {
    est: e("fn", [], [
      e("var", "module", e("object", {exports: e("object", {})}))
    ].concat(esprima.parse(src).body).concat([
      e("return", e("id", "module.exports"))
    ])),
    deps: {},
  };
};

var loadEcmaLessModule = function(src, path, global_symbols){
  var ast = parser(src, {filepath: path});
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
        loc: d.path.loc,
        path: normalizePath(dir, d.path.value)
      };
      mast[0].params.push(d.id)
    });
    mast[0].block.body = ast.slice(1);
  }else{
    mast[0].block.body = ast;
  }

  var c = compiler(mast);

  _.each(c.undefined_symbols, function(info, sym){
    var stdlib_sym = sym;
    if(sym.indexOf("$$$ecmaless$$$") === 0){
      stdlib_sym = sym.substring(14);
    }
    var ld = stdlibLoader(stdlib_sym);
    if(ld){
      c.estree[0].params.push(e("id", info.js_id, info.loc));
      deps[sym] = {
        loc: info.loc,
        path: "stdlib://" +stdlib_sym
      };
    }else{
      if(_.has(global_symbols, sym)){
        return;
      }
      throw new Error("Undefined symbol: " + sym);
    }
  });

  return {
    est: c.estree[0],
    deps: deps,
  };
};

var loadKeyFromModule = function(opts){
  return {
    est: e("fn", ["o"], [
      e("return", e("get", e("id", "o"), e("str", opts.key)))
    ]),
    deps: {
      o: {
        loc: opts.loc,
        path: opts.main_path
      }
    },
  };
};

var asyncEach = function(obj, iter, callback){
  if(_.isEmpty(obj)){
    return callback();
  }
  var done = (function(){
    var has_errored = false;
    var after = _.after(_.size(obj), callback);
    return function(err){
      if(has_errored) return;
      if(err){
        has_errored = true;
        callback(err);
        return;
      }
      after();
    };
  }());
  _.each(obj, function(v){
    iter(v, done);
  });
};

module.exports = function(conf, callback){
  var base = conf.base || process.cwd();
  var start_path = normalizePath(base, conf.start_path);
  var global_symbols = conf.global_symbols || {};

  var loadPath = function(path, callback){
    if(/^stdlib\:\/\//.test(path)){
      var sym = path.replace(/^stdlib\:\/\//, "");
      callback(undefined, {
        //TODO loc:
        key: sym,
        main_path: stdlibLoader(sym)
      });
      return;
    }
    conf.loadPath(path, callback);
  };

  var modules = {};

  var load = function load(path, callback){
    if(_.has(modules, path)){
      return callback();
    }
    loadPath(path, function(err, src){
      if(err)return callback(err);

      try{
        if(_.has(src, "key")){
          modules[path] = loadKeyFromModule(src);
        }else if(/\.js$/.test(path)){
          modules[path] = loadJSModule(src);
        }else{
          modules[path] = loadEcmaLessModule(src, path, global_symbols);
        }
      }catch(err){
        callback(err);
        return;
      }
      asyncEach(modules[path].deps, function(dep, done){
        load(dep.path, done);
      }, callback);
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

    var toReqPath = function(path, loc){
      return e("number", path_to_i[path], loc);
    };

    var mods = [];
    _.each(modules, function(m, path){
      mods.push(e("array", [m.est].concat(_.map(m.deps, function(dep){
        return toReqPath(dep.path, dep.loc);
      })), m.est.loc));
    });
    var est = e("call", req_est, [e("array", mods), toReqPath(start_path)]);
    callback(void 0, toJSProgram(est, conf));
  });
};
