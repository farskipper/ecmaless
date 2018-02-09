/* eslint-disable no-constant-condition */
// inspired by http://crockford.com/javascript/tdop/tdop.html

var ast = require("./ast");

var Ok = function(loc, ast){
    return {
        type: "Ok",
        tree: {
            loc: loc,
            ast: ast,
        },
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
        return Error(prev.token.loc, "Expected an expression");
    }
    var left = prev.rule.nud(state, prev.token);
    if(notOk(left)){
        return left;
    }
    while(rbp < state.curr.rule.lbp){
        prev = state.curr;
        advance(state);
        left = prev.rule.led(state, prev.token, left.tree);
        if(notOk(left)){
            return left;
        }
    }
    return left;
};

var parameter = function(state){
    if(state.curr.rule.id !== "SYMBOL"){
        return Error(state.curr.token.loc, "Expected a parameter symbol");
    }
    var nud = state.curr.rule.nud;
    var token = state.curr.token;
    advance(state);
    return nud(state, token);
};

////////////////////////////////////////////////////////////////////////////////

var defRule = function(id, rule){
    if(!rules.hasOwnProperty(id)){
        rules[id] = {
            id: id,

            nud: void 0,// Maybe< Fn(State, Token) >

            lbp: 0,
            led: void 0,// Maybe< Fn(State, Token, left: Tree) >
        };
    }
    if(rule.nud){
        rules[id].nud = rule.nud;
    }
    if(rule.led && rule.lbp > 0){
        rules[id].lbp = rule.lbp;
        rules[id].led = rule.led;
    }
};

var infix = function(op, bp){
    defRule(op, {
        lbp: bp,
        led: function(state, token, left){
            var right = expression(state, bp);
            if(notOk(right)){
                return right;
            }
            return Ok(token.loc, ast.Infix(op, left, right.tree));
        }
    });
};

var prefix = function(op, rbp){
    defRule(op, {
        nud: function(state, token){
            var v = expression(state, rbp);
            if(notOk(v)){
                return v;
            }
            return Ok(token.loc, ast.Prefix(op, v.tree));
        },
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
        return Ok(token.loc,  ast.Symbol(token.src));
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

prefix("not", 70);
prefix("-", 70);

defRule("(", {
    nud: function(state, token){
        var e = expression(state, 0);
        if(notOk(e)){
            return e;
        }
        if(state.curr.rule.id !== ")"){
            return Error(state.curr.token.loc, "Expected `)`");
        }
        advance(state);
        return e;
    },

    lbp: 80,
    led: function(state, token, left){
        var args = [];
        if(state.curr.rule.id !== ")"){
            while(true){
                var e = expression(state, 0);
                if(notOk(e)){
                    return e;
                }
                args.push(e.tree);
                if(state.curr.rule.id !== ","){
                    break;
                }
                advance(state);
            }
        }
        if(state.curr.rule.id !== ")"){
            return Error(state.curr.token.loc, "Expected `)`");
        }
        advance(state);
        return Ok(token.loc,  ast.ApplyFn(left, args));
    },
});

defRule("fn", {
    nud: function(state, token){
        if(state.curr.rule.id !== "("){
            return Error(state.curr.token.loc, "Expected `(`");
        }
        advance(state);
        var params = [];
        if(state.curr.rule.id !== ")"){
            while(true){
                var e = parameter(state, 0);
                if(notOk(e)){
                    return e;
                }
                params.push(e.tree);
                if(state.curr.rule.id !== ","){
                    break;
                }
                advance(state);
            }
        }
        if(state.curr.rule.id !== ")"){
            return Error(state.curr.token.loc, "Expected `)`");
        }
        advance(state);
        // TODO block or expression
        var body = expression(state, 0);
        if(notOk(body)){
            return body;
        }
        return Ok(token.loc,  ast.Function(params, body.tree));
    },
});



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
