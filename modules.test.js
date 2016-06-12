var _ = require("lodash");
var test = require("tape");
var compile = require("./");

test("modules", function(t){

  var tc = function(files, expected){
    t.equals(eval(compile(_.keys(files)[0], {
      files: files
    })), expected);
  };

  tc({
    './a': {
      src: '(m b "./b") b'
    },
    './b': {
      src: ":im-b-ok?"
    }
  }, "im-b-ok?");

  tc({
    './a': {
      src: '(m def-a "stdlib") (def-a 3) a'
    },
    'stdlib': {
      src: "(defmacro def-a [val] '('def 'a val))"
    }
  }, 3);

  t.end();
});
