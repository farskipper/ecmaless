var _ = require("lodash");
var test = require("tape");
var compile = require("./");

test("modules", function(t){

  var src = compile('./a', {
    files: {
      './a': {
        src: '(m b "./b") b'
      },
      './b': {
        src: ":im-b-ok?"
      }
    }
  });

  t.equals(eval(src), "im-b-ok?");

  t.end();
});
