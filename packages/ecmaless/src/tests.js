var _ = require("lodash");
var λ = require("contra");
var fs = require("fs");
var test = require("tape");
var main = require("./");

var StructLoader = function(files){
    return function(path, callback){
        if(_.has(files, path)){
            callback(void 0, files[path]);
        }else if(/\/ecmaless-stdlib\/src\/core.js$/.test(path)){
            fs.readFile(path, "utf-8", callback);
        }else{
            callback(new Error("Unknown path: " + path));
        }
    };
};

test("it", function(t){

    λ.each([
        {
            files: {
                "/test/a": "def a = 1\n\nexport:\n    a",
            },
            out: {a: 1},
        },
    ], function(info, next){
        main({
            base: "/test/",
            start_path: "./a",
            loadPath: StructLoader(info.files)
        }, function(err, js){
            if(err) return next(err);

            t.deepEquals(eval(js), info.out);

            next();
        });
    }, t.end);
});
