var _ = require('lodash')
var test = require('tape')
var tokenizer = require('./tokenizer')

test('tokenizer', function (t) {
  var tst = function (src, expected, message) {
    var r = tokenizer(src)
    if (r.type !== 'Ok') {
      t.fail('failed to tokenize: ' + src + ' ' + JSON.stringify(r))
      return
    }
    var tokens = r.value

    t.deepEquals(_.map(tokens, function (tok) {
      var locSrc = src.substring(tok.loc.start, tok.loc.end)
      t.equals(tok.src, locSrc, 'loc should point to the same src string')
      return _.padEnd(tok.type, 7) + '|' + tok.src
    }), expected, message)

    t.equals(_.map(tokens, 'src').join(''), src, 'all src should be tokenized')
  }

  var tstTok = function (type, src) {
    tst(src, [_.padEnd(type, 7) + '|' + src])
  }

  var tstErr = function (src, eType, eMessage, eSrc, eLoc) {
    t.deepEquals(tokenizer(src), {
      type: eType,
      message: eMessage,
      src: eSrc,
      loc: eLoc
    })
  }

  tstTok('NUMBER', '0')
  tstTok('NUMBER', '123')
  tstTok('NUMBER', '123.45')
  tstTok('NUMBER', '.45')

  tstTok('STRING', '""')
  tstTok('STRING', '"foo"')
  tstTok('STRING', '"one \\" two"')
  tstTok('STRING', '"one\\ntwo"')

  tstErr('"one\ntwo"',
    'UnexpectedCharacter',
    'Use """ for multiline strings',
    '\n',
    {start: 4, end: 5}
  )

  tstErr('"one\ntwo"',
    'UnexpectedCharacter',
    'Use """ for multiline strings',
    '\n',
    {start: 4, end: 5}
  )
  tstErr('"foo',
    'UnterminatedString',
    'Use " to close your string',
    '"foo',
    {start: 3, end: 4}
  )
  tstErr('"foo\\"',
    'UnterminatedString',
    'Use " to close your string',
    '"foo\\"',
    {start: 5, end: 6}
  )

  tstTok('DOCSTRING', '"""one"""')
  tstTok('DOCSTRING', '"""\none\n"""')
  tstTok('DOCSTRING', '"""one"""')
  tstTok('DOCSTRING', '"""one\\""" two "\\"" three """')
  tstErr('"""one""',
    'UnterminatedString',
    'Use """ to close your docstring',
    '"""one""',
    {start: 7, end: 8}
  )
  tstErr('"""one\\"""',
    'UnterminatedString',
    'Use """ to close your docstring',
    '"""one\\"""',
    {start: 9, end: 10}
  )
  tstTok('DOCSTRING', '"""one\\""""')

  tstTok('SYMBOL', 'foo')
  tstTok('SYMBOL', 'fooBar')
  tstTok('SYMBOL', 'foo_bar')
  tstTok('SYMBOL', 'a1')
  tstTok('SYMBOL', '_B')
  tstTok('TYPE', 'Foo')
  tstTok('TYPE', 'Foo_bar')
  tstTok('TYPE', 'A1')

  tstTok('COMMENT', '; some comment')

  tstTok('RAW', '{')
  tstTok('RAW', '==')
  tstTok('RAW', '!=')
  tstTok('RAW', '|')
  tstErr('foo$',
    'UnexpectedCharacter',
    "Don't know what to do with \"$\"",
    '$',
    {start: 3, end: 4}
  )

  tst('foo+bar', [
    'SYMBOL |foo',
    'RAW    |+',
    'SYMBOL |bar'
  ])

  tst('123 "four"\nblah', [
    'NUMBER |123',
    'SPACES | ',
    'STRING |"four"',
    'NEWLINE|\n',
    'SYMBOL |blah'
  ])

  tst('10 0.1 1.0', [
    'NUMBER |10',
    'SPACES | ',
    'NUMBER |0.1',
    'SPACES | ',
    'NUMBER |1.0'
  ])

  tst('({[]})', [
    'RAW    |(',
    'RAW    |{',
    'RAW    |[',
    'RAW    |]',
    'RAW    |}',
    'RAW    |)'
  ])

  tst('*:', [
    'RAW    |*',
    'RAW    |:'
  ])

  tst('<', [
    'RAW    |<'
  ])
  tst('<=', [
    'RAW    |<='
  ])
  tst('<!==', [
    'RAW    |<',
    'RAW    |!=',
    'RAW    |='
  ])

  tst('1;some comment\n2', [
    'NUMBER |1',
    'COMMENT|;some comment',
    'NEWLINE|\n',
    'NUMBER |2'
  ])

  tst('[\n    1,\n    2,\n]', [
    'RAW    |[',
    'NEWLINE|\n',
    'SPACES |    ',
    'NUMBER |1',
    'RAW    |,',
    'NEWLINE|\n',
    'SPACES |    ',
    'NUMBER |2',
    'RAW    |,',
    'NEWLINE|\n',
    'RAW    |]'
  ])

  tst('1\n;some comment', [
    'NUMBER |1',
    'NEWLINE|\n',
    'COMMENT|;some comment'
  ])

  tst('1\n;some comment\n2', [
    'NUMBER |1',
    'NEWLINE|\n',
    'COMMENT|;some comment',
    'NEWLINE|\n',
    'NUMBER |2'
  ])

  tst('"""foo"""a', [
    'DOCSTRING|"""foo"""',
    'SYMBOL |a'
  ])
  tst('"""foo""""bar"', [
    'DOCSTRING|"""foo"""',
    'STRING |"bar"'
  ])

  tstErr('a\tb',
    'NoTabs',
    'Tabs (\\t) are not allowed, use spaces instead.',
    '\t',
    {start: 1, end: 2}
  )
  tstErr('a\n\rb',
    'NoCarriageReturns',
    'Carriage returns (\\r) are not allowed, use newline (\\n) instead.',
    '\r',
    {start: 2, end: 3}
  )

  t.end()
})
