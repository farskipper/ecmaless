# ecmaless-compiler

[![Build Status](https://travis-ci.org/farskipper/ecmaless.svg?branch=master)](https://travis-ci.org/farskipper/ecmaless)

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
