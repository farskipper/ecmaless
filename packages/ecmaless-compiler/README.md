# ecmaless-compiler

[![build status](https://secure.travis-ci.org/farskipper/ecmaless-compiler.svg)](https://travis-ci.org/farskipper/ecmaless-compiler)

ecmaless AST -> ESTree

```js
var parser = require("ecmaless-parser");
var compiler = require("ecmaless-compiler");

var src = ...//get your ecmaless source code string

var ast = parser(src);

var c = compiler(ast);

c.estree //now pass this into a javascript code generator like escodegen

c.undefined_symbols //this is an array of strings (symbols) that were not defined in the code.
```

## License
MIT
