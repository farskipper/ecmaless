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

  t.is(tc('ann a=Number def a=1'), 'var a=1;')
  t.is(tc('ann a=Number def a="b"'), 'e:Number a:String|19-22')
  t.is(tc('ann a=String def a=1'), 'e:String a:Number|19-20')
  t.is(tc('def a=1 ann a=Number'), '`a` should be annotated before it\'s defined|12-13')
  t.is(tc('ann a=Number ann a=Number'), '`a` is already annotated|17-18')
})

test('infix', function (t) {
  t.is(tc('def a = 1 + 2'), 'var a=1+2;')
  t.is(tc('def a = 1 - 2'), 'var a=1-2;')
  t.is(tc('def a = 1 * 2'), 'var a=1*2;')
  t.is(tc('def a = 1 / 2'), 'var a=1/2;')
  t.is(tc('def a = 1 % 2'), 'var a=1%2;')

  t.is(tc('def a = 1 + "b"'), 'e:Number a:String|12-15')
  t.is(tc('def a = "b" + 2'), 'e:Number a:String|8-11')

  t.is(tc('def a = "a" + "b"'), 'e:Number a:String|8-11')
  t.is(tc('def a = "a" ++ "b"'), "var a='a'+'b';")
  t.is(tc('def a = "a" ++ 1'), 'e:String a:Number|15-16')

  t.is(tc('def a = 1 and false'), 'e:Boolean a:Number|8-9')
  t.is(tc('def a = true and 1'), 'e:Boolean a:Number|17-18')
  t.is(tc('def a = true and false'), 'var a=true&&false;')
  t.is(tc('def a = true or false'), 'var a=true||false;')
  t.is(tc('def a = true xor false'), 'var a=true?!false:false;')

  t.is(tc('def a = 1 == "b"'), 'e:Number a:String|13-16')
  t.is(tc('def a = {} == {}'), 'Struct is not comparable, only Number,String,Boolean,Nil|8-10')

  t.is(tc('def a = 1 == 2'), 'var a=1===2;')
  t.is(tc('def a = 1 != 2'), 'var a=1!==2;')
  t.is(tc('def a = 1 < 2'), 'var a=1<2;')
  t.is(tc('def a = 1 <= 2'), 'var a=1<=2;')
  t.is(tc('def a = 1 > 2'), 'var a=1>2;')
  t.is(tc('def a = 1 >= 2'), 'var a=1>=2;')
})

test('prefix', function (t) {
  t.is(tc('def a = not 1'), 'e:Boolean a:Number|12-13')
  t.is(tc('def a = not true'), 'var a=!true;')
  t.is(tc('def a = -"s"'), 'e:Number a:String|9-12')
  t.is(tc('def a = -1'), 'var a=-1;')
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

  t.is(tc('ann foo=Fn()Nil def foo=fn() do def a=1 def b=2 end'), 'var foo=function foo(){var a=1;var b=2;};')

  t.is(tc('ann foo=Fn()Nil def foo=fn() do ann a=Number def a=1 end'), 'var foo=function foo(){var a=1;};', 'test that `ann` doesnt break estree')
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

test('type alias', function (t) {
  t.is(tc('def Number=String'), 'Cannot redefine base types|4-10')
  t.is(tc('def Bar=Number'), '')
  t.is(tc('def Bar=Number def Bar=Number'), '`Bar` is already defined|19-22')
  t.is(tc('ann foo=Bar def foo=1'), '`Bar` is not defined|8-11')
  t.is(tc('def Bar=Number ann foo=Bar def foo=1'), 'var foo=1;')
  t.is(tc('def Bar=String ann foo=Bar def foo=1'), 'e:String a:Number|35-36')
})

test('tagged unions', function (t) {
  t.is(tc('def Bar=#a|#b'), '')
  t.is(tc('def Bar=#a'), '')
  t.is(tc('def Bar=#a | #a'), 'Duplicate tag `a`|13-15')
  t.is(tc('def Bar=#a | #a(String)'), 'Duplicate tag `a`|13-15')
  t.is(tc('def Bar=#a | #b'), '')
  t.is(tc('def Bar=#a | #b(String)'), '')

  t.is(tc('def bar=#a'), "var bar=['a'];")
  t.is(tc('def bar=#a(1,"hi")'), "var bar=['a',1,'hi'];")

  t.is(tc('ann bar=String def bar=#a'), 'e:String a:Union|23-25')
  t.is(tc('def Bar=#b|#c ann bar=Bar def bar=#a'), '#a is not one of #b|#c|34-36')
  t.is(tc('def Bar=#a|#b ann bar=Bar def bar=#a'), "var bar=['a'];")
  t.is(tc('def Bar=#a(String)|#b ann bar=Bar def bar=#a'), 'expected 1 arguments but was 0|42-44')
  t.is(tc('def Bar=#a(String)|#b ann bar=Bar def bar=#a(1)'), 'e:String a:Number|45-46')
  t.is(tc('def Bar=#a(String)|#b ann bar=Bar def bar=#a("hi")'), "var bar=['a','hi'];")
})

test('case', function (t) {
  var caseE = 'def out = case bar when #a(name) "hi " ++ name when #b "bye"'
  t.is(tc(caseE), 'Not defined `bar`|15-18')
  t.is(tc('def bar = 1 ' + caseE), 'case only works with tagged unions|27-30')
  t.is(tc('def bar = #a ' + caseE), '#a should have 0 args not 1|37-39')
  t.is(tc('def bar = #a("s") ' + caseE), '#b is not in #a|70-72')
  t.is(tc('def bar = #a("s") ' + caseE), '#b is not in #a|70-72')
  t.is(tc('def Bar=#a(String)|#b|#c ann bar=Bar def bar=#a("s") ' + caseE), 'missing `when #c..`|63-67')
  t.is(tc('def foo=#a("s") def bar=case foo when #a(1) "hi " ++ name'), 'expected a symbol to bind to|41-42')
  t.is(tc('def foo=#a("s") def bar=case foo when #a(name) "hi " ++ name'), "var foo=['a','s'];var bar=function($v0){switch($v0[0]){case'a':var $name$=$v0[1];return'hi '+$name$;}}(foo);")
  t.is(tc('def foo=#a(1) def bar=case foo when #a(name) "hi " ++ name'), 'e:String a:Number|54-58')
  t.is(tc('def foo=#a("s") def bar=case foo when #a(name) "hi " ++ name def baz=name'), 'Not defined `name`|69-73')
  t.is(tc('def Bar=#a(String)|#b ann bar=Bar def bar=#a("s") ' + caseE), "var bar=['a','s'];var out=function($v0){switch($v0[0]){case'a':var $name$=$v0[1];return'hi '+$name$;case'b':return'bye';}}(bar);")

  t.is(tc('def Bar=#a(String)|#b ann bar=Bar def bar=#a("s") def out = case bar when #a(name) name when #b 2'), 'e:String a:Number|96-97')
  t.is(tc('def Bar=#a(String)|#b ann bar=Bar def bar=#a("s") ann out=Number def out = case bar when #a(name) name when #b 2'), 'e:Number a:String|98-102')
})

test('if', function (t) {
  t.is(tc('def out=if a then 1 else 2'), 'Not defined `a`|11-12')
  t.is(tc('def out=if 1 then 1 else 2'), 'must be a Boolean|11-12')
  t.is(tc('def out=if true then 1 else 2'), 'var out=true?1:2;')
  t.is(tc('def out=if true then 1 else "s"'), 'e:Number a:String|28-31')
  t.is(tc('ann out=String def out=if true then 1 else "s"'), 'e:String a:Number|36-37')

  t.is(tc('if true do def a=1 end'), 'if(true){var a=1;}')
  t.is(tc('if true do def a=1 else def a=2 end'), 'if(true){var a=1;}else{var a=2;}')
  t.is(tc('if true do else end'), 'if(true){}else{}')

  t.is(tc('ann foo=Fn()Number def foo=fn()do return 1 end'), 'var foo=function foo(){return 1;};')
  t.is(tc('ann foo=Fn()Number def foo=fn()do return "s" end'), 'e:Number a:String|41-44')
  t.is(tc('ann foo=Fn(Boolean)Number def foo=fn(b)do if b do return 1 end end'), 'a branch does not return|42-66')
  t.is(tc('ann foo=Fn(Boolean)Number def foo=fn(b)do if b do return 1 else return 2 end end'), 'var foo=function foo(b){if(b){return 1;}else{return 2;}};')
  t.is(tc('ann foo=Fn(Boolean)Number def foo=fn(b)do if b do return 1 end return 2 end'), 'var foo=function foo(b){if(b){return 1;}return 2;};')
  t.is(tc('ann foo=Fn(Boolean)Number def foo=fn(b)do if b do return 1 else if b do return 2 end end end'), 'a branch does not return|42-92')
  t.is(tc('ann foo=Fn(Boolean)Number def foo=fn(b)do if b do return 1 else if b do return 2 end return 3 end end'), 'var foo=function foo(b){if(b){return 1;}else{if(b){return 2;}return 3;}};')
})

test('while', function (t) {
  t.is(tc('while a do end'), 'Not defined `a`|6-7')
  t.is(tc('while 1 do end'), 'must be a Boolean|6-7')
  t.is(tc('while true do end'), 'while(true){}')
  t.is(tc('while true do def a=1 end'), 'while(true){var a=1;}')
  t.is(tc('while true do foo() end'), 'Not defined `foo`|14-17')
  t.is(tc('ann foo=Fn()Number def foo=fn()do while true do return "s" end end'), 'a branch does not return|34-66')
  t.is(tc('ann foo=Fn()Number def foo=fn()do while true do return "s" end return 1 end'), 'e:Number a:String|55-58')
  t.is(tc('ann foo=Fn()Number def foo=fn()do while true do if true do return 2 end end return 1 end'), 'var foo=function foo(){while(true){if(true){return 2;}}return 1;};')

  t.is(tc('while true do continue end'), 'while(true){continue;}')
  t.is(tc('while true do break end'), 'while(true){break;}')
})

test('set', function (t) {
  t.is(tc('set a=2'), 'Not defined `a`|4-5')
  t.is(tc('def a=1 set a="s"'), 'e:Number a:String|14-17')
  t.is(tc('def a=1 set a=2'), 'var a=1;a=2;')
})

test('export', function (t) {
  t.is(tc('export(a)'), 'Not defined `a`|7-8')
  t.is(tc('def a=1 export(a)'), "var a=1;return{'a':a};")

  t.is(tc('def a=1 def B=String export(a, B)'), "var a=1;return{'a':a};")

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
  t.is(tcM('import "./log.js" (log is WatDa)'), '`WatDa` is not defined|26-31')
  t.is(tcM('import "./a" (a is String)'), '`is` only works for js imports|19-25')
  t.is(tcM('import "./log.js" (log as foo is String)'), "var foo=$_log_js['log'];")
})

test('generics', function (t) {
  t.is(tc('def m<> = #n|#j(a)'), 'Expected `=`|5-6')
  t.is(tc('def M<> = #n|#j(a)'), 'Expected a type var|6-7')
  t.is(tc('def M<A> = #n|#j(a)'), 'Expected a type var|6-7')
  t.is(tc('def M<a> = #n|#j(a) ann b=M<Number,String>'), 'Trying to give 2 params for M<a>|26-27')
  t.is(tc('def M<a> = #n|#j def M<a> = #n|#j'), '`M` is already defined|21-22')

  t.is(tc('def M<a> = #n|#j(a) ann b=M<Number> def b=#j("s")'), 'e:Number a:String|45-48')
  t.is(tc('def M<a> = #n|#j(a) ann b=M<Number> def b=#j(1)'), "var b=['j',1];")
  t.is(tc('def M<a> = #n|#j(a) ann b=M<String> def b=#j(1)'), 'e:String a:Number|45-46')
  t.is(tc('def M<a> = #n|#j(a) ann b=M<String> def b=#j("s")'), "var b=['j','s'];")
})
