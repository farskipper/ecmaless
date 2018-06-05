var _ = require('lodash')
var test = require('tape')
var parser = require('ecmaless-parser2')
var compiler = require('./')
var escodegen = require('escodegen')
var okOrError = require('./okOrError')
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
  t.equals(out.value, expected)
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
  t.equals(estr, expected)
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

  t.end()
})
