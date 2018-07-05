var _ = require('lodash')
var e = require('estree-builder')
var toId = require('to-js-identifier')
var SymbolTableStack = require('symbol-table/stack')
var okOrError = require('./okOrError')
var Ok = okOrError.Ok
var Error = okOrError.Error
var notOk = okOrError.notOk

var baseTypes = {
  'Number': true,
  'String': true,
  'Boolean': true,
  'Nil': true
}

var comparableTypes = {
  'Number': true,
  'String': true,
  'Boolean': true,
  'Nil': true
}

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
    if (aclKeys.join(',') !== expKeys.join(',')) {
      return Error(actual.loc, 'expected {' + expKeys.join(',') + '} but was {' + aclKeys.join(',') + '}')
    }
    var j = 0
    while (j < aclKeys.length) {
      var key = aclKeys[j]
      j++
      var tmp = assertT(actual.typ.byKey[key], expected.typ.byKey[key])
      if (notOk(tmp)) {
        return tmp
      }
    }
  }
  if (aTag === 'Union') {
    var aclVariants = Object.keys(actual.typ.variants).sort()
    var expVariants = Object.keys(expected.typ.variants).sort()
    var k = 0
    while (k < aclVariants.length) {
      var aclV = aclVariants[k]
      k++
      if (!expected.typ.variants.hasOwnProperty(aclV)) {
        return Error(actual.loc, '#' + aclV + ' is not one of #' + expVariants.join('|#'))
      }
      var aclVParams = actual.typ.variants[aclV]
      var expVParams = expected.typ.variants[aclV]
      if (aclVParams.length !== expVParams.length) {
        return Error(actual.loc, 'expected ' + expVParams.length + ' arguments but was ' + aclVParams.length)
      }
      var l = 0
      while (l < aclVParams.length) {
        var aclVParam = aclVParams[l]
        var expVParam = expVParams[l]
        l++
        var out2 = assertT(aclVParam, expVParam)
        if (notOk(out2)) {
          return out2
        }
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
  'Boolean': function (node, comp, ctx) {
    return Ok({
      estree: e(node.ast.value ? 'true' : 'false', ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {tag: 'Boolean', value: node.ast.value}
      }
    })
  },
  'Nil': function (node, comp, ctx) {
    return Ok({
      estree: e('nil', ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {tag: 'Nil'}
      }
    })
  },
  'Tag': function (node, comp, ctx, fromCaller) {
    var expTYPE = fromCaller && fromCaller.expTYPE

    var arr = []
    arr.push(e('string', node.ast.tag, ctx.toLoc(node.loc)))

    var params = []
    var i = 0
    while (i < (node.ast.args || []).length) {
      var arg = comp(node.ast.args[i])
      i++
      if (notOk(arg)) {
        return arg
      }
      arg = arg.value

      arr.push(arg.estree)
      params.push(arg.TYPE)
    }

    var variants = {}
    variants[node.ast.tag] = params

    if (expTYPE && expTYPE.typ.tag === 'Union') {
      variants = Object.assign({}, expTYPE.typ.variants, variants)
    }

    return Ok({
      estree: e('array', arr, ctx.toLoc(node.loc)),
      TYPE: {
        loc: node.loc,
        typ: {
          tag: 'Union',
          variants: variants
        }
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
    var isType = node.ast.id.ast.type === 'Type'

    var sym = node.ast.id.ast.value

    var ann = ctx.scope.get(sym)
    if (ann && ann.defLoc) {
      return Error(node.ast.id.loc, '`' + sym + '` is already defined')
    }
    if (isType) {
      ann = null// types are not annotated
      if (baseTypes[sym]) {
        return Error(node.ast.id.loc, 'Cannot redefine base types')
      }
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

    if (isType) {
      return Ok({})
    }

    var id = comp(node.ast.id)
    if (notOk(id)) {
      return id
    }

    if (init.value.estree.type === 'FunctionExpression') {
      init.value.estree.id = id.value.estree
    }
    return Ok({
      estree: e('var', id.value.estree, init.value.estree, ctx.toLoc(node.loc))
    })
  },
  'Assign': function (node, comp, ctx, fromCaller) {
    var id = comp(node.ast.id)
    if (notOk(id)) {
      return id
    }
    id = id.value

    var value = comp(node.ast.value)
    if (notOk(value)) {
      return value
    }
    value = value.value

    var out = assertT(value.TYPE, id.TYPE)
    if (notOk(out)) {
      return out
    }

    return Ok({
      estree: e(';', e('=', id.estree, value.estree, ctx.toLoc(node.loc)), ctx.toLoc(node.loc))
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

    var toOk = function (op, tag) {
      return Ok({
        estree: e(op, left.estree, right.estree, ctx.toLoc(node.loc)),
        TYPE: {
          loc: node.loc,
          typ: {tag: tag}
        }
      })
    }

    var op = node.ast.op
    var tmp

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
        return toOk(op, 'Number')
      case '++':
        tmp = assertLR('String')
        if (notOk(tmp)) {
          return tmp
        }
        return toOk('+', 'String')
      case 'and':
      case 'or':
        tmp = assertLR('Boolean')
        if (notOk(tmp)) {
          return tmp
        }
        if (op === 'and') {
          op = '&&'
        } else if (op === 'or') {
          op = '||'
        }
        return toOk(op, 'Boolean')
      case 'xor':
        tmp = assertLR('Boolean')
        if (notOk(tmp)) {
          return tmp
        }
        return Ok({
          estree: e('?', left.estree, e('!', right.estree, ctx.toLoc(node.loc)), right.estree, ctx.toLoc(node.loc)),
          TYPE: {
            loc: node.loc,
            typ: {tag: 'Boolean'}
          }
        })
      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
        if (!comparableTypes[left.TYPE.typ.tag]) {
          return Error(node.ast.left.loc, left.TYPE.typ.tag + ' is not comparable, only ' + Object.keys(comparableTypes))
        }
        tmp = assertLR(left.TYPE.typ.tag)
        if (notOk(tmp)) {
          return tmp
        }
        if (op === '==' || op === '!=') {
          op += '='
        }
        return toOk(op, 'Boolean')
      default:
        return Error(node.loc, '`' + op + '` not supported')
    }
  },
  'Prefix': function (node, comp, ctx) {
    var value = comp(node.ast.value)
    if (notOk(value)) {
      return value
    }
    value = value.value
    var tmp
    switch (node.ast.op) {
      case 'not':
        tmp = assertT(value.TYPE, {
          loc: node.loc,
          typ: {tag: 'Boolean'}
        })
        if (notOk(tmp)) {
          return tmp
        }
        return Ok({
          estree: e('!', value.estree, ctx.toLoc(node.loc)),
          TYPE: {
            loc: node.loc,
            typ: {tag: 'Boolean'}
          }
        })
      case '-':
        tmp = assertT(value.TYPE, {
          loc: node.loc,
          typ: {tag: 'Number'}
        })
        if (notOk(tmp)) {
          return tmp
        }
        return Ok({
          estree: {
            type: 'UnaryExpression',
            prefix: true,
            operator: '-',
            argument: value.estree
          },
          TYPE: {
            loc: node.loc,
            typ: {tag: 'Number'}
          }
        })
      default:
        return Error(node.loc, '`' + op + '` not supported')
    }
  },
  'Type': function (node, comp, ctx) {
    var id = node.ast.value
    if (baseTypes[id]) {
      return Ok({
        TYPE: {
          loc: node.loc,
          typ: {tag: id}
        }
      })
    }
    var type = ctx.scope.get(id)
    if (!type || !type.TYPE) {
      return Error(node.loc, '`' + id + '` is not defined')
    }
    return Ok({
      TYPE: type.TYPE
    })
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

    var body
    if (node.ast.body.ast.type === 'Block') {
      body = comp(node.ast.body)
      if (notOk(body)) {
        return body
      }
      body = body.value
      if (body.mayReturn) {
        return Error(node.ast.body.loc, 'a branch does not return')
      }
      if (!body.returns) {
        body.returns = {loc: node.ast.body.loc, typ: {tag: 'Nil'}}
      }
      var out = assertT(body.returns, expTYPE.typ.body)
      if (notOk(out)) {
        return out
      }
      body = body.estree
    } else {
      body = comp(node.ast.body)
      if (notOk(body)) {
        return body
      }
      var out2 = assertT(body.value.TYPE, expTYPE.typ.body)
      if (notOk(out2)) {
        return out2
      }
      body = [e('return', body.value.estree, ctx.toLoc(node.ast.body.loc))]
    }

    ctx.scope.pop()
    var id
    return Ok({
      estree: e('function', params, body, id, ctx.toLoc(node.loc)),
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
  'TypeUnion': function (node, comp, ctx, fromCaller) {
    var id = node.ast.id.ast.value

    if (ctx.scope.has(id)) {
      return Error(node.ast.id.loc, '`' + id + '` is already defined')
    }
    if (baseTypes[id]) {
      return Error(node.ast.id.loc, 'Cannot redefine base types')
    }

    var TYPE = {
      loc: node.ast.id.loc,
      typ: {
        tag: 'Union',
        variants: {}
      }
    }

    var i = 0
    while (i < node.ast.variants.length) {
      var variant = node.ast.variants[i]
      i++
      var tag = variant.ast.tag
      if (TYPE.typ.variants.hasOwnProperty(tag)) {
        return Error(variant.loc, 'Duplicate tag `' + tag + '`')
      }

      var params = []
      var j = 0
      while (j < (variant.ast.params || []).length) {
        var param = variant.ast.params[j]
        j++
        param = comp(param)
        if (notOk(param)) {
          return param
        }
        param = param.value
        params.push(param.TYPE)
      }
      TYPE.typ.variants[tag] = params
    }

    ctx.scope.set(id, {
      TYPE: TYPE,
      defLoc: node.loc
    })

    return Ok({})
  },
  'CaseExpression': function (node, comp, ctx, fromCaller) {
    var disc = comp(node.ast.discriminant)
    if (notOk(disc)) {
      return disc
    }
    disc = disc.value

    if (disc.TYPE.typ.tag !== 'Union') {
      return Error(disc.TYPE.loc, 'case only works with tagged unions')
    }
    if (node.ast.else) {
      return Error(node.ast.else.loc, 'case..else is not yet supported')
    }

    var discId = ctx.nextId()
    var body = []
    var TYPE = fromCaller && fromCaller.expTYPE// or based on the first branch

    var tags = []
    var i = 0
    while (i < node.ast.whens.length) {
      var when = node.ast.whens[i]
      i++
      if (when.ast.test.ast.type !== 'Tag') {
        return Error(when.ast.test.loc, 'when only works with tags')
      }
      var tag = when.ast.test.ast.tag
      tags.push(tag)
      if (!disc.TYPE.typ.variants.hasOwnProperty(tag)) {
        return Error(when.ast.test.loc, '#' + tag + ' is not in #' + Object.keys(disc.TYPE.typ.variants).join(',#'))
      }
      var variantParams = disc.TYPE.typ.variants[tag]
      var tagArgs = when.ast.test.ast.args || []
      if (variantParams.length !== tagArgs.length) {
        return Error(when.ast.test.loc, '#' + tag + ' should have ' + variantParams.length + ' args not ' + tagArgs.length)
      }

      ctx.scope.push()

      var caseBody = []
      var params = []
      var j = 0
      while (j < tagArgs.length) {
        var tagArg = tagArgs[j]
        var paramTYPE = variantParams[j]
        j++
        if (tagArg.ast.type !== 'Symbol') {
          return Error(tagArg.loc, 'expected a symbol to bind to')
        }
        ctx.scope.set(tagArg.ast.value, {TYPE: paramTYPE})
        var arg = comp(tagArg)
        if (notOk(arg)) {
          return arg
        }
        params.push(arg.value.estree)

        caseBody.push(e('var', arg.value.estree, e('get', e('id', discId, ctx.toLoc(tagArg.loc)), e('number', j, ctx.toLoc(tagArg.loc)), ctx.toLoc(tagArg.loc)), ctx.toLoc(tagArg.loc)))
      }
      var then = comp(when.ast.then)
      if (notOk(then)) {
        return then
      }
      if (!TYPE) {
        TYPE = then.value.TYPE
      }
      var out = assertT(then.value.TYPE, TYPE)
      if (notOk(out)) {
        return out
      }
      caseBody.push(e('return', then.value.estree, ctx.toLoc(when.ast.then.loc)))

      body.push(e('case', e('string', tag, ctx.toLoc(when.ast.test.loc)), caseBody))

      ctx.scope.pop()
    }

    var missingWhens = Object.keys(disc.TYPE.typ.variants).filter(function (key) {
      return tags.indexOf(key) < 0
    })
    if (missingWhens.length > 0) {
      return Error(node.loc, 'missing `when #' + missingWhens.join('..`,`when #') + '..`')
    }

    var cpLoc = function () {
      return ctx.toLoc(node.ast.discriminant.loc)
    }

    return Ok({
      estree: e('call', e('function', [
        e('id', discId, cpLoc())
      ], [
        e('switch',
          e('get', e('id', discId, cpLoc()), e('number', 0, cpLoc()), cpLoc()),
          body,
          cpLoc()
        )
      ], null, cpLoc()), [disc.estree], cpLoc()),
      TYPE: TYPE
    })
  },
  'IfExpression': function (node, comp, ctx, fromCaller) {
    var test = comp(node.ast.test)
    if (notOk(test)) {
      return test
    }
    test = test.value
    if (test.TYPE.typ.tag !== 'Boolean') {
      return Error(node.ast.test.loc, 'must be a Boolean')
    }
    var then = comp(node.ast.then)
    if (notOk(then)) {
      return then
    }
    then = then.value
    var TYPE = fromCaller && fromCaller.expTYPE// or based on the first branch
    if (!TYPE) {
      TYPE = then.TYPE
    }
    var out = assertT(then.TYPE, TYPE)
    if (notOk(out)) {
      return out
    }
    var else_ = comp(node.ast.else)
    if (notOk(else_)) {
      return else_
    }
    else_ = else_.value
    out = assertT(else_.TYPE, TYPE)
    if (notOk(out)) {
      return out
    }
    return Ok({
      estree: e('?',
        test.estree,
        then.estree,
        else_.estree,
        ctx.toLoc(node.loc)
      ),
      TYPE: TYPE
    })
  },
  'Block': function (node, comp, ctx, fromCaller) {
    var shouldPushScope = !(fromCaller && fromCaller.noScopePush)
    var shouldWrapInEBlock = !(fromCaller && fromCaller.dontWrapInEBlock)
    if (shouldPushScope) {
      ctx.scope.push()
    }
    var body = []
    var returns
    var mayReturn

    var i = 0
    while (i < node.ast.body.ast.length) {
      var stmt = node.ast.body.ast[i]
      i++
      if (returns) {
        return Error(stmt.loc, 'dead code')
      }
      var c = comp(stmt)
      if (notOk(c)) {
        return c
      }
      c = c.value
      body.push(c.estree)
      if (c.returns) {
        returns = c.returns
        if (mayReturn) {
          var tst = assertT(mayReturn, returns)
          if (notOk(tst)) {
            return tst
          }
          mayReturn = void 0
        }
      }
      if (c.mayReturn) {
        if (mayReturn) {
          var tst2 = assertT(mayReturn, c.mayReturn)
          if (notOk(tst2)) {
            return tst2
          }
        }
        mayReturn = c.mayReturn
      }
    }

    if (shouldPushScope) {
      ctx.scope.pop()
    }
    return Ok({
      estree: shouldWrapInEBlock
        ? e('block', body, ctx.toLoc(node.loc))
        : body,
      returns: returns,
      mayReturn: mayReturn
    })
  },
  'IfStatement': function (node, comp, ctx, fromCaller) {
    var test = comp(node.ast.test)
    if (notOk(test)) {
      return test
    }
    test = test.value
    if (test.TYPE.typ.tag !== 'Boolean') {
      return Error(node.ast.test.loc, 'must be a Boolean')
    }
    var then = comp(node.ast.then)
    if (notOk(then)) {
      return then
    }
    then = then.value
    var else_
    if (node.ast.else) {
      else_ = comp(node.ast.else)
      if (notOk(else_)) {
        return else_
      }
      else_ = else_.value
    }
    var returns
    var mayReturn
    if (then.returns && else_ && else_.returns) {
      var tst = assertT(else_.returns, then.returns)
      if (notOk(tst)) {
        return tst
      }
      returns = then.returns
    } else {
      mayReturn = then.returns || then.mayReturn
      if (else_) {
        var elseMayReturn = else_.returns || else_.mayReturn
        if (elseMayReturn) {
          var tst2 = assertT(elseMayReturn, mayReturn)
          if (notOk(tst2)) {
            return tst2
          }
        }
      }
    }
    return Ok({
      estree: e('if', test.estree, then.estree, else_ && else_.estree, ctx.toLoc(node.loc)),
      returns: returns,
      mayReturn: mayReturn
    })
  },
  'Return': function (node, comp, ctx, fromCaller) {
    var val = comp(node.ast.value)
    if (notOk(val)) {
      return val
    }
    val = val.value
    return Ok({
      estree: e('return', val.estree, ctx.toLoc(node.loc)),
      returns: val.TYPE
    })
  },
  'While': function (node, comp, ctx, fromCaller) {
    var cond = comp(node.ast.cond)
    if (notOk(cond)) {
      return cond
    }
    cond = cond.value
    if (cond.TYPE.typ.tag !== 'Boolean') {
      return Error(node.ast.cond.loc, 'must be a Boolean')
    }
    var body = comp(node.ast.body)
    if (notOk(body)) {
      return body
    }
    body = body.value

    var mayReturn = body.returns || body.mayReturn

    return Ok({
      estree: e('while', cond.estree, body.estree, ctx.toLoc(node.loc)),
      mayReturn: mayReturn
    })
  },
  'Continue': function (node, comp, ctx, fromCaller) {
    // TODO only inside while
    return Ok({estree: e('continue', ctx.toLoc(node.loc))})
  },
  'Break': function (node, comp, ctx, fromCaller) {
    // TODO only inside while
    return Ok({estree: e('break', ctx.toLoc(node.loc))})
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
    nextId: (function () {
      var i = 0
      return function () {
        return '$v' + i++
      }
    }()),
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
