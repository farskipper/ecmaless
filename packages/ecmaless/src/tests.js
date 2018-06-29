var _ = require('lodash')
var λ = require('contra')
var fs = require('fs')
var test = require('tape')
var main = require('./')
var escodegen = require('escodegen')

var StructLoader = function (files) {
  return function (path, callback) {
    if (_.has(files, path)) {
      callback(null, files[path])
    } else if (/\/ecmaless-stdlib\/src\/core.js$/.test(path)) {
      fs.readFile(path, 'utf-8', callback)
    } else {
      callback(new Error('Unknown path: ' + path))
    }
  }
}

test('it', function (t) {
  λ.each([
    {
      files: {
        '/test/a': 'def a = 1\n\nexport:\n    a'
      },
      out: {a: 1}
    },
    {
      files: {
        '/test/a': 'import:\n    "./b":\n        b\ndef a = b + 1\n\nexport:\n    a',
        '/test/b': 'def b = 2\n\nexport:\n    b'
      },
      out: {a: 3}
    }
  ], function (info, next) {
    main({
      base: '/test/',
      start_path: './a',
      loadPath: StructLoader(info.files)
    }, function (err, est) {
      if (err) return next(err)

      var js = escodegen.generate(est)

      t.deepEquals(eval(js), info.out)// eslint-disable-line

      next()
    })
  }, t.end)
})
