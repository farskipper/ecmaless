var lexer = require("./lexer");
var nearley = require("nearley");
var grammar = require("./grammar.js");
var tokenizer = require("./tokenizer");
var EStreeLoc = require("estree-loc");


module.exports = function(src, opts){
    opts = opts || {};

    var toLoc = EStreeLoc(src, opts.filepath);
    var err;

    var tokens;
    try{
        tokens = lexer(tokenizer(src));
    }catch(e){
        if(e
                && (typeof e.type) === "string"
                && (typeof e.src) === "string"
                && e.loc
                && (typeof e.loc.start) === "number"
                && (typeof e.loc.end) === "number"
        ){
            err = new Error(e.type + ": " + e.message);
            err.ecmaless = {
                loc: toLoc(e.loc.start, e.loc.end),
            };
            throw err;
        }
        throw e;
    }

    tokens = tokens
        .map(function(tok){
            return {
                type: tok.type,
                src: tok.src,
                loc: toLoc(tok.loc.start, tok.loc.end),
            };
        });

    var p = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);
    try{
        p.feed(tokens);
    }catch(e){
        if(typeof e.offset === "number"){
            var tok = tokens[e.offset];
            if(tok && tok.loc){
                if(/Error: invalid syntax at/.test(e + "")){
                    err = new Error("Invalid syntax");
                }else{
                    err = new Error(e + "");
                }
                err.ecmaless = {
                    loc: tok.loc,
                };
                throw err;
            }
        }
        throw e;
    }

    if(p.results.length === 0){
        throw new Error(
            "No parsings found"
        );
    }

    if(p.results.length !== 1){
        throw new Error(
            "Parsing Ambiguity: " + p.results.length + " parsings found"
        );
    }
    return p.results[0];
};
