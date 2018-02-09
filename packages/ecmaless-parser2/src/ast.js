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
};
