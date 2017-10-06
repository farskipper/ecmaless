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
                "/test/a": "deps:\n    b \"./b\"\n\nb",
                "/test/b": "100"
            },
            out: 100
        },
        {
            files: {
                "/test/a": "def a=1\nisNumber(a)",
            },
            out: true
        },
        {
            files: {
                "/test/a": "if(0):\n    return 1\n2",
            },
            out: 1
        },
        {
            files: {
                "/test/a": "deps:\n    b \"./sub/b\"\nb + 1",
                "/test/sub/b": "deps:\n    c \"./c\"\nc + 2",
                "/test/sub/c": "4",
            },
            out: 7
        },
        {
            files: {
                "/test/a": "deps:\n    b \"./b.js\"\nb",
                "/test/b.js": "var a = 1, b = 2;module.exports = a + b;"
            },
            out: 3
        },
        {
            files: {
                "/test/a": "truthy(1) ? 2 && 3 : 4"
            },
            out: 3
        }
    ], function(info, next){
        main({
            base: "/test/",
            start_path: "./a",
            loadPath: StructLoader(info.files)
        }, function(err, js){
            if(err) return next(err);

            t.equals(eval(js), info.out);

            next();
        });
    }, t.end);
});

test("global_symbols", function(t){
    var run = function(src, callback){
        main({
            base: "/test/",
            start_path: "./a",
            loadPath: StructLoader({"/test/a": src}),
            global_symbols: {global1: true}
        }, callback);
    };
    run("wat", function(err){
        t.equals("Error: Undefined symbol: wat", err + "");
        run("global1", t.end);
    });
});

test("consistent module layout", function(t){
    var run = function(use_random, callback){
        main({
            base: "/test/",
            start_path: "./a",
            loadPath: function(path, callback){
                if(path === "/test/a"){
                    callback(void 0, "deps:\n" + "bcdefghijkl".split("").map(function(l){
                        return "    " + l + " " + JSON.stringify(l);
                    }).join("\n") + "\n\nb()");
                    return;
                }
                if(use_random){
                    setTimeout(function(){
                        callback(void 0, JSON.stringify(path));
                    }, _.random(0, 10));
                    return;
                }
                callback(void 0, JSON.stringify(path));
            },
            global_symbols: {global1: true}
        }, callback);
    };
    run(false, function(err, expected_js){
        if(err)return t.end(err);
        λ.each(_.range(0, 1), function(info, next){
            run(true, function(err, actual_js){
                if(err)return next(err);
                t.equals(actual_js, expected_js);
                next();
            });
        }, t.end);
    });
});
