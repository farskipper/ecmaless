var tokenizer = require('ecmaless-tokenizer')
var tdop = require('./tdop')

module.exports = function (src) {
  var r = tokenizer(src)
  if (r.type !== 'Ok') {
    return r
  }
  return tdop.parse(r.value)
}
