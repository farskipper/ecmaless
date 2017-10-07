var _ = require("lodash");
var λ = require("contra");
var e = require("estree-builder");
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");
var path_fns = require("path");
var escodegen = require("escodegen");
var DependencyResolver = require("dependency-resolver");

var normalizePath = function(base, path){
    if(path[0] === "."){
        return path_fns.resolve(base, path);
    }
    return path;
};

module.exports = function(conf, callback){
    var base = conf.base || process.cwd();
    var start_path = normalizePath(base, conf.start_path);

    var module_ast = {};
    var resolver = new DependencyResolver();

    var parseModules = function parseModules(path, callback){
        if(_.has(module_ast, path)){
            callback();
            return;
        }

        conf.loadPath(path, function(err, src){
            if(err) return callback(err);

            var ast = parser(src, {filepath: path});

            module_ast[path] = ast;
            resolver.add(path);

            var ast0 = _.head(ast);
            if(ast0 && ast0.type === "ImportBlock"){
                λ.each(ast0.modules, function(m, next){
                    //TODO resolve relative to curr path
                    var dep_path = normalizePath(base, m.path.value);

                    resolver.setDependency(path, dep_path);

                    parseModules(dep_path, next);

                }, callback);
            }else{
                callback();
            }
        });
    };


    parseModules(start_path, function(err){
        if(err) return callback(err);

        var paths_to_comp = resolver.sort();

        var body = [];
        var modules = {};

        _.each(paths_to_comp, function(path, mod_index){
            var ast = module_ast[path];

            var c = compiler(ast, {
                requireModule: function(path){
                    //TODO resolve relative to curr path
                    path = normalizePath(base, path);

                    return modules[path];
                },
            });

            c.mod_index = mod_index;
            modules[path] = c;

            var args = [];
            _.each(c.modules, function(path){
                //TODO resolve relative to curr path
                path = normalizePath(base, path);
                var i = _.indexOf(paths_to_comp, path);
                args.push(e("id", "$mod$" + i));
            });
            body.push(e("var", "$mod$" + mod_index, e("call", c.estree, args)));
        });

        var main_mod = "$mod$" + _.indexOf(paths_to_comp, start_path);

        body.push(e(";", e("=", e("id", "module.exports"), e("id", main_mod))));


        var est = {
            "type": "Program",
            "body": body,
        };

        var esout = escodegen.generate(est, conf.escodegen);

        callback(null, esout);
    });
};
