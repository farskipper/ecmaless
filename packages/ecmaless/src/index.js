var e = require("estree-builder");
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");
var path_fns = require("path");
var escodegen = require("escodegen");

var normalizePath = function(base, path){
    if(path[0] === "."){
        return path_fns.resolve(base, path);
    }
    return path;
};

module.exports = function(conf, callback){
    var base = conf.base || process.cwd();
    var start_path = normalizePath(base, conf.start_path);

    conf.loadPath(start_path, function(err, src){
        if(err) return callback(err);

        var esout;
        try{
            var ast = parser(src, {filepath: start_path});
            var c = compiler(ast);

            var est = {
                "loc": c.estree.loc,
                "type": "Program",
                "body": [e("call", c.estree, [], c.estree.loc)],
            };
            esout = escodegen.generate(est, conf.escodegen);
        }catch(e){
            callback(e);
            return;
        }

        callback(null, esout);
    });
};
