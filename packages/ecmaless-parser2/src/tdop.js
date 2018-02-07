// inspired by http://crockford.com/javascript/tdop/tdop.html

var ast = require("./ast");

var Ok = function(loc, ast){
    return {
        type: "Ok",
        loc: loc,
        ast: ast,
    };
};

var Error = function(loc, message){
    return {
        type: "Error",
        loc: loc,
        message: message,
    };
};

var notOk = function(ast){
    return ast.type !== "Ok";
};

var rules = {};

var advance = function(state){
    if(state.token_i >= state.tokens.length){
        var src_len = state.tokens[state.tokens.length - 1].loc.end;
        state.curr = {
            rule: rules["(end)"],
            token: {
                type: "(end)",
                src: "(end)",
                loc: {start: src_len, end: src_len},
            },
        };
        return;
    }

    // get next token
    var token;
    while(state.token_i < state.tokens.length){
        token = state.tokens[state.token_i];
        state.token_i += 1;
        if(token.type !== "SPACES"){
            break;
        }
    }

    var rule;
    if(token.type === "RAW" || token.type === "KEYWORD"){
        rule = rules[token.src];
    }else{
        rule = rules[token.type];
    }

    if( ! rule){
        // this is a panic, not an error value
        throw "Unhandled token: " + token.type + "|" + token.src;
    }
    state.curr = {
        rule: rule,
        token: token,
    };
};

var expression = function(state, rbp){
    var prev = state.curr;
    advance(state);
    if(!prev.rule.nud){
        return Error(prev.token.loc, "Rule `" + prev.rule.id + "` does not have a nud");
    }
    var left = prev.rule.nud(state, prev.token);
    if(notOk(left)){
        return left;
    }
    while(rbp < state.curr.rule.lbp){
        prev = state.curr;
        advance(state);
        left = prev.rule.led(state, prev.token, left);
        if(notOk(left)){
            return left;
        }
    }
    return left;
};

////////////////////////////////////////////////////////////////////////////////

var defRule = function(id, rule){
    rules[id] = {
        id: id,

        nud: rule.nud || void 0,// fn(state, token)

        lbp: rule.lbp || 0,
        led: rule.led || void 0,// fn(state, token, left)

    };
};

var infix = function(id, bp){
    defRule(id, {
        lbp: bp,
        led: function(state, token, left){
            var right = expression(state, bp);
            if(notOk(right)){
                return right;
            }
            return Ok(token.loc, ast.Infix(id, left, right));
        }
    });
};

////////////////////////////////////////////////////////////////////////////////
// Rules
defRule("(end)", {});
defRule("end", {});
defRule(")", {});
defRule(",", {});
defRule("=", {});
defRule("NUMBER", {
    nud: function(state, token){
        var v = parseFloat(token.src) || 0;
        return Ok(token.loc, ast.Number(v));
    },
});
defRule("STRING", {
    nud: function(state, token){
        var value = token.src
            .replace(/(^")|("$)/g, "")
            .replace(/\\"/g, "\"")
            .replace(/\\\\/g, "\\")
            ;
        return Ok(token.loc, ast.String(value));
    },
});
defRule("SYMBOL", {
    nud: function(state, token){
        return Ok(token.loc,  ast.Identifier(token.src));
    },
});

infix("and", 30);
infix("or", 30);
infix("xor", 30);

infix("==", 40);
infix("!=", 40);
infix("<", 40);
infix("<=", 40);
infix(">", 40);
infix(">=", 40);

infix("+", 50);
infix("-", 50);
infix("++", 50);

infix("*", 60);
infix("/", 60);



////////////////////////////////////////////////////////////////////////////////

module.exports = function(tokens){
    var state = {
        tokens: tokens,
        token_i: 0,
        curr: void 0,
    };

    advance(state);
    var s = expression(state, 0);
    if(notOk(s)){
        return s;
    }
    if(state.curr.rule.id !== "(end)"){
        return Error(state.curr.token.loc, "Expected `(end)`");
    }
    advance(state);

    return s;
};
