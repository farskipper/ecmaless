var _ = require("lodash");
var fs = require("fs");
var lang = require("./lang");
var parser = require("./parser");
var escodegen = require("escodegen");
var astToTarget = require("./ast-to-target");
var toStatement = require("./toESTreeStatement");

var module_loader_ast = parser(fs.readFileSync("./module_loader.ecmaless").toString());


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

    var p = parseFile(modules[module].src);
    modules[module].ast = p.ast;
    modules[module].deps = p.deps;
    _.each(p.deps, loadModule);
  };

  loadModule(src);

  var mkAST = function(type, value){
    var loc = modules[src].ast[0].loc;
    return {type: type, value: value, loc: loc};
  };

  var daAST = mkAST('list', module_loader_ast.concat([
    mkAST('list', [
      mkAST('symbol', '{')
    ].concat(_.flatten(_.map(modules, function(m, module){
      return [
        mkAST('string', module),
        mkAST('list', [
          mkAST('symbol', '['),
          mkAST('list', [
            mkAST('symbol', 'fn'),
            mkAST('list', [
              mkAST('symbol', '[')
            ].concat(_.map(_.keys(m.deps), function(arg){
              return mkAST('symbol', arg);
            })))
          ].concat(m.ast))
        ].concat(_.map(m.deps, function(dep){
          return mkAST('string', dep);
        })))
      ];
    })))),
    mkAST('string', src)
  ]));

  if(_.size(modules) === 1){
    daAST = modules[_.keys(modules)[0]].ast;
  }

  var compiled = compile(daAST, options);
  return toJSFile(compiled.estree, options);
};
