var _ = require('lodash')
var ast = require('./src/ast')
var tdop = require('./src/tdop')
var test = require('ava')
var tokenizer = require('ecmaless-tokenizer')

var parseExpression = function (src) {
  var r = tokenizer(src)
  if (r.type !== 'Ok') {
    return r
  }
  return tdop.parseExpression(r.value)
}

var rmLoc = function (ast) {
  if (_.isPlainObject(ast)) {
    if (!_.isEqual(_.keys(ast), ['loc', 'ast'])) {
      throw 'AST tree should only have {loc, ast} properties: ' + _.keys(ast).join(', ')//eslint-disable-line
    }
    return _.isArray(ast.ast)
      ? _.map(ast.ast, rmLoc)
      : _.mapValues(ast.ast, rmLoc)
  }
  if (_.isArray(ast)) {
    return _.map(ast, rmLoc)
  }
  return ast
}

function p (src, entryFn) {
  entryFn = entryFn || tdop.parse

  var tokens = tokenizer(src)
  if (tokens.type !== 'Ok') {
    return 'TokenizerError: ' + JSON.stringify(tokens)
  }
  var r = entryFn(tokens.value)
  if (r.type !== 'Ok') {
    return r.message + '|' + r.loc.start + '-' + r.loc.end
  }
  var ast = rmLoc(r.tree)
  return ast
}

function pe (src) {
  return p(src, tdop.parseExpression)
}

function pte (src) {
  return p(src, tdop.parseTypeExpression)
}

var S = ast.Symbol
var T = ast.Type

test('expression', function (t) {
  t.is = t.deepEqual

  t.deepEqual(pe('123'), ast.Number(123))
  t.deepEqual(pe('"a"'), ast.String('a'))
  t.deepEqual(pe('"a\\"b"'), ast.String('a"b'))
  t.deepEqual(pe('"a\\\\b"'), ast.String('a\\b'))

  t.deepEqual(pe('nil'), ast.Nil())
  t.deepEqual(pe('true'), ast.Boolean(true))
  t.deepEqual(pe('false'), ast.Boolean(false))

  t.deepEqual(pe('foo'), ast.Symbol('foo'))

  t.deepEqual(pe('a+b'), ast.Infix('+', S('a'), S('b')))
  t.deepEqual(pe('aorb'), S('aorb'))
  t.deepEqual(pe('a or b'), ast.Infix('or', S('a'), S('b')))

  t.is(pe('a + + b'), 'Expected an expression|4-5')

  t.is(pe('='), 'Expected an expression|0-1')
  t.is(pe('= a'), 'Expected an expression|0-1')
  t.is(pe('a ='), 'Expected `(end)`|2-3')

  t.is(pe('or'), 'Expected an expression|0-2')

  t.is(pe('a +'), 'Expected an expression|3-3')

  t.is(pe('a b'), 'Expected `(end)`|2-3')

  t.deepEqual(pe('a + b + c'), ast.Infix('+', ast.Infix('+', S('a'), S('b')), S('c')))
  t.deepEqual(pe('a + b * c'), ast.Infix('+', S('a'), ast.Infix('*', S('b'), S('c'))))
  t.deepEqual(pe('(a + b) * c'), ast.Infix('*', ast.Infix('+', S('a'), S('b')), S('c')))

  t.deepEqual(pe('not a'), ast.Prefix('not', S('a')))
  t.deepEqual(pe('not a or b'), ast.Infix('or', ast.Prefix('not', S('a')), S('b')))
  t.deepEqual(pe('a or not b == c'), ast.Infix('or', S('a'), ast.Infix('==', ast.Prefix('not', S('b')), S('c'))))

  t.deepEqual(pe('a - b'), ast.Infix('-', S('a'), S('b')))
  t.deepEqual(pe('a - - b'), ast.Infix('-', S('a'), ast.Prefix('-', S('b'))))

  t.is(pe('-'), 'Expected an expression|1-1')
  t.is(pe('not'), 'Expected an expression|3-3')

  t.is(pe('(a'), 'Expected `)`|2-2')

  t.deepEqual(pe('a()'), ast.ApplyFn(S('a'), []))
  t.deepEqual(pe('a(b + (c))'), ast.ApplyFn(S('a'), [ast.Infix('+', S('b'), S('c'))]))
  t.deepEqual(pe('a(b())'), ast.ApplyFn(S('a'), [ast.ApplyFn(S('b'), [])]))

  t.deepEqual(pe('fn() a'), ast.Function([], S('a')))
  t.deepEqual(pe('fn(a, b) c'), ast.Function([S('a'), S('b')], S('c')))

  t.deepEqual(pe('(fn() a)()'), ast.ApplyFn(ast.Function([], S('a')), []))

  t.is(pe('fn a'), 'Expected `(`|3-4')
  t.is(pe('fn('), 'Expected a symbol|3-3')
  t.is(pe('fn(+)'), 'Expected a symbol|3-4')
  t.is(pe('fn(a'), 'Expected `)`|4-4')
  t.is(pe('fn(a + b)'), 'Expected `)`|5-6')
  t.is(pe('fn(1)'), 'Expected a symbol|3-4')

  t.is(pe('if a'), 'Expected `then`|4-4')
  t.is(pe('if a then b'), 'Expected `else`|11-11')
  t.deepEqual(pe('if a then b else c'), ast.IfExpression(S('a'), S('b'), S('c')))
  t.deepEqual(pe('if a then b else if c then d else e'), ast.IfExpression(S('a'), S('b'), ast.IfExpression(S('c'), S('d'), S('e'))))
  t.deepEqual(pe('if a then if b then c else d else e'), ast.IfExpression(S('a'), ast.IfExpression(S('b'), S('c'), S('d')), S('e')))

  t.is(pe('{'), 'Expected a symbol|1-1')
  t.deepEqual(pe('{}'), ast.Struct([]))
  t.is(pe('{a'), 'Expected `:`|2-2')
  t.is(pe('{a:'), 'Expected an expression|3-3')
  t.is(pe('{a: 1'), 'Expected `}`|5-5')
  t.deepEqual(pe('{a: 1}'), ast.Struct([
    ast.StructPair(S('a'), ast.Number(1))
  ]))
  t.is(pe('{a: 1,'), 'Expected a symbol|6-6')
  t.deepEqual(pe('{a: 1,}'), ast.Struct([
    ast.StructPair(S('a'), ast.Number(1))
  ]))
  t.is(pe('{a: 1,,}'), 'Expected a symbol|6-7')
  t.deepEqual(pe('{b: 2, c: 3}'), ast.Struct([
    ast.StructPair(S('b'), ast.Number(2)),
    ast.StructPair(S('c'), ast.Number(3))
  ]))
  t.deepEqual(pe('{b: 2, c: 3,}'), ast.Struct([
    ast.StructPair(S('b'), ast.Number(2)),
    ast.StructPair(S('c'), ast.Number(3))
  ]))
  t.is(pe('{def: 1}'), ast.Struct([
    ast.StructPair(S('def'), ast.Number(1))
  ]))

  t.deepEqual(pe('a.b'), ast.Member(S('a'), S('b')))
  t.deepEqual(pe('a.b.c'), ast.Member(ast.Member(S('a'), S('b')), S('c')))
  t.is(pe('a.'), 'Expected a symbol|2-2')
  t.is(pe('a. 1'), 'Expected a symbol|3-4')// NOTE need the space so it doesn't tokenize the number `.1`
  t.is(pe('a.def'), ast.Member(S('a'), S('def')))

  t.is(pe('case'), 'Expected an expression|4-4')
  t.is(pe('case foo'), 'Expected `when` or `else`|8-8')
  t.is(pe('case foo when'), 'Expected an expression|13-13')
  t.is(pe('case foo when #foo'), 'Expected an expression|18-18')
  t.deepEqual(pe('case foo when #foo bar'), ast.CaseExpression(S('foo'), [
    ast.CaseWhenExpression(ast.Tag('foo'), S('bar'))
  ]))
  t.is(pe('case foo when #foo bar else'), 'Expected an expression|27-27')
  t.deepEqual(pe('case foo when #foo bar else baz'), ast.CaseExpression(S('foo'), [
    ast.CaseWhenExpression(ast.Tag('foo'), S('bar'))
  ], S('baz')))
  t.deepEqual(pe('case foo when #foo bar when #baz qux'), ast.CaseExpression(S('foo'), [
    ast.CaseWhenExpression(ast.Tag('foo'), S('bar')),
    ast.CaseWhenExpression(ast.Tag('baz'), S('qux'))
  ]))
})

test('ast shape', function (t) {
  t.deepEqual(parseExpression('a'), {
    type: 'Ok',
    tree: {
      loc: {start: 0, end: 1},
      ast: {type: 'Symbol', value: 'a'}
    }
  })

  t.deepEqual(parseExpression('not a'), {
    type: 'Ok',
    tree: {
      loc: {start: 0, end: 3},
      ast: {
        type: 'Prefix',
        op: 'not',
        value: {
          loc: {start: 4, end: 5},
          ast: {type: 'Symbol', value: 'a'}
        }
      }
    }
  })

  t.deepEqual(parseExpression('a + b'), {
    type: 'Ok',
    tree: {
      loc: {start: 2, end: 3},
      ast: {
        type: 'Infix',
        op: '+',
        left: {
          loc: {start: 0, end: 1},
          ast: {type: 'Symbol', value: 'a'}
        },
        right: {
          loc: {start: 4, end: 5},
          ast: {type: 'Symbol', value: 'b'}
        }
      }
    }
  })

  t.deepEqual(parseExpression('(a)'), {
    type: 'Ok',
    tree: {
      loc: {start: 1, end: 2},
      ast: {type: 'Symbol', value: 'a'}
    }
  })

  t.deepEqual(parseExpression('a(b)'), {
    type: 'Ok',
    tree: {
      loc: {start: 1, end: 2},
      ast: {
        type: 'ApplyFn',
        callee: {
          loc: {start: 0, end: 1},
          ast: S('a')
        },
        args: [
          {
            loc: {start: 2, end: 3},
            ast: S('b')
          }
        ]
      }
    }
  })

  t.deepEqual(parseExpression('{a: 1}'), {
    type: 'Ok',
    tree: {
      loc: {start: 0, end: 6},
      ast: {
        type: 'Struct',
        pairs: [
          {
            loc: {start: 1, end: 5},
            ast: {
              type: 'StructPair',
              key: {
                loc: {start: 1, end: 2},
                ast: S('a')
              },
              value: {
                loc: {start: 4, end: 5},
                ast: ast.Number(1)
              }
            }
          }
        ]
      }
    }
  })
})

test('statements', function (t) {
  t.is = t.deepEqual

  t.deepEqual(p('a()'), [ast.CallFn(S('a'), [])])
  t.is(p('a + 1'), 'Expected a statement|2-3')

  t.deepEqual(p('a() b()'), [
    ast.CallFn(S('a'), []),
    ast.CallFn(S('b'), [])
  ])
  t.is(p('a() b'), 'Expected a statement|4-5')

  t.deepEqual(p('def a = 1'), [ast.Define(S('a'), ast.Number(1))])
  t.is(p('def 1 = a'), 'Expected a symbol or type|4-5')
  t.is(p('def a + a'), 'Expected `=`|6-7')
  t.is(p('def a = def b = 2'), 'Expected an expression|8-11')

  t.is(p('set'), 'Expected a symbol|3-3')
  t.is(p('set A'), 'Expected a symbol|4-5')
  t.is(p('set a'), 'Expected `=`|5-5')
  t.is(p('set a ='), 'Expected an expression|7-7')
  t.is(p('set a = 1'), [ast.Assign(S('a'), ast.Number(1))])

  t.deepEqual(p('ann a = Number'), [ast.Annotate(S('a'), T('Number'))])
  t.is(p('ann 1 = Number'), 'Expected a symbol|4-5')
  t.is(p('ann a a Number'), 'Expected `=`|6-7')
  t.is(p('ann a = 1'), 'Expected a type expression|8-9')

  t.deepEqual(p('do end'), [ast.Block([])])
  t.deepEqual(p('\n\ndo\n  \n\nend\n\n'), [ast.Block([])])
  t.deepEqual(p('  do\n  \n\nend  '), [ast.Block([])])

  t.deepEqual(p('do def a = 1 end'), [
    ast.Block([
      ast.Define(S('a'), ast.Number(1))
    ])
  ])

  t.deepEqual(p('def noop = fn() do end'), [
    ast.Define(S('noop'), ast.Function([], ast.Block([])))
  ])
  t.deepEqual(p('def foo = fn() do bar() baz() end'), [
    ast.Define(S('foo'), ast.Function([], ast.Block([
      ast.CallFn(S('bar'), []),
      ast.CallFn(S('baz'), [])
    ])))
  ])
  t.is(p('def noop = fn() do'), 'Expected `end`|18-18')

  t.deepEqual(p('return a'), [ast.Return(S('a'))])
  t.is(p('return +'), 'Expected an expression|7-8')

  t.is(p('while a'), 'Expected `do`|7-7')
  t.deepEqual(p('while a do foo() end'), [
    ast.While(S('a'), ast.Block([
      ast.CallFn(S('foo'), [])
    ]))
  ])
  t.deepEqual(p('continue break'), [
    ast.Continue(),
    ast.Break()
  ])
  t.is(p('def a = fn() continue'), 'Expected an expression|13-21')

  t.is(p('if a then'), 'Expected `do`|5-9')
  t.is(p('if a do foo()'), 'Expected `elseif` or `else` or `end`|13-13')
  t.deepEqual(p('if a do foo() end'), [
    ast.IfStatement(S('a'), ast.Block([
      ast.CallFn(S('foo'), [])
    ]), void 0)
  ])
  t.deepEqual(p('if a do foo() else bar() end'), [
    ast.IfStatement(S('a'), ast.Block([
      ast.CallFn(S('foo'), [])
    ]), ast.Block([
      ast.CallFn(S('bar'), [])
    ]))
  ])
  t.deepEqual(p('if a do else end'), [ast.IfStatement(S('a'), ast.Block([]), ast.Block([]))])
  t.deepEqual(p('if a do end'), [ast.IfStatement(S('a'), ast.Block([]), void 0)])

  t.is(p('def'), 'Expected a symbol or type|3-3')
  t.is(p('def Foo'), 'Expected `=`|7-7')
  t.is(p('def Foo ='), 'Expected a type expression|9-9')
  t.deepEqual(p('def Foo = Bar'), [ast.Define(T('Foo'), T('Bar'))])

  t.is(p('def A = {'), 'Expected a symbol|9-9')
  t.deepEqual(p('def A = {}'), [
    ast.Define(T('A'), ast.TypeStruct([]))
  ])
  t.is(p('def A = {name'), 'Expected `:`|13-13')
  t.is(p('def A = {name:'), 'Expected a type expression|14-14')
  t.deepEqual(p('def A = {name: String}'), [
    ast.Define(T('A'), ast.TypeStruct([
      ast.TypeStructPair(S('name'), T('String'))
    ]))
  ])
  t.deepEqual(p('def A = {name: String,}'), [
    ast.Define(T('A'), ast.TypeStruct([
      ast.TypeStructPair(S('name'), T('String'))
    ]))
  ])
  t.is(p('def A = {name: String'), 'Expected `}`|21-21')

  t.is(p('case'), 'Expected an expression|4-4')
  t.is(p('case foo'), 'Expected `do`|8-8')
  t.is(p('case foo do'), 'Expected `when` or `else`|11-11')
  t.is(p('case foo do when'), 'Expected an expression|16-16')
  t.is(p('case foo do when #bar'), 'Expected `when`, `else` or `end`|21-21')
  t.deepEqual(p('case foo do when #bar end'), [
    ast.CaseStatement(S('foo'), [
      ast.CaseWhenStatement(ast.Tag('bar'), [])
    ])
  ])
  t.is(p('case foo do when #bar baz end'), 'Expected a statement|22-25')
  t.deepEqual(p('case foo do when #bar baz() end'), [
    ast.CaseStatement(S('foo'), [
      ast.CaseWhenStatement(ast.Tag('bar'), [
        ast.CallFn(S('baz'), [])
      ])
    ])
  ])
  t.deepEqual(p('case foo do when #bar baz() when #qux end'), [
    ast.CaseStatement(S('foo'), [
      ast.CaseWhenStatement(ast.Tag('bar'), [
        ast.CallFn(S('baz'), [])
      ]),
      ast.CaseWhenStatement(ast.Tag('qux'), [])
    ])
  ])
  t.is(p('case foo do when #bar baz() else qux() when Foo() end'), 'Expected `end`|39-43')
  t.deepEqual(p('case foo do when #bar baz() else qux() end'), [
    ast.CaseStatement(S('foo'), [
      ast.CaseWhenStatement(ast.Tag('bar'), [
        ast.CallFn(S('baz'), [])
      ])
    ], [
      ast.CallFn(S('qux'), [])
    ])
  ])
})

test('type expression', function (t) {
  t.deepEqual(pte('Number'), T('Number'))

  t.is(pte('Fn'), 'Expected `(`|2-2')
  t.is(pte('Fn('), 'Expected a type expression|3-3')
  t.is(pte('Fn(Number'), 'Expected `)`|9-9')
  t.is(pte('Fn(Number)'), 'Expected a type expression|10-10')
  t.deepEqual(pte('Fn(Number)Number'), ast.TypeFunction([T('Number')], T('Number')))
  t.deepEqual(pte('Fn()Number'), ast.TypeFunction([], T('Number')))
  t.deepEqual(pte('Fn(Number, String) Fn(Number)Number'), ast.TypeFunction([T('Number'), T('String')], ast.TypeFunction([T('Number')], T('Number'))))
})

test('import', function (t) {
  t.is(p('import'), 'Expected a path string literal|6-6')
  t.is(p('import a'), 'Expected a path string literal|7-8')
  t.is(p('import "./foo"'), 'Expected `*` or `(`|14-14')

  t.deepEqual(p('import "./foo" *'), [ast.Import('./foo', null)])

  t.is(p('import "./foo" ('), 'Expected a variable or type to import|16-16')
  t.is(p('import "./foo" (bar'), 'Expected `,` or `)`|19-19')
  t.is(p('import "./foo" (bar,'), 'Expected a variable or type to import|20-20')
  t.is(p('import "./foo" (bar,Baz'), 'Expected `,` or `)`|23-23')
  t.deepEqual(p('import "./foo" (bar,Baz)'), [
    ast.Import('./foo', [
      ast.ImportSymbol(S('bar')),
      ast.ImportType(T('Baz'))
    ])
  ])

  t.is(p('import "./foo" (bar as )'), 'Expected a symbol|23-24')
  t.deepEqual(p('import "./foo" (bar as wat)'), [
    ast.Import('./foo', [
      ast.ImportSymbol(S('bar'), S('wat'))
    ])
  ])

  t.is(p('import "./foo" (bar is )'), 'Expected a type expression|23-24')
  t.deepEqual(p('import "./foo" (bar is Fn(Number) String)'), [
    ast.Import('./foo', [
      ast.ImportSymbol(S('bar'), void 0, ast.TypeFunction([T('Number')], T('String')))
    ])
  ])

  t.deepEqual(p('import "./foo" (bar as wat is String)'), [
    ast.Import('./foo', [
      ast.ImportSymbol(S('bar'), S('wat'), T('String'))
    ])
  ])

  t.is(p('import "./foo" (Baz as )'), 'Expected a type|23-24')
  t.deepEqual(p('import "./foo" (Baz as Wat)'), [
    ast.Import('./foo', [
      ast.ImportType(T('Baz'), T('Wat'))
    ])
  ])
  t.is(p('import "./foo" (Baz as Wat is String)'), 'Expected `,` or `)`|27-29')
})

test('export', function (t) {
  t.is(p('export'), 'Expected `*` or `(`|6-6')

  t.deepEqual(p('export *'), [ast.Export(null)])

  t.is(p('export ('), 'Expected a variable or type to export|8-8')
  t.is(p('export ()'), 'Expected a variable or type to export|8-9')
  t.is(p('export (foo'), 'Expected `,` or `)`|11-11')
  t.is(p('export (foo())'), 'Expected `,` or `)`|11-12')

  t.deepEqual(p('export (foo)'), [ast.Export([S('foo')])])
  t.deepEqual(p('export (foo, Bar, baz, Qux)'), [ast.Export([S('foo'), T('Bar'), S('baz'), T('Qux')])])
})

test('tagged unionts / type variants', function (t) {
  t.is = t.deepEqual

  t.is(p('type'), 'Expected a type|4-4')
  t.is(p('type A'), 'Expected `=`|6-6')
  t.is(p('type A='), 'Expected a type expression|7-7')
  t.is(p('type A=B'), 'Expected a tag|7-8')
  t.is(p('type A=#b'), [
    ast.TypeUnion(T('A'), [
      ast.TypeTag('b')
    ])
  ])
  t.is(p('type A=#b('), 'Expected a type expression|10-10')
  t.is(p('type A=#b(C'), 'Expected `,` or `)`|11-11')
  t.is(p('type A=#b(C)'), [
    ast.TypeUnion(T('A'), [
      ast.TypeTag('b', [T('C')])
    ])
  ])

  t.is(pte('#b'), ast.TypeTag('b'))

  t.is(pte('B(C)'), 'In type expressions, `(` only works after tags|1-2')

  t.is(pe('#b'), ast.Tag('b'))
  t.is(pe('#b(c)'), ast.Tag('b', [S('c')]))
  t.is(pe('#b(1, d)'), ast.Tag('b', [ast.Number(1), S('d')]))
})
