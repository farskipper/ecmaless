var λ = require("contra");
var _ = require("lodash");
var test = require("tape");
var main = require("./");

var StructLoader = function(files){
  return function(path, callback){
    if(_.has(files, path)){
      callback(undefined, files[path]);
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
