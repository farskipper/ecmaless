module.exports = {
    Number: function(value){
        return {type: "Number", value: value};
    },
    String: function(value){
        return {type: "String", value: value};
    },
    Symbol: function(value){
        return {type: "Symbol", value: value};
    },
    Infix: function(op, left, right){
        return {
            type: "Infix",
            op: op,
            left: left,
            right: right
        };
    },
    Prefix: function(op, value){
        return {
            type: "Prefix",
            op: op,
            value: value
        };
    },
    ApplyFn: function(callee, args){
        return {
            type: "ApplyFn",
            callee: callee,
            args: args,
        };
    },
    Function: function(params, body){
        return {
            type: "Function",
            params: params,
            body: body,
        };
    },
    Define: function(id, init){
        return {
            type: "Define",
            id: id,
            init: init,
        };
    },
    Block: function(body){
        return {
            type: "Block",
            body: body,
        };
    },
    Return: function(value){
        return {
            type: "Return",
            value: value,
        };
    },
    While: function(cond, body){
        return {
            type: "While",
            cond: cond,
            body: body,
        };
    },
    Continue: function(){
        return {type: "Continue"};
    },
    Break: function(){
        return {type: "Break"};
    },
    IfExpression: function(test, then, elseExpr){
        return {
            type: "IfExpression",
            test: test,
            then: then,
            "else": elseExpr,
        };
    },
    IfStatement: function(test, then, elseStmt){
        return {
            type: "IfStatement",
            test: test,
            then: then,
            "else": elseStmt,
        };
    },
};
