var _ = require('lodash')
var λ = require('contra')
var e = require('estree-builder')
var parser = require('ecmaless-parser')
var compiler = require('ecmaless-compiler')
var pathFns = require('path')
var DependencyResolver = require('dependency-resolver')

var normalizePath = function (base, path) {
  if (path[0] === '.') {
    return pathFns.resolve(base, path)
  }
  return path
}

module.exports = function (conf, callback) {
  var base = conf.base || process.cwd()
  var loadPath = conf.loadPath
  var startPath = normalizePath(base, conf.start_path)

  var moduleSrc = {}
  var moduleAst = {}
  var resolver = new DependencyResolver()

  var parseModules = function parseModules (path, callback) {
    if (_.has(moduleAst, path)) {
      callback()
      return
    }
    if (/\.js$/i.test(path)) {
      resolver.add(path)
      callback()
      return
    }

    loadPath(path, function (err, src) {
      if (err) return callback(err)

      var ast
      try {
        ast = parser(src, {filepath: path})
      } catch (e) {
        callback(e)
        return
      }

      moduleSrc[path] = src
      moduleAst[path] = ast
      resolver.add(path)

      var ast0 = _.head(ast)
      if (ast0 && ast0.type === 'ImportBlock') {
        λ.each(ast0.modules, function (m, next) {
          // TODO resolve relative to curr path
          var depPath = normalizePath(base, m.path.value)

          resolver.setDependency(path, depPath)

          parseModules(depPath, next)
        }, callback)
      } else {
        callback()
      }
    })
  }

  parseModules(startPath, function (err) {
    if (err) return callback(err)

    var pathsToComp = resolver.sort()

    var body = []
    var modules = {}

    try {
      _.each(pathsToComp, function (path, modIndex) {
        if (/\.js$/i.test(path)) {
          modules[path] = {
            commonjs: {
              path: path,
              value: require(path)
            }
          }

          body.push(e('var',
            '$mod$' + modIndex,
            e('call',
              e('id', 'require'),
              [e('str', path)]
            )
          ))
          return
        }
        var src = moduleSrc[path]
        var ast = moduleAst[path]

        var c = compiler(ast, {
          src: src,
          filepath: path,
          requireModule: function (path) {
            // TODO resolve relative to curr path
            path = normalizePath(base, path)

            return modules[path]
          }
        })

        c.mod_index = modIndex
        modules[path] = c

        var args = []
        _.each(c.modules, function (path) {
          // TODO resolve relative to curr path
          path = normalizePath(base, path)
          var i = _.indexOf(pathsToComp, path)
          args.push(e('id', '$mod$' + i))
        })
        body.push(e('var', '$mod$' + modIndex, e('call', c.estree, args)))
      })
    } catch (e) {
      callback(e)
      return
    }

    var mainMod = '$mod$' + _.indexOf(pathsToComp, startPath)

    body.push(e(';', e('=', e('id', 'module.exports'), e('id', mainMod))))

    callback(null, {
      'type': 'Program',
      'body': body
    })
  })
}
