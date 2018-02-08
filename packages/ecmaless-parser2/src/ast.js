module.exports = {
    Number: function(value){
        return {type: "Number", value: value};
    },
    String: function(value){
        return {type: "String", value: value};
    },
    Identifier: function(value){
        return {type: "Identifier", value: value};
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
};
