var test = require("tape");
var main = require("./");

test("it", function(t){

  main({
    start_path: "./a",
    loadPath: function(path, callback){
      if(path === "./a"){
        callback(undefined, "def a = 1");
        return;
      }
      callback(new Error("Unknown path: " + path));
    }
  }, function(err, js){
    if(err) return t.end(err);

    t.equals(js, "");

    t.end();
  });
});
