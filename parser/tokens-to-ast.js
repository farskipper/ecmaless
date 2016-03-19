var _ = require("lodash");

var tokenToLoc = function(token){
  var lines = token.src.split('\n');
  return {
    start: {
      line: token.line,
      column: token.col - 1
    },
    end: {
      line: token.line + lines.length - 1,
      column: (lines.length > 1 ? 1 : token.col) + _.last(lines).length - 2
    }
  };
};

var tokenToNode = function(token){
  return {
    type: token.type,
    value: undefined,
    src: token.src,
    loc: tokenToLoc(token)
  };
};

module.exports = function(onAstNode){
  var stack = [];

  return function(token){
    var node = tokenToNode(token);

    if(node.type === 'whitespace'){
      return;
    }else if(node.type === "comment"){
      node = _.assign({}, node, {
        type: 'list',
        value: [
          _.assign({}, node, {type: 'symbol', value: ';'}),
          _.assign({}, node, {type: 'string', value: node.src.substring(1)})
        ]
      });
    }else if(node.type === 'string'){
      node.value = node.src.substring(1, node.src.length - 1).replace(/\\"/g, '"');
    }else if(node.type === 'number'){
      //just de-sugar the number. Converting it to a float, or big-num is up to the language dialect
      node.value = node.src.replace(/[+,]/g, '').toLowerCase();
    }else if(/^open-/.test(node.type)){
      stack.push(_.assign({}, node, {
        type: 'list',
        value: []
      }));
      return;
    }else if(/^close-/.test(node.type)){
      node = stack.pop();
    }else if(node.type === "dispatch"){
      node = _.assign({}, node, {
        type: 'list',
        value: [],
        list_max_size: 2
      });
      node.value.push(_.assign({}, node, {
        type: 'symbol',
        value: /^#.+/.test(node.src) ? node.src.substring(1) : node.src
      }));
      stack.push(node);
      return;
    }else if(node.type === 'symbol'){
      node.value = node.src;
    }else{
      throw new Error("Unsupported token type: " + token.type);
    }

    var curr_list = _.last(stack);
    if(curr_list){
      curr_list.value.push(node);
      if(curr_list.hasOwnProperty('list_max_size')){
        if(curr_list.value.length === curr_list.list_max_size){
          onAstNode(stack.pop());
        }
      }
    }else{
      onAstNode(node);
    }
  };
};
