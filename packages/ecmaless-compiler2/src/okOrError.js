var Ok = function (value) {
  return {type: 'Ok', value: value}
}

var Error = function (loc, message) {
  return {type: 'Error', loc: loc, message: message}
}

var notOk = function (ast) {
  return ast.type !== 'Ok'
}

module.exports = {
  Ok: Ok,
  Error: Error,
  notOk: notOk
}
