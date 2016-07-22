var test = require("tape");
var main = require("./");

test("it", function(t){

  main({
    start_path: "./a",
    loadPath: function(path, callback){
      if(/\/a$/.test(path)){
        callback(undefined, "deps:\n    b \"./b\"\n\nb");
        return;
      }
      if(/\/b$/.test(path)){
        callback(undefined, "100");
        return;
      }
      callback(new Error("Unknown path: " + path));
    }
  }, function(err, js){
    if(err) return t.end(err);

    t.equals(eval(js), 100);

    t.end();
  });
});
