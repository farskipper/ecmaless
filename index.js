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

  var l = lang(options.target_macros);
  var estree = astToTarget(ast, l.target_macros);
  if(options.export_type !== 'macro'){
    return {
      estree: estree
    };
  }
  //TODO actually bundle each macro with it's dependancies then execute the whole bundle
  var macro_fn = eval('(' + escodegen.generate(estree) + '())');
  return {
    estree: estree,
    macro_fn: macro_fn
  };
};

var parseFile = function(src){
  var ast = parser(src);
  var deps = {};

  if(ast[0].type === "list"
      && ast[0].value[0].type === "symbol"
      && ast[0].value[0].value === "deps"){
    _.each(_.chunk(ast[0].value.slice(1), 2), function(pair){
      var sym = pair[0].value;
      var path = pair[1].value;
      deps[sym] = path;
    });
    ast = ast.slice(1);
  }
  var last_node = _.last(ast);
  var export_type = 'value';
  if(last_node
      && last_node.type === "list"
      && last_node.value[0]
      && last_node.value[0].type === "symbol"
      && last_node.value[0].value === "macro"){
    export_type = 'macro';
  }
  return {
    ast: ast,
    deps: deps,
    export_type: export_type
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
    var target_macros = {};

    _.each(m.deps, function(path, symbol){
      var export_type = _.get(modules, [path, "export_type"]);
      if(export_type === 'macro'){
        target_macros[symbol] = _.get(modules, [path, "macro_fn"]);
        delete m.deps[symbol];
      }
    });

    var c = compile(m.module_ast, _.assign({}, m, options, {target_macros: target_macros}));
    m.estree = c.estree;
    m.macro_fn = c.macro_fn;
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
