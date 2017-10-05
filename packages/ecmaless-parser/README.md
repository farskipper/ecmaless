# ecmaless-parser

[![Build Status](https://travis-ci.org/farskipper/ecmaless.svg?branch=master)](https://travis-ci.org/farskipper/ecmaless)

Parser for the ecmaless language

## API
### ast = parser(src[, options])
 * `options.filepath` string for the name/path of the file you are parsing. This is used for error messages and source maps.

This function will throw errors when it can't parse. When applicable, the Error object may have a where property. i.e.
```js
try{
  parser("def add = fn (a, b]:\n    a + b", {filepath: "foo/bar"});
}catch(err){
  console.log(err.message);
  console.log("-------------------------------");
  console.log(err.where);
}
```
```js
No possible parsings
foo/bar:1:13
 
def add = fn (a, b]:
             ^
-------------------------------
{ filepath: 'foo/bar',
  line: 1,
  col: 13,
  excerpt: 'def add = fn (a, b]:\n             ^\n    a + b' }
```

## AST Specification
See [spec.md](https://github.com/farskipper/ecmaless-parser/blob/master/spec.md).

## License
MIT
