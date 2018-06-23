module.exports = {
  Number: function (value) {
    return {type: 'Number', value: value}
  },
  String: function (value) {
    return {type: 'String', value: value}
  },
  Symbol: function (value) {
    return {type: 'Symbol', value: value}
  },
  Infix: function (op, left, right) {
    return {
      type: 'Infix',
      op: op,
      left: left,
      right: right
    }
  },
  Prefix: function (op, value) {
    return {
      type: 'Prefix',
      op: op,
      value: value
    }
  },
  ApplyFn: function (callee, args) {
    return {
      type: 'ApplyFn',
      callee: callee,
      args: args
    }
  },
  Function: function (params, body) {
    return {
      type: 'Function',
      params: params,
      body: body
    }
  },
  Struct: function (pairs) {
    return {
      type: 'Struct',
      pairs: pairs
    }
  },
  StructPair: function (key, value) {
    return {
      type: 'StructPair',
      key: key,
      value: value
    }
  },
  TypeStruct: function (pairs) {
    return {
      type: 'TypeStruct',
      pairs: pairs
    }
  },
  TypeStructPair: function (key, value) {
    return {
      type: 'TypeStructPair',
      key: key,
      value: value
    }
  },
  Define: function (id, init) {
    return {
      type: 'Define',
      id: id,
      init: init
    }
  },
  Block: function (body) {
    return {
      type: 'Block',
      body: body
    }
  },
  Return: function (value) {
    return {
      type: 'Return',
      value: value
    }
  },
  While: function (cond, body) {
    return {
      type: 'While',
      cond: cond,
      body: body
    }
  },
  Continue: function () {
    return {type: 'Continue'}
  },
  Break: function () {
    return {type: 'Break'}
  },
  IfExpression: function (test, then, elseExpr) {
    return {
      type: 'IfExpression',
      test: test,
      then: then,
      'else': elseExpr
    }
  },
  IfStatement: function (test, then, elseStmt) {
    return {
      type: 'IfStatement',
      test: test,
      then: then,
      'else': elseStmt
    }
  },
  CaseExpression: function (discriminant, whens, elseExpr) {
    return {
      type: 'CaseExpression',
      discriminant: discriminant,
      whens: whens,
      'else': elseExpr
    }
  },
  CaseStatement: function (discriminant, whens, elseStmt) {
    return {
      type: 'CaseStatement',
      discriminant: discriminant,
      whens: whens,
      'else': elseStmt
    }
  },
  CaseWhenExpression: function (test, then) {
    return {
      type: 'CaseWhenExpression',
      test: test,
      then: then
    }
  },
  CaseWhenStatement: function (test, then) {
    return {
      type: 'CaseWhenStatement',
      test: test,
      then: then
    }
  },
  Type: function (value) {
    return {type: 'Type', value: value}
  },
  Annotate: function (id, init) {
    return {
      type: 'Annotate',
      id: id,
      init: init
    }
  },
  DefineType: function (id, init) {
    return {
      type: 'DefineType',
      id: id,
      init: init
    }
  },
  TypeUnion: function (left, right) {
    return {
      type: 'TypeUnion',
      left: left,
      right: right
    }
  },
  TypeVariant: function (tag, args) {
    return {
      type: 'TypeVariant',
      tag: tag,
      args: args
    }
  }
}
