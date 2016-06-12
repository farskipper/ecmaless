var _ = require("lodash");
var e = require("estree-builder");
var fs = require("fs");
var lang = require("./lang");
var parser = require("./parser");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");
var toStatement = require("./toESTreeStatement");

var module_loader_src = fs.readFileSync("./module_loader.ecmaless").toString();
var module_loader_ast = parser(module_loader_src);
var module_loader_est = astToTarget(module_loader_ast, lang().target_macros)[0];


var compile = function(ast, options){
  options = options || {};

  var l = lang(options.user_macros);
  return {
    estree: astToTarget(ast, l.target_macros),
    user_macros: l.user_macros
  };
};

var parseFile = function(src){
  var ast = parser(src);
  var deps = {};

  if(ast[0].type === "list"
      && ast[0].value[0].type === "symbol"
      && ast[0].value[0].value === "m"){
    _.each(_.chunk(ast[0].value.slice(1), 2), function(pair){
      var sym = pair[0].value;
      var path = pair[1].value;
      deps[sym] = path;
    });
    ast = ast.slice(1);
  }
  return {
    ast: ast,
    deps: deps
  };
};

var toJSFile = function(estree, options){
  options = options || {};

  if(!_.isArray(estree)){
    estree = [estree];
  }
  return escodegen.generate({
    "loc": _.size(estree) > 0 ? _.head(estree).loc : undefined,
    "type": "Program",
    "body": _.map(estree, toStatement)
  }, options.escodegen);
};

module.exports = function(src, options){
  options = options || {};

  if(!_.has(options, 'files')){
    options.files = {'main': {src: src}};
    src = 'main';
  }

  var modules = _.cloneDeep(options.files);

  var loadModule = function(module){
    if(!_.has(modules, module)){
      throw new Error('Module not found: ' + module);
    }
    if(_.has(modules[module], 'ast')){
      return;//already loaded
    }

    var m = parseFile(modules[module].src);
    modules[module] = m;

    var mkAST = function(type, value){
      var loc = m.ast[0].loc;
      return {type: type, value: value, loc: loc};
    };
    m.module_ast = mkAST('list', [
      mkAST('symbol', 'fn'),
      mkAST('list', [
        mkAST('symbol', '[')
      ].concat(_.map(_.keys(m.deps), function(arg){
        return mkAST('symbol', arg);
      })))
    ].concat(m.ast));

    _.each(m.deps, loadModule);

    //now that all deps have been loaded, we can compile it
    var user_macros = {};

    //TODO load these based on paths given in (m ...)
    if(_.has(modules, ["stdlib", "user_macros"])){
      //TODO load these based on paths given in (m ...)
      user_macros = modules["stdlib"]["user_macros"];
    }

    var c = compile(m.module_ast, _.assign({}, options, {user_macros: user_macros}));
    m.estree = c.estree;
    m.user_macros = c.user_macros;
  };

  loadModule(src);

  var daEST;
  if(_.size(modules) === 1){
    daEST = compile(modules[_.keys(modules)[0]].ast).estree;
  }else{
    daEST = [e('call', module_loader_est, [
      e('object', _.mapValues(modules, function(m){
        return e('array', [
          m.estree
        ].concat(_.map(m.deps, function(dep){
          return e('string', dep);
        })));
      })),
      e('string', src)
    ])];
  }
  return toJSFile(daEST, options);
};
