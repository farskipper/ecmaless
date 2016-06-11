var _ = require("lodash");
var test = require("tape");
var compile = require("./");

test("modules", function(t){

  t.equals(eval(compile('./a', {
    files: {
      './a': {
        src: '(m b "./b") (console.log b)'
      },
      './b': {
        src: ":im-b-ok?"
      }
    },
    escodegen: {format: {compact: true}}
  })), "im-b-ok?");

  t.end();
});
