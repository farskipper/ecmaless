/* eslint-disable no-constant-condition */
// inspired by http://crockford.com/javascript/tdop/tdop.html

var ast = require('./ast')

var Ok = function (loc, ast) {
  return {
    type: 'Ok',
    tree: {
      loc: loc,
      ast: ast
    }
  }
}

var Error = function (loc, message) {
  return {
    type: 'Error',
    loc: loc,
    message: message
  }
}

var notOk = function (ast) {
  return ast.type !== 'Ok'
}

var rules = {}

var advance = function (state) {
  // get next token
  var token
  var found = false
  while (state.token_i < state.tokens.length) {
    token = state.tokens[state.token_i]
    state.token_i += 1
    if (token.type !== 'SPACES' && token.type !== 'NEWLINE') {
      found = true
      break
    }
  }

  if (!found && state.token_i >= state.tokens.length) {
    var srcLen = state.tokens[state.tokens.length - 1].loc.end
    state.curr = {
      rule: rules['(end)'],
      token: {
        type: '(end)',
        src: '(end)',
        loc: {start: srcLen, end: srcLen}
      }
    }
    return
  }

  var rule
  if (rules[token.src]) {
    rule = rules[token.src]
  } else {
    rule = rules[token.type]
  }

  if (!rule) {
    // this is a panic, not an error value
    throw 'Unhandled token: ' + token.type + '|' + token.src//eslint-disable-line
  }
  state.curr = {
    rule: rule,
    token: token
  }
}

var expression = function (state, rbp) {
  var prev = state.curr
  advance(state)
  if (!prev.rule.nud) {
    return Error(prev.token.loc, 'Expected an expression')
  }
  var left = prev.rule.nud(state, prev.token)
  if (notOk(left)) {
    return left
  }
  while (rbp < state.curr.rule.lbp) {
    prev = state.curr
    advance(state)
    left = prev.rule.led(state, prev.token, left.tree)
    if (notOk(left)) {
      return left
    }
  }
  return left
}

var symbol = function (state) {
  if (state.curr.token.type !== 'SYMBOL') {
    return Error(state.curr.token.loc, 'Expected a symbol')
  }
  var token = state.curr.token
  advance(state)
  return rules['SYMBOL'].nud(state, token)
}

var typeVar = function (state) {
  if (state.curr.token.type !== 'SYMBOL') {
    return Error(state.curr.token.loc, 'Expected a type var')
  }
  var token = state.curr.token
  advance(state)
  return rules['SYMBOL'].type_nud(state, token)
}

var type = function (state) {
  if (state.curr.token.type !== 'TYPE') {
    return Error(state.curr.token.loc, 'Expected a type')
  }
  var token = state.curr.token
  advance(state)
  return rules['TYPE'].type_nud(state, token)
}

var typeExpression = function (state, rbp) {
  var prev = state.curr
  advance(state)
  if (!prev.rule.type_nud) {
    return Error(prev.token.loc, 'Expected a type expression')
  }
  var left = prev.rule.type_nud(state, prev.token)
  if (notOk(left)) {
    return left
  }
  while (rbp < state.curr.rule.type_lbp) {
    prev = state.curr
    advance(state)
    left = prev.rule.type_led(state, prev.token, left.tree)
    if (notOk(left)) {
      return left
    }
  }
  return left
}

var structPair = function (state, isType) {
  var sym = symbol(state)
  if (notOk(sym)) {
    return sym
  }
  if (state.curr.rule.id !== ':') {
    return Error(state.curr.token.loc, 'Expected `:`')
  }
  advance(state)
  var exp = isType
    ? typeExpression(state, 0)
    : expression(state, 0)
  if (notOk(exp)) {
    return exp
  }
  var tree = isType
    ? ast.TypeStructPair(sym.tree, exp.tree)
    : ast.StructPair(sym.tree, exp.tree)
  return Ok({
    start: sym.tree.loc.start,
    end: exp.tree.loc.end
  }, tree)
}

var struct = function (state, token, isType) {
  var loc = {start: 0, end: 0}
  loc.start = token.loc.start
  var pairs = []
  while (state.curr.rule.id !== '}') {
    var pair = structPair(state, isType)
    if (notOk(pair)) {
      return pair
    }
    pairs.push(pair.tree)
    if (state.curr.rule.id !== ',') {
      break
    }
    advance(state)
  }
  if (state.curr.rule.id !== '}') {
    return Error(state.curr.token.loc, 'Expected `}`')
  }
  loc.end = state.curr.token.loc.end
  advance(state)
  var tree = isType
    ? ast.TypeStruct(pairs)
    : ast.Struct(pairs)
  return Ok(loc, tree)
}

var statement = function (state) {
  var rule = state.curr.rule
  if (rule.sta) {
    advance(state)
    return rule.sta(state)
  }
  var e = expression(state, 0)
  if (notOk(e)) {
    return e
  }
  if (e.tree.ast.type === 'ApplyFn') {
    e.tree.ast.type = 'CallFn'
    return e
  }
  return Error(e.tree.loc, 'Expected a statement')
}

var statements = function (state) {
  var loc = {
    start: state.curr.token.loc.start,
    end: state.curr.token.loc.end
  }
  var a = []
  while (true) {
    if (state.curr.rule.id === 'end' ||
        state.curr.rule.id === '(end)' ||
        state.curr.rule.id === 'else' ||
        state.curr.rule.id === 'elseif' ||
        state.curr.rule.id === 'when'
    ) {
      break
    }
    var s = statement(state)
    if (notOk(s)) {
      return s
    }
    a.push(s.tree)
  }
  loc.end = state.curr.token.loc.end
  return Ok(loc, a)
}

var importSymbol = function (state) {
  var loc = state.curr.token.loc
  var sym = symbol(state)
  if (notOk(sym)) {
    return sym
  }
  var as
  if (state.curr.rule.id === 'as') {
    advance(state)
    as = symbol(state)
    if (notOk(as)) {
      return as
    }
  }
  var is
  if (state.curr.rule.id === 'is') {
    advance(state)
    is = typeExpression(state, 0)
    if (notOk(is)) {
      return is
    }
  }
  return Ok(loc, ast.ImportSymbol(sym.tree, as && as.tree, is && is.tree))
}

var importType = function (state) {
  var loc = state.curr.token.loc
  var typ = type(state)
  if (notOk(typ)) {
    return typ
  }
  var as
  if (state.curr.rule.id === 'as') {
    advance(state)
    as = type(state)
    if (notOk(as)) {
      return as
    }
  }
  return Ok(loc, ast.ImportType(typ.tree, as && as.tree))
}

/// /////////////////////////////////////////////////////////////////////////////

var defRule = function (id, rule) {
  if (!rules.hasOwnProperty(id)) {
    rules[id] = {
      id: id,

      nud: void 0, // Maybe< Fn(State, Token) >

      lbp: 0,
      led: void 0, // Maybe< Fn(State, Token, left: Tree) >

      sta: void 0, // Maybe< Fn(State) >

      type_nud: void 0, // Maybe< Fn(State, Token) >
      type_lbp: 0,
      type_led: void 0// Maybe< Fn(State, Token, left: Tree) >
    }
  }
  if (rule.nud) {
    rules[id].nud = rule.nud
  }
  if (rule.led && rule.lbp > 0) {
    rules[id].lbp = rule.lbp
    rules[id].led = rule.led
  }
  if (rule.sta) {
    rules[id].sta = rule.sta
  }
  if (rule.type_nud) {
    rules[id].type_nud = rule.type_nud
  }
  if (rule.type_led && rule.type_lbp > 0) {
    rules[id].type_lbp = rule.type_lbp
    rules[id].type_led = rule.type_led
  }
}

var infix = function (op, bp) {
  defRule(op, {
    lbp: bp,
    led: function (state, token, left) {
      var right = expression(state, bp)
      if (notOk(right)) {
        return right
      }
      return Ok(token.loc, ast.Infix(op, left, right.tree))
    }
  })
}

var prefix = function (op, rbp) {
  defRule(op, {
    nud: function (state, token) {
      var v = expression(state, rbp)
      if (notOk(v)) {
        return v
      }
      return Ok(token.loc, ast.Prefix(op, v.tree))
    }
  })
}

var stmt = function (s, f) {
  return defRule(s, {sta: f})
}

var doBlock = function (state) {
  var loc = {
    start: state.curr.token.loc.start,
    end: state.curr.token.loc.end
  }
  var body = statements(state)
  if (notOk(body)) {
    return body
  }
  if (state.curr.rule.id !== 'end') {
    return Error(state.curr.token.loc, 'Expected `end`')
  }
  loc.end = state.curr.token.loc.end
  advance(state)
  return Ok(loc, ast.Block(body.tree))
}

/// /////////////////////////////////////////////////////////////////////////////
// Rules
defRule('(end)', {})
defRule('end', {})
defRule(')', {})
defRule('}', {})
defRule(':', {})
defRule(',', {})
defRule('|', {})
defRule('=', {})
defRule('as', {})
defRule('is', {})
defRule('then', {})
defRule('else', {})
defRule('elseif', {})
defRule('when', {})

defRule('NUMBER', {
  nud: function (state, token) {
    var v = parseFloat(token.src) || 0
    return Ok(token.loc, ast.Number(v))
  }
})

function stringTokenSrcToValue (src) {
  var value = src
    .replace(/(^")|("$)/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
  return value
}

defRule('STRING', {
  nud: function (state, token) {
    var value = stringTokenSrcToValue(token.src)
    return Ok(token.loc, ast.String(value))
  }
})
defRule('SYMBOL', {
  nud: function (state, token) {
    return Ok(token.loc, ast.Symbol(token.src))
  },
  type_nud: function (state, token) {
    return Ok(token.loc, ast.TypeVar(token.src))
  }
})
defRule('TYPE', {
  type_nud: function (state, token) {
    return Ok(token.loc, ast.Type(token.src))
  }
})

defRule('TAG', {
  nud: function (state, token) {
    return Ok(token.loc, ast.Tag(token.src.substring(1)))
  },
  type_nud: function (state, token) {
    return Ok(token.loc, ast.TypeTag(token.src.substring(1)))
  }
})

defRule('nil', {
  nud: function (state, token) {
    return Ok(token.loc, ast.Nil())
  }
})
defRule('true', {
  nud: function (state, token) {
    return Ok(token.loc, ast.Boolean(true))
  }
})
defRule('false', {
  nud: function (state, token) {
    return Ok(token.loc, ast.Boolean(false))
  }
})

infix('and', 30)
infix('or', 30)
infix('xor', 30)

infix('==', 40)
infix('!=', 40)
infix('<', 40)
infix('<=', 40)
infix('>', 40)
infix('>=', 40)

infix('+', 50)
infix('-', 50)
infix('++', 50)

infix('*', 60)
infix('/', 60)
infix('%', 60)

prefix('not', 70)
prefix('-', 70)

defRule('.', {
  lbp: 80,
  led: function (state, token, left) {
    var right = symbol(state)
    if (notOk(right)) {
      return right
    }
    return Ok(token.loc, ast.Member(left, right.tree))
  }
})

defRule('(', {
  nud: function (state, token) {
    var e = expression(state, 0)
    if (notOk(e)) {
      return e
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `)`')
    }
    advance(state)
    return e
  },

  lbp: 80,
  led: function (state, token, left) {
    var args = []
    if (state.curr.rule.id !== ')') {
      while (true) {
        var e = expression(state, 0)
        if (notOk(e)) {
          return e
        }
        args.push(e.tree)
        if (state.curr.rule.id !== ',') {
          break
        }
        advance(state)
      }
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `)`')
    }
    advance(state)
    if (left.ast.type === 'Tag') {
      return Ok(left.loc, ast.Tag(left.ast.tag, args))
    }
    return Ok(token.loc, ast.ApplyFn(left, args))
  }
})

defRule('{', {
  nud: function (state, token) {
    return struct(state, token)
  },
  type_nud: function (state, token) {
    return struct(state, token, true)
  }
})

defRule('fn', {
  nud: function (state, token) {
    if (state.curr.rule.id !== '(') {
      return Error(state.curr.token.loc, 'Expected `(`')
    }
    advance(state)
    var params = []
    if (state.curr.rule.id !== ')') {
      while (true) {
        var e = symbol(state)
        if (notOk(e)) {
          return e
        }
        params.push(e.tree)
        if (state.curr.rule.id !== ',') {
          break
        }
        advance(state)
      }
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `)`')
    }
    advance(state)
    var body
    if (state.curr.rule.id === 'do') {
      advance(state)
      body = doBlock(state)
    } else {
      body = expression(state, 0)
    }
    if (notOk(body)) {
      return body
    }
    return Ok(token.loc, ast.Function(params, body.tree))
  }
})

defRule('Fn', {
  type_nud: function (state, token) {
    if (state.curr.rule.id !== '(') {
      return Error(state.curr.token.loc, 'Expected `(`')
    }
    advance(state)
    var params = []
    if (state.curr.rule.id !== ')') {
      while (true) {
        var e = typeExpression(state, 0)
        if (notOk(e)) {
          return e
        }
        params.push(e.tree)
        if (state.curr.rule.id !== ',') {
          break
        }
        advance(state)
      }
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `)`')
    }
    advance(state)
    var body = typeExpression(state, 0)
    if (notOk(body)) {
      return body
    }
    return Ok(token.loc, ast.TypeFunction(params, body.tree))
  }
})

defRule('if', {
  nud: function (state, token) {
    var test = expression(state, 0)
    if (notOk(test)) {
      return test
    }
    if (state.curr.rule.id !== 'then') {
      return Error(state.curr.token.loc, 'Expected `then`')
    }
    advance(state)
    var then = expression(state, 0)
    if (notOk(then)) {
      return then
    }
    if (state.curr.rule.id !== 'else') {
      return Error(state.curr.token.loc, 'Expected `else`')
    }
    advance(state)
    var elseExpr = expression(state, 0)
    if (notOk(elseExpr)) {
      return elseExpr
    }

    return Ok(token.loc, ast.IfExpression(test.tree, then.tree, elseExpr.tree))
  },
  sta: function (state) {
    var loc = state.curr.token.loc

    var test = expression(state, 0)
    if (notOk(test)) {
      return test
    }
    if (state.curr.rule.id !== 'do') {
      return Error(state.curr.token.loc, 'Expected `do`')
    }
    advance(state)
    var then = statements(state)
    if (notOk(then)) {
      return then
    }
    then = then.tree
    then = {loc: then.loc, ast: ast.Block(then)}
    var else_
    while (true) {
      if (state.curr.rule.id === 'elseif') {
        return Error(state.curr.token.loc, '`elseif` is not yet supported')
      } else if (state.curr.rule.id === 'else') {
        advance(state)
        else_ = statements(state)
        if (notOk(else_)) {
          return else_
        }
        else_ = else_.tree
        else_ = {loc: else_.loc, ast: ast.Block(else_)}
        if (state.curr.rule.id !== 'end') {
          return Error(state.curr.token.loc, 'Expected `end`')
        }
        advance(state)
        break
      } else if (state.curr.rule.id === 'end') {
        advance(state)
        break
      } else {
        return Error(state.curr.token.loc, 'Expected `elseif` or `else` or `end`')
      }
    }
    return Ok(loc, ast.IfStatement(test.tree, then, else_))
  }
})

defRule('case', {
  nud: function (state, token) {
    var loc = token.loc
    var discriminant = expression(state, 0)
    if (notOk(discriminant)) {
      return discriminant
    }
    if (state.curr.rule.id !== 'when' && state.curr.rule.id !== 'else') {
      return Error(state.curr.token.loc, 'Expected `when` or `else`')
    }
    var whens = []
    var elseExpr
    while (true) {
      if (state.curr.rule.id === 'when') {
        advance(state)
        var test = expression(state, 0)
        if (notOk(test)) {
          return test
        }
        var then = expression(state, 0)
        if (notOk(then)) {
          return then
        }
        whens.push({
          loc: {
            start: test.tree.loc.start,
            end: then.tree.loc.end
          },
          ast: ast.CaseWhenExpression(test.tree, then.tree)
        })
      } else if (state.curr.rule.id === 'else') {
        advance(state)
        elseExpr = expression(state, 0)
        if (notOk(elseExpr)) {
          return elseExpr
        }
        break
      } else {
        break
      }
    }
    return Ok(loc, ast.CaseExpression(discriminant.tree, whens, elseExpr && elseExpr.tree))
  },
  sta: function (state) {
    var loc = {start: 0, end: 0}
    var discriminant = expression(state, 0)
    if (notOk(discriminant)) {
      return discriminant
    }
    if (state.curr.rule.id !== 'do') {
      return Error(state.curr.token.loc, 'Expected `do`')
    }
    advance(state)
    if (state.curr.rule.id !== 'when' && state.curr.rule.id !== 'else') {
      return Error(state.curr.token.loc, 'Expected `when` or `else`')
    }
    var whens = []
    var elseStmt
    while (true) {
      if (state.curr.rule.id === 'when') {
        advance(state)
        var test = expression(state, 0)
        if (notOk(test)) {
          return test
        }
        var then = statements(state)
        if (notOk(then)) {
          return then
        }
        whens.push({
          loc: {
            start: test.tree.loc.start,
            end: then.tree.loc.end
          },
          ast: ast.CaseWhenStatement(test.tree, then.tree)
        })
      } else if (state.curr.rule.id === 'else') {
        advance(state)
        elseStmt = statements(state)
        if (notOk(elseStmt)) {
          return elseStmt
        }
        if (state.curr.rule.id !== 'end') {
          return Error(state.curr.token.loc, 'Expected `end`')
        }
        advance(state)
        break
      } else if (state.curr.rule.id === 'end') {
        advance(state)
        break
      } else {
        return Error(state.curr.token.loc, 'Expected `when`, `else` or `end`')
      }
    }
    return Ok(loc, ast.CaseStatement(discriminant.tree, whens, elseStmt && elseStmt.tree))
  }
})

stmt('def', function (state) {
  var loc = state.curr.token.loc
  var isType = false
  switch (state.curr.rule.id) {
    case 'SYMBOL':
      break
    case 'TYPE':
      isType = true
      break
    default:
      return Error(state.curr.token.loc, 'Expected a symbol or type')
  }
  var id = isType
    ? type(state)
    : symbol(state)
  if (notOk(id)) {
    return id
  }
  id = id.tree
  if (state.curr.rule.id !== '=') {
    if (!isType) {
      return Error(state.curr.token.loc, 'Expected `=`')
    }
    if (state.curr.rule.id !== '<') {
      return Error(state.curr.token.loc, 'Expected `=` or `<`')
    }
    advance(state)
    var tparams = []
    while (true) {
      var tparam = typeVar(state)
      if (notOk(tparam)) {
        return tparam
      }
      tparams.push(tparam.tree)
      if (state.curr.rule.id !== ',') {
        break
      }
      advance(state)
    }
    if (state.curr.rule.id !== '>') {
      return Error(state.curr.token.loc, 'Expected `,` or `>`')
    }
    id = {
      loc: {start: id.loc.start, end: state.curr.token.loc.end},
      ast: ast.Generic(id, tparams)
    }
    advance(state)
    if (state.curr.rule.id !== '=') {
      return Error(state.curr.token.loc, 'Expected `=`')
    }
  }
  advance(state)
  var init = isType
    ? typeExpression(state, 0)
    : expression(state, 0)
  if (notOk(init)) {
    return init
  }
  return Ok(loc, ast.Define(id, init.tree))
})

stmt('set', function (state) {
  var loc = state.curr.token.loc
  var id = symbol(state)
  if (notOk(id)) {
    return id
  }
  if (state.curr.rule.id !== '=') {
    return Error(state.curr.token.loc, 'Expected `=`')
  }
  advance(state)
  var value = expression(state, 0)
  if (notOk(value)) {
    return value
  }
  return Ok(loc, ast.Assign(id.tree, value.tree))
})

stmt('do', doBlock)

stmt('return', function (state) {
  var loc = state.curr.token.loc
  var val = expression(state, 0)
  if (notOk(val)) {
    return val
  }
  return Ok(loc, ast.Return(val.tree))
})

stmt('while', function (state) {
  var loc = state.curr.token.loc
  var cond = expression(state, 0)
  if (notOk(cond)) {
    return cond
  }
  if (state.curr.rule.id !== 'do') {
    return Error(state.curr.token.loc, 'Expected `do`')
  }
  advance(state)
  var body = doBlock(state)
  if (notOk(body)) {
    return body
  }
  return Ok(loc, ast.While(cond.tree, body.tree))
})
stmt('continue', function (state) {
  return Ok(state.curr.token.loc, ast.Continue())
})
stmt('break', function (state) {
  return Ok(state.curr.token.loc, ast.Break())
})

stmt('ann', function (state) {
  var loc = state.curr.token.loc
  var id = symbol(state)
  if (notOk(id)) {
    return id
  }
  if (state.curr.rule.id !== '=') {
    return Error(state.curr.token.loc, 'Expected `=`')
  }
  advance(state)

  var init = typeExpression(state, 0)
  if (notOk(init)) {
    return init
  }
  return Ok(loc, ast.Annotate(id.tree, init.tree))
})

stmt('type', function (state) {
  var loc = state.curr.token.loc
  var id = type(state)
  if (notOk(id)) {
    return id
  }
  if (state.curr.rule.id !== '=') {
    return Error(state.curr.token.loc, 'Expected `=`')
  }
  advance(state)

  var variants = []

  while (true) {
    var variant = typeExpression(state, 0)
    if (notOk(variant)) {
      return variant
    }
    variant = variant.tree
    if (variant.ast.type !== 'TypeTag') {
      return Error(variant.loc, 'Expected a tag')
    }
    variants.push(variant)
    if (state.curr.rule.id !== '|') {
      break
    }
    advance(state)
  }

  return Ok(loc, ast.TypeUnion(id.tree, variants))
})

defRule('(', {
  type_lbp: 80,
  type_led: function (state, token, left) {
    if (left.ast.type !== 'TypeTag') {
      return Error(token.loc, 'In type expressions, `(` only works after tags')
    }
    var args = []
    if (state.curr.rule.id !== ')') {
      while (true) {
        var e = typeExpression(state, 0)
        if (notOk(e)) {
          return e
        }
        args.push(e.tree)
        if (state.curr.rule.id !== ',') {
          break
        }
        advance(state)
      }
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `,` or `)`')
    }
    advance(state)
    return Ok(left.loc, ast.TypeTag(left.ast.tag, args))
  }
})

defRule('<', {
  type_lbp: 80,
  type_led: function (state, token, left) {
    if (left.ast.type !== 'Type') {
      return Error(left.loc, 'expected a type left of `<`')
    }
    var args = []
    while (true) {
      var e = typeExpression(state, 0)
      if (notOk(e)) {
        return e
      }
      args.push(e.tree)
      if (state.curr.rule.id !== ',') {
        break
      }
      advance(state)
    }
    if (state.curr.rule.id !== '>') {
      return Error(state.curr.token.loc, 'Expected `,` or `>`')
    }
    advance(state)
    return Ok(left.loc, ast.Generic(left, args))
  }
})

stmt('import', function (state) {
  var loc = state.curr.token.loc

  if (state.curr.rule.id !== 'STRING') {
    return Error(state.curr.token.loc, 'Expected a path string literal')
  }
  var path = stringTokenSrcToValue(state.curr.token.src)
  var parts = []
  advance(state)

  if (state.curr.rule.id === '*') {
    advance(state)
    parts = null
  } else if (state.curr.rule.id === '(') {
    advance(state)
    while (true) {
      if (state.curr.rule.id === 'SYMBOL') {
        var sym = importSymbol(state)
        if (notOk(sym)) {
          return sym
        }
        parts.push(sym.tree)
      } else if (state.curr.rule.id === 'TYPE') {
        var typ = importType(state)
        if (notOk(typ)) {
          return typ
        }
        parts.push(typ.tree)
      } else {
        return Error(state.curr.token.loc, 'Expected a variable or type to import')
      }
      if (state.curr.rule.id !== ',') {
        break
      }
      advance(state)
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `,` or `)`')
    }
    advance(state)
  } else {
    return Error(state.curr.token.loc, 'Expected `*` or `(`')
  }

  return Ok(loc, ast.Import(path, parts))
})

stmt('export', function (state) {
  var loc = state.curr.token.loc

  var parts = []
  if (state.curr.rule.id === '*') {
    advance(state)
    parts = null
  } else if (state.curr.rule.id === '(') {
    advance(state)
    while (true) {
      if (state.curr.rule.id === 'SYMBOL') {
        var sym = symbol(state)
        if (notOk(sym)) {
          return sym
        }
        parts.push(sym.tree)
      } else if (state.curr.rule.id === 'TYPE') {
        var typ = type(state)
        if (notOk(typ)) {
          return typ
        }
        parts.push(typ.tree)
      } else {
        return Error(state.curr.token.loc, 'Expected a variable or type to export')
      }
      if (state.curr.rule.id !== ',') {
        break
      }
      advance(state)
    }
    if (state.curr.rule.id !== ')') {
      return Error(state.curr.token.loc, 'Expected `,` or `)`')
    }
    advance(state)
  } else {
    return Error(state.curr.token.loc, 'Expected `*` or `(`')
  }

  return Ok(loc, ast.Export(parts))
})

/// /////////////////////////////////////////////////////////////////////////////

var parse = function (tokens, entryParseFn) {
  var state = {
    tokens: tokens,
    token_i: 0,
    curr: void 0
  }

  advance(state)
  var s = entryParseFn(state)
  if (notOk(s)) {
    return s
  }
  if (state.curr.rule.id !== '(end)') {
    return Error(state.curr.token.loc, 'Expected `(end)`')
  }
  advance(state)

  return s
}

module.exports = {
  parse: function (tokens) {
    return parse(tokens, statements)
  },
  parseExpression: function (tokens) {
    return parse(tokens, function (state) {
      return expression(state, 0)
    })
  },
  parseTypeExpression: function (tokens) {
    return parse(tokens, function (state) {
      return typeExpression(state, 0)
    })
  }
}
