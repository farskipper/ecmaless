var _ = require("lodash");
var fs = require("fs");
var main = require("./");
var path = require("path");
var btoa = require("btoa");
var escodegen = require("escodegen");

//parse the CLI args
var args = require("minimist")(process.argv.slice(2), {
    "boolean": [
        "help",
        "version",
        "out",
    ],
    "alias": {
        "help": "h",
        "version": "v",
        "out": "o",
    }
});

if(args.help){
    console.log("");
    console.log("Usage:");
    console.log("");
    console.log("    ecmaless [options] <path>");
    console.log("");
    console.log("Options:");
    console.log("    -v, --version        print ecmaless version");
    console.log("    -h, --help           show this message");
    console.log("    -o, --out            instead of running write the compiled javascript to stdout");
    console.log("");
    return;
}
if(args.version){
    console.log(require("../package.json").version);
    return;
}

if(_.size(args._) === 0){
    console.error("ERROR missing file path");
    return;
}else if(_.size(args._) > 1){
    console.error("ERROR too many file paths given: " + args._.join(" "));
    return;
}

var pase_path = process.cwd();

main({
    start_path: path.resolve(pase_path, args._[0]),
    loadPath: function(path, callback){
        fs.readFile(path, "utf-8", callback);
    },
}, function(err, est){
    if(err){
        console.error(err + "");
        return;
    }

    var out = escodegen.generate(est, {
        sourceMap: true,
        sourceMapRoot: pase_path,
        sourceMapWithCode: true,
    });

    var code = out.code;
    var map = JSON.parse(out.map.toString());
    map.sources = map.sources.map(function(source){
        return path.relative(map.sourceRoot, source);
    });
    delete map.sourceRoot;
    code += "\n//# sourceMappingURL=data:application/json;base64,"
        + btoa(JSON.stringify(map))
        + "\n";

    if(args.out){
        process.stdout.write(code);
    }else{
        eval(code);
    }
});
