var _ = require('lodash')
var test = require('ava')
var parser = require('ecmaless-parser2')
var compiler = require('../')
var escodegen = require('escodegen')
var okOrError = require('../src/okOrError')
var Ok = okOrError.Ok
var notOk = okOrError.notOk

var compToStr = function (src) {
  var ast = parser(src)
  if (notOk(ast)) {
    return ast
  }
  var out = compiler(ast.tree)
  if (notOk(out)) {
    return out
  }
  var est = out.value.estree
  var js = escodegen.generate({
    'loc': est.loc,
    'type': 'Program',
    'body': est.body.body
  }, {format: {compact: true}})
  return Ok(js)
}

var testCompile = function (t, src, expected) {
  var out = compToStr(src)
  if (notOk(out)) {
    throw "Didn't expect an error: " + JSON.stringify(out)//eslint-disable-line
  }
  t.is(out.value, expected)
}

var testError = function (t, src, expected) {
  var m = /^e:([a-z<, >]*) a:([a-z<, >]*)(|.*)$/i.exec(expected)
  if (m) {
    expected = 'expected `' + m[1] + '` but was `' + m[2] + '`' + m[3]
  }

  var out = compToStr(src)
  if (out.type === 'Ok') {
    t.fail('should error: ' + expected)
    return
  }
  var estr = out.message + '|' + out.loc.start + '-' + out.loc.end
  t.is(estr, expected)
}

test('compile', function (t) {
  var tc = _.partial(testCompile, t)
  var terr = _.partial(testError, t)

  tc('def a = 100.25', 'var a=100.25;')
  terr('def a = 1 def a = 2', '`a` is already defined|14-15')
  terr('def a = b', 'Not defined `b`|8-9')

  tc('def a = "b"', "var a='b';")

  tc('def a = 1 + 2', 'var a=1+2;')

  terr('def a = 1 + "b"', 'e:Number a:String|12-15')
  terr('def a = "b" + 2', 'e:Number a:String|8-11')

  tc('ann a=Number def a=1', 'var a=1;')
  terr('ann a=Number def a="b"', 'e:Number a:String|19-22')
  terr('ann a=String def a=1', 'e:String a:Number|19-20')
  terr('def a=1 ann a=Number', '`a` should be annotated before it\'s defined|12-13')
  terr('ann a=Number ann a=Number', '`a` is already annotated|17-18')

  tc('ann add=Fn(Number, Number) Number', '')
  terr('def add=fn(a,b)a+b', 'Sorry, this function type was not infered, add an annotation|8-10')
  terr('ann add=Fn(Number, Number)Number def add=fn()1', 'Expected 2 params not 0|41-43')
  tc('ann one=Fn()Number def one=fn()1', 'var one=function one(){return 1;};')
  terr('ann add=Fn(Number,String)Number def add=fn(a,b)a+b', 'e:Number a:String|49-50')
  tc('ann add=Fn(Number,Number)Number def add=fn(a,b)a+b', 'var add=function add(a,b){return a+b;};')
  terr('ann add=Fn(Number,Number)String def add=fn(a,b)a+b', 'e:String a:Number|48-49')
})
