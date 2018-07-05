var test = require('ava')
var main = require('./src')
var astring = require('astring')

var StructLoader = function (files) {
  return function (path, callback) {
    if (files[path]) {
      callback(null, files[path])
    } else {
      callback(new Error('Unknown path: ' + path))
    }
  }
}

var run = function (files) {
  return new Promise(function (resolve, reject) {
    main({
      base: '/test/',
      startPath: './a',
      loadPath: StructLoader(files)
    }, function (err, est) {
      if (err) return reject(err)

      var js = astring.generate(est)

      var out = eval(js)// eslint-disable-line

      resolve(out)
    })
  })
}

test('it', async function (t) {
  t.deepEqual(await run({
    '/test/a': 'def a = 1 export(a)'
  }), {a: 1})

  t.deepEqual(await run({
    '/test/a': 'import "./b" * def a=b+1 export(a)',
    '/test/b': 'def b=2 export(b)'
  }), {a: 3})
})
