var _ = require('lodash')
var test = require('ava')
var parser = require('ecmaless-parser')
var compiler = require('./')
var escodegen = require('escodegen')
var okOrError = require('./src/okOrError')
var Ok = okOrError.Ok
var Error = okOrError.Error
var notOk = okOrError.notOk

function compToStr (src, conf) {
  var ast = parser(src)
  if (notOk(ast)) {
    return ast
  }
  var out = compiler(ast.tree, conf)
  if (notOk(out)) {
    return out
  }
  var est = out.value.estree
  var js = escodegen.generate(est, {format: {compact: true}})
  return Ok(js)
}

function tc (src, conf) {
  var out = compToStr(src, conf)
  if (notOk(out)) {
    var estr = out.message + '|'
    if (out.loc && out.loc.start) {
      estr += out.loc.start
    }
    estr += '-'
    if (out.loc && out.loc.end) {
      estr += out.loc.end
    }
    var m = /^expected `([^`]+)` but was `([^`]+)`(.*)/.exec(estr)
    if (m) {
      return 'e:' + m[1] + ' a:' + m[2] + m[3]
    }
    return estr
  }
  return out.value
}

test('compile', function (t) {
  t.is(tc('def a = 100.25'), 'var a=100.25;')
  t.is(tc('def a = 1 def a = 2'), '`a` is already defined|14-15')
  t.is(tc('def a = b'), 'Not defined `b`|8-9')

  t.is(tc('def a = "b"'), "var a='b';")

  t.is(tc('def a = 1 + 2'), 'var a=1+2;')

  t.is(tc('def a = 1 + "b"'), 'e:Number a:String|12-15')
  t.is(tc('def a = "b" + 2'), 'e:Number a:String|8-11')

  t.is(tc('def a = "a" + "b"'), 'e:Number a:String|8-11')
  t.is(tc('def a = "a" ++ "b"'), "var a='a'+'b';")
  t.is(tc('def a = "a" ++ 1'), 'e:String a:Number|15-16')

  t.is(tc('ann a=Number def a=1'), 'var a=1;')
  t.is(tc('ann a=Number def a="b"'), 'e:Number a:String|19-22')
  t.is(tc('ann a=String def a=1'), 'e:String a:Number|19-20')
  t.is(tc('def a=1 ann a=Number'), '`a` should be annotated before it\'s defined|12-13')
  t.is(tc('ann a=Number ann a=Number'), '`a` is already annotated|17-18')
})

test('functions', function (t) {
  t.is(tc('ann add=Fn(Number, Number) Number'), '')
  t.is(tc('def add=fn(a,b)a+b'), 'Sorry, this function type was not infered, add an annotation|8-10')
  t.is(tc('ann add=Fn(Number, Number)Number def add=fn()1'), 'Expected 2 params not 0|41-43')
  t.is(tc('ann one=Fn()Number def one=fn()1'), 'var one=function one(){return 1;};')
  t.is(tc('ann add=Fn(Number,String)Number def add=fn(a,b)a+b'), 'e:Number a:String|49-50')
  t.is(tc('ann add=Fn(Number,Number)String def add=fn(a,b)a+b'), 'e:String a:Number|48-49')

  var addEl = 'ann add=Fn(Number,Number)Number def add=fn(a,b)a+b'
  var addJs = 'var add=function add(a,b){return a+b;};'
  t.is(tc(addEl), addJs)
  t.is(tc('def add=1 add()'), 'not a function|10-13')
  t.is(tc(addEl + ' add()'), 'expected 2 params but was 0|54-55')
  t.is(tc(addEl + ' add(1)'), 'expected 2 params but was 1|54-55')
  t.is(tc(addEl + ' add(1,"a")'), 'e:Number a:String|57-60')
  t.is(tc(addEl + ' add(1,2)'), addJs + 'add(1,2);')
  t.is(tc(addEl + ' ann a=String def a=add(1,2)'), 'e:String a:Number|70-73')
})

test('struct', function (t) {
  t.is(tc('def foo={}'), 'var foo={};')
  t.is(tc('def foo={a: 1}'), "var foo={'a':1};")
  t.is(tc('def foo={a: 1, b: 2}'), "var foo={'a':1,'b':2};")
  t.is(tc('def foo={a: 1, a: 2}'), 'Duplicate key `a`|15-16')

  t.is(tc('ann foo={a: Number}'), '')
  t.is(tc('ann foo={a: Number} def foo={a: 1}'), "var foo={'a':1};")

  t.is(tc('ann foo={a: Number} def foo={a: 1, b: 2}'), 'expected {a} but was {a,b}|28-40')
  t.is(tc('ann foo={a: Number} def foo={a: "hi"}'), 'e:Number a:String|32-36')

  t.is(tc('def foo=1 def bar=foo.a + 1'), 'e:Struct a:Number|18-21')
  t.is(tc('def foo={a:"hi"} def bar=foo.a + 1'), 'e:Number a:String|29-30')
  t.is(tc('def foo={a: 1} def bar=foo.b + 1'), 'Key `b` not found on {a}|27-28')
  t.is(tc('def foo={a: 1} def bar=foo.a + 1'), "var foo={'a':1};var bar=foo['a']+1;")
})

test('export', function (t) {
  t.is(tc('export(a)'), 'Not defined `a`|7-8')
  t.is(tc('def a=1 export(a)'), "var a=1;return{'a':a};")

  t.is(tc('export *'), '`export *` is not yet supported|7-8')
})

test('import', function (t) {
  var modules = {
    './a': {
      a: {tag: 'Number'}
    },
    './b': {
      foo: {tag: 'Number'},
      Bar: {tag: 'Number'},
      baz: {tag: 'String'}
    },
    './log.js': {
      log: console.log
    }
  }
  var tcM = _.partialRight(tc, {
    requireModule: function (path, loc) {
      var m = modules[path]
      if (!m) {
        return Error(loc, 'Module not found: ' + path)
      }
      var module
      if (/\.js$/.test(path)) {
        module = {isJs: true, value: m}
      } else {
        module = {TYPE: {typ: {byKey: m}}}
      }
      return Ok({
        id: '$' + path.replace(/[^a-z0-9]+/ig, '_'),
        module: module
      })
    }
  })

  t.is(tcM('import "404" *'), 'Module not found: 404|7-12')
  t.is(tcM('import "./a" *'), "var a=$_a['a'];")
  t.is(tcM('import "./a" (a)'), "var a=$_a['a'];")
  t.is(tcM('import "./a" (z)'), './a does not export `z`|14-15')
  t.is(tcM('def a=1 import "./a" *'), '`a` is already defined, use `as` to rename|15-20')
  t.is(tcM('def a=1 import "./a" (a)'), '`a` is already defined, use `as` to rename|22-23')

  t.is(tcM('import "./b" *'), "var foo=$_b['foo'];var baz=$_b['baz'];")
  t.is(tcM('import "./b" (foo)'), "var foo=$_b['foo'];")
  t.is(tcM('import "./b" (baz)'), "var baz=$_b['baz'];")

  t.is(tcM('import "./b" (foo as wat)'), "var wat=$_b['foo'];")
  t.is(tcM('import "./b" (foo as wat) def foo=1'), "var wat=$_b['foo'];var foo=1;")
  t.is(tcM('import "./b" (foo as wat) def wat=1'), '`wat` is already defined|30-33')
  t.is(tcM('def foo=1 import "./b" (foo as wat)'), "var foo=1;var wat=$_b['foo'];")
  t.is(tcM('def wat=1 import "./b" (foo as wat)'), '`wat` is already defined, use `as` to rename|31-34')

  t.is(tcM('import "./log.js" *'), 'Can\'t use * on js imports|7-17')
  t.is(tcM('import "./log.js" (log)'), 'Must annotate js imports using `is`|19-22')
  t.is(tcM('import "./log.js" (log is String)'), "var log=$_log_js['log'];")
  t.is(tcM('import "./log.js" (log is Fn(String) String)'), "var log=$_log_js['log'];")
  t.is(tcM('import "./log.js" (log is WatDa)'), '`WatDa` is not a defined type|26-31')
  t.is(tcM('import "./a" (a is String)'), '`is` only works for js imports|19-25')
  t.is(tcM('import "./log.js" (log as foo is String)'), "var foo=$_log_js['log'];")
})
