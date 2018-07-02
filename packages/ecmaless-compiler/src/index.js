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
      if (ctx.scope.get(sym).def_loc) {
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
      ann_loc: node.loc
    })

    return Ok({})
  },
  'Define': function (node, comp, ctx) {
    var sym = node.ast.id.ast.value

    var ann = ctx.scope.get(sym)
    if (ann && ann.def_loc) {
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
      def_loc: node.loc,
      ann_loc: ann && ann.ann_loc
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

      var def_loc = node.loc
      var ann_loc = node.loc
      if (part) {
        def_loc = part.ast.value.loc
        ann_loc = part.ast.value.loc

        if (part.ast.as) {
          as = part.ast.as.ast.value
          def_loc = part.ast.as.loc
          ann_loc = part.ast.as.loc
        }

        if (part.ast.is && !isJs) {
          return Error(part.ast.is.loc, '`is` only works for js imports')
        }
        if (part.ast.is) {
          ann_loc = part.ast.is.loc
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
        return Error(def_loc, '`' + as + '` is already defined, use `as` to rename')
      }
      ctx.scope.set(as, {
        TYPE: TYPE,
        def_loc: def_loc,
        ann_loc: ann_loc
      })

      var isType = /^[A-Z]/.test(key)
      if (isType) {
        // nothing
      } else {
        estree.push(e('var', as, e('get', e('id', modId), e('str', key))))
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
