var fs = require("fs");
var main = require("./");
var path = require("path");
var btoa = require("btoa");

main({
    start_path: path.resolve(process.cwd(), process.argv[2]),
    loadPath: function(path, callback){
        fs.readFile(path, "utf-8", callback);
    },
    common_js: true,
    global_symbols: {
        "require": true,
        "console": true
    },
    escodegen: {
        sourceMap: true,
        sourceMapRoot: process.cwd(),
        sourceMapWithCode: true
    }
}, function(err, out){
    if(err) throw err;
    var code = out.code;
    var map = JSON.parse(out.map.toString());
    map.sources = map.sources.map(function(source){
        return path.relative(map.sourceRoot, source);
    });
    delete map.sourceRoot;
    code += "\n//# sourceMappingURL=data:application/json;base64,"
    + btoa(JSON.stringify(map))
    + "\n";
    process.stdout.write(code);
});
