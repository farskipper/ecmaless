var _ = require('lodash')
var e = require('estree-builder')
var toId = require('to-js-identifier')
var SymbolTableStack = require('symbol-table/stack')
var okOrError = require('./okOrError')
var Ok = okOrError.Ok
var Error = okOrError.Error
var notOk = okOrError.notOk

var typeToString = function (TYPE) {
  return TYPE.typ.tag
}

var assertT = function (actual, expected) {
  var aTag = actual.typ.tag
  if (aTag !== expected.typ.tag) {
    return Error(actual.loc, 'expected `' + typeToString(expected) + '` but was `' + typeToString(actual) + '`')
  }
  if (aTag === 'Fn') {
    if (actual.typ.params.length !== expected.typ.params.length) {
      return Error(actual.loc, 'expected ' + expected.typ.params.length + ' params but was ' + actual.typ.params.length)
    }
    var i = 0
    while (i < actual.typ.params.length) {
      var aclParam = actual.typ.params[i]
      var expParam = expected.typ.params[i]
      i++
      var out = assertT(aclParam, expParam)
      if (notOk(out)) {
        return out
      }
    }
  }
  if (aTag === 'Struct') {
    var aclKeys = Object.keys(actual.typ.byKey).sort()
    var expKeys = Object.keys(expected.typ.byKey).sort()
    if (aclKeys.join(',') != expKeys.join(',')) {
      return Error(actual.loc, 'expected {' + expKeys.join(',') + '} but was {' + aclKeys.join(',') + '}')
    }
    var i = 0
    while (i < aclKeys.length) {
      var key = aclKeys[i]
      i++
      var out = assertT(actual.typ.byKey[key], expected.typ.byKey[key])
      if (notOk(out)) {
        return out
      }
    }
  }
  return Ok()
}

var compAstNode = {
  'Number': function (node, comp, ctx) {
    return Ok({
      estree: e('number', node.ast.value, ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {tag: 'Number', value: node.ast.value}
      }
    })
  },
  'String': function (node, comp, ctx) {
    return Ok({
      estree: e('string', node.ast.value, ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {tag: 'String', value: node.ast.value}
      }
    })
  },
  'Symbol': function (node, comp, ctx) {
    var id = node.ast.value
    if (!ctx.scope.has(id)) {
      return Error(node.loc, 'Not defined `' + id + '`')
    }
    return Ok({
      estree: e('id', toId(node.ast.value), ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: ctx.scope.get(id).TYPE.typ
      }
    })
  },
  'Annotate': function (node, comp, ctx) {
    var sym = node.ast.id.ast.value
    if (ctx.scope.has(sym)) {
      if (ctx.scope.get(sym).defLoc) {
        return Error(node.ast.id.loc, '`' + sym + '` should be annotated before it\'s defined')
      }
      return Error(node.ast.id.loc, '`' + sym + '` is already annotated')
    }

    var init = comp(node.ast.init)
    if (notOk(init)) {
      return init
    }
    ctx.scope.set(sym, {
      TYPE: init.value.TYPE,
      annLoc: node.loc
    })

    return Ok({})
  },
  'Define': function (node, comp, ctx) {
    var sym = node.ast.id.ast.value

    var ann = ctx.scope.get(sym)
    if (ann && ann.defLoc) {
      return Error(node.ast.id.loc, '`' + sym + '` is already defined')
    }

    var init = comp(node.ast.init, {expTYPE: ann && ann.TYPE})
    if (notOk(init)) {
      return init
    }

    if (ann) {
      var out = assertT(init.value.TYPE, ann.TYPE)
      if (notOk(out)) {
        return out
      }
    }

    ctx.scope.set(sym, {
      TYPE: init.value.TYPE,
      defLoc: node.loc,
      annLoc: ann && ann.annLoc
    })

    var id = comp(node.ast.id)
    if (notOk(id)) {
      return id
    }

    if (init.value.estree.type === 'FunctionExpression') {
      init.value.estree.id = id.value.estree
    }
    return Ok({
      estree: e('var', id.value.estree, init.value.estree, ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {tag: 'Nil'}
      }
    })
  },
  'Infix': function (node, comp, ctx) {
    var left = comp(node.ast.left)
    if (notOk(left)) {
      return left
    }
    left = left.value
    var right = comp(node.ast.right)
    if (notOk(right)) {
      return right
    }
    right = right.value

    var assertLR = function (typeName) {
      var out = assertT(left.TYPE, {
        loc: right.TYPE.loc,
        typ: {tag: typeName}
      })
      if (notOk(out)) {
        return out
      }
      out = assertT(right.TYPE, {
        loc: left.TYPE.loc,
        typ: {tag: typeName}
      })
      if (notOk(out)) {
        return out
      }
      return Ok()
    }

    var op = node.ast.op

    switch (op) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
        var out = assertLR('Number')
        if (notOk(out)) {
          return out
        }
        return Ok({
          estree: e(op, left.estree, right.estree, ctx.toLoc(node.loc)),
          TYPE: {
            loc: node.loc,
            typ: left.TYPE.typ
          }
        })
      case '++':
        var out = assertLR('String')
        if (notOk(out)) {
          return out
        }
        return Ok({
          estree: e('+', left.estree, right.estree, ctx.toLoc(node.loc)),
          TYPE: {
            loc: node.loc,
            typ: left.TYPE.typ
          }
        })
      default:
        return Error(node.loc, '`' + op + '` not supported')
    }
  },
  'Type': function (node, comp, ctx) {
    var id = node.ast.value
    switch (id) {
      case 'Number':
      case 'String':
        return Ok({
          TYPE: {
            loc: node.loc,
            typ: {tag: id}
          }
        })
      default:
        return Error(node.loc, '`' + id + '` is not a defined type')
    }
  },
  'TypeFunction': function (node, comp, ctx) {
    var params = []
    var i = 0
    while (i < node.ast.params.length) {
      var param = comp(node.ast.params[i])
      i++
      if (notOk(param)) {
        return param
      }
      params.push(param.value.TYPE)
    }
    var body = comp(node.ast.body)
    if (notOk(body)) {
      return body
    }
    body = body.value.TYPE
    return Ok({
      TYPE: {
        loc: node.loc,
        typ: {
          tag: 'Fn',
          params: params,
          body: body
        }
      }
    })
  },
  'Function': function (node, comp, ctx, fromCaller) {
    var expTYPE = fromCaller && fromCaller.expTYPE
    if (!expTYPE || !expTYPE.typ || expTYPE.typ.tag !== 'Fn') {
      return Error(node.loc, 'Sorry, this function type was not infered, add an annotation')
    }
    if (node.ast.params.length !== expTYPE.typ.params.length) {
      return Error(node.loc, 'Expected ' + expTYPE.typ.params.length + ' params not ' + node.ast.params.length)
    }
    ctx.scope.push()

    var params = []
    var i = 0
    while (i < node.ast.params.length) {
      var param = node.ast.params[i]
      var paramTYPE = expTYPE.typ.params[i]
      ctx.scope.set(param.ast.value, {TYPE: paramTYPE})
      param = comp(param)
      if (notOk(param)) {
        return param
      }
      params.push(param.value.estree)
      i++
    }

    var body = comp(node.ast.body)
    if (notOk(body)) {
      return body
    }
    var out = assertT(body.value.TYPE, expTYPE.typ.body)
    if (notOk(out)) {
      return out
    }
    body = [e('return', body.value.estree, node.ast.body.loc)]

    ctx.scope.pop()
    var id
    return Ok({
      estree: e('function', params, body, id, node.loc),
      TYPE: {
        loc: node.loc,
        typ: expTYPE.typ
      }
    })
  },
  'ApplyFn': function (node, comp, ctx, fromCaller) {
    var callee = comp(node.ast.callee)
    if (notOk(callee)) {
      return callee
    }
    callee = callee.value

    if (callee.TYPE.typ.tag !== 'Fn') {
      return Error(node.ast.callee.loc, 'not a function')
    }

    var inferedTYPE = {
      loc: node.loc,
      typ: {
        tag: 'Fn',
        params: [],
        body: null
      }
    }

    var args = []
    var i = 0
    while (i < node.ast.args.length) {
      var arg = comp(node.ast.args[i])
      i++
      if (notOk(arg)) {
        return arg
      }
      args.push(arg.value.estree)
      inferedTYPE.typ.params.push(arg.value.TYPE)
    }

    var out = assertT(inferedTYPE, callee.TYPE)
    if (notOk(out)) {
      return out
    }

    return Ok({
      estree: e('call', callee.estree, args, ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.ast.callee.loc,
        typ: callee.TYPE.typ.body.typ
      }
    })
  },
  'CallFn': function (node, comp, ctx, fromCaller) {
    var out = compAstNode.ApplyFn(node, comp, ctx, fromCaller)
    if (notOk(out)) {
      return out
    }
    return Ok({
      estree: e(';', out.value.estree, ctx.toLoc(node.loc))
    })
  },
  'Struct': function (node, comp, ctx, fromCaller) {
    var byKey = {}
    var pairs = []

    var i = 0
    while (i < node.ast.pairs.length) {
      var pair = node.ast.pairs[i]
      i++
      var key = pair.ast.key.ast.value
      var val = comp(pair.ast.value)
      if (notOk(val)) {
        return val
      }
      val = val.value
      if (byKey.hasOwnProperty(key)) {
        return Error(pair.ast.key.loc, 'Duplicate key `' + key + '`')
      }
      byKey[key] = val.TYPE
      pairs.push(e('object-property', e('string', key, ctx.toLoc(pair.ast.key.loc)), val.estree, ctx.toLoc(pair.loc)))
    }

    return Ok({
      estree: e('object-raw', pairs, ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {
          tag: 'Struct',
          byKey: byKey
        }
      }
    })
  },
  'TypeStruct': function (node, comp, ctx, fromCaller) {
    var byKey = {}
    var i = 0
    while (i < node.ast.pairs.length) {
      var pair = node.ast.pairs[i]
      i++
      var key = pair.ast.key.ast.value
      var val = comp(pair.ast.value)
      if (notOk(val)) {
        return val
      }
      val = val.value
      if (byKey.hasOwnProperty(key)) {
        return Error(pair.ast.key.loc, 'Duplicate key `' + key + '`')
      }
      byKey[key] = val.TYPE
    }
    return Ok({
      TYPE: {
        loc: node.loc,
        typ: {
          tag: 'Struct',
          byKey: byKey
        }
      }
    })
  },
  'Member': function (node, comp, ctx, fromCaller) {
    var struct = comp(node.ast.struct)
    if (notOk(struct)) {
      return struct
    }
    struct = struct.value
    if (struct.TYPE.typ.tag !== 'Struct') {
      return Error(node.ast.struct.loc, 'expected `Struct` but was `' + typeToString(struct.TYPE) + '`')
    }

    var key = node.ast.key.ast.value
    var TYPE = struct.TYPE.typ.byKey[key]
    if (!TYPE) {
      return Error(node.ast.key.loc, 'Key `' + key + '` not found on {' + Object.keys(struct.TYPE.typ.byKey).join(',') + '}')
    }

    return Ok({
      estree: e('.', struct.estree, e('str', key, ctx.toLoc(node.ast.key.loc))),
      TYPE: {
        loc: node.ast.key.loc,
        typ: TYPE.typ
      }
    })
  },
  'Import': function (node, comp, ctx, fromCaller) {
    if (!fromCaller.isRootLevel) {
      return Error(node.loc, 'Imports only work at the root level')
    }
    var m = ctx.requireModule(node.ast.path, node.loc)
    if (notOk(m)) {
      return m
    }
    m = m.value
    var modId = m.id
    var isJs = m.module.isJs
    var exported = isJs ? null : m.module.TYPE.typ.byKey

    var estree = []

    var keysToImport = []
    var parts = {}

    if (node.ast.parts) {
      _.each(node.ast.parts, function (part) {
        var key = part.ast.value.ast.value
        parts[key] = part
        keysToImport.push(key)
      })
    } else {
      if (isJs) {
        return Error(node.loc, 'Can\'t use * on js imports')
      }
      keysToImport = Object.keys(exported)
    }

    var i = 0
    while (i < keysToImport.length) {
      var key = keysToImport[i]
      var part = parts[key]
      i++

      var as = key
      var TYPE

      var defLoc = node.loc
      var annLoc = node.loc
      if (part) {
        defLoc = part.ast.value.loc
        annLoc = part.ast.value.loc

        if (part.ast.as) {
          as = part.ast.as.ast.value
          defLoc = part.ast.as.loc
          annLoc = part.ast.as.loc
        }

        if (part.ast.is && !isJs) {
          return Error(part.ast.is.loc, '`is` only works for js imports')
        }
        if (part.ast.is) {
          annLoc = part.ast.is.loc
        }
      }

      if (isJs) {
        if (!part.ast.is) {
          return Error(part.loc, 'Must annotate js imports using `is`')
        }
        var is = comp(part.ast.is)
        if (notOk(is)) {
          return is
        }
        TYPE = is.value.TYPE
      } else {
        TYPE = exported[key]
        if (!TYPE) {
          return Error(part.loc, node.ast.path + ' does not export `' + key + '`')
        }
      }

      if (ctx.scope.has(as)) {
        return Error(defLoc, '`' + as + '` is already defined, use `as` to rename')
      }
      ctx.scope.set(as, {
        TYPE: TYPE,
        defLoc: defLoc,
        annLoc: annLoc
      })

      var isType = /^[A-Z]/.test(key)
      if (isType) {
        // nothing
      } else {
        estree.push(e('var', toId(as), e('get', e('id', modId), e('str', key))))
      }
    }
    return Ok({
      estree: estree
    })
  },
  'Export': function (node, comp, ctx, fromCaller) {
    if (!fromCaller.isRootLevel || !fromCaller.isLastNode) {
      return Error(node.loc, 'Export only works as the last statement in a file')
    }
    if (!node.ast.parts) {
      return Error(node.loc, '`export *` is not yet supported')
    }

    var typ = {tag: 'Struct', byKey: {}}
    var obj = {}
    var i = 0
    while (i < node.ast.parts.length) {
      var part = comp(node.ast.parts[i])
      var key = node.ast.parts[i].ast.value
      i++
      if (notOk(part)) {
        return part
      }
      obj[key] = part.value.estree
      typ.byKey[key] = part.value.TYPE
    }
    return Ok({
      estree: e('return', e('object', obj, ctx.toLoc(node.loc)), ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: typ
      }
    })
  }
}

module.exports = function (ast, conf) {
  conf = conf || {}

  var toLoc = conf.toLoc || _.noop

  var ctx = {
    scope: SymbolTableStack(),
    requireModule: conf.requireModule,
    toLoc: toLoc
  }

  var comp = function (node, fromCaller) {
    var type = node.ast.type
    if (!compAstNode[type]) {
      throw 'Unsupported ast type: ' + type//eslint-disable-line
    }
    return compAstNode[type](node, comp, ctx, fromCaller)
  }

  var estree = []
  var TYPE// the `export` type (the return value of the estree function)

  var i = 0
  while (i < ast.ast.length) {
    var isLastNode = i === ast.ast.length - 1
    var isExport = isLastNode && ast.ast[i].ast.type === 'Export'
    var out = comp(ast.ast[i], {
      isRootLevel: true,
      isLastNode: isLastNode
    })
    i++
    if (notOk(out)) {
      return out
    }
    if (Array.isArray(out.value.estree)) {
      estree = estree.concat(out.value.estree)
    } else if (out.value.estree) {
      estree.push(out.value.estree)
    }
    if (isExport) {
      TYPE = out.value.TYPE
    }
  }

  return {
    type: 'Ok',
    value: {
      estree: {
        loc: toLoc(ast.loc),
        type: 'Program',
        body: estree
      },
      TYPE: TYPE
    }
  }
}
