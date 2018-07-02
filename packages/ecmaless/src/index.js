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

      var ast = parser(src)
      if (ast.type !== 'Ok') {
        return callback(new Error(JSON.stringify(ast)))
      }
      ast = ast.tree

      moduleSrc[path] = src
      moduleAst[path] = ast
      resolver.add(path)

      var dirname = pathFns.dirname(path)

      var importPaths = _.compact(_.map(ast.ast, function (node) {
        if (node.ast.type === 'Import') {
          return normalizePath(dirname, node.ast.path)
        }
      }))

      λ.each(importPaths, function (depPath, next) {
        resolver.setDependency(path, depPath)

        parseModules(depPath, next)
      }, callback)
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
          modules[path] = {isJs: true}

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

        var myModules = {}
        var nextModuleId = (function () {
          var i = 0
          return function () {
            return '$' + i++
          }
        }())

        var c = compiler(ast, {
          toLoc: function () { _.noop(src, path) }, // TODO use src + path
          requireModule: function (path, loc) {
            // TODO resolve relative to curr path
            path = normalizePath(base, path)

            if (!modules[path]) {
              return {type: 'Error', loc: loc, message: 'Module not found: ' + path}
            }

            var moduleId = nextModuleId()
            myModules[moduleId] = path

            return {
              type: 'Ok',
              value: {
                id: moduleId,
                module: modules[path]
              }
            }
          }
        })
        if (c.type !== 'Ok') {
          throw new Error(JSON.stringify(c))
        }
        c = c.value

        modules[path] = c

        var args = []
        var params = []
        _.each(myModules, function (path, moduleId) {
          var i = _.indexOf(pathsToComp, path)
          args.push(e('id', '$mod$' + i))
          params.push(moduleId)
        })
        body.push(e('var', '$mod$' + modIndex, e('call', e('function', params, c.estree.body), args)))
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
