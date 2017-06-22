var nearley = require("nearley");
var grammar = require("./grammar.js");
var tokenizer = require("./tokenizer");
var EStreeLoc = require("estree-loc");
var excerptAtLineCol = require("excerpt-at-line-col");

var fmtErrorWithExcerpt = function(err, info){

    var msg = err + "";

    if(/Error: invalid syntax at/.test(msg)){
        msg = "No possible parsings";
    }

    msg = msg.replace(/^Error:/i, "");
    msg = msg.trim();

    msg += "\n" + (info.filepath  || "") + ":" + (info.line + 1) + ":" + info.col;

    msg += "\n \n" + excerptAtLineCol(info.src, info.line, info.col, 0);

    err.message = msg;
    err.where = {
        filepath: info.filepath,
        line: info.line + 1,
        col: info.col,
        excerpt: excerptAtLineCol(info.src, info.line, info.col, 3)
    };
    return err;
};

var fmtTokenizerError = function(te, src, filepath){
    var e = new Error(te.type + ": " + te.message);

    var toLoc = EStreeLoc(src, filepath);
    var loc = toLoc(te.loc.start, te.loc.end);

    return fmtErrorWithExcerpt(e, {
        src: src,
        filepath: filepath,
        line: loc.start.line - 1,
        col: loc.start.column
    });
};

module.exports = function(src, opts){
    opts = opts || {};

    var tokens;
    try{
        tokens = tokenizer(src, {filepath: opts.filepath});
    }catch(e){
        if(e && (e.type === "InvalidCharacter" || e.type === "InvalidIndentation")){
            throw fmtTokenizerError(e, src, opts.filepath);
        }
        throw e;
    }

    var toLoc = EStreeLoc(src, opts.filepath);

    tokens = tokens
        .filter(function(tok){
            return true
                && tok.type !== "SPACES"
                && tok.type !== "COMMENT"
            ;
        })
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
                throw fmtErrorWithExcerpt(e, {
                    src: src,
                    filepath: opts.filepath,
                    line: tok.loc.start.line - 1,
                    col: tok.loc.start.column
                });
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
