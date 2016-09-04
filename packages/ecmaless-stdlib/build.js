var fs = require("fs");
var path = require("path");
var core = require("./src/core");

var lookup = {};

fs.readdirSync(path.resolve(__dirname, "src/")).forEach(function(filename){
  var file = path.join("src", filename);

  if(filename === "core.js"){
    Object.keys(core).forEach(function(sym){
      lookup[sym] = {file: file, key: sym};
    });
    return;
  }
  var sym = filename.split(".")[0];
  lookup[sym] = {file: file};
});

var index = "";
var index_part2 = "";
index += "deps:\n";
index += "    core \"./src/core.js\"\n";
core.iterate(lookup, function(o, sym){
  if(!/core\.js$/.test(o.file)){
    index += "    " + sym + " " + JSON.stringify("./" + o.file) + "\n";
    index_part2 += "stdlib." + sym + " = " + sym + "\n";
  }
  return true;
});
index += "\ndef stdlib = core\n";
index += index_part2;
index += "stdlib";

fs.writeFileSync("./lookup.json", JSON.stringify(lookup, void 0, 2));
fs.writeFileSync("./index.ecmaless", index);
