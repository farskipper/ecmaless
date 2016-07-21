var test = require("tape");
var main = require("./");

test("it", function(t){

  main({
    start_path: "./a",
    loadPath: function(path, callback){
      if(path === "./a"){
        callback(undefined, "deps:\n    b \"./b\"\n\nb");
        return;
      }
      if(path === "./b"){
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
